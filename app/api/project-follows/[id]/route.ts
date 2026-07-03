import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** ?viewer=0x… response — the single-relation check ProjectFollowButton uses
 *  instead of downloading the whole (capped) follower list. */
export interface ProjectFollowRelationResponse {
  project_id: string;
  handle: string | null;
  viewer: string;
  /** viewer has an explicit project_follows row. */
  viewer_follows: boolean;
  /** viewer holds a piece (the project auto-follows them). */
  viewer_held: boolean;
  follower_count: number;
}

export interface ProjectFollowersResponse {
  project_id: string;
  /** The project's canonical @name, or null if it hasn't been claimed. */
  handle: string | null;
  /** The project's FOLLOWERS — wallets that clicked Follow. The FollowButton
      checks the viewer against this for its followed/not-followed state. */
  followers: string[];
  /** @name snapshots of the followers (sprite chips). Unclaimed wallets drop
      out, so this can be shorter than `followers`. */
  follower_handles: string[];
  follower_count: number;
  /** The project's FOLLOWING — every current HOLDER. The project auto-follows
      whoever owns a piece (Brendon 2026-06-14: "own a piece, it follows you;
      dump it, unfollowed"). Sell out and you drop off this list. */
  following: string[];
  following_handles: string[];
  following_count: number;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const ref = params.id.trim();
  if (ref.length === 0) {
    return notFound('Project not found');
  }

  try {
    const supabase = getSupabaseAnon();

    // (a) Resolve the project by id-or-handle. Try id first, then handle
    // (citext, case-insensitive). 404 if neither matches.
    const { data: byId, error: idErr } = await supabase
      .from('projects')
      .select('id, handle')
      .eq('id', ref)
      .maybeSingle();
    if (idErr) return serverError(idErr.message);
    // Cast around Supabase typed-client `never` inference on column-list selects.
    let projectRow = byId as { id: string; handle: string | null } | null;

    if (projectRow === null) {
      const { data: byHandle, error: handleErr } = await supabase
        .from('projects')
        .select('id, handle')
        .eq('handle', ref)
        .maybeSingle();
      if (handleErr) return serverError(handleErr.message);
      projectRow = byHandle as { id: string; handle: string | null } | null;
    }

    if (projectRow === null) {
      return notFound('Project not found');
    }

    const projectId = projectRow.id;

    // ── Relation mode (?viewer=) — two single-row lookups + an exact count.
    const viewer = new URL(_req.url).searchParams.get('viewer')?.toLowerCase() ?? null;
    if (viewer !== null) {
      if (!/^0x[a-fA-F0-9]{40}$/.test(viewer)) {
        return badRequest('Invalid `?viewer=` address');
      }
      const [followRes, holdRes, countRes] = await Promise.all([
        supabase
          .from('project_follows')
          .select('follower_address')
          .eq('project_id', projectId)
          .eq('follower_address', viewer)
          .maybeSingle(),
        supabase
          .from('holders')
          .select('owner_address')
          .eq('project_id', projectId)
          .eq('owner_address', viewer)
          .limit(1)
          .maybeSingle(),
        supabase
          .from('project_follows')
          .select('follower_address', { count: 'exact', head: true })
          .eq('project_id', projectId),
      ]);
      if (followRes.error) return serverError(followRes.error.message);
      if (countRes.error) return serverError(countRes.error.message);
      const relation: ProjectFollowRelationResponse = {
        project_id: projectId,
        handle: projectRow.handle,
        viewer,
        viewer_follows: followRes.data !== null,
        viewer_held: !holdRes.error && holdRes.data !== null,
        follower_count: countRes.count ?? 0,
      };
      return NextResponse.json(relation);
    }

    // (b) Pull the follower rows for this project. The address is the key;
    // follower_name is the @name snapshot (null pre-claim). Explicitly capped
    // (the platform truncates at 1000 rows regardless); the exact follower
    // count comes from a count query so it can't freeze at the cap.
    const { data: followsData, error: followsErr } = await supabase
      .from('project_follows')
      .select('follower_address, follower_name')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1000);
    if (followsErr) return serverError(followsErr.message);
    const { count: exactFollowerCount, error: followCountErr } = await supabase
      .from('project_follows')
      .select('follower_address', { count: 'exact', head: true })
      .eq('project_id', projectId);
    if (followCountErr) return serverError(followCountErr.message);

    const rows = (followsData ?? []) as Array<{
      follower_address: string;
      follower_name: string | null;
    }>;

    const followers = rows.map((r) => r.follower_address.toLowerCase());

    // (c) The project FOLLOWS every current holder — own a piece, it follows
    // you; dump it, you drop off (Brendon 2026-06-14). That's the project's
    // FOLLOWING list (distinct holders).
    const { data: holderData, error: holderErr } = await supabase
      .from('holders')
      .select('owner_address')
      .eq('project_id', projectId)
      .limit(1000);
    if (holderErr) return serverError(holderErr.message);
    const following = Array.from(
      new Set(
        ((holderData ?? []) as Array<{ owner_address: string }>).map((h) =>
          h.owner_address.toLowerCase()
        )
      )
    );

    // (d) Resolve @names across both sets in one users join (sprite chips).
    const all = Array.from(new Set([...followers, ...following]));
    let handleByAddr = new Map<string, string>();
    if (all.length > 0) {
      const { data: usersData, error: usersErr } = await supabase
        .from('users')
        .select('address, handle')
        .in('address', all);
      if (usersErr) return serverError(usersErr.message);
      handleByAddr = new Map(
        ((usersData ?? []) as Array<{ address: string; handle: string | null }>)
          .filter((u): u is { address: string; handle: string } => u.handle !== null)
          .map((u) => [u.address.toLowerCase(), u.handle])
      );
    }
    const handlesFor = (addrs: string[]) =>
      addrs.map((a) => handleByAddr.get(a)).filter((h): h is string => typeof h === 'string');

    const response: ProjectFollowersResponse = {
      project_id: projectId,
      handle: projectRow.handle,
      followers,
      follower_handles: handlesFor(followers),
      follower_count: exactFollowerCount ?? followers.length,
      following,
      following_handles: handlesFor(following),
      following_count: following.length,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
