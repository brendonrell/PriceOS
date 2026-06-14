import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, notFound, serverError } from '@/lib/errors';
import { createPing } from '@/lib/pings/createPing';

export const dynamic = 'force-dynamic';

export interface ProjectFollowRequestBody {
  /** A project id OR a project @handle. Resolved id-first, then handle. */
  project: string;
}

/**
 * POST response shape. follower_name is the caller's users.handle snapshot at
 * follow time, or null pre-claim (wallet has no @name yet). Unlike the
 * user→user follows table, the project graph is keyed on the follower's
 * ADDRESS (FK to users.address), so a pre-claim follower still writes a row —
 * follower_name is simply null until they claim. The id resolution is echoed
 * so the client doesn't have to re-resolve a handle it passed.
 */
export interface ProjectFollowResponse {
  follower_address: string;
  follower_name: string | null;
  project_id: string;
  created_at: string;
}

export interface ProjectUnfollowResponse {
  ok: true;
}

/**
 * Resolve a project reference (id OR @handle) to its id. Tries projects.id
 * first, then falls back to projects.handle (citext, case-insensitive).
 * Returns null when neither matches.
 */
async function resolveProjectId(
  supabase: ReturnType<typeof getSupabaseService>,
  ref: string
): Promise<string | null> {
  const { data: byId, error: idErr } = await supabase
    .from('projects')
    .select('id')
    .eq('id', ref)
    .maybeSingle();
  if (idErr) throw new Error(idErr.message);
  // Cast around Supabase typed-client `never` inference on column-list selects.
  const idRow = byId as { id: string } | null;
  if (idRow) return idRow.id;

  const { data: byHandle, error: handleErr } = await supabase
    .from('projects')
    .select('id')
    .eq('handle', ref)
    .maybeSingle();
  if (handleErr) throw new Error(handleErr.message);
  const handleRow = byHandle as { id: string } | null;
  return handleRow?.id ?? null;
}

/**
 * Resolve a wallet address → users.handle. Returns null when the wallet has
 * no row OR has a row but has not yet claimed an @name (pre-claim). Mirrors
 * resolveHandle() in app/api/follows/route.ts.
 */
async function resolveHandle(
  supabase: ReturnType<typeof getSupabaseService>,
  address: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as { handle: string | null } | null;
  return row?.handle ?? null;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** One followed-project row for the followers modal's Projects tab. */
export interface FollowedProject {
  project_id: string;
  handle: string | null;
  title: string;
  /** True when the follow is implicit (the viewer holds a piece). */
  held: boolean;
}

export interface FollowedProjectsResponse {
  address: string;
  projects: FollowedProject[];
  count: number;
}

/**
 * GET /api/project-follows?follower=0x… — the projects a wallet follows, for
 * the followers modal's Projects tab. Includes BOTH explicit follows AND every
 * project the wallet holds a piece of (auto-follow). Public (anon) read, same
 * as the user follows list.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const follower = new URL(req.url).searchParams.get('follower')?.toLowerCase();
  if (!follower || !ADDRESS_RE.test(follower)) {
    return badRequest('Invalid or missing `?follower=` address');
  }

  try {
    const supabase = getSupabaseAnon();

    const [followsRes, holdsRes] = await Promise.all([
      supabase.from('project_follows').select('project_id').eq('follower_address', follower),
      supabase.from('holders').select('project_id').eq('owner_address', follower),
    ]);
    if (followsRes.error) return serverError(followsRes.error.message);
    if (holdsRes.error) return serverError(holdsRes.error.message);

    const explicit = new Set(
      ((followsRes.data ?? []) as Array<{ project_id: string }>).map((r) => r.project_id)
    );
    const held = new Set(
      ((holdsRes.data ?? []) as Array<{ project_id: string }>).map((r) => r.project_id)
    );
    const ids = Array.from(new Set([...explicit, ...held]));

    let projects: FollowedProject[] = [];
    if (ids.length > 0) {
      const { data: projData, error: projErr } = await supabase
        .from('projects')
        .select('id, handle, title')
        .in('id', ids);
      if (projErr) return serverError(projErr.message);
      projects = ((projData ?? []) as Array<{ id: string; handle: string | null; title: string }>)
        .map((p) => ({
          project_id: p.id,
          handle: p.handle,
          title: p.title,
          held: held.has(p.id),
        }))
        .sort((a, b) => a.title.localeCompare(b.title));
    }

    const response: FollowedProjectsResponse = { address: follower, projects, count: projects.length };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: ProjectFollowRequestBody;
  try {
    body = (await req.json()) as ProjectFollowRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const project = body.project?.trim();
  if (!project) {
    return badRequest('Invalid or missing `project` (id or @handle)');
  }

  try {
    const supabase = getSupabaseService();

    const [projectId, followerName] = await Promise.all([
      resolveProjectId(supabase, project),
      resolveHandle(supabase, address),
    ]);

    if (projectId === null) {
      return notFound('Project not found');
    }

    const payload = {
      follower_address: address,
      follower_name: followerName,
      project_id: projectId,
      created_at: new Date().toISOString(),
    };
    const { data, error } = await supabase
      .from('project_follows')
      .upsert(payload as never, {
        onConflict: 'follower_address,project_id',
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    const row = data as {
      follower_address: string;
      follower_name: string | null;
      project_id: string;
      created_at: string;
    };
    const response: ProjectFollowResponse = {
      follower_address: row.follower_address,
      follower_name: row.follower_name,
      project_id: row.project_id,
      created_at: row.created_at,
    };

    // Ping the project's artist: "@you followed your project" (rolled up).
    const { data: projRow } = await supabase
      .from('projects')
      .select('artist_address')
      .eq('id', projectId)
      .maybeSingle();
    const artist = (projRow as { artist_address?: string } | null)?.artist_address ?? null;
    if (artist) {
      await createPing({
        recipientAddress: artist,
        kind: 'PROJECT_FOLLOW',
        actorAddress: address,
        actorName: row.follower_name,
        projectId,
        groupKey: `PROJECT_FOLLOW:${projectId}`,
      });
    }

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (req, _ctx, address) => {
  const project = new URL(req.url).searchParams.get('project')?.trim();
  if (!project) {
    return badRequest('Invalid or missing `?project=` (id or @handle)');
  }

  try {
    const supabase = getSupabaseService();

    const projectId = await resolveProjectId(supabase, project);
    if (projectId === null) {
      return notFound('Project not found');
    }

    const { error } = await supabase
      .from('project_follows')
      .delete()
      .eq('follower_address', address)
      .eq('project_id', projectId);

    if (error) return serverError(error.message);

    const response: ProjectUnfollowResponse = { ok: true };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
