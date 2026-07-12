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
import { formatEth } from '../../lib/format/eth';
import { PerMilleMark } from '../shell/PerMilleMark';
import { ACHIEVEMENTS_ICON } from '../../lib/achievements/icon';
import { useTraits, type TraitCategory, type FeedCategory } from '../../lib/state/TraitsContext';
import {
    useSort,
    type SortKey, type SortDir, type FeedKind, type GroupKey,
    PROJECT_GROUP_ORDER, GROUP_GLYPH, GROUP_LABEL,
} from '../../lib/state/SortContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { usePersona } from '../../lib/state/PersonaContext';
import { useCart } from '../../lib/state/CartContext';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import { getActiveBudgetEth } from '../../lib/engines/budgetEngine';
import { useAuth } from '../../lib/state/AuthContext';
import { outputFate, FATE_VALUES } from '../../lib/project/fate';
import { useProject } from '../../lib/state/ProjectContext';
import { fullTraitSchema, outputTraits } from '../../lib/project/registry';
import { getGrails, subscribeGrails, MAX_GRAIL_PINS, type GrailPin } from '../../lib/pins/grailStore';
import { isStarred, toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist } from '../../lib/pins/wishlistStore';
import { toggleTraitStar, traitStarKey, subscribeTraitStarred } from '../../lib/pins/traitStarStore';
import { getRecentGlobal, subscribeBreadcrumbs, isRecordingEnabled } from '../../lib/pins/breadcrumbStore';
import { useModal } from '../../lib/state/ModalContext';
import AlbumPickerCard from '../album/AlbumPickerCard';
import SpriteFace from '../SpriteFace';
import { getSpriteFrame, subscribeSprite, type SpriteFrame } from '../../lib/engines/priceSpriteEngine';
import MsFloatBar from './MsFloatBar';
import PresetRow from './PresetRow';
import { BarPill, SubPill, L3Pill, IconBtn, SortBtn, GroupBtn } from './traitsUIPills';
import {
    SORT_LABELS, computeNextSortKey, SORT_BAR_THEME_NAMES,
    FEED_TRAIT_PILLS, LAYERS, MINERALS, OMEN_TRAITS,
    L2_DICT, L3_FLAT_POOL, NET_VALUE_ICON, THEME_PILLS,
} from './traitsUIShared';

/* Profile Page v0 — when ProfilePageBody mounts TraitsUI on the
   `+ More` tab, the L1 trait pill cluster is swapped to profile-mode
   pills (Starred / Wishlists / Albums). The sort surfaces (sort-icons
   cluster + sort-btn-group #ID/$PRICE/FEED) are hidden via the sibling
   `hideSortBar` prop. The view-mode switcher (.colorway-pills, four
   squares) stays visible. Pill selection is visual-only for v0 — no
   gallery filter wiring behind it. */
export interface ProfilePill {
    key: string;
    label: ReactNode;
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
    /* Optional node rendered at the END of the profilePills row (e.g. a search
       icon beside the last pill). Profile-mode only. */
    profilePillsTrailing?: ReactNode;
    /* Optional sort controls rendered in the sort-bar beside the colorway
       picker (profile +More — Starred/Wishlist sorts live here, same spot +
       font as the project sorts). */
    profileSortControls?: ReactNode;
    /* Optional pop-out value row rendered directly under the L1 profilePills
       and ABOVE the colorway/sort bar — the same slot the Collected tab's
       value pills (↳ value) occupy. Profile +More uses it for the Starred
       sub-category pills (All Starred / Collectors / …). */
    profileValueRow?: ReactNode;
}

