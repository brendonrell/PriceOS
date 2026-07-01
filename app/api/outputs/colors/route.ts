// Stored dominant-colour read — returns the sampled colour bucket for every
// token of the given projects that has one in `outputs.dominant_color`. Public
// (anon) read; powers gallery grouping-by-colour across engines.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const slugs = (req.nextUrl.searchParams.get('slugs') ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (slugs.length === 0) return NextResponse.json([]);

    const sb = getSupabaseAnon();
    const { data, error } = await sb
      .from('outputs')
      .select('project_id, token_id, dominant_color, aspect, brightness, saturation, complexity, accent_color, palette_count, contrast, warmth, gravity, symmetry, air, texture, scene, shape_count, pattern, rarity, artist, project_name, true_name, price_day, natal_sun, natal_moon, natal_rising, fate, minted_at')
      .in('project_id', slugs)
      .not('dominant_color', 'is', null);
    if (error) return serverError(error);

    const out = (data ?? []) as {
      project_id: string; token_id: string; dominant_color: string | null;
      aspect: string | null; brightness: number | null; saturation: number | null; complexity: number | null;
      accent_color: string | null; palette_count: number | null; contrast: number | null;
      warmth: number | null; gravity: string | null; symmetry: number | null;
      air: number | null; texture: number | null;
      scene: string | null; shape_count: number | null; pattern: string | null;
      rarity: string | null; artist: string | null; project_name: string | null; true_name: string | null;
      price_day: string | null; natal_sun: string | null; natal_moon: string | null; natal_rising: string | null;
      fate: string | null; minted_at: string | null;
    }[];
    const rows = out.map((r) => ({
      slug: r.project_id,
      id: Number(r.token_id),
      bucket: r.dominant_color,
      aspect: r.aspect,
      brightness: r.brightness,
      saturation: r.saturation,
      complexity: r.complexity,
      accent: r.accent_color,
      paletteCount: r.palette_count,
      contrast: r.contrast,
      warmth: r.warmth,
      gravity: r.gravity,
      symmetry: r.symmetry,
      air: r.air,
      texture: r.texture,
      scene: r.scene,
      shapeCount: r.shape_count,
      pattern: r.pattern,
      rarity: r.rarity,
      artist: r.artist,
      project_name: r.project_name,
      true_name: r.true_name,
      price_day: r.price_day,
      natal_sun: r.natal_sun,
      natal_moon: r.natal_moon,
      natal_rising: r.natal_rising,
      fate: r.fate,
      minted_at: r.minted_at,
    }));
    return NextResponse.json(rows);
  } catch (e) {
    return serverError(e);
  }
}
