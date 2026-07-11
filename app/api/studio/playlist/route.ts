/*
 * /api/studio/playlist — is this YouTube playlist publicly reachable?
 *
 * PD Studio's soundtrack field checks the playlist before an artist ships it
 * (Brendon, 2026-07-11: "ideally with some built-in check it's public before
 * allowing but if not that's okay"). YouTube's oEmbed endpoint answers 200
 * for public/unlisted playlists and 4xx for private/deleted ones — no API
 * key, no quota. FAIL-SOFT is the contract (matches lib/project/soundtrack):
 * a definitive 4xx answers { public: false }; any error on OUR side answers
 * { public: null } and the Studio never blocks on it.
 *
 * Cached per playlist for 10 minutes — repeated checks (typing, re-blur,
 * multiple artists sharing a list) reuse one upstream fetch.
 */

import { type NextRequest, NextResponse } from 'next/server';

const PLAYLIST_ID_RE = /^[A-Za-z0-9_-]{10,64}$/;

export async function GET(req: NextRequest) {
    const list = req.nextUrl.searchParams.get('list') ?? '';
    if (!PLAYLIST_ID_RE.test(list)) {
        return NextResponse.json({ public: false, reason: 'malformed id' }, { status: 200 });
    }
    try {
        const url = `https://www.youtube.com/oembed?url=${encodeURIComponent(
            `https://www.youtube.com/playlist?list=${list}`
        )}&format=json`;
        const r = await fetch(url, { next: { revalidate: 600 } });
        if (r.ok) {
            let title: string | null = null;
            try { title = ((await r.json()) as { title?: string }).title ?? null; } catch { /* body optional */ }
            return NextResponse.json({ public: true, title }, { status: 200 });
        }
        if (r.status >= 400 && r.status < 500) {
            return NextResponse.json({ public: false }, { status: 200 });
        }
        return NextResponse.json({ public: null }, { status: 200 });
    } catch {
        return NextResponse.json({ public: null }, { status: 200 });
    }
}
