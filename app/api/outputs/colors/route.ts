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
      .select('project_id, token_id, dominant_color, aspect, brightness, saturation, complexity')
      .in('project_id', slugs)
      .not('dominant_color', 'is', null);
    if (error) return serverError(error);

    const out = (data ?? []) as {
      project_id: string; token_id: string; dominant_color: string | null;
      aspect: string | null; brightness: number | null; saturation: number | null; complexity: number | null;
    }[];
    const rows = out.map((r) => ({
      slug: r.project_id,
      id: Number(r.token_id),
      bucket: r.dominant_color,
      aspect: r.aspect,
      brightness: r.brightness,
      saturation: r.saturation,
      complexity: r.complexity,
    }));
    return NextResponse.json(rows);
  } catch (e) {
    return serverError(e);
  }
}
