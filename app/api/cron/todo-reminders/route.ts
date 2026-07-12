// app/api/cron/todo-reminders/route.ts
//
// The CLOSED-APP To-Do reminder sweep. Fired every 2 min by the Cloudflare Cron
// Trigger (wrangler.jsonc `triggers.crons`, dispatched in custom-worker.ts,
// same Bearer CRON_SECRET gate as the indexer reconcile). The app-OPEN path is
// the in-app toast (components/todos/TodoReminders.tsx); this is its native twin.
//
// Scale-safe + stateless: it walks only users who have a push subscription (the
// only ones who can receive), reads each one's To-Dos out of their settings
// envelope, and fires a native push for any dated, open to-do whose reminder
// instant falls inside the last sweep window. No per-reminder state is stored —
// the narrow window (== the cron cadence) gives exactly-once delivery without a
// prod-data write. Best-effort by design (a skipped cron drops that window).
//
// Reminder instant: a to-do with an explicit HH:MM fires at that time; a
// date-only to-do fires at TODO_REMINDER_UTC_HOUR (default 13:00 UTC ≈ morning
// in the Americas). Timezone is per-account TODO — v1 is a single UTC hour.

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Window (ms) a reminder instant must fall within to fire this sweep. Matches
 *  the EVERY-MINUTE cron cadence so consecutive windows tile without overlap and
 *  a to-the-minute due time fires within ~1 min (cron jitter only). */
const WINDOW_MS = 60_000;

interface StoredTodo {
  id?: string;
  text?: string;
  due?: string | null;
  dueTime?: string | null;
  /** Device UTC offset (minutes, Date.getTimezoneOffset()) stamped by the
   *  client when the due date/time was set — due/dueTime are LOCAL wall-clock. */
  tz?: number | null;
  done?: boolean;
}

/** Epoch (ms, UTC) of a to-do's reminder instant, or null if the date is bad.
 *  due/dueTime are the user's LOCAL wall-clock; `tz` (the device UTC offset at
 *  save time) converts them to the real instant. Without it a 19:09 Montreal
 *  reminder read as 19:09 UTC — hours early, usually already past when the
 *  to-do was created, so it never fired (THE 2026-07-10 dead-reminder bug).
 *  Legacy rows without tz keep the old UTC read rather than guessing a zone. */
function reminderInstant(
  due: string,
  dueTime: string | undefined,
  tz: number | null,
  defaultHour: number,
): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  if (!m) return null;
  let h = defaultHour;
  let min = 0;
  const tm = dueTime && /^(\d{1,2}):(\d{2})$/.exec(dueTime);
  if (tm) {
    h = Math.min(23, Number(tm[1]));
    min = Math.min(59, Number(tm[2]));
  }
  const base = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min);
  // getTimezoneOffset() = UTC − local in minutes (Montreal EDT = +240), so the
  // real instant is the local wall-clock reading PLUS the offset.
  return typeof tz === 'number' && Number.isFinite(tz) ? base + tz * 60_000 : base;
}

export async function GET(req: Request): Promise<Response> {
  // Fail CLOSED — no secret configured ⇒ never run (mirrors the reconcile route
  // + the Worker's own guard). An open reminder sweep would fan real pushes.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }

  const defaultHour = Number(process.env.TODO_REMINDER_UTC_HOUR ?? 13);
  const now = Date.now();

  try {
    const db = getSupabaseService();

    // Only subscribers can receive a native push — walk them, not all users.
    const { data: subRows } = await db.from('push_subscriptions').select('user_address');
    const addresses = Array.from(
      new Set(((subRows ?? []) as { user_address?: string }[]).map((r) => r.user_address).filter(Boolean)),
    ) as string[];

    let scanned = 0;
    let sent = 0;
    for (const address of addresses) {
      const { data: uRow } = await db
        .from('users')
        .select('settings')
        .eq('address', address)
        .maybeSingle();
      const settings = ((uRow as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as {
        todos?: unknown;
      };
      const todos = Array.isArray(settings.todos) ? (settings.todos as StoredTodo[]) : [];
      for (const t of todos) {
        if (!t || t.done || typeof t.due !== 'string' || !t.due) continue;
        scanned += 1;
        const instant = reminderInstant(
          t.due,
          typeof t.dueTime === 'string' ? t.dueTime : undefined,
          typeof t.tz === 'number' ? t.tz : null,
          defaultHour,
        );
        if (instant == null) continue;
        // Fire only if the instant just passed (within the last window).
        if (instant > now || instant <= now - WINDOW_MS) continue;
        const body = typeof t.text === 'string' && t.text.trim() ? t.text.trim() : 'You have a to-do due';
        // ONE call lands both deliverables: the inbox ping (❍ To-Do due: …)
        // and — through the ping's own native path — the lock-screen push,
        // gated by the recipient's Pingtoasts mode + Silent Mode.
        await createPing({
          recipientAddress: address,
          kind: 'PING',
          data: { reminder: 'todo', text: body },
        });
        sent += 1;
      }
    }

    // ── Calendar — same sweep, same window. Personal items ping their owner;
    // GLOBAL items (@brendon's platform schedule) ping every subscriber. The
    // calendar is Montreal wall-clock by design (see 20260702_calendar_items),
    // so "today" and item times are read in America/Toronto.
    let calSent = 0;
    try {
      const mtl = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Toronto',
        year: 'numeric', month: '2-digit', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).formatToParts(new Date(now));
      const part = (t: string) => mtl.find((x) => x.type === t)?.value ?? '';
      const todayKey = `${part('year')}-${part('month')}-${part('day')}`;
      const nowMin = Number(part('hour')) * 60 + Number(part('minute'));

      const { data: calRows } = await db
        .from('calendar_items')
        .select('scope, owner_address, time_label, title')
        .eq('date_key', todayKey);
      const items = (calRows ?? []) as Array<{
        scope: string; owner_address: string | null; time_label: string | null; title: string;
      }>;
      const subscriberSet = new Set(addresses);
      for (const item of items) {
        // Reminder minute: an explicit HH:MM in the label, else the day-of
        // default (09:00 Montreal — morning heads-up for all-day items).
        const tm = item.time_label && /(\d{1,2}):(\d{2})/.exec(item.time_label);
        const itemMin = tm
          ? Math.min(23, Number(tm[1])) * 60 + Math.min(59, Number(tm[2]))
          : 9 * 60;
        // Same tiling as to-dos: fire in the one sweep whose window the
        // reminder minute just passed (WINDOW_MS == the cron cadence).
        const delta = nowMin - itemMin;
        if (delta < 0 || delta * 60_000 >= WINDOW_MS) continue;
        const recipients =
          item.scope === 'global'
            ? addresses
            : item.owner_address && subscriberSet.has(item.owner_address.toLowerCase())
              ? [item.owner_address.toLowerCase()]
              : [];
        for (const r of recipients) {
          await createPing({
            recipientAddress: r,
            kind: 'PING',
            data: {
              reminder: 'calendar',
              text: item.title,
              ...(item.time_label ? { time: item.time_label } : {}),
            },
          });
          calSent += 1;
        }
      }
    } catch (err) {
      console.error('[cron] calendar sweep error:', err instanceof Error ? err.message : err);
    }

    return Response.json({ ok: true, subscribers: addresses.length, scanned, sent, calSent });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'sweep failed' },
      { status: 500 },
    );
  }
}
