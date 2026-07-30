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
    GROUP_SOON, GROUP_LABEL,
} from '../../lib/state/SortContext';
import { groupSectionLabel, usefulLayers } from '../../lib/state/groupDimensions';
import type { GroupKey } from '../../lib/state/SortContext';
import { buildGroupBlocks, type GBlock } from '../../lib/state/groupBlocks';
import { useStoredColors } from '../../lib/art/colorStore';
import { getProject, outputTraits } from '../../lib/project/registry';
import { facetValueOf, type EnrichedHolding } from './ProfileFacetBar';
import type { Holding } from './profilePageShared';

/* The block/header shapes moved to lib/state/groupBlocks when grouping went
   N-layer (Brendon, 2026-07-26). Re-exported so every existing importer of
   these types keeps working unchanged. */
export type { GBHead, GBlock } from '../../lib/state/groupBlocks';

export function useCollectedGallery(holdings: Holding[]) {
    const { sort, dir, group, groupLayers } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    /* Decouple the gallery grid from the trait pills (Brendon, 2026-06-18). The
       pills read the live filter state and paint their dim/active instantly;
       the heavy grid filter/sort reads a DEFERRED copy, so a pill tap no longer
       waits on the grid to recompute — the grid catches up on its own frame. */
    /* ⛔ THE CONTROL PAINTS FIRST (Brendon, 2026-07-30) — same deal for the
       sort and group taps as for the pills: they light up on the spot and the
       grid rebuilds a frame later. Only the timing changes. */
    const dSort = useDeferredValue(sort);
    const dDir = useDeferredValue(dir);
    const dGroup = useDeferredValue(group);
    const dGroupLayers = useDeferredValue(groupLayers);

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
                    mintMs: h.mint_ts != null ? h.mint_ts * 1000 : null,
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

        const dirMult = dDir === 'asc' ? 1 : -1;
        const byId = (a: EnrichedHolding, b: EnrichedHolding) =>
            a.slug === b.slug ? (a.token_id - b.token_id) * dirMult : a.slug.localeCompare(b.slug);
        if (dSort === 'price') {
            filtered.sort((a, b) => {
                const na = a.list_price_eth ? parseFloat(a.list_price_eth) : Infinity;
                const nb = b.list_price_eth ? parseFloat(b.list_price_eth) : Infinity;
                return na !== nb ? (na - nb) * dirMult : byId(a, b);
            });
        } else if (dSort === 'az') {
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
    }, [enriched, dSort, dDir, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax]);

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

    /* Grouped collected gallery (Brendon, 2026-06-16; standalone toggle
       2026-07-12). Cross-project surface dimensions: artist · project ·
       artist+project · colour (+combos) · last-sold · rarity. Titles
       reuse the home carousel-title look; spacing binds each to the group below.
       Cards still render inside a ProjectProvider so the art paints with its own
       project's context. Returns null when grouping is off / not applicable. */
    const collectedGroups = useMemo<GBlock[] | null>(() => {
        if (!dGroupLayers.length || dSort === 'feed') return null;
        const projName = (slug: string) => getProject(slug)?.displayName ?? slug;

        // Last-sold: one greyed "coming soon" title, all pieces beneath.
        if (GROUP_SOON[dGroup]) {
            return [{
                key: 'soon',
                l1Key: 'soon',
                heads: [{ level: 1, label: GROUP_LABEL[dGroup], soon: true }],
                cards: shownCollected.map((h) => ({ slug: h.slug, id: h.token_id })),
            }];
        }

        /* Every dimension — the identity ones and the deep cuts alike — now
           resolves through the one shared engine, so the builder walks whatever
           layers the user picked without caring what they are. This replaced
           four hand-written PAIR branches (Brendon, 2026-07-26). */
        const labelOf = (h: (typeof shownCollected)[number], layer: GroupKey) =>
            groupSectionLabel(layer, h.slug, h.token_id, {
                listed: h.listed,
                fate: h.traits.Fate ?? null,
                sun: h.traits.Sun ?? null,
                mintMs: h.mintMs ?? null,
                artist: h.traits.Artist ?? null,
                project: projName(h.slug),
            });
        /* Drop any layer that can't actually cut this window — a wallet holding
           one artist grouped BY artist is a title bar and nothing else. */
        const useful = usefulLayers(shownCollected, dGroupLayers, labelOf);
        if (!useful.length) return null;
        return buildGroupBlocks(shownCollected, useful, {
            labelOf,
            cardOf: (h) => ({ slug: h.slug, id: h.token_id }),
            /* A project title still carries its artist underneath. */
            byOf: (h, layer) => (layer === 'project' ? (h.traits.Artist ?? null) : null),
        });
    }, [dGroup, dGroupLayers, dSort, shownCollected, colorsVer]);

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
    /* One render per change — see the project gallery's note. */
    useEffect(() => { setCollapsedGroups((prev) => (prev.size ? new Set() : prev)); }, [groupLayers]);

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
