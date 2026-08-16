import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { getUserOwnedProjectsCount } from '@/lib/profile/getUserHoldings';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Explicit cap on the follower/following LISTS. PostgREST silently truncates
 *  at 1000 rows anyway — pre-fix, a profile past 1000 followers had its count
 *  frozen at the cap and followers beyond it saw a wrong button state. Counts
 *  are now exact (count queries) and follow-state checks use the relation
 *  mode below, so the cap only bounds how many faces a list can show. */
const LIST_CAP = 1000;

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

/** ?viewer=0x… response — the single-relation check the FollowButton and
 *  useArtistSocial use instead of downloading the whole (capped) list. */
export interface FollowRelationResponse {
  address: string;
  viewer: string;
  /** viewer → address edge exists. */
  i_follow: boolean;
  /** address → viewer edge exists. */
  follows_me: boolean;
  follower_count: number;
  following_count: number;
}

type DB = ReturnType<typeof getSupabaseAnon>;

async function handleOf(supabase: DB, address: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as { handle: string | null } | null)?.handle ?? null;
}

/** Exact follower/following counts by @name — count queries, immune to the
 *  1000-row response cap that used to freeze big profiles' numbers. */
async function exactCounts(
  supabase: DB,
  handle: string
): Promise<{ followers: number; following: number }> {
  const [followersRes, followingRes] = await Promise.all([
    supabase
      .from('follows')
      .select('follower_name', { count: 'exact', head: true })
      .eq('following_name', handle),
    supabase
      .from('follows')
      .select('following_name', { count: 'exact', head: true })
      .eq('follower_name', handle),
  ]);
  if (followersRes.error) throw new Error(followersRes.error.message);
  if (followingRes.error) throw new Error(followingRes.error.message);
  return { followers: followersRes.count ?? 0, following: followingRes.count ?? 0 };
}

/** Project edges — keyed on ADDRESS (not @name), so they apply even to a
 *  pre-claim wallet. Every project this wallet HOLDS follows them (a
 *  follower); every project they explicitly follow counts as following.
 *  Same rule as /api/user/[address] and the profile page, so all three
 *  surfaces (site, Supabase, Friend Inspector) report the same number. */
async function projectEdgeCounts(
  supabase: DB,
  address: string
): Promise<{ heldProjects: number; projectsFollowed: number }> {
  const [heldProjects, projFollowRes] = await Promise.all([
    getUserOwnedProjectsCount(address),
    supabase
      .from('project_follows')
      .select('*', { count: 'exact', head: true })
      .eq('follower_address', address),
  ]);
  if (projFollowRes.error) throw new Error(projFollowRes.error.message);
  return { heldProjects, projectsFollowed: projFollowRes.count ?? 0 };
}

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ address: string }> }
): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }
  const viewer = new URL(req.url).searchParams.get('viewer')?.toLowerCase() ?? null;
  if (viewer !== null && !ADDRESS_RE.test(viewer)) {
    return badRequest('Invalid `?viewer=` address');
  }

  try {
    const supabase = getSupabaseAnon();

    // (a) Resolve the queried address to its @name.
    const handle = await handleOf(supabase, address);

    // ── Relation mode (?viewer=) — two single-row lookups + exact counts.
    if (viewer !== null) {
      const projCounts = await projectEdgeCounts(supabase, address);
      const empty: FollowRelationResponse = {
        address,
        viewer,
        i_follow: false,
        follows_me: false,
        follower_count: projCounts.heldProjects,
        following_count: projCounts.projectsFollowed,
      };
      if (handle === null) return NextResponse.json(empty);

      const viewerHandle = viewer === address ? handle : await handleOf(supabase, viewer);
      const counts = await exactCounts(supabase, handle);
      if (viewerHandle === null || viewer === address) {
        return NextResponse.json({
          ...empty,
          follower_count: counts.followers + projCounts.heldProjects,
          following_count: counts.following + projCounts.projectsFollowed,
        });
      }
      const [iFollowRes, followsMeRes] = await Promise.all([
        supabase
          .from('follows')
          .select('follower_name')
          .eq('follower_name', viewerHandle)
          .eq('following_name', handle)
          .maybeSingle(),
        supabase
          .from('follows')
          .select('follower_name')
          .eq('follower_name', handle)
          .eq('following_name', viewerHandle)
          .maybeSingle(),
      ]);
      if (iFollowRes.error) return serverError(iFollowRes.error.message);
      if (followsMeRes.error) return serverError(followsMeRes.error.message);
      const response: FollowRelationResponse = {
        address,
        viewer,
        i_follow: iFollowRes.data !== null,
        follows_me: followsMeRes.data !== null,
        follower_count: counts.followers + projCounts.heldProjects,
        following_count: counts.following + projCounts.projectsFollowed,
      };
      return NextResponse.json(response);
    }

    // ── Full list mode.
    // Pre-claim → no follow rows possible, but project edges are keyed on
    // address and still apply.
    if (handle === null) {
      const projCounts = await projectEdgeCounts(supabase, address);
      const empty: FollowsListResponse = {
        address,
        followers: [],
        following: [],
        follower_count: projCounts.heldProjects,
        following_count: projCounts.projectsFollowed,
        follower_handles: [],
        following_handles: [],
        follower_scores: [],
        following_scores: [],
      };
      return NextResponse.json(empty);
    }

    // (b) Exact counts (users + projects) + the (capped) row lists by @name.
    const [counts, projCounts, followersRes, followingRes] = await Promise.all([
      exactCounts(supabase, handle),
      projectEdgeCounts(supabase, address),
      supabase
        .from('follows')
        .select('follower_name')
        .eq('following_name', handle)
        .order('created_at', { ascending: false })
        .limit(LIST_CAP),
      supabase
        .from('follows')
        .select('following_name')
        .eq('follower_name', handle)
        .order('created_at', { ascending: false })
        .limit(LIST_CAP),
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
    const nameToAddress = new Map<string, string>();
    const nameToScore = new Map<string, number>();
    if (allNames.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('address, handle, price_score')
        .in('handle', allNames);
      if (usersErr) return serverError(usersErr.message);
      for (const u of (usersData ?? []) as Array<{
        address: string;
        handle: string | null;
        price_score: number | null;
      }>) {
        if (u.handle !== null) {
          nameToAddress.set(u.handle, u.address);
          nameToScore.set(u.handle, u.price_score ?? 0);
        }
      }
    }

    // (d) Build ONE filtered pair list per direction and derive every parallel
    // array from it — pre-fix, `followers` was filtered but the handle/score
    // arrays were not, so one unresolvable @name shifted the zip and every
    // subsequent handle in the modal wore the wrong wallet's stats.
    const pair = (names: string[]) =>
      names
        .map((n) => ({ handle: n, address: nameToAddress.get(n), score: nameToScore.get(n) ?? 0 }))
        .filter((p): p is { handle: string; address: string; score: number } =>
          typeof p.address === 'string'
        );
    const followerPairs = pair(followerNames);
    const followingPairs = pair(followingNames);

    const response: FollowsListResponse = {
      address,
      followers: followerPairs.map((p) => p.address),
      following: followingPairs.map((p) => p.address),
      follower_count: counts.followers + projCounts.heldProjects,
      following_count: counts.following + projCounts.projectsFollowed,
      follower_handles: followerPairs.map((p) => p.handle),
      following_handles: followingPairs.map((p) => p.handle),
      follower_scores: followerPairs.map((p) => p.score),
      following_scores: followingPairs.map((p) => p.score),
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
