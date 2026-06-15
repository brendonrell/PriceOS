'use client';

/*
 * TraitsUI
 *
 * Renders the three sibling blocks that sit between the .profile-tabs-row
 * (Project Showcase / Artworks / + More) and the gallery section (sim 5168-5189):
 *
 *   1. .traits-ui            — header bar of filter pills
 *      └ .traits-header-bar  — flex-wrap row, dynamic pill content
 *        ├ #traitCategories   — L1 pills (Layer / Mineral / Fate / Network …)
 *        └ #traitSubCategories — L2 value pills, visible only when an L1
 *          category with a value pool is active (sim 8617-8618)
 *   2. .sort-bar             — colorway pills + #ID / $PRICE / FEED sort tabs
 *   3. .search-row           — text search + min/max ETH price-range + ✕
 *
 * In sim these are populated by JS (renderTraitUI sim ~8463 + renderSortUI
 * sim ~8417). This port renders them statically for the PD-persona /
 * non-feed default state — every pill that JS injects is rendered once
 * here, with onClick handlers wired into TraitsContext.
 *
 * Build 14 (current): L2 sub-pills land. Sim splits filtering across L2
 * (sub-categories like Network → Followers/Following/Mutuals) and L3
 * (the actual values). Per Brendon's brief, this port collapses sim's L3
 * value pool into the L2 row directly — clicking an L2 pill toggles a
 * value into `activeFilters[activeCategory]` rather than swapping the
 * sub-category. Visual styling stays as `.pill-l2`. The L1 pill picks up
 * a numeric `.badge` whenever its Set is non-empty (sim 8488).
 *
 * Value pools are hard-coded here as VALUE_POOLS. Sim sources them from
 * `traitData` / `GodModeDict`; for v0 we just bake in the STRATA pools
 * called out at sim 7693 (LAYERS = Crust/Mantle/Bedrock/…, MINERALS =
 * Quartz/Schist/Slate/…). Fate / Network / Breadcrumb get empty pools so
 * the L2 row stays hidden when one of those categories is active —
 * matching sim 8618's `display = l2Html ? 'flex' : 'none'`. Real value
 * sources land when the gallery wiring goes in.
 *
 * UI-only build (Build 14 scope): the gallery is unchanged. Pills track
 * active state via TraitsContext but no actual filter predicate runs
 * against the gallery yet.
 *
 * The "Search Filter ON" floating chip is a port-only addition. Sim
 * fires that exact phrase as a toast in toggleSearch() at sim 8861,
 * but never as a persistent UI chip. It's been added per Brendon's
 * Build 13 brief so future gallery wiring has a visible "filter is
 * active" surface — the chip toggles purely on `hasActiveFilter` from
 * context, so removing it is a one-line change once a sim spec lands.
 *
 * Sub-components (BarPill, SortBtn, etc.) live inline below — splitting
 * to separate files would just add repo files for ~20-line helpers.
 */

import React, { type CSSProperties, type ReactNode } from 'react';
import { useMemo } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useTraits, type TraitCategory, type FeedCategory } from '../../lib/state/TraitsContext';
import { useSort, type SortKey, type SortDir, type FeedKind, type GroupKey } from '../../lib/state/SortContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { usePersona } from '../../lib/state/PersonaContext';
import { useCart } from '../../lib/state/CartContext';
import { useAuth } from '../../lib/state/AuthContext';
import { outputFate, FATE_VALUES } from '../../lib/project/fate';
import { useProject } from '../../lib/state/ProjectContext';
import { fullTraitSchema, outputTraits } from '../../lib/project/registry';
import { getGrails, subscribeGrails, MAX_GRAIL_PINS, type GrailPin } from '../../lib/pins/grailStore';
import { isStarred, toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist } from '../../lib/pins/wishlistStore';
import AlbumPickerCard from '../album/AlbumPickerCard';
import {
    getPresets,
    getLoadedIndex,
    savePreset,
    deletePreset,
    setLoadedIndex,
    subscribePresets,
    type PresetEntry,
} from '../../lib/pins/presetStore';

/* ── Sort toast helpers ──────────────────────────────────────────────────
   Mirror sim 8360's sortLabels + currentSort pattern. We compute the
   NEXT sort key before calling cycleSort (React state is async, so we
   can't read sort/dir/feedKind after the call). Pure function — no side
   effects. */
const SORT_LABELS: Record<string, string> = {
    'id-asc':          'ID Ascending',
    'id-desc':         'ID Descending',
    'price-asc':       'Price Ascending',
    'price-desc':      'Price Descending',
    'feed-time-desc':  'Feed: Latest',
    'feed-time-asc':   'Feed: Earliest',
    'feed-price-desc': 'Feed: Highest',
    'feed-price-asc':  'Feed: Lowest',
    'fog':             'Fog — tap to reveal',
};

function computeNextSortKey(
    target: SortKey,
    sort: SortKey,
    dir: SortDir,
    feedKind: FeedKind,
): string {
    if (target === 'fog') return sort === 'fog' ? 'id-asc' : 'fog';
    if (target === 'feed') {
        if (sort !== 'feed') return 'feed-time-desc';
        if (feedKind === 'time' && dir === 'desc') return 'feed-time-asc';
        if (feedKind === 'time' && dir === 'asc')  return 'feed-price-desc';
        if (feedKind === 'price' && dir === 'desc') return 'feed-price-asc';
        return 'feed-time-desc'; // price-asc wraps
    }
    // id or price
    if (sort === target) return `${target}-${dir === 'asc' ? 'desc' : 'asc'}`;
    return `${target}-asc`;
}

/* Colorway names for the sort-bar view-mode pills (mirrors ColorwayPicker.tsx). */
const SORT_BAR_THEME_NAMES: Record<string, string> = {
    artist:  'Artist Custom',
    light:   'Light Mode',
    dark:    'Dark Mode',
    orange:  'Orange Mode',
};

/* PD-persona dynamic trait categories (sim ~8517 — Network/Fate/Breadcrumb
   are pinned separately so they're excluded here). Display labels follow
   sim's STRATA-rebrand mapping at sim 8524 (Gateway → Layer, Spectrum →
   Mineral). For v0 we hard-code the two sim renders today. */
/* L1 trait pills are derived from the active Project schema at render time
   (see dynamicTraitPills) — no longer hardcoded here. */

/* Chat H item 3 — feed-mode L1 pill row (sim 8475-8509). Four cats:
   Event, My Network (key 'Network'), Traits, Market. Sim 8495-8497
   maps Network → 'My Network' and Gateway/Spectrum → Layer/Mineral
   for display; the four feed-mode L1 keys themselves are stable. */
const FEED_TRAIT_PILLS: { key: FeedCategory; label: string }[] = [
    { key: 'Event',   label: 'Event'      },
    { key: 'Network', label: 'My Network' },
    { key: 'Traits',  label: 'Traits'     },
    { key: 'Market',  label: 'Market'     },
];

/* ─── Sim trait pools ──────────────────────────────────────────────────
   Sim 6955-6956 — STRATA pools (display labels Layer / Mineral; internal
   keys Gateway / Spectrum kept for back-compat per sim 6961-6967).
   Sim 7999  — Fate (iChing Omens), 8 destinies derived from token id.
   Sim 7392  — Network L2 sub-buckets (My Circle / Global) and their leaf
              names. */
const LAYERS:   readonly string[] = ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'];
const MINERALS: readonly string[] = ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'];
const OMEN_TRAITS: readonly string[] = [
    'SOVEREIGN', 'ABUNDANT', 'FORTUNE', 'ASCENDANT',
    'BALANCED',  'SHADOW',   'TRIBULATION', 'VOID',
];

/* L2 sub-bucket → L3 leaf names mapping. Sim's GodModeDict (sim 7390-7395)
   collapsed into one table, keyed by L1 category — both non-feed and
   feed-mode L1s. Empty entries for L1s that surface their L3 directly
   (Layer / Mineral / Fate — no sub-bucketing in sim either). Breadcrumb
   carries Hot / Breadcrumbs labels but no concrete L3 leaves yet
   (sim's L3 = recently-seen token IDs, dynamic per session — wires in
   when breadcrumb-data lands).

   Chat H item 4: replaces the prior `L2_SUB_LABELS` (which fed the SubPill
   row as filter-value toggles). The new model — per Brendon's chat-H
   prompt — is sim-faithful: L2 narrows L3 visibility via setSubFilter,
   L3 toggles values via toggleFilter. */
const L2_DICT: Record<
    TraitCategory | 'Traits',
    Record<string, readonly string[]>
