import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Cartel count — how many of the caller's mutuals control (hold ≥1 Output of)
 * this project. A mutual is a two-way follow. The query only checks the
 * caller's mutuals against the project's holders, so it stays cheap.
 *
 * GET /api/project/[slug]/cartel?me=0x… → { count }
 *
 * Returns { count: 0 } for a signed-out / pre-claim caller, or one with no
 * mutuals holding the project — the badge shows ⟁0 in those cases by design.
 * The number goes live the moment a real mutual collects.
 */
export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const slug = params.slug?.toLowerCase();
  const me = (new URL(req.url).searchParams.get('me') ?? '').toLowerCase();
  if (!slug) return badRequest('Missing slug');
  if (!ADDRESS_RE.test(me)) return NextResponse.json({ count: 0 });

  try {
    const supabase = getSupabaseService();

    // (a) Caller address → @name. Pre-claim wallets have no follows.
    const { data: meUser, error: meErr } = await supabase
      .from('users')
      .select('handle')
      .eq('address', me)
      .maybeSingle();
    if (meErr) return serverError(meErr.message);
    const handle = (meUser as { handle: string | null } | null)?.handle ?? null;
    if (!handle) return NextResponse.json({ count: 0 });

    // (b) Mutuals = handles that appear as BOTH my follower and my following.
    const [followersRes, followingRes] = await Promise.all([
      supabase.from('follows').select('follower_name').eq('following_name', handle),
      supabase.from('follows').select('following_name').eq('follower_name', handle),
    ]);
    if (followersRes.error) return serverError(followersRes.error.message);
    if (followingRes.error) return serverError(followingRes.error.message);

    const followerNames = new Set(
      ((followersRes.data ?? []) as Array<{ follower_name: string }>).map((r) => r.follower_name)
    );
    const mutualHandles = Array.from(
      new Set(
        ((followingRes.data ?? []) as Array<{ following_name: string }>)
          .map((r) => r.following_name)
          .filter((n) => followerNames.has(n))
      )
    );
    if (mutualHandles.length === 0) return NextResponse.json({ count: 0 });

    // (c) Mutual @names → wallet addresses.
    const { data: usersData, error: usersErr } = await supabase
      .from('users')
      .select('address, handle')
      .in('handle', mutualHandles);
    if (usersErr) return serverError(usersErr.message);
    const mutualAddrs = ((usersData ?? []) as Array<{ address: string; handle: string | null }>)
      .map((u) => u.address?.toLowerCase())
      .filter((a): a is string => typeof a === 'string');
    if (mutualAddrs.length === 0) return NextResponse.json({ count: 0 });

    // (d) Which of those mutuals hold this project → distinct holder count.
    const { data: holdersData, error: holdersErr } = await supabase
      .from('holders')
      .select('owner_address')
      .eq('project_id', slug)
      .in('owner_address', mutualAddrs);
    if (holdersErr) return serverError(holdersErr.message);
    const distinct = new Set(
      ((holdersData ?? []) as Array<{ owner_address: string }>)
        .map((r) => r.owner_address?.toLowerCase())
        .filter(Boolean)
    );

    return NextResponse.json({ count: distinct.size });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
