import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getCircleStats } from '@/lib/social/circleStats';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_ADDRESSES = 300;

/** Re-exported for existing consumers (FollowersModal). The implementation —
    and the type — live in lib/social/circleStats, shared with Global Search. */
export type { CircleStat } from '@/lib/social/circleStats';

/**
 * GET /api/social/circle-stats?addresses=0x..,0x.. → { stats: { [address]: CircleStat } }
 *
 * Batches the per-person numbers the modal shows on every row so it can sort the
 * circle by collected / spend / followers. Collected + spend come from the
 * holders table (spend = Σ each held project's mint price, via the registry —
 * identical to the profile hero's Volume Spent). Followers is the follows tally
 * by @name. Artist = the wallet creates at least one project. Public anon read.
 * Shared implementation: lib/social/circleStats (also feeds Global Search rows).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const raw = new URL(req.url).searchParams.get('addresses') ?? '';
  const addrs = Array.from(
    new Set(raw.split(',').map((a) => a.trim().toLowerCase()).filter((a) => ADDRESS_RE.test(a)))
  ).slice(0, MAX_ADDRESSES);

  if (addrs.length === 0) return badRequest('Missing or empty `?addresses=` list');

  try {
    const stats = await getCircleStats(getSupabaseAnon(), addrs);
    return NextResponse.json({ stats });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