> = {
    /* Layer / Mineral subtraits (PD subtrait feature — derived grouping,
       same pattern as collection.html's paletteSubCats Main/Special: the
       L3 value's bucket membership IS its subtrait, no per-token data).
       Layer → Surface / Deep by geological depth; Mineral → Crystalline /
       Foliated by structure. Every LAYERS / MINERALS leaf appears in
       exactly one bucket so 'All' concat reproduces the flat pool. */
    Layer: {
        'Surface': ['Crust', 'Sediment', 'Drift'],
        'Deep':    ['Mantle', 'Bedrock', 'Vein'],
    },
    Mineral: {
        'Crystalline': ['Quartz', 'Pyrite', 'Onyx'],
        'Foliated':    ['Schist', 'Slate', 'Mica'],
    },
    /* Fate stays flat — no subtrait. */
    Fate:       {},

    /* Non-feed L1s that DO sub-bucket. For Network, sim renders L2 narrows
       in BOTH feed and non-feed modes (sim 8588 — `(isFeed && active) ||
       (!isFeed && activeCategory === 'Network')`). */
    Network: {
        'My Circle': ['Me', '⚭ Mutuals', '⚯ Following', '⚬ Followers'],
        'Global':    ['Top Holders', 'New Wallets'],
    },
    Breadcrumb: {
        /* Sim's L3 = session-random token IDs; for v0 the L2 narrows are
           rendered but L3 stays empty until breadcrumb-data wires in.
           Empty arrays here mean L3 row shows nothing — L1 active +
           L2 narrowing visible without spurious leaves. */
        "What's Hot":     [],
        'My Breadcrumbs': [],
    },

    /* Feed-mode-only L1 cats (sim 7390-7395 GodModeDict). */
    Event: {
        'Sales':  ['✶ Mints', '✹ Lists'],
        'Offers': ['✦ Item Offers', '✦ Coll. Offers'],
        'Other':  ['✸ Xfers'],
    },
    Market: {
        'Primary':   ['Native'],
        'Secondary': ['Blur', 'OpenSea', 'OTC', 'Magic Eden'],
    },
    /* Traits (feed-mode wrapper L1) — sub-buckets gate which trait pool
       renders in L3. activeSubFilter='Gateway' → LAYERS routed to
       activeFilters['Layer']; activeSubFilter='Spectrum' → MINERALS
       routed to activeFilters['Mineral'] (sim 8627-8635). Display labels
       follow sim 8524 (Layer / Mineral). */
    Traits: {
        'Gateway':  LAYERS,
        'Spectrum': MINERALS,
    },
};

/* Flat L3 pool for non-feed L1s without L2 sub-bucketing. */
const L3_FLAT_POOL: Partial<Record<TraitCategory, readonly string[]>> = {
    Layer:   LAYERS,
    Mineral: MINERALS,
    Fate:    OMEN_TRAITS,
};

/* Colorways shown as the four-square cluster on the left of the sort-bar
   (sim 8443-8446). ColorwayContext has more keys, but only these four
   render in the sim. */
const THEME_PILLS: {
    key: ColorwayKey;
    cls: string;
    glyph: string;
    title: string;
}[] = [
    { key: 'custom', cls: 't-custom', glyph: '◩\uFE0E', title: 'Custom Color' },
    { key: 'light',  cls: 't-light',  glyph: '◻\uFE0E', title: 'Light' },
    { key: 'dark',   cls: 't-dark',   glyph: '◼\uFE0E', title: 'Dark' },
    { key: 'orange', cls: 't-orange', glyph: '▨\uFE0E', title: 'Orange' },
];

/* Profile Page v0 — when ProfilePageBody mounts TraitsUI on the
   `+ More` tab, the L1 trait pill cluster is swapped to profile-mode
   pills (Starred / Wishlists / Albums). The sort surfaces (sort-icons
   cluster + sort-btn-group #ID/$PRICE/FEED) are hidden via the sibling
   `hideSortBar` prop. The view-mode switcher (.colorway-pills, four
   squares) stays visible. Pill selection is visual-only for v0 — no
   gallery filter wiring behind it. */
