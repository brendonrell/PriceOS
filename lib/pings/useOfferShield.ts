'use client';

/*
 * useOfferShield — the OFFER SHIELD spell's read side.
 *
 * When the spell is on, incoming offers under 50% of their collection's floor
 * are hidden from Pings (Atlas: "auto-hide feed offers under 50% of floor").
 * The offer ping carries its amount + collection but not the floor, so we fetch
 * each project's floor once (cached module-wide) and resolve the set of offer
 * pings that fall under the line.
 *
 * Fail-open by design: an offer whose floor isn't known yet (still loading, no
 * active listings, or a fetch error) is SHOWN, never hidden — the shield only
 * ever hides an offer it can PROVE is a low-ball. So this can never swallow a
 * real ping, even if the floor read fails.
 */

import { useEffect, useState } from 'react';
import type { FeedItem } from './render';

/** The line: an offer under this fraction of floor is a low-ball (spec: 50%). */
const SHIELD_RATIO = 0.5;

/** project_id → floor in ETH (null = no active listings / unknown). Module-level
 *  so the floor for a project is fetched once and shared across renders + polls. */
const FLOOR_CACHE = new Map<string, number | null>();

function offerProjectIds(items: FeedItem[]): string[] {
    const s = new Set<string>();
    for (const p of items) {
        if (p.kind === 'OFFER' && p.project_id && p.amount_eth != null) s.add(p.project_id);
    }
    return [...s];
}

/** The set of ping ids the shield hides right now (offers proven under 50% of
 *  their project's floor). Empty when the spell is off. */
export function useOfferShield(items: FeedItem[], enabled: boolean): Set<string> {
    const [hidden, setHidden] = useState<Set<string>>(() => new Set());

    useEffect(() => {
        if (!enabled) { setHidden(new Set()); return; }
        let cancelled = false;

        const recompute = () => {
            if (cancelled) return;
            const h = new Set<string>();
            for (const p of items) {
                if (p.kind !== 'OFFER' || !p.project_id || p.amount_eth == null) continue;
                const floor = FLOOR_CACHE.get(p.project_id);
                if (floor != null && floor > 0 && Number(p.amount_eth) < floor * SHIELD_RATIO) {
                    h.add(p.id);
                }
            }
            setHidden(h);
        };

        const need = offerProjectIds(items).filter((slug) => !FLOOR_CACHE.has(slug));
        if (need.length === 0) { recompute(); return () => { cancelled = true; }; }

        Promise.all(
            need.map((slug) =>
                fetch(`/api/project/${slug}/floor`, { cache: 'no-store' })
                    .then((r) => (r.ok ? r.json() : null))
                    .then((d) => { FLOOR_CACHE.set(slug, d && typeof d.floor_eth === 'number' ? d.floor_eth : null); })
                    .catch(() => { FLOOR_CACHE.set(slug, null); })
            )
        ).then(recompute);

        return () => { cancelled = true; };
    }, [items, enabled]);

    return hidden;
}
