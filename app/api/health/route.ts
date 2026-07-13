/*
 * GET /api/health — the one-glance liveness readout (Architect Report §3.3).
 *
 * Answers "is PD alive?" for an uptime pinger and for a human: database
 * reachable, the every-minute sweep's heartbeat age, when the last platform
 * event landed, and whether the Dispatch printed. Read-only, anon-safe (no
 * internals beyond ages and dates), cheap (three tiny reads + one KV get).
 * Overall `ok` is strict: DB up AND heartbeat fresh (<5 min when present).
 */

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseAnon } from '@/lib/supabase';
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

  return NextResponse.json(
    { ok, checks, at: new Date().toISOString() },
    { status: ok ? 200 : 503, headers: { 'cache-control': 'no-store' } }
  );
}
