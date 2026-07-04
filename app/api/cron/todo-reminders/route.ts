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
import { sendTodoReminder } from '@/lib/push/webpush';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Window (ms) a reminder instant must fall within to fire this sweep. Matches
 *  the 2-min cron cadence so consecutive windows tile without overlap. */
const WINDOW_MS = 120_000;

interface StoredTodo {
  id?: string;
  text?: string;
  due?: string | null;
  dueTime?: string | null;
  done?: boolean;
}

/** Epoch (ms, UTC) of a to-do's reminder instant, or null if the date is bad. */
function reminderInstant(due: string, dueTime: string | undefined, defaultHour: number): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(due);
  if (!m) return null;
  let h = defaultHour;
  let min = 0;
  const tm = dueTime && /^(\d{1,2}):(\d{2})$/.exec(dueTime);
  if (tm) {
    h = Math.min(23, Number(tm[1]));
    min = Math.min(59, Number(tm[2]));
  }
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), h, min);
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
        const instant = reminderInstant(t.due, typeof t.dueTime === 'string' ? t.dueTime : undefined, defaultHour);
        if (instant == null) continue;
        // Fire only if the instant just passed (within the last window).
        if (instant > now || instant <= now - WINDOW_MS) continue;
        const body = typeof t.text === 'string' && t.text.trim() ? t.text.trim() : 'You have a to-do due';
        await sendTodoReminder(address, 'To-Do due', body);
        sent += 1;
      }
    }

    return Response.json({ ok: true, subscribers: addresses.length, scanned, sent });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'sweep failed' },
      { status: 500 },
    );
  }
}
