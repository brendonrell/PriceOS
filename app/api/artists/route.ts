import { NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import { getAllowlistedArtists } from '@/lib/artists/allowlist';

export const dynamic = 'force-dynamic';

/**
 * GET /api/artists — the live artist roster for client surfaces.
 *
 * Same source the /artists page renders server-side (`getAllowlistedArtists`:
 * `artist_allowlist` rows + real ☼/☽ cooldown state off `projects`), exposed
 * for the connect-menu Artists A–Z list — which previously drew its roster
 * and statuses from the pre-rolled `lib/data/mockArtists` table. Anon,
 * RLS-bound, handle-sorted upstream.
 */
export interface ArtistsRosterRow {
  /** Display name: '@handle', or the short 0x1234…abcd form pre-claim. */
  name: string;
  /** Claimed @name without the '@', null pre-claim — profile path is
      `/${handle ?? address}`, same as the /artists page rows. */
  handle: string | null;
  address: string;
  status: 'active' | 'cooldown';
}

export interface ArtistsRosterResponse {
  artists: ArtistsRosterRow[];
}

export async function GET(): Promise<NextResponse> {
  try {
    const artists = await getAllowlistedArtists();
    const rows: ArtistsRosterRow[] = artists.map((a) => ({
      name: '@' + (a.handle ?? `${a.address.slice(0, 6)}…${a.address.slice(-4)}`),
      handle: a.handle,
      address: a.address,
      status: a.status,
    }));
    const response: ArtistsRosterResponse = { artists: rows };
    return NextResponse.json(response);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'artists roster failed');
  }
}
