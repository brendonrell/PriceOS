// lib/pings/heartbeat.ts — server-only. The sweep's dead-man switch.
//
// The every-minute Cron drives reminders, the streak guard, the calendar and
// the indexer reconcile. If it silently stops, nothing else would notice —
// so the scheduled handler stamps a heartbeat into KV on every run, and the
// hot pings-count route (which fires constantly while anyone has PD open)
// occasionally checks the stamp. Stale by 10+ minutes → ONE ops ping (inbox +
// lock screen) to the admin account per hour, so the operator finds out
// before users do. Zero new infra: rides the Worker's existing KV binding.

import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';

export const HEARTBEAT_KEY = 'pd:sweep-heartbeat';
const ALERT_MUTE_KEY = 'pd:sweep-alert-mute';
const STALE_MS = 10 * 60_000;
const ALERT_MUTE_SEC = 3600;
/** Fraction of count polls that run the check (it's two KV reads at most). */
const SAMPLE = 0.02;

interface KVLike {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
}

function kv(): KVLike | null {
  try {
    const { env } = getCloudflareContext() as unknown as { env: { NEXT_INC_CACHE_KV?: KVLike } };
    return env.NEXT_INC_CACHE_KV ?? null;
  } catch {
    return null; // local dev / non-CF runtime
  }
}

/** Sampled check — call from a hot, cheap route. Never throws, never slows
 *  the caller beyond two KV reads on the sampled 2%. */
export async function checkSweepHeartbeat(): Promise<void> {
  try {
    if (Math.random() > SAMPLE) return;
    const store = kv();
    if (!store) return;
    const stamp = await store.get(HEARTBEAT_KEY);
    if (!stamp) return; // never stamped (fresh deploy) — nothing to compare
    const age = Date.now() - Number(stamp);
    if (!Number.isFinite(age) || age < STALE_MS) return;

    // Rate-limit: one alert per hour however many polls notice the stall.
    if (await store.get(ALERT_MUTE_KEY)) return;
    await store.put(ALERT_MUTE_KEY, '1', { expirationTtl: ALERT_MUTE_SEC });

    const admin = (process.env.PD_ADMIN_HANDLE ?? 'brendon').toLowerCase();
    const db = getSupabaseService();
    const { data } = await db.from('users').select('address').eq('handle', admin).maybeSingle();
    const addr = (data as { address: string } | null)?.address;
    if (!addr) return;

    const mins = Math.round(age / 60_000);
    await createPing({
      recipientAddress: addr,
      kind: 'PING',
      data: {
        reminder: 'ops',
        text: `Sweep heartbeat stale ${mins} min — reminders + reconcile cron may be down`,
      },
    });
  } catch {
    /* watchdog must never bite the caller */
  }
}
