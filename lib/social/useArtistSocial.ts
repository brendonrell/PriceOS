'use client';

/*
 * useArtistSocial — follower count + the viewer's follow relationship for one
 * artist/collector handle. One by-handle fetch (count + address) followed by one
 * follows fetch (relation), cached per session so re-renders never refetch.
 *
 * Shared by the Starred and Wishlist row lists so both surfaces show the SAME
 * social tags beside an @name — the relationship glyph + follower count
 * (Brendon 2026-06-19).
 */

import { useEffect, useState } from 'react';

export type ArtistRel = 'mutual' | 'following' | 'follower' | 'none';

const cache = new Map<string, { count: number; rel: ArtistRel; address: string | null }>();

export function useArtistSocial(
    handle: string,
    viewerAddress?: string | null,
): { count: number | null; rel: ArtistRel; address: string | null } {
    const cacheKey = `${handle}|${(viewerAddress ?? '').toLowerCase()}`;
    const cached = cache.get(cacheKey);
    const [count, setCount] = useState<number | null>(cached?.count ?? null);
    const [rel, setRel] = useState<ArtistRel>(cached?.rel ?? 'none');
    const [address, setAddress] = useState<string | null>(cached?.address ?? null);

    useEffect(() => {
        if (cached || !handle) return;
        let cancel = false;
        (async () => {
            try {
                const u = await fetch(`/api/user/by-handle/${handle}`).then((r) => (r.ok ? r.json() : null));
                if (cancel || !u) return;
                const cnt = typeof u.follower_count === 'number' ? u.follower_count : 0;
                setCount(cnt);
                let relation: ArtistRel = 'none';
                const addr = (u.address ?? '').toLowerCase();
                setAddress(addr || null);
                const me = (viewerAddress ?? '').toLowerCase();
                if (addr && me) {
                    const f = await fetch(`/api/follows/${addr}`).then((r) => (r.ok ? r.json() : null));
                    if (!cancel && f) {
                        const followers = ((f.followers ?? []) as string[]).map((a) => a.toLowerCase());
                        const following = ((f.following ?? []) as string[]).map((a) => a.toLowerCase());
                        const iFollow = followers.includes(me);
                        const theyFollow = following.includes(me);
                        relation = iFollow && theyFollow ? 'mutual' : iFollow ? 'following' : theyFollow ? 'follower' : 'none';
                    }
                }
                if (!cancel) { setRel(relation); cache.set(cacheKey, { count: cnt, rel: relation, address: addr || null }); }
            } catch { /* leave as null/none */ }
        })();
        return () => { cancel = true; };
    }, [handle, viewerAddress, cacheKey, cached]);

    return { count, rel, address };
}

/* Social glyphs (docs/GLYPHS.md): ⚭ mutual · ⚯ following · ⚬ follower. */
export function relGlyphOf(rel: ArtistRel): string {
    return rel === 'mutual' ? '⚭︎' : rel === 'following' ? '⚯︎' : rel === 'follower' ? '⚬︎' : '';
}
export function relLabelOf(rel: ArtistRel): string {
    return rel === 'mutual' ? 'Mutual' : rel === 'following' ? 'Following' : rel === 'follower' ? 'Follows you' : '';
}
/** Compact follower count: 2.2k, 10k (max one decimal, drop a trailing .0). */
export function fmtFollowers(count: number): string {
    return count >= 1000 ? `${(count / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(count);
}
