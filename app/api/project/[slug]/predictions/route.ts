/*
 * /api/project/[slug]/predictions — PRICE TARGETS, the real crowd game
 * (Brendon greenlight 2026-07-13, replacing the Sentiment tab's mock).
 *
 * The shape: each Montreal calendar month is a WINDOW. Signed-in users cast
 * ONE 30-day floor call per project per window (retargetable until the
 * window closes — friendlier than write-once). Casts stay SEALED while the
 * window runs: the API exposes only the count. When the month turns, the
 * previous window REVEALS as an aggregate histogram next to where the floor
 * actually sits — the crowd against reality, every month.
 *
 * Sealing is structural: the table has RLS on with zero public policies, so
 * the only reader is this route's service client, and it never returns an
 * open window's values — not even your own neighbours' (yours comes back
 * alone so the UI can show your standing call).
 */

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getSession, requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function montrealYM(at = new Date()): { y: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') };
}
const keyOf = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;

/** Round to the site's 4-significant-digit ETH read. */
function round4(n: number): number {
  return Number(n.toPrecision(4));
}

/* The tap-a-bucket ladder, anchored on where the project's price actually
   stands (floor, else last sale, else mint price). Nine rungs from a halving
   to a doubling — the same spread the mock histogram implied. */
const LADDER = [0.5, 0.65, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 2];

async function anchorEth(slug: string): Promise<number | null> {
  const db = getSupabaseService();
  const { data } = await db
    .from('projects')
    .select('floor_price_eth, mint_price_eth')
    .eq('id', slug)
    .maybeSingle();
  const row = data as { floor_price_eth?: string | number | null; mint_price_eth?: string | number | null } | null;
  const floor = row?.floor_price_eth != null ? Number(row.floor_price_eth) : 0;
  if (floor > 0) return floor;
  const { data: sale } = await db
    .from('events')
    .select('price_eth')
    .eq('project_id', slug).eq('type', 'XFER')
    .not('price_eth', 'is', null)
    .order('timestamp', { ascending: false })
    .limit(1)
    .maybeSingle();
  const last = (sale as { price_eth?: string | number } | null)?.price_eth;
  if (last != null && Number(last) > 0) return Number(last);
  const mint = row?.mint_price_eth != null ? Number(row.mint_price_eth) : 0;
  return mint > 0 ? mint : null;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  if (!getProject(slug)) return badRequest('Unknown project');
  try {
    const db = getSupabaseService();
    const { y, m } = montrealYM();
    const cur = keyOf(y, m);
    const prev = m === 1 ? keyOf(y - 1, 12) : keyOf(y, m - 1);
    const nextMonthLabel = `${MONTHS[m % 12]} 1`;

    // Who am I? (optional — the sealed count is public, your own call is yours)
    let wallet: string | null = null;
    try {
      const session = await getSession();
      wallet = session.address?.toLowerCase() ?? null;
    } catch { /* signed out */ }

    const [countRes, mineRes, prevRes, anchor] = await Promise.all([
      db.from('price_predictions')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', slug).eq('window_key', cur),
      wallet
        ? db.from('price_predictions')
            .select('floor_eth')
            .eq('project_id', slug).eq('window_key', cur).eq('wallet', wallet)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      db.from('price_predictions')
        .select('floor_eth')
        .eq('project_id', slug).eq('window_key', prev),
      anchorEth(slug),
    ]);

    const mine = (mineRes.data as { floor_eth?: string | number } | null)?.floor_eth;
    const ladder = anchor ? LADDER.map((x) => round4(anchor * x)) : null;

    // The REVEAL — last month's crowd, aggregated into 9 buckets.
    let last: null | {
      window_key: string;
      count: number;
      buckets: { from: number; to: number; count: number }[];
      median_eth: number;
      floor_now_eth: number | null;
    } = null;
    const prevVals = ((prevRes.data ?? []) as { floor_eth: string | number }[])
      .map((r) => Number(r.floor_eth))
      .filter((v) => Number.isFinite(v) && v > 0)
      .sort((a, b) => a - b);
    if (prevVals.length > 0) {
      const lo = prevVals[0];
      const hi = prevVals[prevVals.length - 1];
      const span = hi > lo ? hi - lo : lo * 0.2 || 1; // degenerate: all equal
      const start = hi > lo ? lo : lo - span / 2;
      const B = 9;
      const buckets = Array.from({ length: B }, (_, i) => ({
        from: round4(start + (span / B) * i),
        to: round4(start + (span / B) * (i + 1)),
        count: 0,
      }));
      for (const v of prevVals) {
        const i = Math.min(B - 1, Math.max(0, Math.floor(((v - start) / span) * B)));
        buckets[i].count += 1;
      }
      last = {
        window_key: prev,
        count: prevVals.length,
        buckets,
        median_eth: round4(prevVals[Math.floor(prevVals.length / 2)]),
        floor_now_eth: anchor,
      };
    }

    return NextResponse.json({
      project_id: slug,
      window_key: cur,
      reveals_on: nextMonthLabel,
      sealed_count: countRes.count ?? 0,
      mine: mine != null ? Number(mine) : null,
      ladder,
      last,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export const POST = requireAuth<{ slug: string }>(async (req, ctx, address) => {
  const slug = (await ctx.params).slug?.toLowerCase() ?? '';
  if (!getProject(slug)) return badRequest('Unknown project');
  let floorEth = 0;
  try {
    const body = (await req.json()) as { floor_eth?: number };
    floorEth = Number(body.floor_eth);
  } catch {
    return badRequest('Bad body');
  }
  if (!Number.isFinite(floorEth) || floorEth <= 0 || floorEth > 100000) {
    return badRequest('Target out of range');
  }
  try {
    const db = getSupabaseService();
    const { y, m } = montrealYM();
    const up = await db.from('price_predictions').upsert(
      {
        project_id: slug,
        wallet: address.toLowerCase(),
        window_key: keyOf(y, m),
        floor_eth: floorEth,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'project_id,window_key,wallet' },
    );
    if (up.error) return serverError(up.error.message);
    return NextResponse.json({ ok: true, floor_eth: floorEth });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
