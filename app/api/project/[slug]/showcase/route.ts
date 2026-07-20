// /api/project/[slug]/showcase — the artist's Showcase customization
// (Brendon, 2026-07-20: per-project, manual placement first-class).
//
// PATCH → { ids?, layout?, titles?, caption? } — artist-only (SIWE caller
// must be the project's artist). Manual set order lives in showcase_ids;
// layout = classic/masonry/mixed; titles = the little placards; caption
// present = the Gen Curated placard line (the engine's set name).
//
// The read side rides /api/project/[slug]/outputs (public payload).

import { NextResponse, type NextRequest } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const MAX_PICKS = 12;
const MAX_CAPTION = 60;
const LAYOUTS = ['classic', 'masonry', 'mixed'] as const;
type Layout = (typeof LAYOUTS)[number];

interface PatchBody {
  ids?: unknown;
  layout?: unknown;
  titles?: unknown;
  caption?: unknown;
}

export const PATCH = requireAuth<{ slug: string }>(async (req: NextRequest, ctx, address) => {
  try {
    const { slug: rawSlug } = await ctx.params;
    const slug = rawSlug.toLowerCase();
    const db = getSupabaseService();

    const { data: proj, error: projErr } = await db
      .from('projects')
      .select('artist_address, max_supply')
      .eq('id', slug)
      .maybeSingle();
    if (projErr) return serverError(projErr.message);
    if (!proj) return badRequest('unknown project');
    const artist = (proj as { artist_address: string | null }).artist_address?.toLowerCase();
    if (!artist || artist !== address.toLowerCase()) {
      return badRequest('only the artist curates this Showcase');
    }
    const maxSupply = Number((proj as { max_supply: number | null }).max_supply ?? 0) || 100000;

    const body = (await req.json().catch(() => null)) as PatchBody | null;
    if (!body) return badRequest('body required');

    const patch: Record<string, unknown> = {};

    if (body.ids !== undefined) {
      if (!Array.isArray(body.ids)) return badRequest('ids must be an array');
      const ids = body.ids.map(Number);
      if (ids.length > MAX_PICKS) return badRequest(`at most ${MAX_PICKS} picks`);
      if (ids.some((n) => !Number.isInteger(n) || n < 1 || n > maxSupply)) {
        return badRequest('ids out of range');
      }
      if (new Set(ids).size !== ids.length) return badRequest('duplicate ids');
      patch.showcase_ids = ids;
    }
    if (body.layout !== undefined) {
      if (body.layout !== null && !LAYOUTS.includes(body.layout as Layout)) {
        return badRequest("layout must be 'classic', 'masonry' or 'mixed'");
      }
      patch.showcase_layout = body.layout;
    }
    if (body.titles !== undefined) {
      if (typeof body.titles !== 'boolean') return badRequest('titles must be boolean');
      patch.showcase_titles = body.titles;
    }
    if (body.caption !== undefined) {
      if (body.caption !== null && (typeof body.caption !== 'string' || body.caption.length > MAX_CAPTION)) {
        return badRequest(`caption is a string of at most ${MAX_CAPTION} chars, or null`);
      }
      patch.showcase_caption = body.caption === '' ? null : body.caption;
    }
    if (Object.keys(patch).length === 0) return badRequest('nothing to change');

    const { error: upErr } = await db.from('projects').update(patch as never).eq('id', slug);
    if (upErr) return serverError(upErr.message);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'showcase update failed');
  }
});
