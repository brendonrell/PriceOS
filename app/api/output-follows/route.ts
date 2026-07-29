import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, notFound, serverError } from '@/lib/errors';
import { createPing } from '@/lib/pings/createPing';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

/* An output is referenced as `{slug}-{tokenId}` (the global-id form, e.g.
   `oracle-234`). Mirrors parseId in app/api/output/[id]/market/route.ts. */
function parseOutputRef(ref: string): { slug: string; tokenId: string } | null {
  const idx = ref.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = ref.slice(0, idx).toLowerCase();
  const tokenId = ref.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

export interface OutputFollowRequestBody {
  /** Global output id, `{slug}-{tokenId}` (e.g. `oracle-234`). */
  output: string;
}

export interface OutputFollowResponse {
  follower_address: string;
  follower_name: string | null;
  project_id: string;
  token_id: string;
  created_at: string;
}

export interface OutputUnfollowResponse {
  ok: true;
}

/** Followers of one output: stored user followers + the synthesised parent
    project (parental support), so the count is never 0. */
export interface OutputFollowersResponse {
  project_id: string;
  token_id: string;
  /** Lower-cased wallet addresses that explicitly follow this output. */
  followers: string[];
  /** @names matching `followers` — Friend Inspector Lite renders ASCII-IDs,
   *  which are keyed by handle. Same row source, additive (the follows API's
   *  own follower_handles convention). Addresses with no handle are dropped. */
  follower_handles: string[];
  /** followers.length + 1 (the parent project always follows its own output). */
  count: number;
}

/** One followed output, for the viewer's "outputs you follow" list (the
    profile Starred "Following" pill). */
export interface FollowedOutput {
  project_id: string;
  token_id: string;
  created_at: string;
}
export interface FollowedOutputsResponse {
  address: string;
  outputs: FollowedOutput[];
  count: number;
}

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

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

/**
 * GET — two modes:
 *   ?follower=0x…        → the outputs that wallet follows (Starred "Following").
 *   ?output={slug-id}    → that output's followers + count (the +More social tab).
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const follower = url.searchParams.get('follower')?.toLowerCase();
  const output = url.searchParams.get('output')?.trim();

  try {
    const supabase = getSupabaseAnon();

    if (output) {
      const parsed = parseOutputRef(output);
      if (!parsed) return badRequest('Invalid `?output=` (expected {slug}-{tokenId})');

      // Relation mode (?output=…&viewer=0x…) — one single-row lookup + an
      // exact count; OutputFollowButton uses this instead of downloading the
      // whole (capped) follower list to find itself.
      const viewer = url.searchParams.get('viewer')?.toLowerCase();
      if (viewer) {
        if (!ADDRESS_RE.test(viewer)) return badRequest('Invalid `?viewer=` address');
        const [relRes, countRes] = await Promise.all([
          supabase
            .from('output_follows')
            .select('follower_address')
            .eq('project_id', parsed.slug)
            .eq('token_id', parsed.tokenId)
            .eq('follower_address', viewer)
            .maybeSingle(),
          supabase
            .from('output_follows')
            .select('follower_address', { count: 'exact', head: true })
            .eq('project_id', parsed.slug)
            .eq('token_id', parsed.tokenId),
        ]);
        if (relRes.error) return serverError(relRes.error.message);
        if (countRes.error) return serverError(countRes.error.message);
        return NextResponse.json({
          project_id: parsed.slug,
          token_id: parsed.tokenId,
          viewer,
          viewer_follows: relRes.data !== null,
          count: (countRes.count ?? 0) + 1, // + the parent project (parental support)
        });
      }

      const { data, error } = await supabase
        .from('output_follows')
        .select('follower_address')
        .eq('project_id', parsed.slug)
        .eq('token_id', parsed.tokenId)
        .limit(1000);
      if (error) return serverError(error.message);
      const followers = ((data ?? []) as Array<{ follower_address: string }>).map(
        (r) => r.follower_address.toLowerCase()
      );
      const { count: exactCount, error: countErr } = await supabase
        .from('output_follows')
        .select('follower_address', { count: 'exact', head: true })
        .eq('project_id', parsed.slug)
        .eq('token_id', parsed.tokenId);
      if (countErr) return serverError(countErr.message);
      // One users read turns the addresses into the @names the ASCII-ID needs.
      let followerHandles: string[] = [];
      if (followers.length) {
        const { data: rows } = await supabase
          .from('users')
          .select('address, handle')
          .in('address', followers);
        const byAddr = new Map(
          ((rows ?? []) as Array<{ address: string; handle: string | null }>)
            .map((r) => [r.address.toLowerCase(), r.handle]),
        );
        followerHandles = followers
          .map((a) => byAddr.get(a))
          .filter((h): h is string => typeof h === 'string' && h.length > 0);
      }
      const response: OutputFollowersResponse = {
        project_id: parsed.slug,
        token_id: parsed.tokenId,
        followers,
        follower_handles: followerHandles,
        count: (exactCount ?? followers.length) + 1, // + the parent project (parental support)
      };
      return NextResponse.json(response);
    }

    if (follower) {
      if (!ADDRESS_RE.test(follower)) {
        return badRequest('Invalid `?follower=` address');
      }
      const { data, error } = await supabase
        .from('output_follows')
        .select('project_id, token_id, created_at')
        .eq('follower_address', follower)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (error) return serverError(error.message);
      const outputs = ((data ?? []) as Array<FollowedOutput>).map((r) => ({
        project_id: r.project_id,
        token_id: r.token_id,
        created_at: r.created_at,
      }));
      const response: FollowedOutputsResponse = {
        address: follower,
        outputs,
        count: outputs.length,
      };
      return NextResponse.json(response);
    }

    return badRequest('Provide `?follower=` or `?output=`');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** POST — follow an output. Body: { output: "{slug}-{tokenId}" }. */
export const POST = requireAuth(async (req, _ctx, address) => {
  let body: OutputFollowRequestBody;
  try {
    body = (await req.json()) as OutputFollowRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const ref = body.output?.trim();
  if (!ref) return badRequest('Invalid or missing `output` ({slug}-{tokenId})');
  const parsed = parseOutputRef(ref);
  if (!parsed) return badRequest('Invalid `output` (expected {slug}-{tokenId})');

  try {
    const supabase = getSupabaseService();
    const followerName = await resolveHandle(supabase, address);

    const payload = {
      follower_address: address,
      follower_name: followerName,
      project_id: parsed.slug,
      token_id: parsed.tokenId,
      created_at: new Date().toISOString(),
    };
    // ignoreDuplicates: re-following an already-followed output is an
    // idempotent no-op — no created_at reset, no re-fired owner ping.
    const { data, error } = await supabase
      .from('output_follows')
      .upsert(payload as never, {
        onConflict: 'follower_address,project_id,token_id',
        ignoreDuplicates: true,
      })
      .select()
      .maybeSingle();
    if (error) return serverError(error.message);

    if (data === null) {
      const response: OutputFollowResponse = {
        follower_address: address,
        follower_name: followerName,
        project_id: parsed.slug,
        token_id: parsed.tokenId,
        created_at: new Date().toISOString(),
      };
      return NextResponse.json(response, { status: 200 });
    }

    const row = data as {
      follower_address: string;
      follower_name: string | null;
      project_id: string;
      token_id: string;
      created_at: string;
    };

    // Ping the output's OWNER: "@you followed your output" (rolled up per
    // output). Owner = current holder of (project_id, token_id).
    const { data: holderRow } = await supabase
      .from('holders')
      .select('owner_address')
      .eq('project_id', parsed.slug)
      .eq('token_id', parsed.tokenId)
      .maybeSingle();
    const owner = (holderRow as { owner_address?: string } | null)?.owner_address ?? null;
    if (owner) {
      await createPing({
        recipientAddress: owner,
        kind: 'OUTPUT_FOLLOW',
        actorAddress: address,
        actorName: row.follower_name,
        projectId: parsed.slug,
        projectName: getProject(parsed.slug)?.slug ?? null,
        tokenId: parsed.tokenId,
        groupKey: `OUTPUT_FOLLOW:${parsed.slug}:${parsed.tokenId}`,
      });
    }

    const response: OutputFollowResponse = {
      follower_address: row.follower_address,
      follower_name: row.follower_name,
      project_id: row.project_id,
      token_id: row.token_id,
      created_at: row.created_at,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

/** DELETE — unfollow an output. ?output={slug}-{tokenId}. */
export const DELETE = requireAuth(async (req, _ctx, address) => {
  const ref = new URL(req.url).searchParams.get('output')?.trim();
  if (!ref) return badRequest('Invalid or missing `?output=` ({slug}-{tokenId})');
  const parsed = parseOutputRef(ref);
  if (!parsed) return badRequest('Invalid `?output=` (expected {slug}-{tokenId})');

  try {
    const supabase = getSupabaseService();
    const { error } = await supabase
      .from('output_follows')
      .delete()
      .eq('follower_address', address)
      .eq('project_id', parsed.slug)
      .eq('token_id', parsed.tokenId);
    if (error) return serverError(error.message);
    const response: OutputUnfollowResponse = { ok: true };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
