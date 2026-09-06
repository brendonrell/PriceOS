'use client';

/*
 * useProjectFloors — a small per-project floor cache, lifted straight out of
 * useOfferShield's proven pattern (lib/pings/useOfferShield.ts) so the new
 * vs.-Floor grouping (Brendon, 2026-09-06) doesn't re-derive it. Fetches
 * each project's floor ONCE (cached module-wide across every hook instance,
 * every surface) via the same /api/project/[slug]/floor route the Offer
 * Shield already reads.
 *
 * Fail-open, same as the Shield: a project whose floor isn't known yet
 * (still loading, no active listings, or a fetch error) resolves to null —
 * the vs.-Floor grouping treats that as its own honest "Unknown" bucket,
 * never a guessed number.
 */

import { useEffect, useState } from 'react';

/** slug → floor in ETH (null = no active listings / unknown). Module-level
 *  so a project's floor is fetched once and shared across every caller —
 *  the SAME cache useOfferShield would build if it ran first. */
const FLOOR_CACHE = new Map<string, number | null>();

/** Live floor per slug for whichever project slugs the caller currently
 *  cares about. Returns a fresh Map each time any of `slugs` resolves — read
 *  it, don't hold a stale reference across renders. */
export function useProjectFloors(slugs: readonly string[]): ReadonlyMap<string, number | null> {
    const key = slugs.join(',');
    const [, bump] = useState(0);

    useEffect(() => {
        const need = slugs.filter((s) => s && !FLOOR_CACHE.has(s));
        if (need.length === 0) return;
        let cancelled = false;
        Promise.all(
            need.map((slug) =>
                fetch(`/api/project/${slug}/floor`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => { FLOOR_CACHE.set(slug, d && typeof d.floor_eth === 'number' ? d.floor_eth : null); })
                    .catch(() => { FLOOR_CACHE.set(slug, null); })
            )
        ).then(() => { if (!cancelled) bump((n) => n + 1); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);

    const out = new Map<string, number | null>();
    for (const s of slugs) out.set(s, FLOOR_CACHE.get(s) ?? null);
    return out;
}
