'use client';

/*
 * useCollectedGallery — the Collected tab's whole data pipeline: trait
 * enrichment of the wallet's holdings, facet/search/price filtering, sort,
 * the scroll-windowed progressive reveal, per-project grouping for render,
 * the grouped-gallery block builder, and the collapsible group headers.
 * Split out of ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import {
    useSort,
    GROUP_SOON, GROUP_LABEL, COLLECTED_GROUP_ORDER,
} from '../../lib/state/SortContext';
import { COLOR_BUCKET_ORDER } from '../../lib/art/outputColor';
import { resolveBucket, useStoredColors } from '../../lib/art/colorStore';
import { getProject, outputTraits } from '../../lib/project/registry';
import { facetValueOf, type EnrichedHolding } from './ProfileFacetBar';
import type { Holding } from './profilePageShared';

export type GBHead = { level: 1 | 2; label: string; by?: string | null; soon?: boolean };
export type GBlock = {
    key: string;
    /** Collapse key for the section (level-1) this block belongs to. */
    l1Key: string;
    /** Collapse key for this block's own level-2 sub-section, when it has one. */
    l2Key?: string;
    heads: GBHead[];
    group?: { slug: string; ids: number[] };
    cards?: { slug: string; id: number }[];
};

export function useCollectedGallery(holdings: Holding[]) {
    const { sort, dir, group } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    /* Decouple the gallery grid from the trait pills (Brendon, 2026-06-18). The
       pills read the live filter state and paint their dim/active instantly;
       the heavy grid filter/sort reads a DEFERRED copy, so a pill tap no longer
       waits on the grid to recompute — the grid catches up on its own frame. */
    const dActiveFilters = useDeferredValue(activeFilters);
    const dSearchQuery = useDeferredValue(searchQuery);
    const dPriceMin = useDeferredValue(priceMin);
    const dPriceMax = useDeferredValue(priceMax);

    /* Enrich each held Output with its full platform traits (Artist/Project/
       PriceDay/Natal/Fate — PriceDay + Natal need the mint timestamp) and live
       listed status. Both the facet bar and the predicate read this, so they
       can never diverge. */
    const enriched = useMemo<EnrichedHolding[]>(
        () =>
            holdings
                .filter((h) => getProject(h.slug))
                .map((h) => ({
                    slug: h.slug,
                    token_id: h.token_id,
                    list_price_eth: h.list_price_eth,
                    listed: h.list_price_eth != null,
                    traits: outputTraits(
                        h.slug,
                        h.token_id,
                        h.mint_ts != null ? h.mint_ts * 1000 : undefined,
                    ),
                })),
        [holdings],
    );

    /* Collected-tab search + filter + sort over the enriched holdings. Filters
       by the platform facets (facetValueOf), searches @artist / @project / id,
       ranges on listing price, sorts by id or price. */
    const visibleCollected = useMemo<EnrichedHolding[]>(() => {
        const minVal = parseFloat(dPriceMin);
        const maxVal = parseFloat(dPriceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = dSearchQuery.trim().toLowerCase();
        const activeCats = Object.keys(dActiveFilters).filter((c) => dActiveFilters[c].size > 0);

        const filtered = enriched.filter((h) => {
            const priceNum = h.list_price_eth ? parseFloat(h.list_price_eth) : null;
            for (const cat of activeCats) {
                const v = facetValueOf(cat, h);
                if (v === undefined || !dActiveFilters[cat].has(v)) return false;
            }
            if (q) {
                const hay = `${h.traits.Artist ?? ''} ${h.traits.Project ?? ''} #${h.token_id}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (hasMin && (priceNum == null || priceNum < minVal)) return false;
            if (hasMax && priceNum != null && priceNum > maxVal) return false;
            return true;
        });

        const dirMult = dir === 'asc' ? 1 : -1;
        const byId = (a: EnrichedHolding, b: EnrichedHolding) =>
            a.slug === b.slug ? (a.token_id - b.token_id) * dirMult : a.slug.localeCompare(b.slug);
        if (sort === 'price') {
            filtered.sort((a, b) => {
                const na = a.list_price_eth ? parseFloat(a.list_price_eth) : Infinity;
                const nb = b.list_price_eth ? parseFloat(b.list_price_eth) : Infinity;
                return na !== nb ? (na - nb) * dirMult : byId(a, b);
            });
        } else if (sort === 'az') {
            // A–Z by project name, then token id within each project.
            filtered.sort((a, b) => {
                const an = getProject(a.slug)?.displayName ?? a.slug;
                const bn = getProject(b.slug)?.displayName ?? b.slug;
                const c = an.localeCompare(bn) * dirMult;
                return c !== 0 ? c : a.token_id - b.token_id;
            });
        } else {
            filtered.sort(byId);
        }
        return filtered;
    }, [enriched, sort, dir, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax]);

    /* Progressive gallery reveal (Brendon, 2026-06-18; windowed 2026-06-24).
       Mount a first screenful so the page is instant, then grow the window ONLY
       as the viewer scrolls toward the end (a sentinel near the bottom). The old
       version grew every animation frame until the WHOLE collection was mounted
       — fine for small wallets, but a 10k–20k collection ended up with every card
       in the DOM and scrolled like glue. Now the mounted set tracks how far
       you've actually scrolled, so a giant collection browses as smoothly as a
       small one. revealCount only grows, so re-filtering renders instantly. */
    /* Solid-once-loaded (Brendon, 2026-07-06): a normal collection mounts
       WHOLE — nothing pops in on scroll (cards are native <img> tiles; the
       browser lazy-loads the pictures). The scroll window only kicks in past
       FULL_MOUNT_MAX, where a 10k–20k wallet's DOM would scroll like glue. */
    const FULL_MOUNT_MAX = 1000;
    const REVEAL_FIRST = 24;
    const REVEAL_STEP = 48;
    const [revealCount, setRevealCount] = useState(REVEAL_FIRST);
    const collectedSentinelRef = useRef<HTMLDivElement | null>(null);
    const fullMount = visibleCollected.length <= FULL_MOUNT_MAX;
    useEffect(() => {
        if (fullMount || revealCount >= visibleCollected.length) return;
        const el = collectedSentinelRef.current;
        if (!el) return;
        if (typeof IntersectionObserver === 'undefined') { setRevealCount(visibleCollected.length); return; }
        const io = new IntersectionObserver(
            (entries) => {
                if (entries.some((e) => e.isIntersecting)) {
                    setRevealCount((c) => Math.min(c + REVEAL_STEP, visibleCollected.length));
                }
            },
            { rootMargin: '1200px 0px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [fullMount, revealCount, visibleCollected.length]);
    const shownCollected = useMemo(
        () =>
            fullMount || revealCount >= visibleCollected.length
                ? visibleCollected
                : visibleCollected.slice(0, revealCount),
        [visibleCollected, revealCount, fullMount],
    );

    /* Group the filtered/sorted holdings by Project for rendering. Each group
       renders inside its own ProjectProvider so ArtworkCard paints the right
       Project's art + meta — the provider is a context-only node (no DOM), so
       all cards still land as direct children of the single #gallery grid.
       (Sort is global within each project group; cross-project ordering follows
       the group order.) */
    const collectedByProject = useMemo(() => {
        const m = new Map<string, number[]>();
        for (const h of shownCollected) {
            const arr = m.get(h.slug) ?? [];
            arr.push(h.token_id);
            m.set(h.slug, arr);
        }
        return [...m.entries()].map(([slug, ids]) => ({ slug, ids }));
    }, [shownCollected]);

    /* Stored dominant colours for every project the wallet holds (any engine);
       resolveBucket prefers them, falls back to live palette-math. */
    const heldSlugs = useMemo(() => [...new Set(enriched.map((h) => h.slug))], [enriched]);
    const colorsVer = useStoredColors(heldSlugs);

    /* Grouped collected gallery (Brendon, 2026-06-16). Grouping is the cycling
       modifier on the active grid sort. Cross-project surface dimensions:
       artist · project · artist+project · colour · last-sold · rarity. Titles
       reuse the home carousel-title look; spacing binds each to the group below.
       Cards still render inside a ProjectProvider so the art paints with its own
       project's context. Returns null when grouping is off / not applicable. */
    const collectedGroups = useMemo<GBlock[] | null>(() => {
        if (group === 'none' || sort === 'feed') return null;
        if (!COLLECTED_GROUP_ORDER.includes(group)) return null;
        const projName = (slug: string) => getProject(slug)?.displayName ?? slug;

        // Last-sold + rarity: one greyed "coming soon" title, all pieces beneath.
        if (GROUP_SOON[group]) {
            return [{
                key: 'soon',
                l1Key: 'soon',
                heads: [{ level: 1, label: GROUP_LABEL[group], soon: true }],
                cards: shownCollected.map((h) => ({ slug: h.slug, id: h.token_id })),
            }];
        }

        // Colour cuts across projects — bucket every piece, render each in its
        // own provider so the art still paints with its project's context.
        if (group === 'color') {
            const buckets = new Map<string, { slug: string; id: number }[]>();
            for (const h of shownCollected) {
                const b = resolveBucket(h.slug, h.token_id) ?? 'Other';
                const arr = buckets.get(b) ?? [];
                arr.push({ slug: h.slug, id: h.token_id });
                buckets.set(b, arr);
            }
            const order = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            return [...buckets.entries()]
                .sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]))
                .map(([label, cards]) => ({ key: `c-${label}`, l1Key: `c-${label}`, heads: [{ level: 1 as const, label }], cards }));
        }

        // artist+colour / project+colour — two-level: the identity (artist or
        // project) titles the section, colour buckets sub-title within it.
        // Colour mixes projects under an artist, so pieces render per-card (like
        // the plain colour grouping), not per-project.
        if (group === 'artistColor' || group === 'projectColor') {
            type Hold = (typeof shownCollected)[number];
            const colorOrder = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            const idOf = (h: Hold) =>
                group === 'artistColor' ? (h.traits.Artist ?? '—') : h.slug;
            const idLabel = (k: string) => (group === 'artistColor' ? k : projName(k));
            const byId = new Map<string, Hold[]>();
            const artistOf = new Map<string, string>();
            for (const h of shownCollected) {
                const k = idOf(h);
                const arr = byId.get(k) ?? [];
                arr.push(h);
                byId.set(k, arr);
                if (!artistOf.has(k)) artistOf.set(k, h.traits.Artist ?? '—');
            }
            const ids = [...byId.keys()].sort((a, b) => idLabel(a).localeCompare(idLabel(b)));
            const blocks: GBlock[] = [];
            for (const k of ids) {
                const cbuckets = new Map<string, { slug: string; id: number }[]>();
                for (const h of byId.get(k)!) {
                    const b = resolveBucket(h.slug, h.token_id) ?? 'Other';
                    const arr = cbuckets.get(b) ?? [];
                    arr.push({ slug: h.slug, id: h.token_id });
                    cbuckets.set(b, arr);
                }
                const ordered = [...cbuckets.entries()]
                    .sort((a, b) => colorOrder.indexOf(a[0]) - colorOrder.indexOf(b[0]));
                let first = true;
                for (const [clabel, cards] of ordered) {
                    const heads: GBHead[] = [];
                    if (first) {
                        heads.push(
                            group === 'projectColor'
                                ? { level: 1, label: idLabel(k), by: artistOf.get(k) ?? null }
                                : { level: 1, label: idLabel(k) },
                        );
                        first = false;
                    }
                    heads.push({ level: 2, label: clabel });
                    blocks.push({
                        key: `${k}::${clabel}`,
                        l1Key: `i:${k}`,
                        l2Key: `s:${k}::${clabel}`,
                        heads,
                        cards,
                    });
                }
            }
            return blocks;
        }

        // artist / project / artist+project respect project boundaries (one
        // provider per project), so group by slug then order/title by dimension.
        const bySlug = new Map<string, number[]>();
        const slugArtist = new Map<string, string>();
        for (const h of shownCollected) {
            const arr = bySlug.get(h.slug) ?? [];
            arr.push(h.token_id);
            bySlug.set(h.slug, arr);
            if (!slugArtist.has(h.slug)) slugArtist.set(h.slug, h.traits.Artist ?? '—');
        }
        const slugs = [...bySlug.keys()];
        if (group === 'project') {
            slugs.sort((a, b) => projName(a).localeCompare(projName(b)));
            return slugs.map((slug) => ({
                key: slug,
                l1Key: slug,
                heads: [{ level: 1 as const, label: projName(slug), by: slugArtist.get(slug) ?? null }],
                group: { slug, ids: bySlug.get(slug)! },
            }));
        }
        // artist / artistProject — order by artist then project; artist titled once.
        slugs.sort((a, b) =>
            slugArtist.get(a)!.localeCompare(slugArtist.get(b)!) || projName(a).localeCompare(projName(b)));
        let lastArtist: string | null = null;
        const blocks: GBlock[] = [];
        for (const slug of slugs) {
            const artist = slugArtist.get(slug)!;
            const heads: GBHead[] = [];
            if (artist !== lastArtist) { heads.push({ level: 1, label: artist }); lastArtist = artist; }
            if (group === 'artistProject') heads.push({ level: 2, label: projName(slug) });
            blocks.push({
                key: slug,
                l1Key: `a:${artist}`,
                ...(group === 'artistProject' ? { l2Key: `p:${slug}` } : {}),
                heads,
                group: { slug, ids: bySlug.get(slug)! },
            });
        }
        return blocks;
    }, [group, sort, shownCollected, colorsVer]);

    /* Collapsible grouping headers — tap a header (or its arrow) to fold its
       pieces away; tap again to reopen. Folding a section (level-1) hides
       everything nested under it, including its sub-headers. Keys are
       dimension-specific, so a grouping change starts fresh (effect below). */
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
    const toggleGroupCollapse = (key: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    useEffect(() => { setCollapsedGroups(new Set()); }, [group]);

    return {
        dActiveFilters, dSearchQuery, dPriceMin, dPriceMax,
        enriched,
        visibleCollected,
        shownCollected,
        revealCount,
        collectedSentinelRef,
        collectedByProject,
        collectedGroups,
        collapsedGroups,
        toggleGroupCollapse,
    };
}
