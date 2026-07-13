/*
 * PATCH /api/studio/soundtrack — the artist edits their live Project's
 * soundtrack (studio-phase2 work order #3, spec locked decision #7:
 * soundtrack is the mutable off-chain surround, and writes gate on the
 * PROJECT'S ARTIST WALLET — the SIWE session address must equal
 * projects.artist_address; at chain cutover the same gate reads the
 * contract's artist).
 *
 * Stores the bare YouTube playlist id (the DB shape), normalised fail-soft
 * from whatever the artist pastes.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { normalizePlaylistId } from '@/lib/project/soundtrack';
import { getProject } from '@/lib/project/registry';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const PATCH = requireAuth(async (req, _ctx, address) => {
  let slug = '';
  let playlist = '';
  try {
    const body = (await req.json()) as { slug?: string; playlist?: string };
    slug = String(body.slug ?? '').toLowerCase();
    playlist = String(body.playlist ?? '');
  } catch {
    return badRequest('Bad body');
  }
  if (!slug || !getProject(slug)) return badRequest('Unknown project');
  const playlistId = normalizePlaylistId(playlist);
  if (!playlistId) return badRequest('That does not read as a YouTube playlist');

  try {
    const db = getSupabaseService();
    const { data } = await db
      .from('projects')
      .select('artist_address')
      .eq('id', slug)
      .maybeSingle();
    const artist = (data as { artist_address?: string | null } | null)?.artist_address ?? null;
    if (!artist || artist.toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Only the Project’s artist can edit its soundtrack' }, { status: 403 });
    }
    const up = await db
      .from('projects')
      .update({ soundtrack: playlistId } as never)
      .eq('id', slug);
    if (up.error) return serverError(up.error.message);
    return NextResponse.json({ ok: true, playlist_id: playlistId });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
