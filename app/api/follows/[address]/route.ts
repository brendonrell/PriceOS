import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

export interface FollowsListResponse {
  address: string;
  followers: string[];
  following: string[];
  follower_count: number;
  following_count: number;
  /** @name lists matching followers/following — the FollowersModal renders
      handles (sprite chips), not addresses. Additive, same row source. */
  follower_handles: string[];
  following_handles: string[];
  /** PriceScores parallel to follower_handles / following_handles — feeds the
      social-row relevance ranker (lib/social/relevance). 0 when unclaimed. */
  follower_scores: number[];
  following_scores: number[];
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  try {
    const supabase = getSupabaseAnon();

    // (a) Resolve the queried address to its @name.
    const { data: user, error: userErr } = await supabase
      .from('users')
      .select('handle')
      .eq('address', address)
      .maybeSingle();
    if (userErr) return serverError(userErr.message);

    // Cast around Supabase typed-client `never` inference on column-list selects.
    const userRow = user as { handle: string | null } | null;
    const handle = userRow?.handle ?? null;

    // Pre-claim → no rows possible. Empty lists.
    if (handle === null) {
      const empty: FollowsListResponse = {
        address,
        followers: [],
        following: [],
        follower_count: 0,
        following_count: 0,
        follower_handles: [],
        following_handles: [],
        follower_scores: [],
        following_scores: [],
      };
      return NextResponse.json(empty);
    }

    // (b) Query follows by @name to get the OTHER party's @names.
    const [followersRes, followingRes] = await Promise.all([
      supabase
        .from('follows')
        .select('follower_name')
        .eq('following_name', handle),
      supabase
        .from('follows')
        .select('following_name')
        .eq('follower_name', handle),
    ]);

    if (followersRes.error) return serverError(followersRes.error.message);
    if (followingRes.error) return serverError(followingRes.error.message);

    const followerNames = ((followersRes.data ?? []) as Array<{
      follower_name: string;
    }>).map((r) => r.follower_name);
    const followingNames = ((followingRes.data ?? []) as Array<{
      following_name: string;
    }>).map((r) => r.following_name);

    // (c) Resolve those @names back to addresses via a single users join.
    const allNames = Array.from(new Set([...followerNames, ...followingNames]));
    let nameToAddress = new Map<string, string>();
    const nameToScore = new Map<string, number>();
    if (allNames.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('address, handle, price_score')
        .in('handle', allNames);
      if (usersErr) return serverError(usersErr.message);
      const urows = (usersData ?? []) as Array<{
        address: string;
        handle: string | null;
        price_score: number | null;
      }>;
      nameToAddress = new Map(
        urows
          .filter((u): u is { address: string; handle: string; price_score: number | null } => u.handle !== null)
          .map((u) => [u.handle, u.address])
      );
      for (const u of urows) {
        if (u.handle !== null) nameToScore.set(u.handle, u.price_score ?? 0);
      }
    }

    // (d) Build address arrays. The follows.{follower,following}_name FK to
    // users.handle should guarantee a hit for every row; filter defensively.
    const followers = followerNames
      .map((n) => nameToAddress.get(n))
      .filter((a): a is string => typeof a === 'string');
    const following = followingNames
      .map((n) => nameToAddress.get(n))
      .filter((a): a is string => typeof a === 'string');

    const response: FollowsListResponse = {
      address,
      followers,
      following,
      follower_count: followers.length,
      following_count: following.length,
      follower_handles: followerNames,
      following_handles: followingNames,
      follower_scores: followerNames.map((n) => nameToScore.get(n) ?? 0),
      following_scores: followingNames.map((n) => nameToScore.get(n) ?? 0),
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
