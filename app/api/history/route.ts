// My History — the signed-in viewer's own recently-viewed Outputs, read straight
// from the output_views pillar table (the durable record). Freshest first, last
// 500. PRIVATE: requireAuth, scoped to the caller's own @name rows.
//   GET                → [{ slug, id, ts }] (newest first, max 500)
//   DELETE ?slug=&id=  → drop one row from the caller's history

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

export interface HistoryEntry { slug: string; id: number; ts: number; }

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

export const GET = requireAuth(async (_req, _ctx, address) => {
  try {
    const supabase = getSupabaseService();
    const viewer = await resolveHandle(supabase, address);
    if (!viewer) return NextResponse.json([] as HistoryEntry[]);

    const { data, error } = await supabase
      .from('output_views')
      .select('project_id, token_id, last_viewed_at')
      .eq('viewer_name', viewer)
      .order('last_viewed_at', { ascending: false })
      .limit(500);
    if (error) return serverError(error.message);

    const rows = (data ?? []) as { project_id: string; token_id: number; last_viewed_at: string }[];
    const out: HistoryEntry[] = rows.map((r) => ({
      slug: r.project_id,
      id: r.token_id,
      ts: Date.parse(r.last_viewed_at) || 0,
    }));
    return NextResponse.json(out);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (req, _ctx, address) => {
  const url = new URL(req.url);
  const slug = (url.searchParams.get('slug') ?? '').toLowerCase();
  const id = parseInt(url.searchParams.get('id') ?? '', 10);
  if (!SLUG_RE.test(slug) || !Number.isFinite(id)) return badRequest('Invalid slug/id');

  try {
    const supabase = getSupabaseService();
    const viewer = await resolveHandle(supabase, address);
    if (!viewer) return new NextResponse(null, { status: 204 });

    const { error } = await supabase
      .from('output_views')
      .delete()
      .eq('viewer_name', viewer)
      .eq('project_id', slug)
      .eq('token_id', id);
    if (error) return serverError(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
