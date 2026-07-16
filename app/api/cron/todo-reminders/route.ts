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
    // Montreal wall-clock, read once — the calendar is Montreal by design and
    // the streak guard fires on the same clock (single-zone v1).
    const mtlParts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).formatToParts(new Date(now));
    const mtl = (t: string) => mtlParts.find((x) => x.type === t)?.value ?? '';
    const mtlToday = `${mtl('year')}-${mtl('month')}-${mtl('day')}`;
    const mtlNowMin = Number(mtl('hour')) * 60 + Number(mtl('minute'));
    const mtlYesterday = new Date(Date.parse(`${mtlToday}T00:00:00Z`) - 86400_000)
      .toISOString()
      .slice(0, 10);
    // The guard's evening minute — 19:00 Montreal, same window tiling as the
    // reminders, so it fires exactly once per at-risk evening.
    const STREAK_GUARD_MIN = 19 * 60;
    const streakGuardWindow = mtlNowMin - STREAK_GUARD_MIN >= 0 && (mtlNowMin - STREAK_GUARD_MIN) * 60_000 < WINDOW_MS;
    /** Streaks shorter than this are not worth interrupting an evening for. */
    const STREAK_GUARD_MIN_DAYS = 30;

    /* Per-user calendar↔pings switch (2026-07-16 Calendar Sheet): the
       account's calendar_state may opt OUT of GLOBAL-schedule pings.
       Collected during the same per-address walk the to-dos already do. */
    const globalPingsOff = new Set<string>();

    for (const address of addresses) {
      const { data: uRow } = await db
        .from('users')
        .select('settings, price_streak, streak_last_active, calendar_state')
        .eq('address', address)
        .maybeSingle();
      const settings = ((uRow as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as {
        todos?: unknown;
      };
      const calState = ((uRow as { calendar_state?: Record<string, unknown> } | null)?.calendar_state ?? {}) as {
        globalPings?: unknown;
      };
      if (calState.globalPings === false) globalPingsOff.add(address);

      // ── Streak guard — a 30-day-plus streak dies at midnight and its owner
      // hasn't acted today: one evening ping, ~5 hours of runway left.
      const streak = Number((uRow as { price_streak?: number } | null)?.price_streak ?? 0);
      const lastActive = (uRow as { streak_last_active?: string | null } | null)?.streak_last_active ?? null;
      if (streakGuardWindow && streak >= STREAK_GUARD_MIN_DAYS && lastActive === mtlYesterday) {
        await createPing({
          recipientAddress: address,
          kind: 'PING',
          data: { reminder: 'streak', days: streak },
        });
        sent += 1;
      }
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
    // GLOBAL items (@brendon's platform schedule) ping every subscriber who
    // hasn't switched global pings off. Each item carries its own reminder
    // plan (2026-07-16 Calendar Sheet): off · at time · 15m/1h before · the
    // day before. The calendar is Montreal wall-clock by design (see
    // 20260702_calendar_items), so "today" and item times read America/Toronto.
    let calSent = 0;
    try {
      const todayKey = mtlToday;
      const nowMin = mtlNowMin;
      const tomorrowKey = new Date(Date.parse(`${todayKey}T00:00:00Z`) + 86400_000)
        .toISOString()
        .slice(0, 10);

      // Today's rows fire their at-time / before-leads; tomorrow's rows are
      // in play for day-before ('1d') and for small leads that cross midnight.
      const { data: calRows } = await db
        .from('calendar_items')
        .select('scope, owner_address, time_label, title, date_key, remind')
        .in('date_key', [todayKey, tomorrowKey]);
      const items = (calRows ?? []) as Array<{
        scope: string; owner_address: string | null; time_label: string | null;
        title: string; date_key: string; remind: string | null;
      }>;
      const LEAD_MIN: Record<string, number> = { attime: 0, '15m': 15, '1h': 60, '1d': 1440 };
      const subscriberSet = new Set(addresses);
      for (const item of items) {
        const remind = item.remind && item.remind in LEAD_MIN ? item.remind : item.remind === 'off' ? 'off' : 'attime';
        if (remind === 'off') continue;
        // Reminder minute: an explicit HH:MM in the label, else the day-of
        // default (09:00 Montreal — morning heads-up for all-day items).
        const tm = item.time_label && /(\d{1,2}):(\d{2})/.exec(item.time_label);
        const itemMin = tm
          ? Math.min(23, Number(tm[1])) * 60 + Math.min(59, Number(tm[2]))
          : 9 * 60;
        // Fire minute measured on TODAY's clock: tomorrow's items sit at
        // +1440, then the lead walks the reminder back. Same window tiling
        // as to-dos (WINDOW_MS == the cron cadence) — each reminder falls in
        // exactly one sweep, whichever day it lands on.
        const fireMin = itemMin + (item.date_key === tomorrowKey ? 1440 : 0) - LEAD_MIN[remind];
        const delta = nowMin - fireMin;
        if (delta < 0 || delta * 60_000 >= WINDOW_MS) continue;
        const recipients =
          item.scope === 'global'
            ? addresses.filter((a) => !globalPingsOff.has(a))
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
              ...(remind !== 'attime' ? { lead: remind } : {}),
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
