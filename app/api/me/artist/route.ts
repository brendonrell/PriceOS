/*
 * /api/me/artist — the SIWE-auth'd caller's own artist (whitelist) status.
 *
 * Tiny self-read so client surfaces (the settings Showcase toggle) can tell
 * whether to offer the artist-only "Artist" showcase style. The Artist style is
 * gated on BOTH being whitelisted AND having released ≥1 project (Brendon
 * 2026-06-20), so we also report `has_project`. Identity comes from the session
 * cookie; the client never sends an address.
 */

import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/siwe';
import { getArtistStatus } from '@/lib/artists/allowlist';
import { getSupabaseService } from '@/lib/supabase';
import { projectsByArtist } from '@/lib/project/registry';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export const GET = requireAuth(async (_req, _ctx, address) => {
    try {
        const status = await getArtistStatus(address);
        const isArtist = status !== null;

        let hasProject = false;
        if (isArtist) {
            const supabase = getSupabaseService();
            const { data } = await supabase
                .from('users')
                .select('handle')
                .eq('address', address)
                .maybeSingle();
            const handle = (data as { handle: string | null } | null)?.handle ?? null;
            if (handle) hasProject = projectsByArtist(handle).length > 0;
        }

        return NextResponse.json({ status, is_artist: isArtist, has_project: hasProject });
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
});