export interface ProfilePill {
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

interface TraitsUIProps {
    /* Whether the block should render at all. Sim hides .traits-ui +
       .sort-bar when the active tab is Project Showcase or Albums (sim 13150).
       The page passes `onArtworksTab` here. */
    visible: boolean;
    /* Profile Page v0 — hides ONLY the sort surfaces:
         (1) sort-icons cluster (Recent + burn + multi + search) at the
             top-right of #traitCategories
         (2) .sort-btn-group (#ID / $PRICE / FEED) inside .sort-bar
       Keeps visible: L1 trait pills (or profilePills if provided),
       L2 sub-trait pills, .colorway-pills (four-square view-mode switcher
       at bottom-left of .sort-bar), themed background. Project page
       passes nothing (defaults to false) and gets the full surface. */
    hideSortBar?: boolean;
    /* Profile Page v0 — when provided, replaces the entire non-feed
       L1 trait pill cluster (DYNAMIC_TRAIT_PILLS + Fate + My Network +
       My Notes + the Recent+icons wrapper) with this row. L2/L3 don't
       render because there's no underlying TraitCategory activeCategory
       in profile mode. Project page passes nothing and gets the
       project trait pills. */
    profilePills?: ProfilePill[];
}

export default function TraitsUI({
    visible,
    hideSortBar = false,
    profilePills,
}: TraitsUIProps) {
    const {
        activeCategory,
        setActiveCategory,
        clearActiveCategory,
        activeFeedCategory,
        setActiveFeedCategory,
        clearActiveFeedCategory,
        activeSubFilter,
        setSubFilter,
        activeFilters,
        toggleFilter,
        myNotesActive,
        toggleMyNotes,
        presetRowActive,
        togglePresetRow,
        applyPreset,
        multiSelectActive,
        toggleMultiSelect,
        searchActive,
        toggleSearch,
        closeSearch,
        searchQuery,
        setSearchQuery,
        priceMin,
        setPriceMin,
        priceMax,
        setPriceMax,
        hasActiveFilter,
    } = useTraits();
    const { showToast } = useToast();
    const { isAuthenticated } = useAuth();
    const { sort, dir, feedKind, cycleSort, setSort, applySort, group, cycleGroup } = useSort();
    const { colorway, setColorway } = useColorway();
    const { persona } = usePersona();

    /* Trait pills are driven by the ACTIVE Project's schema (registry), not
       hardcoded to any one Project's trait names (the old hardcoding was to
       KIKI, PD's genesis project). Fate is pinned separately (icon pill),
       so it's excluded from the dynamic L1 row. The fixed network/feed/market
       specials come from L2_DICT; the feed-mode 'Traits' wrapper is rebuilt
       from the Project's trait names. */
    const { slug: projectSlug, totalOutputs } = useProject();
    const projectTraits = useMemo(
        () => fullTraitSchema(projectSlug).traits,
        [projectSlug],
    );
    const dynamicTraitPills = useMemo(
        () => projectTraits.filter((t) => t.name !== 'Fate').map((t) => ({ key: t.name, label: t.name })),
        [projectTraits],
    );
    const traitNames = useMemo(
        () => projectTraits.filter((t) => t.name !== 'Fate').map((t) => t.name),
        [projectTraits],
    );
    const L2_DICT_DYN = useMemo(() => {
        const m: Record<string, Record<string, readonly string[]>> = { ...L2_DICT };
        for (const t of projectTraits) {
            if (t.subtraits && t.subtraits.length) {
                m[t.name] = Object.fromEntries(
                    t.subtraits.map((s) => [s.name, s.values] as [string, readonly string[]]),
                );
            }
        }
        m['Traits'] = Object.fromEntries(
            projectTraits
                .filter((t) => t.name !== 'Fate')
                .map((t) => [t.name, t.values] as [string, readonly string[]]),
        );
        return m;
    }, [projectTraits]);
    /* Fate pills are REAL (Brendon 2026-06-11): only the fates that exist
       in the MINTED set render as leaves — deterministic outputFate over
       1..mintedCount, in canonical FATE_VALUES order. Nothing minted →
       no fate leaves. This replaces the sim's static 8-omen placeholder. */
    const mintedFates = useMemo(() => {
        const present = new Set<string>();
        for (let id = 1; id <= totalOutputs; id++) present.add(outputFate(projectSlug, id));
        return FATE_VALUES.filter((v) => present.has(v));
    }, [projectSlug, totalOutputs]);
    /* REAL per-value grid counts (Brendon 2026-06-12 — the pills were a
       hardcoded 22). Tally every minted Output's traits exactly as the grid
       derives them (same deterministic source), so a value pill shows how
       many of THAT value are actually in the grid. Keyed trait → value →
       count; categories with no token-trait representation (the feed
       specials) simply aren't here and fall back below. */
    const gridCounts = useMemo(() => {
        const m: Record<string, Record<string, number>> = {};
        for (let id = 1; id <= totalOutputs; id++) {
            const traits = outputTraits(projectSlug, id);
            for (const cat in traits) {
                const val = traits[cat];
                (m[cat] ??= {})[val] = (m[cat][val] ?? 0) + 1;
            }
        }
        return m;
    }, [projectSlug, totalOutputs]);
    const L3_FLAT_POOL_DYN = useMemo(() => {
        const m: Record<string, readonly string[]> = {
            ...(L3_FLAT_POOL as Record<string, readonly string[]>),
        };
        for (const t of projectTraits) {
            if (!(t.subtraits && t.subtraits.length)) m[t.name] = t.values;
        }
        m['Fate'] = mintedFates;
        return m;
    }, [projectTraits, mintedFates]);

    /* Wraps cycleSort with a sim-parity toast (sim 8361). Computes the
       NEXT sort key before calling cycleSort so the toast reflects what
       the sort will become, not the stale current value. */
    const cycleSortWithToast = (family: SortKey) => {
        const nextKey = computeNextSortKey(family, sort, dir, feedKind);
        cycleSort(family);
        showToast('SORT: ' + (SORT_LABELS[nextKey] ?? nextKey));
    };

    /* GROUP cycling control — none → colour → owner (Brendon, 2026-06-13). */
    const GROUP_TOAST: Record<GroupKey, string> = { none: 'OFF', color: 'COLOR', owner: 'OWNER' };
    const GROUP_NEXT: GroupKey[] = ['none', 'color', 'owner'];
    const cycleGroupWithToast = () => {
        const next = GROUP_NEXT[(GROUP_NEXT.indexOf(group) + 1) % GROUP_NEXT.length];
        cycleGroup();
        showToast('Group: ' + GROUP_TOAST[next]);
    };

    /* Wraps setColorway with a toast (mirrors ColorwayPicker.tsx). */
    const setColorwayWithToast = (key: ColorwayKey) => {
        setColorway(key);
        if (key) showToast('Colorway: ' + (SORT_BAR_THEME_NAMES[key] ?? key));
    };

    /* D006 (sim 8470) — `.traits-ui` hides only when Regular persona AND
       not on feed. The `.sort-bar` is NOT touched by sim 8470 — sim's
       renderSortUI runs unconditionally (sim 8418-8460), and the sort
       row stays visible whenever we're on the artworks tab regardless
       of persona. So `.traits-ui` gets the persona+feed gate folded into
       its hiddenStyle below; `.sort-bar` keeps the parent's `visible`
       prop (which is `onArtworksTab`) and ignores persona+feed. Same
       pattern sim uses: tab visibility outer, persona+feed inner.
       D007 (sim 8438, 8505, 8556) — search-btn placement also varies
       by these flags; computed once here, branched at the three render
       sites below. */
    const isRegular = persona === 'default';
    const isFeed = sort === 'feed';
    const showSearchInTraitHeader = !isFeed && !isRegular; // sim 8556 site
    const showSearchInFeedTraitRow = isFeed;               // sim 8505 site
    const showSearchInSortRow      = isRegular && !isFeed; // sim 8438 site

    /* D008 (sim 8841-8845) — search input placeholder derived from
       traitData keys, not literal. Sim takes Object.keys(traitData)
       (sim 7139: { Gateway, Spectrum, Network, Fate, Breadcrumb }),
       slices the first 2, lowercases, joins.
       In the React port the equivalent ordered key list is the
       TraitCategory union (Layer, Mineral, Fate, Network, Breadcrumb)
       — Layer/Mineral are sim's STRATA-rebrand display labels for
       Gateway/Spectrum (sim 8524). Slice(0,2) → 'layer, mineral' which
       matches sim's derivation logic 1:1 against the React port's
       canonical category keys. Memoized because the source array is
       static; the placeholder string never changes after mount. */
    const searchPlaceholder = useMemo(() => {
        const extras = traitNames.slice(0, 2).map((c) => c.toLowerCase());
        return (
            '# id, collector' +
            (extras.length ? ', ' + extras.join(', ') + '...' : '...')
        );
    }, [traitNames]);

    const hiddenStyle: CSSProperties | undefined = visible
        ? undefined
        : { display: 'none' };

    /* D006 — `.traits-ui` adds the persona+feed gate on top of `visible`.
       Sim 8470: `traitsUI.style.display = (isRegular && !isFeed) ? 'none' : 'flex'`.
       Profile Page v0 — when in profile mode (profilePills provided),
       the persona+feed gate is bypassed: the +More tab needs the L1
       pill row visible regardless of persona. */
    const inProfileMode = !!profilePills;
    const traitsHiddenStyle: CSSProperties | undefined =
        !visible || (!inProfileMode && isRegular && !isFeed)
            ? { display: 'none' }
            : undefined;

    /* Chat H items 3+4 — mode-aware L1/L2/L3 plumbing.
       ────────────────────────────────────────────────────────────────
       The active L1 key changes by mode: feed sort uses activeFeedCategory
       (sim 7400 — values 'Event' | 'Network' | 'Traits' | 'Market'),
       non-feed uses activeCategory. activeSubFilter is single-state
       across modes (sim only has one L1 active at a time, so a single
       narrow value works either way).

       The L2 row gates on whichever active L1 has a non-empty sub-bucket
       map in L2_DICT. Layer/Mineral/Fate (non-feed) have empty L2_DICT
       entries → L2 hidden, L3 reads from L3_FLAT_POOL.

       L3 routing: when the active L1 has L2 sub-buckets, L3 leaves come
       from L2_DICT[L1][activeSubFilter] when narrowed, or all sub-buckets
       concatenated when activeSubFilter='All'. The `filterCat` (which
       activeFilters Set absorbs L3 toggles) is normally the L1 key
       itself — except for feed-mode 'Traits' which routes to 'Layer'
       or 'Mineral' depending on activeSubFilter (sim 8627-8635). */
    type ActiveL1 = TraitCategory | FeedCategory;
    const activeL1: ActiveL1 | null = isFeed ? activeFeedCategory : activeCategory;

    /* L2 sub-bucket labels for the active L1 (sim 8588-8615 + 7390-7395
       GodModeDict). Empty for L1s without sub-bucketing — L2 row hidden. */
    const l2BucketMap: Record<string, readonly string[]> =
        activeL1 !== null ? L2_DICT_DYN[activeL1] ?? {} : {};
    const l2SubLabels: readonly string[] = Object.keys(l2BucketMap);
    const l2Visible = l2SubLabels.length > 0;

    /* L3 leaf pool. For sub-bucketed L1s, slice by activeSubFilter:
       'All' → concat all buckets (sim 8641-8642), specific → just that
       bucket's leaves (sim 8643-8645). For flat L1s (Layer/Mineral/Fate),
       read straight from L3_FLAT_POOL. */
    const l3Pool: readonly string[] = (() => {
        if (activeL1 === null) return [];
        if (l2Visible) {
            if (activeSubFilter === 'All') {
                /* Feed-mode 'Traits' wrapper defaults to the first trait's
                   values (each sub-bucket routes to its own Set, so 'All'
                   can't concat). Other sub-bucketed L1s concat every bucket. */
                if (activeL1 === 'Traits') return l2BucketMap[traitNames[0]] ?? [];
                return Object.values(l2BucketMap).flat();
            }
            return l2BucketMap[activeSubFilter] ?? [];
        }
        /* Flat L1 — a Project trait without subtraits, or Fate. */
        return L3_FLAT_POOL_DYN[activeL1] ?? [];
    })();
    const l3Visible = l3Pool.length > 0;

    /* L3 → activeFilters Set routing. For feed-mode 'Traits' L1, the
       sub-filter dictates which underlying trait Set to write to (sim
       8627-8635: 'Gateway' → activeFilters['Layer'], 'Spectrum' →
       activeFilters['Mineral']). For all other L1s, the L1 key IS the
       filter Set key — Network / Event / Market / Layer / Mineral / Fate
       all map directly. Breadcrumb stays in its own Set (token-id
       leaves wire in later). */
    const l3FilterCat: TraitCategory | null = (() => {
        if (activeL1 === null) return null;
        if (activeL1 === 'Traits') {
            /* Feed-mode Traits routes L3 toggles into the selected trait's
               Set (sub-filter == trait name); defaults to the first trait. */
            return activeSubFilter !== 'All' ? activeSubFilter : (traitNames[0] ?? null);
        }
        return activeL1;
    })();

    /* Per-category badge counts for L1 pills (sim 8488).
       Sim 8484 — feed-mode 'Traits' badge sums Layer + Mineral counts. */
    const countOf = (cat: TraitCategory): number =>
        activeFilters[cat]?.size ?? 0;
    const traitsBadgeCount = traitNames.reduce((s, n) => s + countOf(n), 0);

    /* Sim 8611 — L2 sub-pills get a `•` dot when any L3 leaf within that
       sub-bucket is currently selected. Read against the routed filter
       Set (so feed-mode Traits checks Layer or Mineral by sub-bucket). */
    const l2HasActive = (sub: string): boolean => {
        if (activeL1 === null) return false;
        const bucketLeaves = l2BucketMap[sub] ?? [];
        if (bucketLeaves.length === 0) return false;
        if (activeL1 === 'Traits') {
            /* Each Traits sub-bucket (a trait name) maps to its own Set. */
            const set = activeFilters[sub];
            if (!set) return false;
            return bucketLeaves.some((leaf) => set.has(leaf));
        }
        const set = activeFilters[activeL1];
        if (!set) return false;
        return bucketLeaves.some((leaf) => set.has(leaf));
    };

    return (
        <>
            {/* .traits-ui — sim 5168-5175. D006: persona+feed gate folded
                into traitsHiddenStyle (sim 8470). */}
            <div className="traits-ui" style={traitsHiddenStyle}>
                <div className="traits-header-bar">
                    <div className="stats-container" id="traitCategories">
                        {/* Profile Page v0 — when profilePills is provided,
                            the entire project-mode L1 cluster (feed-mode
                            + non-feed pill rows + sort-icons wrapper) is
                            replaced with a flat row of profile pills.
                            L2/L3 rows further below naturally don't render
                            because activeCategory stays null in this mode. */}
                        {profilePills ? (
                            profilePills.map((p) => (
                                <BarPill
                                    key={p.key}
                                    label={p.label}
                                    active={p.active}
                                    dimmed={false}
                                    onClick={p.onClick}
                                />
                            ))
                        ) : (
                            <>
                        {/* Chat H item 3 — feed-mode L1 row (sim 8475-8509).
                            When sort==='feed' the regular pill cluster is
                            replaced by the four feed cats: Event / My Network
                            / Traits / Market. The search-btn is wrapped with
                            the LAST pill (Market) per sim 8503-8506 — see the
                            showSearchInFeedTraitRow block below for the wrapper
                            shape. Click handler toggles between
                            setActiveFeedCategory (open / swap) and
                            clearActiveFeedCategory (toggle off) — same pattern
                            as the non-feed Build 16 split. */}
                        {isFeed &&
                            FEED_TRAIT_PILLS.map((p) => {
                                const isActive = activeFeedCategory === p.key;
                                /* Sim 8484 — Traits L1 badge sums Layer +
                                   Mineral counts; other feed cats use their
                                   own filter Set's size. */
                                const badgeCount =
                                    p.key === 'Traits'
                                        ? traitsBadgeCount
                                        : countOf(p.key as TraitCategory);
                                return (
                                    <BarPill
                                        key={p.key}
                                        label={p.label}
                                        active={isActive}
                                        dimmed={
                                            activeFeedCategory !== null &&
                                            !isActive
                                        }
                                        count={badgeCount}
                                        onClick={
                                            isActive
                                                ? clearActiveFeedCategory
                                                : () =>
                                                      setActiveFeedCategory(
                                                          p.key
                                                      )
                                        }
                                    />
                                );
                            })}

                        {/* Non-feed pill cluster — sim 8510-8557 ('else if
                            (!isRegular || debugState === "zero")' arm).
                            Layer / Mineral / Fate / My Network / My Notes /
                            Recent + the burn/multi-select/search icons.
                            Chat H item 3: gated on !isFeed so the feed-mode
                            arm above replaces this entire block. */}
                        {!isFeed && (
                            <>
                                {/* Dynamic trait pills (Layer / Mineral) — sim 8518-8529.
                                    Build 16: clicking the currently-active L1 fires
                                    `clearActiveCategory` so the L1 toggle-off path also
                                    drains activeFilters[cat] in the same setState batch
                                    (Build 9 spec residual #4). Clicking an inactive L1
                                    still calls `setActiveCategory(p.key)` to open / swap. */}
                                {dynamicTraitPills.map((p) => {
                                    const isActive = activeCategory === p.key;
                                    return (
                                        <BarPill
                                            key={p.key}
                                            label={p.label}
                                            active={isActive}
                                            dimmed={
                                                activeCategory !== null &&
                                                activeCategory !== p.key
                                            }
                                            count={countOf(p.key)}
                                            onClick={
                                                isActive
                                                    ? clearActiveCategory
                                                    : () => setActiveCategory(p.key)
                                            }
                                        />
                                    );
                                })}

                                {/* Fate — pinned after dynamic block, sim 8533.
                                    Build 16: same toggle-off semantics as the dynamic
                                    pills above. */}
                                <BarPill
                                    label={"\u4DF2\uFE0E"}
                                    active={activeCategory === 'Fate'}
                                    dimmed={
                                        activeCategory !== null &&
                                        activeCategory !== 'Fate'
                                    }
                                    count={countOf('Fate')}
                                    onClick={
                                        activeCategory === 'Fate'
                                            ? clearActiveCategory
                                            : () => setActiveCategory('Fate')
                                    }
                                    title="Fate"
                                    extraClass="pill-fate-icon"
                                />

                                {/* My Network — only shown when logged in */}
                                {isAuthenticated && (
                                <BarPill
                                    label="My Network"
                                    active={activeCategory === 'Network'}
                                    dimmed={
                                        activeCategory !== null &&
                                        activeCategory !== 'Network'
                                    }
                                    count={countOf('Network')}
                                    onClick={
                                        activeCategory === 'Network'
                                            ? clearActiveCategory
                                            : () => setActiveCategory('Network')
                                    }
                                />
                                )}

                                {/* My Notes — only shown when logged in */}
                                {isAuthenticated && (
                                <BarPill
                                    label={"\u229F\uFE0E"}
                                    active={myNotesActive}
                                    dimmed={
                                        activeCategory !== null && !myNotesActive
                                    }
                                    onClick={toggleMyNotes}
                                    title="My Notes"
                                    extraClass="pill-notes-icon"
                                />
                                )}

                                {/* Recent + icon cluster — sim 8551-8557.
                                    Wrapped in inline-flex so they stay together when
                                    the row wraps on mobile (sim parity, sim 8551).
                                    Profile Page v0 — hidden entirely via hideSortBar
                                    so the +More tab only shows the L1 profilePills. */}
                                {!hideSortBar && (
                                <div
                                    style={{
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        flexShrink: 0,
                                    }}
                                >
                                    <div
                                        className="sort-icons"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                        }}
                                    >
                                        {/* Recent — only shown when logged in */}
                                        {isAuthenticated && (
                                        <BarPill
                                            label={"\u25F7\uFE0E"}
                                            active={activeCategory === 'Breadcrumb'}
                                            dimmed={
                                                activeCategory !== null &&
                                                activeCategory !== 'Breadcrumb'
                                            }
                                            count={countOf('Breadcrumb')}
                                            onClick={
                                                activeCategory === 'Breadcrumb'
                                                    ? clearActiveCategory
                                                    : () =>
                                                          setActiveCategory(
                                                              'Breadcrumb'
                                                          )
                                            }
                                            title="Recent — recently-seen tokens"
                                            extraClass="pill-breadcrumb"
                                        />
                                        )}
                                        <span style={{ marginLeft: 6, display: 'inline-flex' }}>
                                        <IconBtn
                                            cls="burn-btn"
                                            glyph={'⏚\uFE0E'}
                                            title="Gallery Presets"
                                            active={presetRowActive}
                                            onClick={togglePresetRow}
                                        />
                                        </span>
                                        <IconBtn
                                            cls="multiselect-btn"
                                            glyph={'❐\uFE0E'}
                                            title="Multi-Select"
                                            active={multiSelectActive}
                                            onClick={toggleMultiSelect}
                                        />
                                        {/* D007 (sim 8556) — search-btn only renders
                                            in the sort-icons cluster for the PD-persona
                                            non-feed branch (sim's `else if (!isRegular
                                            || debugState === 'zero')` arm). Regular
                                            non-feed → search-btn lives in the sort row
                                            (sim 8438 — rendered in .sort-btn-group
                                            below). Feed mode (any persona) → search-btn
                                            appended to the trait pill row (sim 8505 —
                                            rendered in #traitCategories above). */}
                                        {showSearchInTraitHeader && (
                                            <IconBtn
                                                cls="search-btn"
                                                glyph={'⌕\uFE0E'}
                                                title="Search"
                                                active={searchActive}
                                                onClick={toggleSearch}
                                            />
                                        )}
                                    </div>
                                </div>
                                )}
                            </>
                        )}
                        {/* D007 (sim 8505) — feed-mode search-btn. Sim
                            wraps the LAST feed-mode L1 pill (Market) +
                            search-btn together in a
                            `display:flex;align-items:center;gap:10px`
                            container so the icon stays glued to the
                            pill row's right edge. Chat H item 3 — the
                            feed-mode L1 pills now render above (Event /
                            My Network / Traits / Market) so the wrapper
                            sits right after them, gluing the search-btn
                            to Market's right edge per sim 8503-8506. */}
                        {showSearchInFeedTraitRow && (
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 10,
                                }}
                            >
                                <IconBtn
                                    cls="search-btn"
                                    glyph={'⌕\uFE0E'}
                                    title="Search"
                                    active={searchActive}
                                    onClick={toggleSearch}
                                />
                            </div>
                        )}
                            </>
                        )}
                    </div>
                </div>

                {/* Sibling of `.traits-header-bar` (sim 5168-5174). Pre-
                    chat-B these two `.stats-container` blocks were nested
                    INSIDE `.traits-header-bar` which broke any CSS that
                    targets `.traits-ui > .stats-container` and pushed the
                    L2/L3 rows into the flex-wrap pill row instead of
                    placing them as their own rows below it. Sim 5173 +
                    5174 mount these as direct children of `.traits-ui`. */}

                {/* L2 sub-category pills — sim 5173, render block sim
                    8568-8617. Chat H item 4: row gates on whichever active
                    L1 has a non-empty sub-bucket map in L2_DICT. Click
                    handler swapped from `toggleFilter` (the prior port
                    deviation that treated L2 as a filter-value toggle)
                    to `setSubFilter` (sim-faithful narrow — sim 8287-8297).
                    Active state reads from `activeSubFilter`; the `•` dot
                    indicator (sim 8611) lights up when any L3 leaf inside
                    that sub-bucket is currently selected. */}
                <div
                    className="stats-container"
                    id="traitSubCategories"
                    style={
                        l2Visible
                            ? { display: 'flex' }
                            : { display: 'none' }
                    }
                >
                    {l2Visible &&
                        l2SubLabels.map((sub) => {
                            const isActive = activeSubFilter === sub;
                            /* Sim 8573-8574 — dim non-narrowed siblings
                               only when the row is narrowed (i.e. not 'All').
                               'All' = neutral, no narrow, no dim. Feed-mode
                               Traits L1 defaults to 'Gateway' (not 'All',
                               sim 8278), so 'All'-vs-narrowed neutrality
                               doesn't apply there — instead, the sub that
                               isn't 'Gateway' (i.e. 'Spectrum') gets dimmed
                               whenever Gateway is the narrow. The check
                               below treats any non-'All' value as a narrow
                               state, which gives both behaviors. */
                            const dimmed =
                                activeSubFilter !== 'All' && !isActive;
                            const dot = l2HasActive(sub) ? ' •' : '';
                            return (
                                <SubPill
                                    key={sub}
                                    label={`${sub}${dot}`}
                                    active={isActive}
                                    dimmed={dimmed}
                                    onClick={() => setSubFilter(sub)}
                                />
                            );
                        })}
                </div>

                {/* L3 stat-pills — sim 5174 mount point + sim 8670-8682
                    render block. Chat H item 4: gated on l3Pool which
                    derives from L2_DICT[activeL1][activeSubFilter] for
                    sub-bucketed L1s, or L3_FLAT_POOL[activeL1] for flat
                    L1s (Layer / Mineral / Fate). Click handler routes to
                    `l3FilterCat` — usually the L1 key itself, but for
                    feed-mode 'Traits' L1 it routes via sub-filter to
                    'Layer' or 'Mineral' (sim 8627-8635).

                    Build 17 — dim cascade rule (sim 8674-8675):
                    `dimmed = anySelected && !isActive` keeps `active`
                    and `dimmed` mutually exclusive on a per-pill basis,
                    so the same pill never carries both classes. The
                    L3Pill component below emits classes in sim order
                    (`is-zero` first, then `active`|`dimmed`); CSS
                    source order in globals.css 2332-2342 lets is-zero
                    win the cascade when stacked. */}
                <div
                    className="stats-container"
                    id="statsOutput"
                    style={
                        l3Visible
                            ? { display: 'flex' }
                            : { display: 'none' }
                    }
                >
                    {l3Visible &&
                        l3FilterCat !== null &&
                        l3Pool.map((value) => {
                            const filterSet = activeFilters[l3FilterCat];
                            const isActive = filterSet?.has(value) ?? false;
                            const anySelected = (filterSet?.size ?? 0) > 0;
                            const dimmed = anySelected && !isActive;
                            /* Real grid count for this value (Brendon
                               2026-06-12). For token-trait categories
                               (Palette, Fate) this is the live tally over
                               the minted set. Feed-special categories
                               (Network, Breadcrumb, …) aren't token traits,
                               so they're absent from gridCounts; leave those
                               uncounted rather than show a fake number. */
                            const catCounts = gridCounts[l3FilterCat];
                            const hasCount = catCounts != null;
                            const count: number = hasCount ? (catCounts[value] ?? 0) : -1;
                            return (
                                <L3Pill
                                    key={`${l3FilterCat}:${value}`}
                                    label={value}
                                    count={count}
                                    active={isActive}
                                    dimmed={dimmed}
                                    isZero={count === 0}
                                    category={l3FilterCat}
                                    /* count===0 → genuinely none in grid;
                                       count<0 → no tally for this category. */
                                    onClick={() => {
                                        toggleFilter(l3FilterCat, value);
                                    }}
                                />
                            );
                        })}
                </div>
            </div>

            {/* .sort-bar — sim 5177-5179 + render at sim 8441-8460 */}
            <div
                className="sort-bar"
                id="sortOptions"
                style={hiddenStyle}
            >
                <div className="colorway-pills">
                    {THEME_PILLS.map((t) => (
                        <div
                            key={t.key ?? 'default'}
                            className={`pill-colorway ${t.cls}${
                                colorway === t.key ? ' active' : ''
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setColorwayWithToast(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setColorwayWithToast(t.key);
                                }
                            }}
                            title={t.title}
                        >
                            <span>{t.glyph}</span>
                        </div>
                    ))}
                </div>
                {/* Profile Page v0 — .sort-btn-group hides under
                    hideSortBar. The four-square view-mode switcher
                    (.colorway-pills above) stays visible. */}
                {!hideSortBar && (
                <div
                    className="sort-btn-group"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 16,
                        flexWrap: 'nowrap',
                    }}
                >
                    <SortBtn
                        label={'#ID'}
                        family="id"
                        active={sort === 'id'}
                        dir={dir}
                        feedKind={feedKind}
                        group={group}
                        onCycleGroup={cycleGroupWithToast}
                        onClick={() => cycleSortWithToast('id')}
                    />
                    <SortBtn
                        label={'$PRICE'}
                        family="price"
                        active={sort === 'price'}
                        dir={dir}
                        feedKind={feedKind}
                        group={group}
                        onCycleGroup={cycleGroupWithToast}
                        onClick={() => cycleSortWithToast('price')}
                    />
                    <SortBtn
                        label="FEED"
                        family="feed"
                        active={sort === 'feed'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => cycleSortWithToast('feed')}
                    />
                    {/* D007 (sim 8438) — search-btn lives in the sort row
                        ONLY for Regular persona on non-feed (when
                        `.traits-ui` is hidden by D006 above and there are
                        no trait pills to attach to). Inline `style` matches
                        sim verbatim — `position: relative; top: -2px` is
                        sim's nudge to align the glyph with the sort
                        labels' baseline. Same toggleSearch as the other
                        two sites (one source of truth in TraitsContext
                        per D009). */}
                    {showSearchInSortRow && (
                        <div
                            className={`search-btn${
                                searchActive ? ' active' : ''
                            }`}
                            style={{ position: 'relative', top: -2 }}
                            role="button"
                            tabIndex={0}
                            title="Search"
                            onClick={toggleSearch}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleSearch();
                                }
                            }}
                        >
                            ⌕&#xFE0E;
                        </div>
                    )}
                </div>
                )}
            </div>

            {/* .preset-row — Gallery View Presets. Sits between the
                sort-bar and the search-row so both can be open at once.
                Driven by presetRowActive (⏚ button). */}
            <PresetRow
                open={presetRowActive}
                slug="project"
                projectSlug={projectSlug}
                sort={sort}
                dir={dir}
                feedKind={feedKind}
                applySort={applySort}
                applyPreset={applyPreset}
                activeFilters={activeFilters}
                activeCategory={activeCategory}
                activeFeedCategory={activeFeedCategory}
                activeSubFilter={activeSubFilter}
                myNotesActive={myNotesActive}
                searchQuery={searchQuery}
                priceMin={priceMin}
                priceMax={priceMax}
            />

            {/* .search-row — sim 5180-5189. The .open modifier mirrors
                sim's toggleSearch (sim ~8843) — without it the row's
                display:none rule keeps it collapsed. */}
            <div
                className={`search-row${searchActive ? ' open' : ''}`}
                id="searchRow"
            >
                <input
                    className="search-input"
                    id="searchInput"
                    type="text"
                    placeholder={searchPlaceholder}
                    autoComplete="off"
                    enterKeyHint="done"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            (e.currentTarget as HTMLInputElement).blur();
                        }
                    }}
                />
                <span className="feed-price-range" id="feedPriceRange">
                    <input
                        className="price-input"
                        id="feedPriceMin"
                        type="number"
                        placeholder="min"
                        step="0.001"
                        min="0"
                        enterKeyHint="done"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />
                    <span className="price-sep">–</span>
                    <input
                        className="price-input"
                        id="feedPriceMax"
                        type="number"
                        placeholder="max"
                        step="0.001"
                        min="0"
                        enterKeyHint="done"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                (e.currentTarget as HTMLInputElement).blur();
                            }
                        }}
                    />
                    <span className="price-eth-label">ETH</span>
                </span>
                <span
                    className="search-clear"
                    role="button"
                    tabIndex={0}
                    onClick={closeSearch}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            closeSearch();
                        }
                    }}
                    title="Clear"
                >
                    ✕&#xFE0E;
                </span>
            </div>

            {/* PORT-ONLY: "Search Filter ON" chip. Not in sim — sim only
                fires this string as a toast at sim 8861. Added per Build
                13 brief; class is namespaced so the rest of the sim port
                stays clean. */}

            {/* Multi-select floating action bar — fixed at the bottom
                of the viewport, styled as the artwork modal CTA button.
                Only rendered when multiSelectActive is true. */}
            <MsFloatBar />

        </>
    );
}

/* ── MsFloatBar ─────────────────────────────────────────────────────── */
/*
 * Floating bar: left pill = current action label + ▾ opens a popup,
 * right tab = count (click to deselect all).
 * Popup is an independent modal-style list in Courier New — same look
 * as the links view but entirely separate CSS classes (ms-popup-*).
 * No shared classes with any other modal/overlay in the codebase.
 */
function MsFloatBar() {
    const { multiSelectActive, selectedItems, selectedCount, clearSelected } = useTraits();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const { outputs } = useProject();
    const [pinnedSet, setPinnedSet] = React.useState<readonly GrailPin[]>(() => getGrails());
    const [popupOpen, setPopupOpen] = React.useState(false);
    const [activeAction, setActiveAction] = React.useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = React.useState(false);
    const [albumPickerOpen, setAlbumPickerOpen] = React.useState(false);

    React.useEffect(() => {
        setPinnedSet(getGrails());
        return subscribeGrails((next) => setPinnedSet(next));
    }, []);

    React.useEffect(() => {
        if (!multiSelectActive) { setPopupOpen(false); setActiveAction(null); setConfirmOpen(false); setAlbumPickerOpen(false); }
    }, [multiSelectActive]);

    if (!multiSelectActive) return null;

    const count = selectedCount;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;
    /* Single Project here, so every selected key shares this page's slug —
       mapping to bare ids keeps the existing outputs.get(id) lookups intact. */
    const ids = selectedItems.map((it) => it.id);

    const allOwned  = ids.length > 0 && ids.every(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const anyOwned  = ids.some(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const allListed = ids.every(id => outputs.get(id)?.price != null);
    const availablePinSlots = MAX_GRAIL_PINS - pinnedSet.length;
    const grailPinAvailable = allOwned && count > 0 && count <= availablePinSlots;

    const stub = (label: string) => () => {
        if (count === 0) { showToast('Select items first'); return; }
        showToast(`${label} · ${countLabel}: COMING SOON`);
    };

    /* Real save-triad execs (Brendon, 2026-06-12) — Star / Wishlist apply to
       every selected Output that doesn't have the flag yet (idempotent, never
       un-sets); Add to Album opens the picker card instead of a confirm. */
    const handleStarAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isStarred(slug, id)) { toggleStar(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY STARRED' : `STARRED · ${added} output${added === 1 ? '' : 's'}`);
    };
    const handleWishlistAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isWishlisted(slug, id)) { toggleWishlist(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY WISHLISTED' : `Wishlist: ADDED · ${added} item${added === 1 ? '' : 's'}`);
    };

    const handleAddToCart = () => {
        if (count === 0) { showToast('Select items first'); return; }
        let added = 0;
        selectedItems.forEach(({ slug, id }) => { if (!cartHas(slug, id)) { cartAdd(slug, id); added++; } });
        if (added === 0) showToast('Cart: ALL ALREADY ADDED');
        else showToast(`Cart: ADDED · ${added} item${added === 1 ? '' : 's'}`);
        openCartPanel();
    };

    interface Action { label: string; exec: () => void; }
    const actions: Action[] = [];

    actions.push(
        { label: 'Star',         exec: handleStarAll },
        { label: 'Wishlist',     exec: handleWishlistAll },
        { label: 'Add to Album', exec: () => setAlbumPickerOpen(true) },
        { label: 'Make To-Do',   exec: stub('Make To-Do') },
    );
    if (!anyOwned && allListed) actions.push({ label: 'Add to Cart',  exec: handleAddToCart });
    if (!anyOwned)              actions.push({ label: 'Make Offer',   exec: stub('Make Offer') });
    if (allOwned) {
        if (grailPinAvailable)  actions.push({ label: 'Grail Pin',    exec: stub('Grail Pin') });
        actions.push(
            { label: 'List/Re-List', exec: stub('List/Re-List') },
            { label: 'Transfer',     exec: stub('Transfer') },
        );
    }
    const current = count === 0
        ? 'Select'
        : (activeAction ?? 'Add to Album');

    const handleSelect = (action: Action) => {
        setActiveAction(action.label);
        setPopupOpen(false);
    };

    const handleExec = () => {
        if (count === 0) return;
        setPopupOpen(false);
        /* Add to Album confirms inside its own picker (choosing the album IS
           the confirmation) — the generic confirm card would be a dead tap. */
        if (current === 'Add to Album') {
            setAlbumPickerOpen(true);
            return;
        }
        setConfirmOpen(true);
    };

    const handleConfirm = () => {
        setConfirmOpen(false);
        const action = actions.find(a => a.label === current);
        action?.exec();
    };

    return (
        <>
            {/* Floating compound pill */}
            <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
                {/* Add-to-Album picker — floats above the bar like the
                    action picker; choosing an album executes the add. */}
                {albumPickerOpen && (
                    <AlbumPickerCard
                        items={selectedItems}
                        onDone={(msg) => { setAlbumPickerOpen(false); showToast(msg); }}
                        onClose={() => setAlbumPickerOpen(false)}
                    />
                )}
                {/* Anchored action picker — floats above the bar, matches details-popover style */}
                {popupOpen && (
                    <div className="ms-popup-card">
                        <div className="ms-popup-card-header">Action</div>
                        {actions.map((a) => (
                            <button
                                key={a.label}
                                className={
                                    'ms-popup-card-item' +
                                    (a.label === current ? ' ms-popup-card-item--active' : '')
                                }
                                onPointerDown={() => {
                                    setActiveAction(a.label);
                                    setPopupOpen(false);
                                }}
                            >
                                {a.label}
                                {a.label === current && <span className="ms-popup-card-check">✓</span>}
                            </button>
                        ))}
                    </div>
                )}
                {/* Confirmation card — floats above the action pill,
                    same visual style as the action picker. Own classes. */}
                {confirmOpen && (
                    <div className="ms-confirm-card">
                        <div className="ms-confirm-question">
                            {current} {count === 1 ? '1 output' : `${count} outputs`}?
                        </div>
                        <div className="ms-confirm-btns">
                            <button
                                className="ms-confirm-btn ms-confirm-btn--cancel"
                                onPointerDown={() => setConfirmOpen(false)}
                            >
                                Cancel
                            </button>
                            <button
                                className="ms-confirm-btn ms-confirm-btn--ok"
                                onPointerDown={handleConfirm}
                            >
                                Confirm
                            </button>
                        </div>
                    </div>
                )}
                <div className="ms-float-wrap">
                    <button
                        className="ms-float-action"
                        onClick={handleExec}
                        title={count === 0 ? undefined : (current ?? undefined)}
                    >
                        <span className="ms-float-label">{current}</span>
                    </button>
                    <button
                        className="ms-float-arrow"
                        onClick={(e) => { e.stopPropagation(); setPopupOpen(v => !v); }}
                        title="Choose action"
                        aria-label="Choose action"
                    >
                        {'▾︎'}
                    </button>
                </div>
                {/* Display-only count — no click action */}
                <div className="ms-float-count">
                    {count === 0 ? '—' : countLabel}
                </div>
            </div>
        </>
    );
}

/* ── PresetRow ─────────────────────────────────────────────────────── */
/*
 * Gallery View Presets row. Repurposed from MultiSelectRow — same
 * position in the render tree (between sort-bar and search-row),
 * same open/close pattern.
 *
 * Layout: [SAVE] [① Preset Name ✕] [② Preset Name ✕] [③ Preset Name ✕]
 *
 * Pill style: dashed border when idle (signals "snapshot slot"),
 * solid border + inverted bg when that preset is the currently-loaded
 * view. A ✕ on each pill deletes that slot.
 *
 * Numbered index prefixes (①②③) make slots scannable without a label.
 *
 * The SAVE pill always captures the current full gallery state into the
 * next available slot (or replaces the oldest). presetStore owns all
 * persistence and auto-naming.
 */

const SLOT_GLYPHS = ['①', '②', '③'] as const;

interface PresetRowProps {
    open: boolean;
    /* Store scope. The project page uses the constant 'project' so the 3
       Grid Presets are SHARED across every Project (not per-Project) — a
       deliberate change (WIP decision 3). */
    slug: string;
    /* The Project actually being viewed. Captured into each saved preset so
       recall restores trait filters only when you're back on the same Project;
       the universal parts (sort / price / search) restore on any Project. */
    projectSlug: string;
    /* Current sort state — needed both for snapshot and for apply */
    sort: import('../../lib/state/SortContext').SortKey;
    dir: import('../../lib/state/SortContext').SortDir;
    feedKind: import('../../lib/state/SortContext').FeedKind;
    applySort: (
        sort: import('../../lib/state/SortContext').SortKey,
        dir: import('../../lib/state/SortContext').SortDir,
        feedKind: import('../../lib/state/SortContext').FeedKind,
    ) => void;
    applyPreset: (state: Parameters<import('../../lib/state/TraitsContext').TraitsContextValue['applyPreset']>[0]) => void;
    /* Current traits/search/price state — for snapshot */
    activeFilters: import('../../lib/state/TraitsContext').ActiveFilters;
    activeCategory: import('../../lib/state/TraitsContext').TraitCategory | null;
    activeFeedCategory: import('../../lib/state/TraitsContext').FeedCategory | null;
    activeSubFilter: string;
    myNotesActive: boolean;
    searchQuery: string;
    priceMin: string;
    priceMax: string;
}

function PresetRow({
    open,
    slug,
    projectSlug,
    sort,
    dir,
    feedKind,
    applySort,
    applyPreset,
    activeFilters,
    activeCategory,
    activeFeedCategory,
    activeSubFilter,
    myNotesActive,
    searchQuery,
    priceMin,
    priceMax,
}: PresetRowProps) {
    const { showToast } = useToast();
    const [presets, setPresets] = React.useState<readonly PresetEntry[]>(
        () => getPresets(slug)
    );
    const [loadedIndex, setLoadedIndexState] = React.useState<number>(
        () => getLoadedIndex(slug)
    );

    React.useEffect(() => {
        return subscribePresets(slug, (next: readonly PresetEntry[], idx: number) => {
            setPresets(next);
            setLoadedIndexState(idx);
        });
    }, [slug]);

    if (!open) return null;

    const handleSave = () => {
        // Serialise activeFilters Sets → arrays for JSON storage
        const filtersSnapshot = Object.fromEntries(
            Object.entries(activeFilters).map(([k, v]) => [k, Array.from(v as Set<string>)])
        ) as Record<import('../../lib/state/TraitsContext').TraitCategory, string[]>;

        const { result, index } = savePreset(slug, {
            sort, dir, feedKind,
            activeFilters: filtersSnapshot,
            activeCategory,
            activeFeedCategory,
            activeSubFilter,
            myNotesActive,
            searchQuery,
            priceMin,
            priceMax,
            savedSlug: projectSlug,
        });
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} ${result === 'replaced' ? 'REPLACED' : 'SAVED'}`);
    };

    const handleRecall = (index: number, preset: PresetEntry) => {
        const s = preset.state;
        // Universal parts (sort / price / search / notes) always restore.
        applySort(s.sort, s.dir, s.feedKind);
        // Trait filters only make sense on the Project they were captured on
        // (Layer/Mineral/etc. don't exist on a different Project's schema).
        // Legacy presets with no savedSlug are treated as same-Project.
        const sameProject = !s.savedSlug || s.savedSlug === projectSlug;
        if (sameProject) {
            // Reconstruct Sets from the stored string arrays
            const restoredFilters = Object.fromEntries(
                Object.entries(s.activeFilters).map(([k, arr]) => [k, new Set(arr as string[])])
            ) as unknown as import('../../lib/state/TraitsContext').ActiveFilters;
            applyPreset({
                activeFilters: restoredFilters,
                activeCategory: s.activeCategory,
                activeFeedCategory: s.activeFeedCategory,
                activeSubFilter: s.activeSubFilter,
                myNotesActive: s.myNotesActive,
                searchQuery: s.searchQuery,
                priceMin: s.priceMin,
                priceMax: s.priceMax,
            });
        } else {
            // Cross-Project recall — restore the universal view, and close any
            // open trait category so no mismatched trait row dangles. The
            // preset keeps its stored filters (no data loss) for when you
            // return to its origin Project.
            applyPreset({
                activeCategory: null,
                activeFeedCategory: null,
                activeSubFilter: 'All',
                myNotesActive: s.myNotesActive,
                searchQuery: s.searchQuery,
                priceMin: s.priceMin,
                priceMax: s.priceMax,
            });
        }
        setLoadedIndex(slug, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} LOADED`);
    };

    const handleDelete = (e: React.MouseEvent, index: number) => {
        e.stopPropagation();
        deletePreset(slug, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} CLEARED`);
    };

    return (
        <div className="preset-row open">
            {/* SAVE pill — always present */}
            <button
                className="pill-preset pill-preset--save"
                onClick={handleSave}
                title="Save current view as preset"
            >
                SAVE
            </button>

            {/* Preset slots — up to 3 */}
            {presets.map((preset, index) => {
                const isLoaded = loadedIndex === index;
                return (
                    <button
                        key={index}
                        className={`pill-preset${isLoaded ? ' pill-preset--loaded' : ''}`}
                        onClick={() => handleRecall(index, preset)}
                        title={`Load: ${preset.name}`}
                    >
                        <span className="pill-preset__index">{SLOT_GLYPHS[index]}</span>
                        <span className="pill-preset__name">{preset.name}</span>
                        <span
                            className="pill-preset__delete"
                            role="button"
                            tabIndex={0}
                            onClick={(e) => handleDelete(e, index)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleDelete(e as unknown as React.MouseEvent, index);
                                }
                            }}
                            title="Clear preset"
                            aria-label="Clear preset"
                        >
                            ✕&#xFE0E;
                        </span>
                    </button>
                );
            })}

            {/* Empty slot indicators */}
            {Array.from({ length: 3 - presets.length }).map((_, i) => (
                <span
                    key={`empty-${i}`}
                    className="pill-preset pill-preset--empty"
                    title="Empty preset slot"
                >
                    {SLOT_GLYPHS[presets.length + i]}
                </span>
            ))}
        </div>
    );
}



