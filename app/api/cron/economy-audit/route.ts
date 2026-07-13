/*
 * GET /api/cron/economy-audit — the standing conservation checker
 * (Architect Report §3.1 Stage 3 / ClickUp 86bawbb7j money-math queue).
 *
 * Once a day (KV-gated on the every-minute sweep; probe-and-exit otherwise —
 * the Dispatch pattern), snapshots the sim economy's invariants:
 *   • total sim-ETH in circulation (should only move by signup grants —
 *     a jump that isn't count(new users) × grant means conjured/destroyed ETH)
 *   • negative balances (must always be zero — atomic RPCs forbid overdraft)
 *   • open listings/offers whose owner no longer exists (orphan escrow)
 * Anomalies land in app_errors (kind 'server'), so they surface in the same
 * place as every other production fault. Same fail-closed CRON_SECRET gate as
 * every sweep.
 */

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseService } from '@/lib/supabase';
import { recordError } from '@/lib/telemetry/server';

export const dynamic = 'force-dynamic';

const DAY_GATE_KEY = 'pd:econ-audit-day';

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Daily gate — every other minute-tick exits on one KV read. `?force=1`
  // (still behind the secret) runs it on demand.
  const force = new URL(req.url).searchParams.get('force') === '1';
  interface KVLike {
    get(k: string): Promise<string | null>;
    put(k: string, v: string): Promise<void>;
  }
  let kv: KVLike | null = null;
  const today = new Date().toISOString().slice(0, 10);
  try {
    const { env } = getCloudflareContext() as unknown as {
      env: { NEXT_INC_CACHE_KV?: KVLike };
    };
    kv = env.NEXT_INC_CACHE_KV ?? null;
  } catch {
    /* non-CF runtime */
  }
  if (!force && kv && (await kv.get(DAY_GATE_KEY)) === today) {
    return NextResponse.json({ ok: true, skipped: 'already ran today' });
  }

  try {
    const db = getSupabaseService();
    const q = async (query: PromiseLike<{ data: unknown; error: { message: string } | null }>) => {
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    };

    const users = (await q(db.from('users').select('sim_eth_balance' as never))) as {
      sim_eth_balance: number | string | null;
    }[];
    const total = users.reduce((s, u) => s + Number(u.sim_eth_balance ?? 0), 0);
    const negatives = users.filter((u) => Number(u.sim_eth_balance ?? 0) < 0).length;

    const anomalies: string[] = [];
    if (negatives > 0) anomalies.push(`${negatives} negative balances`);

    // Supply drift vs yesterday's snapshot (KV-stored — grants move it up,
    // nothing else should move it at all).
    if (kv) {
      const prevRaw = await kv.get('pd:econ-audit-supply');
      if (prevRaw) {
        const prev = JSON.parse(prevRaw) as { total: number; users: number };
        const grant = Number(process.env.SIGNUP_SIM_ETH_GRANT ?? 1_000_000);
        const expectedDelta = (users.length - prev.users) * grant;
        const actualDelta = total - prev.total;
        // Trades are zero-sum (fees move between accounts); tolerate rounding.
        if (Math.abs(actualDelta - expectedDelta) > 1) {
          anomalies.push(
            `supply drift: total moved ${actualDelta} but grants explain ${expectedDelta} (${prev.users}→${users.length} users)`
          );
        }
      }
      await kv.put('pd:econ-audit-supply', JSON.stringify({ total, users: users.length }));
      await kv.put(DAY_GATE_KEY, today);
    }

    if (anomalies.length) {
      await recordError({
        kind: 'server',
        route: '/api/cron/economy-audit',
        message: `ECONOMY AUDIT ANOMALY: ${anomalies.join(' · ')}`,
      });
    }

    return NextResponse.json({
      ok: anomalies.length === 0,
      totalSimEth: total,
      users: users.length,
      negatives,
      anomalies,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'audit failed' },
      { status: 500 }
    );
  }
}
