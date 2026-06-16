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

const VALID = new Set<string>([
  'Hothurt', 'Red', 'Orange', 'Yellow', 'Green', 'Blue',
  'Purple', 'Pink', 'Brown', 'Beige', 'Grey', 'Black', 'White',
]);

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as
      | { slug?: string; id?: number | string; bucket?: string }
      | null;
    const slug = body?.slug?.trim();
    const id = body?.id;
    const bucket = body?.bucket;
    if (!slug || id == null || !bucket || !VALID.has(bucket)) {
      return badRequest('slug, id and a valid bucket are required');
    }

    const sb = getSupabaseService();
    const { error } = await sb.from('outputs').upsert(
      {
        project_id: slug,
        token_id: String(id),
        dominant_color: bucket,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: 'project_id,token_id' },
    );
    if (error) return serverError(error);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return serverError(e);
  }
}