/* ── Sub-components ─────────────────────────────────────────────────── */

interface BarPillProps {
    label: ReactNode;
    active: boolean;
    dimmed: boolean;
    /* Numeric badge inside the pill — sim 8488. Omit / 0 = no badge. */
    count?: number;
    onClick: () => void;
    title?: string;
    extraClass?: string;
}

function BarPill({
    label,
    active,
    dimmed,
    count,
    onClick,
    title,
    extraClass,
}: BarPillProps) {
    const cls = [
        'pill',
        'pill-l1',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
        extraClass ?? '',
    ]
        .filter(Boolean)
        .join(' ');
    const showBadge = typeof count === 'number' && count > 0;
    return (
        <div
            className={cls}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            title={title}
        >
            <span className="stat-name">{label}</span>
            {showBadge && <span className="badge">{count}</span>}
        </div>
    );
}

interface SubPillProps {
    label: string;
    active: boolean;
    dimmed: boolean;
    onClick: () => void;
}

/* L2 sub-pill — used for value selections within the active L1 category.
   Visual prefix `↴` matches sim's L2 row at sim 8585 / 8613 (the L2 row
   uses ↴ even though sim's L3 row uses ↳). */
function SubPill({ label, active, dimmed, onClick }: SubPillProps) {
    const cls = [
        'pill',
        'pill-l2',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
    ]
        .filter(Boolean)
        .join(' ');
    return (
        <div
            className={cls}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <span className="stat-name">↴ {label}</span>
        </div>
    );
}

