import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

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

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
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

    // (b) Pull the follower rows for this project. The address is the key;
    // follower_name is the @name snapshot (null pre-claim).
    const { data: followsData, error: followsErr } = await supabase
      .from('project_follows')
      .select('follower_address, follower_name')
      .eq('project_id', projectId);
    if (followsErr) return serverError(followsErr.message);

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
      .eq('project_id', projectId);
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
      follower_count: followers.length,
      following,
      following_handles: handlesFor(following),
      following_count: following.length,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
