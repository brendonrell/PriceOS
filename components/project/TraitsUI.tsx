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
 *   2. .sort-bar             — theme pills + #ID / $PRICE / FEED sort tabs
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
import { useSort, type SortKey, type SortDir, type FeedKind } from '../../lib/state/SortContext';
import { useTheme, type ThemeKey } from '../../lib/state/ThemeContext';
import { usePersona } from '../../lib/state/PersonaContext';
import { useCart } from '../../lib/state/CartContext';
import { useProject } from '../../lib/state/ProjectContext';
import { getGrails, subscribeGrails, MAX_GRAIL_PINS } from '../../lib/pins/grailStore';

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

/* Theme names for the sort-bar view-mode pills (mirrors ThemePicker.tsx). */
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
const DYNAMIC_TRAIT_PILLS: { key: TraitCategory; label: string }[] = [
    { key: 'Layer',   label: 'Layer'   },
    { key: 'Mineral', label: 'Mineral' },
];

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
    /* Non-feed L1s with no L2 sub-bucketing — L3 reads from a flat pool
       (computed below as L3_FLAT_POOL). Empty L2_DICT entry keeps the
       L2 row hidden (sim 8617-8618). */
    Layer:      {},
    Mineral:    {},
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

/* Themes shown as the four-square cluster on the left of the sort-bar
   (sim 8443-8446). ThemeContext has more keys, but only these four
   render in the sim. */
const THEME_PILLS: {
    key: ThemeKey;
    cls: string;
    glyph: string;
    title: string;
}[] = [
    { key: 'artist', cls: 't-artist', glyph: '◩\uFE0E', title: 'Artist Default' },
    { key: 'light',  cls: 't-light',  glyph: '◻\uFE0E', title: 'Light' },
    { key: 'dark',   cls: 't-dark',   glyph: '◼\uFE0E', title: 'Dark' },
    { key: 'orange', cls: 't-orange', glyph: '▨\uFE0E', title: 'Orange' },
];

