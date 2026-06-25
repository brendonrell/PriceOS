import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_ADDRESSES = 300;

/** Inline stats for one person row in the Followers Manager — the SAME three the
    profile hero shows (Outputs Collected · Volume Spent · Followers), plus the
    artist flag for the ✺ badge. */
export interface CircleStat {
  handle: string | null;
  collected: number;
  spentEth: number;
  followers: number;
  isArtist: boolean;
}

/**
 * GET /api/social/circle-stats?addresses=0x..,0x.. → { stats: { [address]: CircleStat } }
 *
 * Batches the per-person numbers the modal shows on every row so it can sort the
 * circle by collected / spend / followers. Collected + spend come from the
 * holders table (spend = Σ each held project's mint price, via the registry —
 * identical to the profile hero's Volume Spent). Followers is the follows tally
 * by @name. Artist = the wallet creates at least one project. Public anon read.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const raw = new URL(req.url).searchParams.get('addresses') ?? '';
  const addrs = Array.from(
    new Set(raw.split(',').map((a) => a.trim().toLowerCase()).filter((a) => ADDRESS_RE.test(a)))
  ).slice(0, MAX_ADDRESSES);

  if (addrs.length === 0) return badRequest('Missing or empty `?addresses=` list');

  try {
    const supabase = getSupabaseAnon();

    const [usersRes, holdersRes, artistRes] = await Promise.all([
      supabase.from('users').select('address, handle').in('address', addrs),
      supabase.from('holders').select('owner_address, project_id').in('owner_address', addrs),
      supabase.from('projects').select('artist_address').in('artist_address', addrs),
    ]);
    if (usersRes.error) return serverError(usersRes.error.message);
    if (holdersRes.error) return serverError(holdersRes.error.message);
    if (artistRes.error) return serverError(artistRes.error.message);

    const addrToHandle = new Map<string, string>();
    for (const u of (usersRes.data ?? []) as Array<{ address: string; handle: string | null }>) {
      if (u.handle) addrToHandle.set(u.address.toLowerCase(), u.handle);
    }
    const artistSet = new Set(
      ((artistRes.data ?? []) as Array<{ artist_address: string | null }>)
        .map((p) => p.artist_address?.toLowerCase())
        .filter((a): a is string => !!a)
    );

    const collected = new Map<string, number>();
    const spent = new Map<string, number>();
    for (const row of (holdersRes.data ?? []) as Array<{ owner_address: string; project_id: string }>) {
      const a = row.owner_address.toLowerCase();
      collected.set(a, (collected.get(a) ?? 0) + 1);
      const price = getProject(row.project_id)?.mintPriceEth ?? 0;
      spent.set(a, (spent.get(a) ?? 0) + price);
    }

    // Follower counts, by @name, for everyone who has a handle.
    const handles = Array.from(addrToHandle.values()).map((h) => h.toLowerCase());
    const followerByHandle = new Map<string, number>();
    if (handles.length > 0) {
      const { data: fData, error: fErr } = await supabase
        .from('follows')
        .select('following_name')
        .in('following_name', handles);
      if (fErr) return serverError(fErr.message);
      for (const r of (fData ?? []) as Array<{ following_name: string | null }>) {
        const n = r.following_name?.toLowerCase();
        if (n) followerByHandle.set(n, (followerByHandle.get(n) ?? 0) + 1);
      }
    }

    const stats: Record<string, CircleStat> = {};
    for (const a of addrs) {
      const handle = addrToHandle.get(a) ?? null;
      stats[a] = {
        handle,
        collected: collected.get(a) ?? 0,
        spentEth: Math.round((spent.get(a) ?? 0) * 1000) / 1000,
        followers: handle ? followerByHandle.get(handle.toLowerCase()) ?? 0 : 0,
        isArtist: artistSet.has(a),
      };
    }

    return NextResponse.json({ stats });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