interface L3PillProps {
    label: string;
    count: number;
    active: boolean;
    dimmed: boolean;
    isZero: boolean;
    /** Active L1 category. Drives the inner-span variant — sim 8679
     *  renders Breadcrumb (Recent) L3 pills as `<recent-dot>⬤</recent-dot>
     *  #${name}` with NO stat-count, while every other category uses
     *  the `↳ ${name}` + count form. Optional so legacy call sites
     *  (none today, but keeps the surface flexible) keep the original
     *  rendering by default. */
    category?: string;
    onClick: () => void;
}

/* L3 stat-pill — sim 8670-8682. Visual prefix `↳` matches sim 8681
   (L3 uses ↳ vs L2's ↴). `.is-zero` (sim 8672) is applied when count
   reaches 0 — kept in place even though Build 15 mocks counts at 22 so
   the gallery-wiring build only needs to replace the count source.
   `.active` / `.dimmed` mirror L2 selection state — both rows share
   `activeFilters[cat]`, so toggling here updates the L2 pill above and
   any future gallery predicate. The trailing `<span class="stat-count">`
   carries the numeric count (sim 8681).

   Build 17 — class-emission order tightened to match sim 8671-8676
   verbatim: `pill pill-l3 [is-zero] [active|dimmed]`. `active` and
   `dimmed` are mutually exclusive at the call site (sim 8674-8675's
   if/else mirrored in TraitsUI 350-354 where `dimmed = anySelected &&
   !isActive`). `is-zero` stacks on top of either via CSS source order
   in globals.css (.pill-l3.active 2332 → .pill-l3.dimmed 2337 →
   .pill-l3.is-zero 2338) — so a zero-count pill that's also selected
   renders with the dashed-transparent is-zero treatment dominating. */
