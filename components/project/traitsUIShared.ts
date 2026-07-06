'use client';

/* Split out of components/project/TraitsUI.tsx 2026-07-06 (tech-debt pass)
   — pure move, no behavior change. */

import { ACHIEVEMENTS_ICON } from '../../lib/achievements/icon';
import type { TraitCategory, FeedCategory } from '../../lib/state/TraitsContext';
import type { SortKey, SortDir, FeedKind } from '../../lib/state/SortContext';
import type { ColorwayKey } from '../../lib/state/ColorwayContext';

/* ── Sort toast helpers ──────────────────────────────────────────────────
   Mirror sim 8360's sortLabels + currentSort pattern. We compute the
   NEXT sort key before calling cycleSort (React state is async, so we
   can't read sort/dir/feedKind after the call). Pure function — no side
   effects. */
export const SORT_LABELS: Record<string, string> = {
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

export function computeNextSortKey(
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
export const SORT_BAR_THEME_NAMES: Record<string, string> = {
    custom:  'Custom',
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
export const FEED_TRAIT_PILLS: { key: FeedCategory; label: string }[] = [
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
export const LAYERS:   readonly string[] = ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'];
export const MINERALS: readonly string[] = ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'];
export const OMEN_TRAITS: readonly string[] = [
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
export const L2_DICT: Record<
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
        'My Circle': ['Me', 'Sigil', 'Mutuals', 'Following', 'Followers'],
        'Global':    ['Top Holders', 'PriceRank', 'Counterparties', 'New to PD', 'Fresh Wallets'],
    },
    Breadcrumb: {
        /* Recent's two views are EITHER/OR, not filters (Brendon, 2026-06-24):
           'My Breadcrumbs' (first + default) = the recent-visit trail; "What's
           Hot" = empty for now (wires into the view counter later). Order here
           sets pill order — My Breadcrumbs leads. */
        'My Breadcrumbs': [],
        "What's Hot":     [],
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
export const L3_FLAT_POOL: Partial<Record<TraitCategory, readonly string[]>> = {
    Layer:   LAYERS,
    Mineral: MINERALS,
    Fate:    OMEN_TRAITS,
};

/* Leading icon for a Network L3 value → glyph + render class. The social
   relationship glyphs reuse §12's set (Mutual ⚭ / Following ⚯ / Follower ⚬);
   Fresh Wallets wears the sticker-store ETH lozenge ◊; PriceRank wears the
   achievements-tile icon ◍ (U+25CD, the minting-category glyph); New to PD wears
   the per-mille logo mark (the real SVG). Sizes/nudges live in globals.css
   (.net-pill-ico--* / .net-pill-eth / .net-pill-rank / .net-pill-mille). */
export const NET_VALUE_ICON: Record<string, { glyph: string; cls: string }> = {
    'Mutuals':       { glyph: '⚭',         cls: 'net-pill-ico net-pill-ico--mutual' },
    'Following':     { glyph: '⚯',         cls: 'net-pill-ico net-pill-ico--following' },
    'Followers':     { glyph: '⚬',         cls: 'net-pill-ico net-pill-ico--follower' },
    'Top Holders':   { glyph: '△',         cls: 'net-pill-ico net-pill-top' },
    'PriceRank':     { glyph: ACHIEVEMENTS_ICON, cls: 'net-pill-ico net-pill-rank' },
    'Fresh Wallets': { glyph: '◊︎', cls: 'net-pill-ico net-pill-eth' },
    'New to PD':     { glyph: '‰',         cls: 'net-pill-mille' },
};

/* Colorways shown as the four-square cluster on the left of the sort-bar
   (sim 8443-8446). ColorwayContext has more keys, but only these four
   render in the sim. */
export const THEME_PILLS: {
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

