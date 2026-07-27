/*
 * /api/studio/playlist — will this soundtrack actually PLAY in the PD
 * miniplayer?
 *
 * v1 only asked YouTube's oEmbed "is this public?" — which passed the exact
 * links that can never play (the 2026-07-27 soundtracks postmortem):
 *   - OLAK/RD auto-generated official-album + mix playlists: public, but
 *     YouTube blocks their tracks inside embedded players, always.
 *   - Rotted fan playlists: public, but every video inside was taken down.
 * v2 runs the same health check the fleet audit used, at paste time:
 *   playlist page → how many videos actually remain playable, then the
 *   first track's watch-page oEmbed (404/401 there = deleted/embed-blocked,
 *   which is exactly what the player's iframe will hit).
 *
 * The verdict is best-effort by nature — a link can rot AFTER it's saved
 * (takedowns); this gate only stops links that are broken TODAY.
 *
 * FAIL-SOFT is still the contract: a definitive bad link answers
 * { public: false, reason }; any failure on OUR side answers
 * { public: null } and the Studio never blocks on it.
 * Cached per id for 10 minutes.
 */

import { type NextRequest, NextResponse } from 'next/server';

const ID_RE = /^[A-Za-z0-9_-]{10,64}$/;
/* Same split the player makes (FmBar): these prefixes tune as playlists,
   anything else loads as a single full-album video. */
const PLAYLIST_PREFIX_RE = /^(PL|OLAK|RD|UU|FL|LL)/;
/* Auto-generated official album (OLAK) + mix (RD) playlists never play in
   an embedded player — a hard no before any fetch. */
const NEVER_EMBEDS_RE = /^(OLAK|RD)/;

const YT_HEADERS = {
    Cookie: 'SOCS=CAI; CONSENT=YES+1',
    'Accept-Language': 'en',
};

async function videoPlayable(videoId: string): Promise<boolean | null> {
    try {
        const r = await fetch(
            `https://www.youtube.com/oembed?url=${encodeURIComponent(
                `https://www.youtube.com/watch?v=${videoId}`
            )}&format=json`,
            { next: { revalidate: 600 } }
        );
        if (r.ok) return true;
        if (r.status >= 400 && r.status < 500) return false;
        return null;
    } catch {
        return null;
    }
}

export async function GET(req: NextRequest) {
    const list = req.nextUrl.searchParams.get('list') ?? '';
    if (!ID_RE.test(list)) {
        return NextResponse.json({ public: false, reason: 'malformed id' }, { status: 200 });
    }

    // Single full-album video id — one oEmbed answers it.
    if (!PLAYLIST_PREFIX_RE.test(list)) {
        const ok = await videoPlayable(list);
        return NextResponse.json(
            ok === null
                ? { public: null }
                : ok
                    ? { public: true }
                    : { public: false, reason: 'video is deleted, private, or blocks embedding' },
            { status: 200 }
        );
    }

    if (NEVER_EMBEDS_RE.test(list)) {
        return NextResponse.json(
            {
                public: false,
                reason: 'official-album / mix playlists never play in embedded players — use a regular playlist',
            },
            { status: 200 }
        );
    }

    try {
        const r = await fetch(`https://www.youtube.com/playlist?list=${list}`, {
            headers: YT_HEADERS,
            next: { revalidate: 600 },
        });
        if (!r.ok) {
            if (r.status >= 400 && r.status < 500) {
                return NextResponse.json({ public: false, reason: 'playlist not found' }, { status: 200 });
            }
            return NextResponse.json({ public: null }, { status: 200 });
        }
        const html = await r.text();
        const dataMatch = html.match(/var ytInitialData = (\{[\s\S]*?\});<\/script>/);
        if (!dataMatch) return NextResponse.json({ public: null }, { status: 200 });
        const data = dataMatch[1];

        const alerts = [...data.matchAll(/"alert(?:WithButton)?Renderer":\{[^{]*?"simpleText":"([^"]{0,160})"/g)]
            .map((m) => m[1].toLowerCase());
        if (alerts.some((a) => a.includes('does not exist') || a.includes('private') || a.includes('not available'))) {
            return NextResponse.json({ public: false, reason: 'playlist is private or deleted' }, { status: 200 });
        }

        // Distinct rendered video ids = the entries still playable (hidden
        // unavailable rows don't render). Covers both YT page generations.
        const seen: string[] = [];
        for (const m of data.matchAll(/"videoId":"([\w-]{11})"/g)) {
            if (!seen.includes(m[1])) seen.push(m[1]);
        }
        if (seen.length === 0) {
            return NextResponse.json(
                { public: false, reason: 'every video in this playlist has been removed' },
                { status: 200 }
            );
        }

        // The first track is what the player meets — its watch oEmbed failing
        // means deleted or embed-blocked.
        const first = await videoPlayable(seen[0]);
        if (first === false) {
            return NextResponse.json(
                { public: false, reason: 'the playlist opens on a video that will not play embedded' },
                { status: 200 }
            );
        }

        let title: string | null = null;
        const tm = html.match(/<title>([^<]*)<\/title>/);
        if (tm) title = tm[1].replace(' - YouTube', '').trim() || null;

        const um = html.match(/([\d,]+) unavailable videos? (?:are|is) hidden/);
        const unavailable = um ? parseInt(um[1].replace(/,/g, ''), 10) : 0;

        return NextResponse.json(
            { public: true, title, playable: seen.length, unavailable },
            { status: 200 }
        );
    } catch {
        return NextResponse.json({ public: null }, { status: 200 });
    }
}