function L3Pill({
    label,
    count,
    active,
    dimmed,
    isZero,
    category,
    onClick,
}: L3PillProps) {
    const cls = [
        'pill',
        'pill-l3',
        isZero ? 'is-zero' : '',
        active ? 'active' : '',
        dimmed ? 'dimmed' : '',
    ]
        .filter(Boolean)
        .join(' ');
    /* Build 24 — Breadcrumb (Recent) variant per sim 8679. Renders
       the leading `⬤` glyph as `.recent-dot`, prefixes the label
       with `#`, and omits the stat-count entirely (Breadcrumb counts
       are always 1, so sim hides them to keep the row visually
       aligned with the L2 sub-pills above). */
    const isBreadcrumb = category === 'Breadcrumb';
    return (
        <div
            className={cls}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            {isBreadcrumb ? (
                <span className="stat-name">
                    <span className="recent-dot">⬤</span> #{label}
                </span>
            ) : (
                <>
                    <span className="stat-name">↳ {label}</span>
                    {/* count < 0 = no grid tally for this category (feed
                        specials) — show the value with no number rather
                        than a placeholder. */}
                    {count >= 0 && <span className="stat-count">{count}</span>}
                </>
            )}
        </div>
    );
}

interface IconBtnProps {
    cls: string;
    glyph: string;
    title: string;
    active: boolean;
    onClick: () => void;
}