export default function TraitsUI({
    visible,
    hideSortBar = false,
    profilePills,
    profilePillsTrailing,
    profileSortControls,
    profileValueRow,
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
        clearAllFilters,
    } = useTraits();
    const { showToast } = useToast();
    const { isAuthenticated } = useAuth();
    /* The "Me" Network value pill wears the signed-in user's LIVE animated
       PriceSprite (Brendon, 2026-06-24) — the same engine frame the connect-menu
       sprite uses, so it blinks / turns / yawns in the pill. No identity yet
       (signed out / pre-claim) → null, and the pill falls back to plain "Me". */
    const [spriteFrame, setSpriteFrame] = React.useState<SpriteFrame>(() => getSpriteFrame());
    React.useEffect(() => {
        setSpriteFrame(getSpriteFrame());
        return subscribeSprite(() => setSpriteFrame(getSpriteFrame()));
    }, []);
    const meFace = spriteFrame.hasIdentity ? spriteFrame.face : null;
    /* Recent (Breadcrumb) L3 = the 5 most-recent visits ACROSS THE WHOLE SITE,
       freshest first. Each pill shows its rank + the Project @name + #id; crumbs
       from the Project being viewed are lit, the rest sit at half opacity. Live
       via the breadcrumb store (Brendon, 2026-06-24). */
    const [recentGlobal, setRecentGlobal] = React.useState<{ slug: string; id: number }[]>([]);
    /* History recording on/off — when off, Recent shows masked crumbs (Brendon,
       2026-06-24). Re-read alongside the trail (emit fires on the toggle too). */
    const [recording, setRecording] = React.useState(true);
    const { open: openModal } = useModal();
    const { sort, dir, feedKind, cycleSort, setSort, applySort, group, cycleGroup } = useSort();
    /* A group persisted on another surface (e.g. 'artist' from a profile) isn't a
       project-page dimension — show it as off here so the glyph matches reality. */
    const effGroup: GroupKey = PROJECT_GROUP_ORDER.includes(group) ? group : 'none';
    const { colorway, setColorway } = useColorway();
    const { persona } = usePersona();

    /* Trait pills are driven by the ACTIVE Project's schema (registry), not
       hardcoded to any one Project's trait names (the old hardcoding was to
       KIKI, PD's genesis project). Fate is pinned separately (icon pill),
       so it's excluded from the dynamic L1 row. The fixed network/feed/market
       specials come from L2_DICT; the feed-mode 'Traits' wrapper is rebuilt
       from the Project's trait names. */
    const { slug: projectSlug, totalOutputs } = useProject();

    React.useEffect(() => {
        const read = () => { setRecentGlobal(getRecentGlobal(5)); setRecording(isRecordingEnabled()); };
        read();
        return subscribeBreadcrumbs(read);
    }, []);

    /* Starred Traits (Brendon, 2026-06-18) — long-press a trait value pill to
       favourite that (Project, category, value); it lands as its own row in
       +More → Starred with a Trait Offer action. Subscribed so the pill's ★
       indicator flips live. A real project trait only — the feed-special pills
       (Network / Recent / Event / Market) aren't token traits and aren't
       starrable (gated on gridCounts below). */
    const [traitStarKeys, setTraitStarKeys] = React.useState<ReadonlySet<string>>(new Set());
    /* Standing criteria bids on this project — category|value → best ETH.
       One read per project view (+ refresh after any market action). */
    const [traitBids, setTraitBids] = React.useState<Record<string, string>>({});
    React.useEffect(() => {
        if (!projectSlug) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/market/orders?project=${encodeURIComponent(projectSlug)}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancelled || !d) return;
                    const map: Record<string, string> = {};
                    for (const o of (d.offers ?? []) as { scope: string; criteria?: { category?: string; value?: string } | null; price_eth: string | number }[]) {
                        if (o.scope !== 'trait' || !o.criteria?.category || !o.criteria?.value) continue;
                        const k = `${o.criteria.category}|${o.criteria.value}`;
                        const n = Number(o.price_eth);
                        if (!(k in map) || n > Number(map[k])) map[k] = formatEth(n);
                    }
                    setTraitBids(map);
                })
                .catch(() => {});
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [projectSlug]);
    React.useEffect(() => subscribeTraitStarred((next) => setTraitStarKeys(next)), []);
    const handleTraitStar = (category: string, value: string) => {
        const r = toggleTraitStar(projectSlug, category, value);
        showToast(
            r === 'starred'
                ? 'Added to your Starred Traits List (Private)'
                : 'Removed from your Starred Traits List',
        );
    };

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

    /* Grid sorts (Brendon, 2026-07-12 redesign). #ID / $PRICE are plain
       direction flips again — grouping moved to its own toggle at the start of
       the row (GroupBtn). Toast calls out the state it lands on (ALLCAPS). */
    const gridSortWithToast = (family: SortKey) => {
        const nextDir = sort === family ? (dir === 'asc' ? 'desc' : 'asc') : 'asc';
        const lbl = family === 'id' ? '#ID' : family === 'price' ? '$PRICE' : family.toUpperCase();
        cycleSort(family);
        showToast('SORT: ' + lbl + ' ' + (nextDir === 'asc' ? '↑' : '↓'));
    };

    /* The group toggle's tap — advance the project-page grouping cycle
       (none → owner → colour → owner+colour → last-sold → rarity). */
    const cycleGroupWithToast = () => {
        const next = cycleGroup(PROJECT_GROUP_ORDER);
        // Toast-casing rule: the category stays normal case, the STATE screams.
        showToast('Group: ' + GROUP_LABEL[next]);
    };

    /* Wraps setColorway with a toast (mirrors ColorwayPicker.tsx). */
    const setColorwayWithToast = (key: ColorwayKey) => {
        setColorway(key);
        if (!key) return;
        /* Custom = this project's colorway — the toast says so (Brendon,
           2026-07-06; category stays "Custom", toast-only). */
        if (key === 'custom') { showToast('Colorway: Project Colorway'); return; }
        showToast('Colorway: ' + (SORT_BAR_THEME_NAMES[key] ?? key));
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
        /* Recent (Breadcrumb) — either/or. 'My Breadcrumbs' (default) = the 5
           most-recent global visits, freshest first, encoded `slug:id`. "What's
           Hot" = empty for now (wires into the view counter later). */
        if (activeL1 === 'Breadcrumb') {
            if (activeSubFilter === "What's Hot") return [];
            /* Recording off — keep 5 numbered crumbs but mask each destination
               (Brendon, 2026-06-24). '???' is the masked sentinel. */
            if (!recording) return ['???', '???', '???', '???', '???'];
            return recentGlobal.map((b) => `${b.slug}:${b.id}`);
        }
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
                                    /* Same dim as Collected's trait pills: the
                                       non-active pills dim while one is active. */
                                    dimmed={!p.active}
                                    onClick={p.onClick}
                                />
                            ))
                        ) : null}
                        {profilePills && profilePillsTrailing}
                        {!profilePills && (
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

                        {/* Feed-mode Clear — feed is the row regular personas
                            see, so the ✕ must live here too. Final pill, just
                            the glyph (Brendon, 2026-06-18). */}
                        {isFeed && hasActiveFilter && (
                            <BarPill
                                label={'✕︎'}
                                active={false}
                                dimmed={false}
                                onClick={clearAllFilters}
                                title="Clear all filters"
                                extraClass="pill-clear-icon"
                            />
                        )}

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

                                {/* Recent — only shown when logged in. Pulled
                                    out of the sort-icons cluster (Brendon,
                                    2026-06-18) so the icon group no longer
                                    grabs a trait pill; Recent is now a normal
                                    trailing pill and Clear stays the final
                                    pill in the row. */}
                                {isAuthenticated && (
                                <BarPill
                                    label={"◷︎"}
                                    active={activeCategory === 'Breadcrumb'}
                                    dimmed={
                                        activeCategory !== null &&
                                        activeCategory !== 'Breadcrumb'
                                    }
                                    count={countOf('Breadcrumb')}
                                    onClick={
                                        activeCategory === 'Breadcrumb'
                                            ? clearActiveCategory
                                            : () => setActiveCategory('Breadcrumb')
                                    }
                                    title="Recent — recently-seen tokens"
                                    extraClass="pill-breadcrumb"
                                />
                                )}

                                {/* Clear — pops up only while a filter is
                                    active, drains every selected trait value in
                                    one tap. Just the ✕ glyph, always the final
                                    pill in the row (Brendon, 2026-06-18). */}
                                {hasActiveFilter && (
                                    <BarPill
                                        label={'✕︎'}
                                        active={false}
                                        dimmed={false}
                                        onClick={clearAllFilters}
                                        title="Clear all filters"
                                        extraClass="pill-clear-icon"
                                    />
                                )}

                                {/* Recent + icon cluster — sim 8551-8557.
                                    Wrapped in inline-flex so they stay together when
                                    the row wraps on mobile (sim parity, sim 8551).
                                    Profile Page v0 — hidden entirely via hideSortBar
                                    so the +More tab only shows the L1 profilePills. */}
                                {!hideSortBar && (
                                    <div
                                        className="sort-icons"
                                        style={{
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            gap: 8,
                                            flexShrink: 0,
                                        }}
                                    >
                                        <span style={{ marginLeft: 6, display: 'inline-flex' }}>
                                        <IconBtn
                                            cls="burn-btn"
                                            glyph={'⏚\uFE0E'}
                                            title="Grid Presets"
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

                {/* Profile +More pop-out value row (sibling of
                    `.traits-header-bar`, same slot as the Collected value
                    pills): the active L1's sub-categories pop out here, above
                    the sort bar. */}
                {profileValueRow}

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
                        l3Pool.map((value, idx) => {
                            /* Recent pills — global trail: `(rank) @name #id`,
                               half-dimmed when from another Project, tap opens
                               that artwork (Brendon, 2026-06-24). */
                            if (l3FilterCat === 'Breadcrumb') {
                                /* Recording off — masked crumb: keep the rank,
                                   hide the destination, no tap (Brendon). */
                                if (value === '???') {
                                    return (
                                        <L3Pill
                                            key={`bc:masked:${idx}`}
                                            label={`(${idx + 1}) ???`}
                                            count={-1}
                                            active={false}
                                            dimmed={false}
                                            isZero={false}
                                            category="Breadcrumb"
                                            halfDim={false}
                                            inert
                                            starrable={false}
                                            meFace={meFace}
                                            onClick={() => {}}
                                        />
                                    );
                                }
                                const ci = value.indexOf(':');
                                const bSlug = value.slice(0, ci);
                                const bId = value.slice(ci + 1);
                                const otherProject = bSlug !== projectSlug;
                                return (
                                    <L3Pill
                                        key={`bc:${value}`}
                                        label={`(${idx + 1}) @${bSlug} #${bId}`}
                                        count={-1}
                                        active={false}
                                        dimmed={false}
                                        isZero={false}
                                        category="Breadcrumb"
                                        halfDim={otherProject}
                                        inert={otherProject}
                                        starrable={false}
                                        meFace={meFace}
                                        onClick={() => openModal('output', Number(bId), bSlug)}
                                    />
                                );
                            }
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
                            /* Hide trait values with nothing minted yet — a "0"
                               spoils the surprise of an unrevealed value (Brendon,
                               2026-06-18). count < 0 = feed-special category with no
                               tally, which still shows. */
                            if (count === 0) return null;
                            /* Starrable only for real token traits (those with a
                               grid tally); feed-special categories can't be
                               favourited. */
                            const starrable = hasCount;
                            const traitStarred =
                                starrable &&
                                traitStarKeys.has(traitStarKey(projectSlug, l3FilterCat, value));
                            return (
                                <L3Pill
                                    key={`${l3FilterCat}:${value}`}
                                    label={value}
                                    count={count}
                                    active={isActive}
                                    dimmed={dimmed}
                                    isZero={count === 0}
                                    category={l3FilterCat}
                                    meFace={meFace}
                                    starrable={starrable}
                                    starred={traitStarred}
                                    bidEth={starrable ? traitBids[`${l3FilterCat}|${value}`] ?? null : null}
                                    onToggleStar={() => handleTraitStar(l3FilterCat, value)}
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
                {/* Profile +More — Starred/Wishlist sorts sit here beside the
                    colorway picker (same sort-bar font + .sort-btn styling as
                    the project sorts). */}
                {profileSortControls}
                {/* Profile Page v0 — .sort-btn-group hides under
                    hideSortBar. The four-square view-mode switcher
                    (.colorway-pills above) stays visible. */}
                {!hideSortBar && (
                <div
                    className="sort-btn-group"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        flexWrap: 'nowrap',
                    }}
                >
                    {/* GROUP toggle leads the row (Brendon, 2026-07-12) —
                        icon-only, no arrow; cycles the grouping dimension
                        independently of the sorts. */}
                    <GroupBtn
                        glyph={GROUP_GLYPH[effGroup]}
                        on={effGroup !== 'none'}
                        onClick={cycleGroupWithToast}
                    />
                    <SortBtn
                        label={'#ID'}
                        family="id"
                        active={sort === 'id'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => gridSortWithToast('id')}
                    />
                    <SortBtn
                        label={'$PRICE'}
                        family="price"
                        active={sort === 'price'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => gridSortWithToast('price')}
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
                group={effGroup}
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

