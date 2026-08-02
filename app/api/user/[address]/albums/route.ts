// One profile's public album shelf (Brendon, 2026-08-02: albums are public).
//
// Albums live in the owner's settings envelope — this route lifts ONLY the
// `albums` key out of it with the service client, exactly the way the Vault
// route does, so a visitor can read the shelf without the rest of the envelope
// (Starred, Wishlist, Lists, History — all still private) ever going public.
//
// Albums are numbered by position, never named: the array order IS the
// identity, so the shelf is returned in its stored order and the client
// numbers it 1..n the same way the owner's own panel does.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService, type AlbumRecord } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/* Same shape-check as lib/pins/albumStore.sanitize — inlined so the server
   route never imports the client store (userState and friends). */
function sanitizeAlbums(parsed: unknown): AlbumRecord[] {
    if (!Array.isArray(parsed)) return [];
    const out: AlbumRecord[] = [];
    for (const a of parsed) {
        if (!a || typeof a !== 'object') continue;
        const r = a as Partial<AlbumRecord>;
        if (typeof r.id !== 'string') continue;
        out.push({
            id: r.id,
            name: '',
            keys: Array.isArray(r.keys)
                ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
                : [],
            created_at: typeof r.created_at === 'number' ? r.created_at : 0,
            ...(typeof r.cover === 'string' && r.cover.includes(':') ? { cover: r.cover } : {}),
        });
    }
    return out;
}

export interface UserAlbumsResponse {
    address: string;
    /** Stored order — position 1..n is each album's number. */
    albums: AlbumRecord[];
}

export async function GET(
    _req: NextRequest,
    props: { params: Promise<{ address: string }> },
): Promise<NextResponse> {
    const params = await props.params;
    const address = params.address.toLowerCase();
    if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

    try {
        const db = getSupabaseService();
        const { data, error } = await db
            .from('users')
            .select('albums:settings->albums')
            .eq('address', address)
            .maybeSingle();
        if (error) return serverError(error.message);
        const albums = sanitizeAlbums((data as { albums?: unknown } | null)?.albums);
        return NextResponse.json({ address, albums } satisfies UserAlbumsResponse);
    } catch (err) {
        return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
}