function IconBtn({ cls, glyph, title, active, onClick }: IconBtnProps) {
    return (
        <div
            className={`${cls}${active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
            title={title}
        >
            {glyph}
        </div>
    );
}

interface SortBtnProps {
    label: string;
    family: SortKey;
    active: boolean;
    dir: SortDir;
    feedKind: FeedKind;
    /* Group-by modifier (Brendon, 2026-06-13). Grouping is a MODIFIER on the
       ID and PRICE sorts — rendered as a little tappable letter next to the
       direction arrow, exactly like FEED's `$`. Only the id/price buttons
       receive these; FEED/fog don't group. */
    group?: GroupKey;
    onCycleGroup?: () => void;
    onClick: () => void;
}

/* Sim 8420-8428 — arrow only renders when this family is the active
   sort. ID/PRICE just show ↑/↓ per dir. FEED shows ↓/↑ per dir AND
   prepends a `feed-sort-dollar` $ span when feedKind is 'price'
   (i.e. currentSort is feed-price-desc / feed-price-asc).

   Direction cycling is owned by SortContext.cycleSort (sim 8312-8331).
   For 'id'/'price': click toggles asc↔desc when this family is already
   active; for 'feed': click advances through the 4-step FEED_SORTS
   sequence (sim 8313). */
function SortBtn({
    label,
    family,
    active,
    dir,
    feedKind,
    group,
    onCycleGroup,
    onClick,
}: SortBtnProps) {
    let arrowGlyph = '';
    let dollarSpan: ReactNode = null;
    /* Group-by letter modifier — only on the ID / PRICE buttons, and only
       while that sort is active (it modifies the active id/price ordering,
       the way FEED's `$` modifies the feed sub-mode). Off shows a dim `G`
       affordance; on shows the dimension's initial (C = colour, O = owner).
       Tapping it cycles the grouping WITHOUT flipping the sort direction
       (stopPropagation keeps the parent button's dir-toggle from firing). */
    const showGroupMod =
        active &&
        (family === 'id' || family === 'price') &&
        group !== undefined &&
        onCycleGroup !== undefined;
    const groupMod: ReactNode = showGroupMod ? (
        <span
            className={`sort-group-mod${group !== 'none' ? ' on' : ''}`}
            role="button"
            tabIndex={0}
            title="Group by colour / owner"
            style={{
                fontFamily: "'Courier New', Courier, monospace",
                fontSize: '13px',
                marginRight: '4px',
                opacity: group === 'none' ? 0.4 : 1,
                cursor: 'pointer',
            }}
            onClick={(e) => {
                e.stopPropagation();
                onCycleGroup!();
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    e.stopPropagation();
                    onCycleGroup!();
                }
            }}
        >
            {group === 'color' ? 'C' : group === 'owner' ? 'O' : 'G'}
        </span>
    ) : null;
    if (active) {
        if (family === 'id' || family === 'price') {
            arrowGlyph = dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E';
        } else if (family === 'feed') {
            arrowGlyph = dir === 'asc' ? '↑\uFE0E' : '↓\uFE0E';
            if (feedKind === 'price') {
                // Sim 8427-8428 — inline-styled $ span. Class hook
                // (.feed-sort-dollar) preserved for any CSS attached
                // to it; sim's own CSS rule for this class (sim 2209)
                // is overridden by these inline styles anyway.
                dollarSpan = (
                    <span
                        className="feed-sort-dollar"
                        style={{
                            fontFamily:
                                "'Courier New', Courier, monospace",
                            fontSize: '13px',
                            marginRight: '2px',
                        }}
                    >
                        $
                    </span>
                );
            }
        }
    }
    return (
        <div
            className={`sort-btn${active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <span className="sort-lbl">{label}</span>
            <span className="sort-arrow">
                {groupMod}
                {dollarSpan}
                {arrowGlyph}
            </span>
        </div>
    );
}
