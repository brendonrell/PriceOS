import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { notFound, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export interface ProjectFollowersResponse {
  project_id: string;
  /** The project's canonical @name, or null if it hasn't been claimed. */
  handle: string | null;
  /** Follower wallet addresses — the project FollowButton checks the viewer's
      address against this for its followed/not-followed state. */
  followers: string[];
  /** @name snapshots matching followers — the followers list renders handles
      (sprite chips), not addresses. Pre-claim followers contribute no handle,
      so this can be shorter than `followers`. Same row source. */
  follower_handles: string[];
  follower_count: number;
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

    const followers = rows.map((r) => r.follower_address);
    const follower_handles = rows
      .map((r) => r.follower_name)
      .filter((h): h is string => typeof h === 'string');

    const response: ProjectFollowersResponse = {
      project_id: projectId,
      handle: projectRow.handle,
      followers,
      follower_handles,
      follower_count: followers.length,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