/* Profile Page v0 — when ProfilePageBody mounts TraitsUI on the
   `+ More` tab, the L1 trait pill cluster is swapped to profile-mode
   pills (Starred / Wishlists / Albums). The sort surfaces (sort-icons
   cluster + sort-btn-group #ID/$PRICE/FEED) are hidden via the sibling
   `hideSortBar` prop. The view-mode switcher (.theme-pills, four
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
       L2 sub-trait pills, .theme-pills (four-square view-mode switcher
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
        burnPileActive,
        toggleBurnPile,
        multiSelectActive,
        toggleMultiSelect,
        selectedIds,
        clearSelected,
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
    const { sort, dir, feedKind, cycleSort } = useSort();
    const { theme, setTheme } = useTheme();
    const { persona } = usePersona();

    /* Wraps cycleSort with a sim-parity toast (sim 8361). Computes the
       NEXT sort key before calling cycleSort so the toast reflects what
       the sort will become, not the stale current value. */
    const cycleSortWithToast = (family: SortKey) => {
        const nextKey = computeNextSortKey(family, sort, dir, feedKind);
        cycleSort(family);
        showToast('SORT: ' + (SORT_LABELS[nextKey] ?? nextKey));
    };

    /* Wraps setTheme with a toast (mirrors ThemePicker.tsx). */
    const setThemeWithToast = (key: ThemeKey) => {
        setTheme(key);
        if (key) showToast('Theme: ' + (SORT_BAR_THEME_NAMES[key] ?? key));
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
        const cats: TraitCategory[] = [
            'Layer',
            'Mineral',
            'Fate',
            'Network',
            'Breadcrumb',
        ];
        const extras = cats.slice(0, 2).map((c) => c.toLowerCase());
        return (
            '# id, collector' +
            (extras.length ? ', ' + extras.join(', ') + '...' : '...')
        );
    }, []);

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
        activeL1 !== null ? L2_DICT[activeL1] ?? {} : {};
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
                /* Sim 8641-8642 — concatenate every sub-bucket's leaves. */
                return Object.values(l2BucketMap).flat();
            }
            return l2BucketMap[activeSubFilter] ?? [];
        }
        /* Flat L1 — Layer / Mineral / Fate. */
        return L3_FLAT_POOL[activeL1 as TraitCategory] ?? [];
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
            /* Sim 8628 — feed-mode Traits L1 routes via sub-filter key. */
            if (activeSubFilter === 'Spectrum') return 'Mineral';
            return 'Layer'; /* 'Gateway' default, also fallback */
        }
        /* All other L1 keys are also TraitCategory keys (typed by
           construction — Event/Market/Network/Layer/Mineral/Fate/
           Breadcrumb all live in TraitCategory). */
        return activeL1 as TraitCategory;
    })();

    /* Per-category badge counts for L1 pills (sim 8488).
       Sim 8484 — feed-mode 'Traits' badge sums Layer + Mineral counts. */
    const countOf = (cat: TraitCategory): number =>
        activeFilters[cat]?.size ?? 0;
    const traitsBadgeCount = countOf('Layer') + countOf('Mineral');

    /* Sim 8611 — L2 sub-pills get a `•` dot when any L3 leaf within that
       sub-bucket is currently selected. Read against the routed filter
       Set (so feed-mode Traits checks Layer or Mineral by sub-bucket). */
    const l2HasActive = (sub: string): boolean => {
        if (activeL1 === null) return false;
        const bucketLeaves = l2BucketMap[sub] ?? [];
        if (bucketLeaves.length === 0) return false;
        if (activeL1 === 'Traits') {
            /* Each Traits sub-bucket maps to its own filter Set (sim
               8604-8608 — feed-mode Traits checks the sub-keyed Set,
               not a single shared Set). */
            const subCat: TraitCategory = sub === 'Spectrum' ? 'Mineral' : 'Layer';
            const set = activeFilters[subCat];
            return bucketLeaves.some((leaf) => set.has(leaf));
        }
        const set = activeFilters[activeL1 as TraitCategory];
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
                                {DYNAMIC_TRAIT_PILLS.map((p) => {
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
                                    label="Fate"
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
                                    title="Fate Filter — iChing Destines"
                                />

                                {/* My Network — sim 8549.
                                    Build 16: toggle-off via clearActiveCategory. */}
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

                                {/* My Notes — BarPill with ⊟ glyph (U+229F)
                                    as the label. Same pill-l1 style as all
                                    other trait pills. extraClass adds only
                                    the font-size so the glyph matches the
                                    multiselect icon weight. NOT linked to
                                    any other component's styles. */}
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
                                        <IconBtn
                                            cls="burn-btn"
                                            glyph={'⏚\uFE0E'}
                                            title="Burn Pile"
                                            active={burnPileActive}
                                            onClick={toggleBurnPile}
                                        />
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
                            const isActive = filterSet.has(value);
                            const anySelected = filterSet.size > 0;
                            const dimmed = anySelected && !isActive;
                            /* Mock count — gallery wiring will replace
                               with real per-value counts from token data
                               (sim sources from `traitData[cat][name]`,
                               sim 8664). Typed as `number` (not the
                               literal `22`) so the `isZero` check below
                               stays live for the wiring build. */
                            const count: number = 22;
                            return (
                                <L3Pill
                                    key={`${l3FilterCat}:${value}`}
                                    label={value}
                                    count={count}
                                    active={isActive}
                                    dimmed={dimmed}
                                    isZero={count === 0}
                                    category={l3FilterCat}
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
                <div className="theme-pills">
                    {THEME_PILLS.map((t) => (
                        <div
                            key={t.key ?? 'default'}
                            className={`pill-theme ${t.cls}${
                                theme === t.key ? ' active' : ''
                            }`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setThemeWithToast(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setThemeWithToast(t.key);
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
                    (.theme-pills above) stays visible. */}
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
                        label={'#\u202FID'}
                        family="id"
                        active={sort === 'id'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => cycleSortWithToast('id')}
                    />
                    <SortBtn
                        label={'$\u202FPRICE'}
                        family="price"
                        active={sort === 'price'}
                        dir={dir}
                        feedKind={feedKind}
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
    const { multiSelectActive, selectedIds, clearSelected } = useTraits();
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const { outputs } = useProject();
    const [pinnedSet, setPinnedSet] = React.useState<readonly number[]>(() => getGrails());
    const [popupOpen, setPopupOpen] = React.useState(false);
    const [activeAction, setActiveAction] = React.useState<string | null>(null);

    React.useEffect(() => {
        setPinnedSet(getGrails());
        return subscribeGrails((next) => setPinnedSet(next));
    }, []);

    React.useEffect(() => {
        if (!multiSelectActive) { setPopupOpen(false); setActiveAction(null); }
    }, [multiSelectActive]);

    if (!multiSelectActive) return null;

    const count = selectedIds.size;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;
    const ids = Array.from(selectedIds);

    const allOwned  = ids.length > 0 && ids.every(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const anyOwned  = ids.some(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const allListed = ids.every(id => outputs.get(id)?.price != null);
    const availablePinSlots = MAX_GRAIL_PINS - pinnedSet.length;
    const grailPinAvailable = allOwned && count > 0 && count <= availablePinSlots;

    const stub = (label: string) => () => {
        if (count === 0) { showToast('Select items first'); return; }
        showToast(`${label} · ${countLabel} — coming soon`);
    };

    const handleAddToCart = () => {
        if (count === 0) { showToast('Select items first'); return; }
        let added = 0;
        ids.forEach((id) => { if (!cartHas(id)) { cartAdd(id); added++; } });
        if (added === 0) showToast('All selected items already in cart');
        else showToast(`Added ${added} item${added === 1 ? '' : 's'} to cart`);
        openCartPanel();
    };

    interface Action { label: string; exec: () => void; }
    const actions: Action[] = [];

    actions.push(
        { label: 'Star',         exec: stub('Star') },
        { label: 'Wishlist',     exec: stub('Wishlist') },
        { label: 'Add to Album', exec: stub('Add to Album') },
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
    actions.push({ label: 'Deselect All', exec: clearSelected });

    const current = activeAction ?? (actions[0]?.label ?? null);

    const handleSelect = (action: Action) => {
        setActiveAction(action.label);
        setPopupOpen(false);
    };

    const handleExec = () => {
        const action = actions.find(a => a.label === current);
        action?.exec();
    };

    return (
        <>
            {/* Floating compound pill */}
            <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
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
                <div className="ms-float-wrap">
                    <button
                        className="ms-float-action"
                        onClick={handleExec}
                        title={current ?? undefined}
                    >
                        <span className="ms-float-label">{current ?? '—'}</span>
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
                <button
                    className="ms-float-count"
                    onClick={clearSelected}
                    title="Deselect all"
                >
                    {count === 0 ? '—' : countLabel}
                </button>
            </div>
        </>
    );
}

/* ── MultiSelectRow ────────────────────────────────────────────────── */
/*
 * Action availability rules (informed by OpenSea / objkt.com patterns):
 *
 *   UNIVERSAL (any selection, any mix):
 *     Star · Wishlist · Add to Album · Add Note · Make To-Do
 *
 *   NOT-OWNED only (listed tokens you don't own):
 *     Add to Cart · Make Offer
 *
 *   OWNED only (tokens you own):
 *     Grail Pin · List · Transfer
 *     — List and Transfer are mutually exclusive per-action (you can't
 *       trigger both at once; show both pills but stub notes conflict).
 *
 *   MIXED selection: universal actions only + whichever ownership-
 *     specific actions apply to the whole set (e.g. all owned → show
 *     List + Transfer; any not-owned → hide List/Transfer; any owned →
 *     hide Add to Cart).
 *
 * Count pill ("N outputs") is first — display only, no onClick.
 * Pill style SWAPPED vs first draft:
 *   • action pills  → hollow (border only, transparent bg)
 *   • Deselect All  → filled (solid bg = text-color)
 */

interface MultiSelectRowProps {
    open: boolean;
    selectedIds: ReadonlySet<number>;
    clearSelected: () => void;
}

function MultiSelectRow({ open, selectedIds, clearSelected }: MultiSelectRowProps) {
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas } = useCart();
    const { outputs } = useProject();

    if (!open) return null;

    const count = selectedIds.size;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;

    // Classify the selection
    const ids = Array.from(selectedIds);
    const allOwned   = ids.length > 0 && ids.every(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const anyOwned   = ids.some(id => outputs.get(id)?.isOwnedByBrendon ?? false);
    const allListed  = ids.every(id => outputs.get(id)?.price != null);

    // Actions that are always available
    const stub = (label: string) => () => {
        if (count === 0) { showToast('Select items first'); return; }
        showToast(`${label} · ${countLabel} — coming soon`);
    };

    const handleAddToCart = () => {
        if (count === 0) { showToast('Select items first'); return; }
        let added = 0;
        ids.forEach((id) => {
            if (!cartHas(id)) { cartAdd(id); added++; }
        });
        if (added === 0) showToast('All selected items already in cart');
        else showToast(`Added ${added} item${added === 1 ? '' : 's'} to cart`);
    };

    interface Action { label: string; onClick: () => void; }
    const actions: Action[] = [];

    // Universal
    actions.push(
        { label: 'Star',         onClick: stub('Star') },
        { label: 'Wishlist',     onClick: stub('Wishlist') },
        { label: 'Add to Album', onClick: stub('Add to Album') },
        { label: 'Add Note',     onClick: stub('Add Note') },
        { label: 'Make To-Do',   onClick: stub('Make To-Do') },
    );

    // Not-owned actions — hide if any selected item is owned
    if (!anyOwned && allListed) {
        actions.push({ label: 'Add to Cart', onClick: handleAddToCart });
    }
    if (!anyOwned) {
        actions.push({ label: 'Make Offer', onClick: stub('Make Offer') });
    }

    // Owned-only actions — only if ALL selected are owned
    if (allOwned) {
        actions.push(
            { label: 'Grail Pin', onClick: stub('Grail Pin') },
            { label: 'List/Re-List', onClick: stub('List/Re-List') },
            { label: 'Transfer',  onClick: stub('Transfer') },
        );
    }

    return (
        <div className="ms-action-row open">
            {/* Count display — first item, no action */}
            <span className="ms-count-pill">
                {count === 0 ? 'Select outputs' : countLabel}
            </span>
            {count > 0 && actions.map((a) => (
                <button
                    key={a.label}
                    className="ms-action-pill"
                    onClick={a.onClick}
                    title={a.label}
                >
                    {a.label}
                </button>
            ))}
            {count > 0 && (
                <button
                    className="ms-action-pill ms-deselect-all"
                    onClick={clearSelected}
                    title="Deselect All"
                >
                    Deselect All
                </button>
            )}
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
                    <span className="stat-count">{count}</span>
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
    onClick,
}: SortBtnProps) {
    let arrowGlyph = '';
    let dollarSpan: ReactNode = null;
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
                {dollarSpan}
                {arrowGlyph}
            </span>
        </div>
    );
}
