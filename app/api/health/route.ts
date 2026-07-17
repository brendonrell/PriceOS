/*
 * GET /api/health — the one-glance liveness readout (Architect Report §3.3).
 *
 * Answers "is PD alive?" for an uptime pinger and for a human: database
 * reachable, the every-minute sweep's heartbeat age, when the last platform
 * event landed, and whether the Dispatch printed — plus per-system stamps for
 * the July mechanics (sticker market, Sentinel, Takeovers, push keys).
 * Read-only, safe to serve publicly (nothing beyond ages, dates, counts, and
 * a config yes/no), cheap (a handful of single-row reads + one KV get).
 * Overall `ok` is strict: DB up AND heartbeat fresh (<5 min when present).
 * The per-system stamps are INFORMATIONAL ONLY and never flip `ok` — a quiet
 * sticker market is not an outage, and the uptime pinger's contract (alarm =
 * db down / sweep stalled) must stay exactly as it was.
 */

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
import { HEARTBEAT_KEY } from '@/lib/pings/heartbeat';

export const dynamic = 'force-dynamic';

const HEARTBEAT_FRESH_MS = 5 * 60_000;

export async function GET(): Promise<NextResponse> {
  const checks: Record<string, unknown> = {};
  let ok = true;

  // Database
  try {
    const db = getSupabaseAnon();
    const { error } = await db.from('projects').select('id').limit(1);
    checks.db = error ? 'error' : 'ok';
    if (error) ok = false;
  } catch {
    checks.db = 'error';
    ok = false;
  }

  // Sweep heartbeat (stamped by the scheduled handler every minute)
  try {
    const { env } = getCloudflareContext() as unknown as {
      env: { NEXT_INC_CACHE_KV?: { get(k: string): Promise<string | null> } };
    };
    const stamp = await env.NEXT_INC_CACHE_KV?.get(HEARTBEAT_KEY);
    if (stamp) {
      const ageMs = Date.now() - Number(stamp);
      checks.sweepHeartbeatAgeSec = Math.round(ageMs / 1000);
      if (!Number.isFinite(ageMs) || ageMs > HEARTBEAT_FRESH_MS) ok = false;
    } else {
      checks.sweepHeartbeatAgeSec = null; // fresh deploy / local dev
    }
  } catch {
    checks.sweepHeartbeatAgeSec = null;
  }

  // Freshness signals (informational — don't flip `ok`)
  try {
    const db = getSupabaseAnon();
    const [ev, disp] = await Promise.all([
      db.from('events').select('timestamp').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
      db.from('dispatches' as never).select('cal_date').order('cal_date', { ascending: false }).limit(1).maybeSingle(),
    ]);
    checks.lastEventAt = (ev.data as { timestamp?: string } | null)?.timestamp ?? null;
    checks.lastDispatchDate = (disp.data as { cal_date?: string } | null)?.cal_date ?? null;
  } catch {
    /* informational only */
  }

  // Per-system stamps for the 2026-07 mechanics (informational — never flip
  // `ok`). Service client: sentinel_fires/takeovers have no anon grants, and
  // this returns only stamps and a count — no row data.
  try {
    const svc = getSupabaseService();
    const [stk, sen, tko] = await Promise.all([
      svc.from('sticker_events' as never).select('timestamp').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
      svc.from('sentinel_fires' as never).select('fired_at').order('fired_at', { ascending: false }).limit(1).maybeSingle(),
      svc.from('takeovers' as never).select('id', { count: 'exact', head: true }).eq('status', 'active'),
    ]);
    checks.lastStickerEventAt = (stk.data as { timestamp?: number } | null)?.timestamp ?? null;
    checks.lastSentinelFireAt = (sen.data as { fired_at?: string } | null)?.fired_at ?? null;
    checks.takeoversActive = tko.count ?? null;
  } catch {
    /* informational only */
  }

  // Push delivery config — the one silent-failure mode left after the
  // 2026-07-13 transport rebuild is a missing key on the Worker.
  checks.pushKeys =
    (process.env.NEXT_PUBLIC_WEBPUSH_KEY || process.env.VAPID_PUBLIC_KEY || process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) &&
    (process.env.WEBPUSH_PRIVATE_KEY || process.env.VAPID_PRIVATE_KEY)
      ? 'ok'
      : 'missing';

  return NextResponse.json(
    { ok, checks, at: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } }
  );
}
