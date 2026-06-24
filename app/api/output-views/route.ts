// Output views — the pillar trail's cross-user analytics surface.
//   POST { slug, id }  → record one view by the authed viewer (upsert+increment).
//   GET  ?slug=&id=    → anonymized stats for the output: total unique viewers,
//                        total raw views, and (when the caller is signed in)
//                        how many viewers are the caller's mutuals.
// Raw rows are never exposed — only counts. Keyed by @name so it joins the
// @name-keyed follows graph for the mutuals cut (Brendon, 2026-06-24).

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export interface OutputViewStats {
  totalViewers: number;
  totalViews: number;
  mutualViewers: number;
}

async function resolveHandle(
  supabase: ReturnType<typeof getSupabaseService>,
  address: string,
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

function parseTarget(slug: unknown, idRaw: unknown): { slug: string; id: number } | null {
  const s = typeof slug === 'string' ? slug.toLowerCase() : '';
  const id = typeof idRaw === 'number' ? idRaw : parseInt(String(idRaw ?? ''), 10);
  if (!SLUG_RE.test(s) || !Number.isFinite(id) || id < 0) return null;
  return { slug: s, id };
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: { slug?: string; id?: number };
  try {
    body = (await req.json()) as { slug?: string; id?: number };
  } catch {
    return badRequest('Invalid JSON body');
  }
  const target = parseTarget(body.slug, body.id);
  if (!target) return badRequest('Invalid or missing slug/id');

  try {
    const supabase = getSupabaseService();
    const viewer = await resolveHandle(supabase, address);
    // Pre-claim (no @name yet) — nothing to attribute, skip silently.
    if (!viewer) return new NextResponse(null, { status: 204 });

    const { error } = await supabase.rpc('record_output_view' as never, {
      p_viewer: viewer,
      p_project: target.slug,
      p_token: target.id,
    } as never);
    if (error) return serverError(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const target = parseTarget(url.searchParams.get('slug'), url.searchParams.get('id'));
  if (!target) return badRequest('Invalid or missing slug/id');

  try {
    const supabase = getSupabaseService();
    const address = await verifySiweSession(req);
    const viewer = address ? await resolveHandle(supabase, address) : null;

    const { data, error } = await supabase.rpc('output_view_stats' as never, {
      p_project: target.slug,
      p_token: target.id,
      p_viewer: viewer,
    } as never);
    if (error) return serverError(error.message);

    const row = (Array.isArray(data) ? data[0] : data) as
      | { total_viewers: number; total_views: number; mutual_viewers: number }
      | undefined;
    const stats: OutputViewStats = {
      totalViewers: Number(row?.total_viewers ?? 0),
      totalViews: Number(row?.total_views ?? 0),
      mutualViewers: Number(row?.mutual_viewers ?? 0),
    };
    return NextResponse.json(stats);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
