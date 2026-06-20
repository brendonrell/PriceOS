// Persist a sampled dominant-colour bucket for one token (service-role upsert).
// Called fire-and-forget by ArtworkCard as pieces paint, so `outputs` self-
// populates for every engine (new mints + a one-time backfill as the gallery is
// browsed). Bucket is validated against the fixed vocabulary; healing is done by
// Brendon directly in the DB.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

// Mirrors the canonical bucket list (lib/art/outputColor COLOR_BUCKET_ORDER).
// Was out of sync (had 'Pink', missing Moon/Magenta, used 'Beige') — realigned
// so every real bucket persists and the renamed Cream is accepted.
const VALID = new Set<string>([
  'Hothurt', 'Red', 'Orange', 'Yellow', 'Green', 'Blue',
  'Purple', 'Magenta', 'Brown', 'Cream', 'Moon', 'Grey', 'Black', 'White',
]);

const ASPECTS = new Set(['square', 'wide', 'tall']);
const unit = (n: unknown): number | null =>
  typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(1, n)) : null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          slug?: string; id?: number | string; bucket?: string;
          aspect?: string; brightness?: number; saturation?: number; complexity?: number;
        }
      | null;
    const slug = body?.slug?.trim();
    const id = body?.id;
    const bucket = body?.bucket;
    if (!slug || id == null || !bucket || !VALID.has(bucket)) {
      return badRequest('slug, id and a valid bucket are required');
    }

    // The visual fingerprint rides along when present (validated; nulls skipped).
    const row: Record<string, unknown> = {
      project_id: slug,
      token_id: String(id),
      dominant_color: bucket,
      updated_at: new Date().toISOString(),
    };
    if (body?.aspect && ASPECTS.has(body.aspect)) row.aspect = body.aspect;
    const br = unit(body?.brightness); if (br != null) row.brightness = br;
    const sa = unit(body?.saturation); if (sa != null) row.saturation = sa;
    const cx = unit(body?.complexity); if (cx != null) row.complexity = cx;

    const sb = getSupabaseService();
    const { error } = await sb.from('outputs').upsert(row as never, {
      onConflict: 'project_id,token_id',
    });
    if (error) return serverError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
