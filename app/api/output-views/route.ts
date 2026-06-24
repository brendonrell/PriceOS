// Output views — records a view into the output_views table (the History
// pillar's source). POST only; the viewer is attributed server-side by @name.
// No public counts surface here — History reads its own rows via /api/history.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const SLUG_RE = /^[a-z0-9-]{1,64}$/;

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

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: { slug?: string; id?: number };
  try {
    body = (await req.json()) as { slug?: string; id?: number };
  } catch {
    return badRequest('Invalid JSON body');
  }
  const slug = typeof body.slug === 'string' ? body.slug.toLowerCase() : '';
  const id = typeof body.id === 'number' ? body.id : NaN;
  if (!SLUG_RE.test(slug) || !Number.isFinite(id) || id < 0) {
    return badRequest('Invalid or missing slug/id');
  }

  try {
    const supabase = getSupabaseService();
    const viewer = await resolveHandle(supabase, address);
    // Pre-claim (no @name yet) — nothing to attribute, skip silently.
    if (!viewer) return new NextResponse(null, { status: 204 });

    const { error } = await supabase.rpc('record_output_view' as never, {
      p_viewer: viewer,
      p_project: slug,
      p_token: id,
    } as never);
    if (error) return serverError(error.message);
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
