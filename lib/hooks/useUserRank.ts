'use client';

/*
 * useUserRank — a @handle's PriceRank tier (0 = unranked), derived from their
 * live PriceScore off /api/user/by-handle/{handle}.
 *
 * Powers the FULL ASCII-ID (sprite · rank badge · @name — the connect-menu
 * identity, Brendon 2026-07-27) on the modal surfaces that show a person.
 * Module-wide cache, same shape as useSpriteFace: one fetch per handle per
 * session, shared by every badge on the page.
 */

import { useEffect, useState } from 'react';
import { scoreToRank } from '../achievements/tiers';

const cache = new Map<string, number | null>();
const pending = new Map<string, Promise<number | null>>();

function rankFor(handle: string): Promise<number | null> {
    const h = handle.toLowerCase().replace(/^@/, '');
    if (cache.has(h)) return Promise.resolve(cache.get(h) ?? null);
    let p = pending.get(h);
    if (!p) {
        p = fetch(`/api/user/by-handle/${h}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((u: { price_score?: unknown } | null) => {
                const rank = typeof u?.price_score === 'number' ? scoreToRank(u.price_score) : null;
                cache.set(h, rank);
                pending.delete(h);
                return rank;
            })
            .catch(() => {
                cache.set(h, null);
                pending.delete(h);
                return null;
            });
        pending.set(h, p);
    }
    return p;
}

/** The rank tier for a handle — null while loading / for unknown users. */
export function useUserRank(handle: string | null | undefined, enabled = true): number | null {
    const h = (handle ?? '').toLowerCase().replace(/^@/, '');
    const [rank, setRank] = useState<number | null>(() => (h && cache.has(h) ? cache.get(h) ?? null : null));
    useEffect(() => {
        if (!h || !enabled) return;
        let alive = true;
        void rankFor(h).then((r) => { if (alive) setRank(r); });
        return () => { alive = false; };
    }, [h, enabled]);
    return h && enabled ? rank : null;
}

/** The connect-menu badge glyph for a rank tier — ⓿ then ❶…❿. */
export function rankBadgeGlyph(rank: number): string {
    return rank <= 0 ? '⓿' : String.fromCodePoint(0x2775 + Math.min(rank, 10));
}
