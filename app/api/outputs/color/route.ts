// Persist a sampled dominant-colour bucket for one token (service-role upsert).
// Called fire-and-forget by ArtworkCard as pieces paint, so `outputs` self-
// populates for every engine (new mints + a one-time backfill as the gallery is
// browsed). Bucket is validated against the fixed vocabulary; healing is done by
// Brendon directly in the DB.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import {
  brightnessBand, saturationBand, complexityBand, toneMood, colorTemperature, orientationOf,
  paletteBand, contrastBand, warmthBand, symmetryBand, airBand, textureBand,
} from '@/lib/output/derive';

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
const GRAVITIES = new Set(['Centered', 'Low', 'High', 'Left', 'Right']);
const unit = (n: unknown): number | null =>
  typeof n === 'number' && isFinite(n) ? Math.max(0, Math.min(1, n)) : null;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | {
          slug?: string; id?: number | string; bucket?: string;
          aspect?: string; brightness?: number; saturation?: number; complexity?: number;
          accent?: string | null; accentShare?: number; paletteCount?: number;
          contrast?: number; warmth?: number | null; gravity?: string;
          symmetry?: number; air?: number; texture?: number;
          scene?: string | null; shapeCount?: number; pattern?: string | null;
          shapes?: { bucket?: string; kind?: string; share?: number; pos?: string }[];
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
    const aspect = body?.aspect && ASPECTS.has(body.aspect) ? body.aspect : null;
    if (aspect) row.aspect = aspect;
    const br = unit(body?.brightness); if (br != null) row.brightness = br;
    const sa = unit(body?.saturation); if (sa != null) row.saturation = sa;
    const cx = unit(body?.complexity); if (cx != null) row.complexity = cx;

    // Fingerprint-derived bands / mood — denormalised so the attribute sheet
    // reads them straight from the row (same derivations the UI computes live).
    row.color_temperature = colorTemperature(bucket);
    if (aspect) row.orientation = orientationOf(aspect);
    if (br != null) row.brightness_band = brightnessBand(br);
    if (sa != null) row.saturation_band = saturationBand(sa);
    if (cx != null) row.complexity_band = complexityBand(cx);
    if (br != null && sa != null) row.tone_mood = toneMood(br, sa);

    // ── The deep look (fingerprint v2, 2026-07-01) — scalars + bands ──
    const accent = body?.accent && VALID.has(body.accent) && body.accent !== bucket ? body.accent : null;
    if (accent) {
      row.accent_color = accent;
      const ash = unit(body?.accentShare); if (ash != null) row.accent_share = ash;
    }
    const pc = typeof body?.paletteCount === 'number' && isFinite(body.paletteCount)
      ? Math.max(1, Math.min(14, Math.round(body.paletteCount))) : null;
    if (pc != null) { row.palette_count = pc; row.palette_band = paletteBand(pc); }
    const co = unit(body?.contrast); if (co != null) { row.contrast = co; row.contrast_band = contrastBand(co); }
    const wa = unit(body?.warmth); if (wa != null) { row.warmth = wa; row.warmth_band = warmthBand(wa); }
    const gr = body?.gravity && GRAVITIES.has(body.gravity) ? body.gravity : null;
    if (gr) row.gravity = gr;
    const sy = unit(body?.symmetry); if (sy != null) { row.symmetry = sy; row.symmetry_band = symmetryBand(sy); }
    const ai = unit(body?.air); if (ai != null) { row.air = ai; row.air_band = airBand(ai); }
    const tx = unit(body?.texture); if (tx != null) { row.texture = tx; row.texture_band = textureBand(tx); }

    // ── The quantitative read (fingerprint v3) — scene + shapes ──
    const KINDS = new Set(['circle', 'square', 'bar', 'shape']);
    const PATTERNS = new Set(['stripes', 'field', 'scatter']);
    const POSITIONS = new Set(['centre', 'top', 'bottom', 'left', 'right', 'corner']);
    if (typeof body?.scene === 'string' && body.scene.length > 0 && body.scene.length <= 140) {
      row.scene = body.scene;
    }
    const scn = typeof body?.shapeCount === 'number' && isFinite(body.shapeCount)
      ? Math.max(0, Math.min(64, Math.round(body.shapeCount))) : null;
    if (scn != null) row.shape_count = scn;
    if (body?.pattern && PATTERNS.has(body.pattern)) row.pattern = body.pattern;
    if (Array.isArray(body?.shapes)) {
      const shapes = body.shapes
        .filter((s) => s && typeof s === 'object'
          && typeof s.bucket === 'string' && VALID.has(s.bucket)
          && typeof s.kind === 'string' && KINDS.has(s.kind)
          && typeof s.pos === 'string' && POSITIONS.has(s.pos))
        .slice(0, 8)
        .map((s) => ({ bucket: s.bucket, kind: s.kind, share: unit(s.share) ?? 0, pos: s.pos }));
      if (shapes.length) row.shapes = shapes;
    }

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
