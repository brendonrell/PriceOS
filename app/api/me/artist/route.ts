/*
 * /api/me/artist — the SIWE-auth'd caller's own artist (whitelist) status.
 *
 * Tiny self-read so client surfaces (the settings Showcase toggle) can tell
 * whether to offer the artist-only "Artist" showcase style. Mirrors the
 * server-side allowlist check the profile page runs. Identity comes from the
 * session cookie; the client never sends an address.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getArtistStatus } from '@/lib/artists/allowlist';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (_req, _ctx, address) => {
    try {
        const status = await getArtistStatus(address);
        return NextResponse.json({ status, is_artist: status !== null });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
