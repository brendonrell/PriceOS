'use client';

/*
 * starredPriceStore — listing prices for STARRED outputs, loaded at the list
 * level so the Starred list can sort by $PRICE (Brendon 2026-06-19).
 *
 * A starred Output is just {slug, id}; its live listing price lives in the DB
 * (every piece is unlisted until the overlay lands). The Starred list isn't
 * inside a ProjectProvider when it sorts, so we fetch each starred project's
 * outputs feed (the same /api/project/[slug]/outputs the gallery reconcile
 * uses) once, cache price-by-`slug:id`, and bump a version so the sort memo
 * recomputes when prices arrive. Mirrors colorStore's shape.
 */

import { useEffect, useReducer } from 'react';

const cache = new Map<string, number | null>(); // `${slug}:${id}` -> price ETH (null = unlisted)
/* The SAME response already carries per-token ownership, so we keep it here
   rather than firing a second round of requests — it's what tells a list row
   whether the viewer owns the piece (Brendon, 2026-07-25). */
const owners = new Map<string, string>(); // `${slug}:${id}` -> owner address (lowercased)
const loadedSlugs = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
function bump() { version += 1; listeners.forEach((l) => l()); }

/** Listing price (ETH) for a starred output, or null if unlisted / not loaded. */
export function priceOf(slug: string, id: number): number | null {
    return cache.get(`${slug}:${id}`) ?? null;
}

/** Owner address (lowercased) for a starred output, or null if not loaded. */
export function ownerOf(slug: string, id: number): string | null {
    return owners.get(`${slug}:${id}`) ?? null;
}

/** Does `address` hold this output? False while the feed is still loading. */
export function isHeldBy(slug: string, id: number, address?: string | null): boolean {
    if (!address) return false;
    const o = owners.get(`${slug}:${id}`);
    return !!o && o === address.toLowerCase();
}

async function loadPrices(slugs: string[]): Promise<void> {
    const fresh = slugs.filter((s) => s && !loadedSlugs.has(s));
    if (fresh.length === 0) return;
    fresh.forEach((s) => loadedSlugs.add(s));
    await Promise.all(
        fresh.map(async (slug) => {
            try {
                const res = await fetch(`/api/project/${slug}/outputs`, { cache: 'no-store' });
                if (!res.ok) return;
                const data = (await res.json()) as { outputs?: { token_id: number; owner?: string | null; list_price_eth: string | null }[] };
                for (const o of data.outputs ?? []) {
                    const p = o.list_price_eth != null ? Number(o.list_price_eth) : null;
                    cache.set(`${slug}:${o.token_id}`, Number.isFinite(p as number) ? (p as number) : null);
                    if (typeof o.owner === 'string' && o.owner) owners.set(`${slug}:${o.token_id}`, o.owner.toLowerCase());
                }
            } catch { /* ignore */ }
        }),
    );
    bump();
}

/** Load listing prices for the given starred-output slugs; re-render the caller
    when they land. Returns a version to drop into a sort memo's deps. */
export function useStarredPrices(slugs: string[]): number {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        return () => { listeners.delete(force); };
    }, []);
    const key = slugs.join(',');
    useEffect(() => {
        if (slugs.length) void loadPrices(slugs);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return version;
}
