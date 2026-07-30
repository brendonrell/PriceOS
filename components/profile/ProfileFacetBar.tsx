'use client';

/*
 * ProfileFacetBar — the Collected-tab filter surface.
 *
 * This is the project Artworks bar, ported wholesale: same CSS classes, same
 * shared TraitsContext primitives, same pop-up sort/search/preset rows and
 * multi-select — but driven by what the wallet OWNS (which spans many Projects
 * and artists, ArtBlocks/fxhash style) instead of one Project's trait schema.
 *
 * The pills are the PLATFORM facets every Output carries (from registry
 * outputTraits), in birth-order:
 *
 *   Artist › Project › PriceDay › Sun › Moon › Rising › Fate › Status
 *
 * Each facet's value pool is derived from what the wallet actually OWNS — you
 * only see `@oracle` if you hold an Oracle Output, only see Leo if something you
 * own was born under it. Empty collection → no facets.
 *
 * State rides the shared TraitsContext (activeCategory = open facet,
 * activeFilters[facet] = selected values, searchQuery / priceMin / priceMax,
 * presetRowActive / searchActive / multiSelectActive) and SortContext, so the
 * predicate in ProfilePageBody reads the same state. Pill + bar classes mirror
 * TraitsUI so the house styling applies with no new CSS.
 *
 * The sort/preset/multi-select machinery (CollectedPresetRow, CollectedMsFloatBar)
 * is replicated inline here rather than importing TraitsUI's versions, so the
 * project page stays completely isolated and cannot regress from this work. The
 * preset row uses the 'collected' store scope (its own 3 slots); the float bar
 * reads the cross-Project holdings directly (TraitsUI's reads a single Project).
 */

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import {
    useSort,
    COLLECTED_GROUP_ORDER, GROUP_GLYPH, GROUP_LABEL, groupDimsFor, type GroupKey,
} from '../../lib/state/SortContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { useToast } from '../../lib/state/ToastContext';
import type { OutputTraits } from '../../lib/project/types';
import { isStarred, toggleStar } from '../../lib/pins/starStore';
import { isWishlisted, toggleWishlist } from '../../lib/pins/wishlistStore';
import { addOutputTodo } from '../../lib/todos/todoStore';
import { getArtistStars, toggleArtistStar, subscribeArtistStars } from '../../lib/pins/artistStarStore';
import { getProjectStars, toggleProjectStar, subscribeProjectStars } from '../../lib/pins/projectStarStore';
import { L3Pill, GroupBtn } from '../project/traitsUIPills';
import AlbumPickerCard from '../album/AlbumPickerCard';
import GroupLayersBubble from '../lists/GroupLayersBubble';
import { dimsThatCut, groupSectionLabel } from '../../lib/state/groupDimensions';
import { useMarketSheet } from '../../lib/state/MarketSheetContext';
import { useCart } from '../../lib/state/CartContext';
import {
    getPresets,
    getLoadedIndex,
    savePreset,
    deletePreset,
    setLoadedIndex,
    subscribePresets,
    type PresetEntry,
} from '../../lib/pins/presetStore';

export interface EnrichedHolding {
    slug: string;
    token_id: number;
    list_price_eth: string | null;
    /** Full platform traits (Artist/Project/PriceDay/Sun/Moon/Rising/Fate). */
    traits: OutputTraits;
    listed: boolean;
    /** Mint moment in ms (null until indexed) — feeds the sky groupings
        (moon phase / born-on) without another stored-traits round trip. */
    mintMs?: number | null;
}

/* Facet order = birth-order. 'Status' is the live market facet (derived from
   listing presence), not a stored trait. */
export const PROFILE_FACETS = [
    'Artist', 'Project', 'PriceDay', 'Sun', 'Moon', 'Rising', 'Status', 'Fate',
] as const;

/* Fate's L1 pill wears the I Ching hexagram glyph (matching the project page's
   pill-fate-icon), not the word. Pinned LAST (Brendon, 2026-06-15). */
const FATE_GLYPH = '䷲︎';

/** An Output's value for a given facet — the single source both the bar (value
 *  pools) and the gallery predicate read, so they can never diverge. */
export function facetValueOf(facet: string, h: EnrichedHolding): string | undefined {
    if (facet === 'Status') return h.listed ? 'Listed' : 'Held';
    return h.traits[facet];
}

/** Sort a facet's values sensibly (PriceDay numerically, Status fixed, rest A–Z). */
function sortValues(facet: string, values: string[]): string[] {
    if (facet === 'PriceDay') {
        return [...values].sort(
            (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')),
        );
    }
    if (facet === 'Status') {
        return ['Listed', 'Held'].filter((v) => values.includes(v));
    }
    return [...values].sort((a, b) => a.localeCompare(b));
}

/* Colorway view-mode squares — the four-square cluster on the left of the
   sort-bar (mirrors TraitsUI's THEME_PILLS). */
const THEME_PILLS: { key: ColorwayKey; cls: string; glyph: string; title: string }[] = [
    { key: 'custom', cls: 't-custom', glyph: '◩︎', title: 'Custom Color' },
    { key: 'light',  cls: 't-light',  glyph: '◻︎', title: 'Light' },
    { key: 'dark',   cls: 't-dark',   glyph: '◼︎', title: 'Dark' },
    { key: 'orange', cls: 't-orange', glyph: '▨︎', title: 'Orange' },
];
const THEME_NAMES: Record<string, string> = {
    custom: 'Custom', light: 'Light Mode', dark: 'Dark Mode', orange: 'Orange Mode',
};

export default function ProfileFacetBar({
    holdings,
    isOwnProfile,
    profileAddress,
}: {
    holdings: EnrichedHolding[];
    isOwnProfile: boolean;
    /** The viewed profile's address — keys this Collected grid's grouping memory. */
    profileAddress: string;
}) {
    const {
        activeCategory,
        setActiveCategory,
        clearActiveCategory,
        activeFilters,
        toggleFilter,
        searchQuery,
        setSearchQuery,
        priceMin,
        setPriceMin,
        priceMax,
        setPriceMax,
        hasActiveFilter,
        clearAllFilters,
        searchActive,
        toggleSearch,
        closeSearch,
        presetRowActive,
        togglePresetRow,
        applyPreset,
        multiSelectActive,
        toggleMultiSelect,
    } = useTraits();
    const { sort, dir, feedKind, cycleSort, applySort, group, groupLayers, setGroupLayer, cycleGroup } = useSort();
    /* HOLD the group toggle → pick the three layers by hand (Brendon,
       2026-07-26). The tap still cycles the mains. */
    const [layersAnchor, setLayersAnchor] = useState<{ top: number; centerX: number } | null>(null);
    const { colorway, setColorway } = useColorway();
    const { showToast } = useToast();

    /* Live starred-artist + starred-project sets, so an Artist or Project value
       pill carries the SAME star the rest of the app uses — star an artist on
       their page and it reads as starred here too; long-press it here to unstar
       and the pin drops everywhere. Facets that aren't artists/projects stay
       non-starrable and render exactly as before. */
    const [artistStars, setArtistStars] = useState<readonly string[]>(() => getArtistStars());
    useEffect(() => subscribeArtistStars(setArtistStars), []);
    const [projectStars, setProjectStars] = useState<readonly string[]>(() => getProjectStars());
    useEffect(() => subscribeProjectStars(setProjectStars), []);

    /* For an Artist/Project value pill, the live starred state + the toggle
       (reusing the title-star's stores + toasts). null for non-star facets. */
    const pillStar = (facet: string, value: string): { starred: boolean; toggle: () => void } | null => {
        if (facet === 'Artist') {
            return {
                starred: artistStars.includes(value),
                toggle: () => {
                    const r = toggleArtistStar(value);
                    showToast(r === 'starred' ? 'Added to your Starred Artists List (Private)' : 'Removed from your Starred Artists List');
                },
            };
        }
        if (facet === 'Project') {
            const slug = value.replace(/^@/, '');
            return {
                starred: projectStars.includes(slug),
                toggle: () => {
                    const r = toggleProjectStar(slug);
                    showToast(r === 'starred' ? 'Added to your Starred Projects List (Private)' : 'Removed from your Starred Projects List');
                },
            };
        }
        return null;
    };

    /* Grid sorts (Brendon, 2026-07-12 redesign). #ID / $PRICE / AZ are plain
       direction flips — grouping moved to its own toggle at the start of the
       row (GroupBtn), cycling the Collected order: none → artist → project →
       artist+project → colour → artist+colour → project+colour → last-sold →
       rarity. */
    const effGroup: GroupKey = COLLECTED_GROUP_ORDER.includes(group) ? group : 'none';

    /* Which dimensions can actually cut THIS collection — worked out only while
       the layer menu is open, off the same label engine the grid groups by, so
       the menu can grey out a dimension that would produce one big bucket
       (Brendon, 2026-07-30). */
    const usableDims = useMemo(() => {
        if (!layersAnchor) return undefined;
        return dimsThatCut(holdings, groupDimsFor('collected'), (h, layer) =>
            groupSectionLabel(layer, h.slug, h.token_id, {
                listed: h.listed,
                fate: h.traits.Fate ?? null,
                sun: h.traits.Sun ?? null,
                mintMs: h.mintMs ?? null,
                artist: h.traits.Artist ?? null,
                project: h.traits.Project ?? null,
            }));
    }, [layersAnchor, holdings]);
    const gridSortWithToast = (family: 'id' | 'price' | 'az') => {
        const nextDir = sort === family ? (dir === 'asc' ? 'desc' : 'asc') : 'asc';
        const lbl = family === 'id' ? '#ID' : family === 'price' ? '$PRICE' : 'AZ';
        cycleSort(family);
        showToast('SORT: ' + lbl + ' ' + (nextDir === 'asc' ? '↑' : '↓'));
    };
    /* The pick is remembered for THIS profile's Collected grid (like tabs), so
       the viewer finds it grouped as they left it (Brendon, 2026-07-12). */
    const cycleGroupWithToast = () => {
        const next = cycleGroup(COLLECTED_GROUP_ORDER, { scope: 'profile', id: profileAddress });
        // Toast-casing rule: the category stays normal case, the STATE screams.
        showToast('Group: ' + GROUP_LABEL[next]);
    };

    /* Facet → present value pool, drawn from the owned Outputs. Only facets
       with ≥1 value render. */
    const facetValues = useMemo(() => {
        const m = new Map<string, string[]>();
        for (const facet of PROFILE_FACETS) {
            const seen = new Set<string>();
            for (const h of holdings) {
                const v = facetValueOf(facet, h);
                if (v) seen.add(v);
            }
            if (seen.size > 0) m.set(facet, sortValues(facet, [...seen]));
        }
        return m;
    }, [holdings]);

    const liveFacets = PROFILE_FACETS.filter((f) => facetValues.has(f));
    const openValues = activeCategory && facetValues.get(activeCategory);

    const setColorwayWithToast = (key: ColorwayKey) => {
        setColorway(key);
        if (!key) return;
        /* Custom = the profile owner's colour here — the toast says so
           (Brendon, 2026-07-06; category stays "Custom", toast-only). */
        if (key === 'custom') { showToast('Colorway: Profile Colorway'); return; }
        showToast('Colorway: ' + (THEME_NAMES[key] ?? key));
    };

    if (holdings.length === 0) return null;

    return (
        <>
            <div className="traits-ui" style={{ display: 'flex' }}>
                <div className="traits-header-bar">
                    {/* L1 facet pills + the sort-icons cluster (Grid Presets /
                        Multi-Select / Search), matching the project Artworks
                        header bar's right-side cluster. */}
                    <div className="stats-container" id="traitCategories">
                        {liveFacets.map((facet) => {
                            const isActive = activeCategory === facet;
                            const isFate = facet === 'Fate';
                            const count = activeFilters[facet]?.size ?? 0;
                            const cls = `pill pill-l1${isFate ? ' pill-fate-icon' : ''}${isActive ? ' active' : ''}${
                                activeCategory && !isActive ? ' dimmed' : ''
                            }`;
                            return (
                                <div
                                    key={facet}
                                    className={cls}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => (isActive ? clearActiveCategory() : setActiveCategory(facet))}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            isActive ? clearActiveCategory() : setActiveCategory(facet);
                                        }
                                    }}
                                    title={facet}
                                >
                                    <span className="stat-name">{isFate ? FATE_GLYPH : facet}</span>
                                    {count > 0 && <span className="badge">{count}</span>}
                                </div>
                            );
                        })}
                        {hasActiveFilter && (
                            <div
                                className="pill pill-l1 pill-clear-icon"
                                role="button"
                                tabIndex={0}
                                onClick={clearAllFilters}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearAllFilters(); }
                                }}
                                title="Clear all filters"
                            >
                                <span className="stat-name">✕︎</span>
                            </div>
                        )}

                        {/* Sort-icons cluster — same glyphs/classes as the
                            project header (⏚ Grid Presets · ❐ Multi-Select ·
                            ⌕ Search). Grouped in an inline-flex so it stays
                            glued together when the pill row wraps on mobile. */}
                        <div
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexShrink: 0 }}
                        >
                            <span style={{ marginLeft: 6, display: 'inline-flex' }}>
                                <IconBtn
                                    cls="burn-btn"
                                    glyph={'⏚︎'}
                                    title="Grid Presets"
                                    active={presetRowActive}
                                    onClick={togglePresetRow}
                                />
                            </span>
                            <IconBtn
                                cls="multiselect-btn"
                                glyph={'❐︎'}
                                title="Multi-Select"
                                active={multiSelectActive}
                                onClick={toggleMultiSelect}
                            />
                            <IconBtn
                                cls="search-btn"
                                glyph={'⌕︎'}
                                title="Search"
                                active={searchActive}
                                onClick={toggleSearch}
                            />
                        </div>
                    </div>
                </div>

                {/* L3 value pills for the open facet — direct child of
                    .traits-ui (sibling of .traits-header-bar), matching the
                    project's #statsOutput placement. */}
                {openValues && (
                    <div className="stats-container collected-values" id="statsOutput" style={{ display: 'flex' }}>
                        {openValues.map((value) => {
                            const set = activeFilters[activeCategory!];
                            const isActive = set?.has(value) ?? false;
                            const dimmed = (set?.size ?? 0) > 0 && !isActive;
                            const count = holdings.filter(
                                (h) => facetValueOf(activeCategory!, h) === value,
                            ).length;
                            const star = pillStar(activeCategory!, value);
                            return (
                                <L3Pill
                                    key={value}
                                    label={value}
                                    count={count}
                                    active={isActive}
                                    dimmed={dimmed}
                                    isZero={false}
                                    category={activeCategory!}
                                    starrable={star != null}
                                    starred={star?.starred ?? false}
                                    onToggleStar={star ? star.toggle : undefined}
                                    onClick={() => toggleFilter(activeCategory!, value)}
                                />
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Sort bar — colorway view-mode squares + #ID / $PRICE / FEED sort,
                as a sibling of .traits-ui (matching the project). FEED swaps the
                grid for this wallet's activity feed (Brendon 2026-06-15). */}
            <div className="sort-bar" id="sortOptions" style={{ display: 'flex' }}>
                <div className="colorway-pills">
                    {THEME_PILLS.map((t) => (
                        <div
                            key={t.key ?? 'default'}
                            className={`pill-colorway ${t.cls}${colorway === t.key ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setColorwayWithToast(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setColorwayWithToast(t.key); }
                            }}
                            title={t.title}
                        >
                            <span>{t.glyph}</span>
                        </div>
                    ))}
                </div>
                <div
                    className="sort-btn-group"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}
                >
                    {/* GROUP toggle leads the row (Brendon, 2026-07-12) —
                        icon-only, no arrow; cycles the grouping dimension
                        independently of the sorts. */}
                    <GroupBtn
                        /* The face is the TOP layer's glyph; a + says there are
                           more layers under it (Brendon, 2026-07-30). */
                        glyph={groupLayers.length ? GROUP_GLYPH[groupLayers[0]!] : GROUP_GLYPH[effGroup]}
                        on={groupLayers.length > 0 || effGroup !== 'none'}
                        more={groupLayers.length > 1}
                        onClick={cycleGroupWithToast}
                        onHold={setLayersAnchor}
                    />
                    {layersAnchor && (
                        <GroupLayersBubble
                            surface="collected"
                            layers={groupLayers}
                            usable={usableDims}
                            anchor={layersAnchor}
                            onPick={setGroupLayer}
                            onClose={() => setLayersAnchor(null)}
                        />
                    )}
                    <span
                        className={`sort-btn${sort === 'id' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort by ID"
                        onClick={() => gridSortWithToast('id')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gridSortWithToast('id'); } }}
                    >
                        <span className="sort-lbl">{'#ID'}</span>
                        <span className="sort-arrow">{sort === 'id' ? (dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                    </span>
                    <span
                        className={`sort-btn${sort === 'price' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort by Price"
                        onClick={() => gridSortWithToast('price')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gridSortWithToast('price'); } }}
                    >
                        <span className="sort-lbl">{'$PRICE'}</span>
                        <span className="sort-arrow">{sort === 'price' ? (dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                    </span>
                    <span
                        className={`sort-btn${sort === 'az' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort A–Z by project"
                        onClick={() => gridSortWithToast('az')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); gridSortWithToast('az'); } }}
                    >
                        <span className="sort-lbl">{sort === 'az' && dir === 'desc' ? 'ZA' : 'AZ'}</span>
                        <span className="sort-arrow">{sort === 'az' ? (dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                    </span>
                    <span
                        className={`sort-btn${sort === 'feed' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Activity Feed"
                        onClick={() => cycleSort('feed')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSort('feed'); } }}
                    >
                        <span className="sort-lbl">FEED</span>
                        <span className="sort-arrow">{sort === 'feed' ? `${feedKind === 'price' ? '$' : ''}${dir === 'asc' ? '↑︎' : '↓︎'}` : ''}</span>
                    </span>
                </div>
            </div>

            {/* Grid Presets row — pops up on ⏚. Collected's own 3 slots. */}
            <CollectedPresetRow
                open={presetRowActive}
                sort={sort}
                dir={dir}
                feedKind={feedKind}
                group={effGroup}
                applySort={applySort}
                applyPreset={applyPreset}
                activeFilters={activeFilters}
                activeCategory={activeCategory}
                searchQuery={searchQuery}
                priceMin={priceMin}
                priceMax={priceMax}
            />

            {/* Search + price range — pops up on ⌕ (mirrors the project). */}
            <div className={`search-row${searchActive ? ' open' : ''}`} id="searchRow">
                <input
                    className="search-input"
                    type="text"
                    placeholder="@artist, @project, # id…"
                    autoComplete="off"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur(); }}
                />
                <span className="feed-price-range">
                    <input
                        className="price-input"
                        type="number"
                        placeholder="min"
                        step="0.001"
                        min="0"
                        value={priceMin}
                        onChange={(e) => setPriceMin(e.target.value)}
                    />
                    <span className="price-sep">–</span>
                    <input
                        className="price-input"
                        type="number"
                        placeholder="max"
                        step="0.001"
                        min="0"
                        value={priceMax}
                        onChange={(e) => setPriceMax(e.target.value)}
                    />
                    <span className="price-eth-label">ETH</span>
                </span>
                <span
                    className="search-clear"
                    role="button"
                    tabIndex={0}
                    onClick={closeSearch}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); closeSearch(); } }}
                    title="Clear"
                >
                    ✕&#xFE0E;
                </span>
            </div>

            {/* Multi-select floating action bar — holdings-aware (cross-Project). */}
            <CollectedMsFloatBar holdings={holdings} isOwnProfile={isOwnProfile} />
        </>
    );
}

/* ── IconBtn ─────────────────────────────────────────────────────────── */
/* Copy of TraitsUI's IconBtn (kept local so the project page can't regress
   from this surface). Same classes → same house styling. */
function IconBtn({
    cls, glyph, title, active, onClick,
}: { cls: string; glyph: string; title: string; active: boolean; onClick: () => void }) {
    return (
        <div
            className={`${cls}${active ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={onClick}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
            title={title}
        >
            {glyph}
        </div>
    );
}

/* ── CollectedPresetRow ──────────────────────────────────────────────── */
/*
 * Grid View Presets for the Collected tab — 'collected' store scope, 3 slots.
 * Saves the facet filters too: the facet vocabulary (Artist/Project/Day/Fate)
 * is universal across the whole collection, so they restore cleanly (unlike the
 * shared 'project' scope, which restores trait filters only on the same
 * Project). Account-backed via presetStore.
 */

const SLOT_GLYPHS = ['①', '②', '③'] as const;
const COLLECTED_SCOPE = 'collected';

interface CollectedPresetRowProps {
    open: boolean;
    sort: import('../../lib/state/SortContext').SortKey;
    dir: import('../../lib/state/SortContext').SortDir;
    feedKind: import('../../lib/state/SortContext').FeedKind;
    group: import('../../lib/state/SortContext').GroupKey;
    applySort: (
        sort: import('../../lib/state/SortContext').SortKey,
        dir: import('../../lib/state/SortContext').SortDir,
        feedKind: import('../../lib/state/SortContext').FeedKind,
        group?: import('../../lib/state/SortContext').GroupKey,
    ) => void;
    applyPreset: (state: Parameters<import('../../lib/state/TraitsContext').TraitsContextValue['applyPreset']>[0]) => void;
    activeFilters: import('../../lib/state/TraitsContext').ActiveFilters;
    activeCategory: string | null;
    searchQuery: string;
    priceMin: string;
    priceMax: string;
}

function CollectedPresetRow({
    open,
    sort,
    dir,
    feedKind,
    group,
    applySort,
    applyPreset,
    activeFilters,
    activeCategory,
    searchQuery,
    priceMin,
    priceMax,
}: CollectedPresetRowProps) {
    const { showToast } = useToast();
    const [presets, setPresets] = useState<readonly PresetEntry[]>(() => getPresets(COLLECTED_SCOPE));
    const [loadedIndex, setLoadedIndexState] = useState<number>(() => getLoadedIndex(COLLECTED_SCOPE));

    useEffect(() => {
        return subscribePresets(COLLECTED_SCOPE, (next, idx) => {
            setPresets(next);
            setLoadedIndexState(idx);
        });
    }, []);

    if (!open) return null;

    const handleSave = () => {
        const filtersSnapshot = Object.fromEntries(
            Object.entries(activeFilters).map(([k, v]) => [k, Array.from(v as Set<string>)])
        ) as Record<string, string[]>;
        const { result, index } = savePreset(COLLECTED_SCOPE, {
            sort, dir, feedKind, group,
            activeFilters: filtersSnapshot,
            activeCategory,
            activeFeedCategory: null,
            activeSubFilter: 'All',
            myNotesActive: false,
            searchQuery,
            priceMin,
            priceMax,
        });
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} ${result === 'replaced' ? 'REPLACED' : 'SAVED'}`);
    };

    const handleRecall = (index: number, preset: PresetEntry) => {
        const s = preset.state;
        applySort(s.sort, s.dir, s.feedKind, s.group ?? 'none');
        const restoredFilters = Object.fromEntries(
            Object.entries(s.activeFilters).map(([k, arr]) => [k, new Set(arr as string[])])
        ) as unknown as import('../../lib/state/TraitsContext').ActiveFilters;
        applyPreset({
            activeFilters: restoredFilters,
            activeCategory: s.activeCategory,
            activeSubFilter: 'All',
            searchQuery: s.searchQuery,
            priceMin: s.priceMin,
            priceMax: s.priceMax,
        });
        setLoadedIndex(COLLECTED_SCOPE, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} LOADED`);
    };

    const handleDelete = (e: ReactMouseEvent, index: number) => {
        e.stopPropagation();
        deletePreset(COLLECTED_SCOPE, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} CLEARED`);
    };

    return (
        <div className="preset-row open">
            <button
                className="pill-preset pill-preset--save"
                onClick={handleSave}
                title="Save current view as preset"
            >
                SAVE
            </button>
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
                                    handleDelete(e as unknown as ReactMouseEvent, index);
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

/* ── CollectedMsFloatBar ─────────────────────────────────────────────── */
/*
 * Multi-select action bar for the Collected gallery. Same visual shell + ms-*
 * classes as TraitsUI's MsFloatBar, but its output lookup reads the cross-
 * Project holdings (keyed by `${slug}:${id}`) instead of a single Project's
 * outputs map. Action set adapts to whether you're viewing your OWN profile
 * (everything shown is yours → list/transfer/showcase) or someone else's
 * (buyer actions). All actions stub to a toast for v0 (parity with the
 * project bar, whose actions are mostly stubs pending the market wiring).
 */
function CollectedMsFloatBar({
    holdings,
    isOwnProfile,
}: {
    holdings: EnrichedHolding[];
    isOwnProfile: boolean;
}) {
    const { multiSelectActive, selectedItems, selectedCount } = useTraits();
    const { showToast } = useToast();
    const { openListSheet, openOfferSheet, openTraitPicker } = useMarketSheet();
    const { add: cartAdd, has: cartHas, openPanel: openCartPanel } = useCart();
    const [popupOpen, setPopupOpen] = useState(false);
    const [activeAction, setActiveAction] = useState<string | null>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [albumPickerOpen, setAlbumPickerOpen] = useState(false);

    const byKey = useMemo(() => {
        const m = new Map<string, EnrichedHolding>();
        for (const h of holdings) m.set(`${h.slug}:${h.token_id}`, h);
        return m;
    }, [holdings]);

    useEffect(() => {
        if (!multiSelectActive) { setPopupOpen(false); setActiveAction(null); setConfirmOpen(false); setAlbumPickerOpen(false); }
    }, [multiSelectActive]);

    if (!multiSelectActive) return null;

    const count = selectedCount;
    const countLabel = count === 1 ? '1 output' : `${count} outputs`;
    const selected = selectedItems
        .map((it) => byKey.get(`${it.slug}:${it.id}`))
        .filter((h): h is EnrichedHolding => h != null);
    const allListed = selected.length > 0 && selected.every((h) => h.listed);

    interface Action { label: string; }
    const actions: Action[] = [
        { label: 'Star' },
        { label: 'Wishlist' },
        { label: 'Add to Album' },
        { label: 'Make To-Do' },
    ];
    if (isOwnProfile) {
        actions.push(
            { label: 'Add to Showcase' },
            { label: 'List/Re-List' },
            { label: 'Transfer' },
        );
    } else {
        actions.push({ label: 'Make Offer' });
        if (allListed) actions.push({ label: 'Add to Cart' });
    }
    /* Trait Offer — the one-selected general-purpose tool (any output). */
    if (count === 1) actions.push({ label: 'Trait Offer' });

    const current = count === 0 ? 'Select' : (activeAction ?? 'Add to Album');

    /* Real save-triad execs (Brendon, 2026-06-12) — mirrors the project bar
       (TraitsUI MsFloatBar): Star / Wishlist apply idempotently, Add to
       Album routes through the picker card. Everything else stays a
       coming-soon stub until its flow ships. */
    const handleStarAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isStarred(slug, id)) { toggleStar(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY STARRED' : `Added ${added} to your Starred Outputs List (Private)`);
    };
    const handleWishlistAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (!isWishlisted(slug, id)) { toggleWishlist(slug, id); added++; }
        });
        showToast(added === 0 ? 'ALL ALREADY WISHLISTED' : `Added ${added} to your Wishlist (Private)`);
    };
    /* Make To-Do — the artwork ❍ across the selection (was a coming-soon stub). */
    const handleTodoAll = () => {
        let added = 0;
        selectedItems.forEach(({ slug, id }) => {
            if (addOutputTodo(slug, id, 'BUY') === 'added') added++;
        });
        showToast(added === 0 ? 'To-Do: ALL ALREADY ADDED' : added === 1 ? 'To-Do: ADDED' : `To-Dos: ADDED · ${added}`);
    };

    const sheetItems = () => selected.map((h) => ({
        slug: h.slug,
        id: h.token_id,
        currentPriceEth: h.list_price_eth != null && parseFloat(h.list_price_eth) > 0
            ? parseFloat(h.list_price_eth).toFixed(3)
            : null,
    }));

    const handleExec = () => {
        if (count === 0) return;
        setPopupOpen(false);
        /* Album picker is its own confirmation — see TraitsUI MsFloatBar.
           Same for the market sheets (pricing + CONFIRM live in the sheet). */
        if (current === 'Add to Album') {
            setAlbumPickerOpen(true);
            return;
        }
        if (current === 'List/Re-List' || current === 'Make Offer') {
            if (selected.length === 0) { showToast(`${current}: NONE ELIGIBLE`); return; }
            if (current === 'List/Re-List') openListSheet(sheetItems());
            else openOfferSheet(sheetItems());
            return;
        }
        if (current === 'Trait Offer') {
            const it = selectedItems[0];
            if (it) openTraitPicker(it.slug, it.id);
            return;
        }
        setConfirmOpen(true);
    };
    const handleConfirm = () => {
        setConfirmOpen(false);
        if (current === 'Star') { handleStarAll(); return; }
        if (current === 'Wishlist') { handleWishlistAll(); return; }
        if (current === 'Make To-Do') { handleTodoAll(); return; }
        if (current === 'Add to Cart') {
            let added = 0;
            for (const h of selected) {
                if (h.listed && !cartHas(h.slug, h.token_id)) { cartAdd(h.slug, h.token_id); added++; }
            }
            if (added === 0) showToast('Cart: ALL ALREADY ADDED');
            else showToast(`Cart: ADDED · ${added} item${added === 1 ? '' : 's'}`);
            openCartPanel();
            return;
        }
        showToast(`${current} · ${countLabel}: COMING SOON`);
    };

    return (
        <div className="ms-float-bar" role="toolbar" aria-label="Multi-select actions">
            {albumPickerOpen && (
                <AlbumPickerCard
                    items={selectedItems}
                    onDone={(msg) => { setAlbumPickerOpen(false); showToast(msg); }}
                    onClose={() => setAlbumPickerOpen(false)}
                />
            )}
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
                            onPointerDown={() => { setActiveAction(a.label); setPopupOpen(false); }}
                        >
                            {a.label}
                            {a.label === current && <span className="ms-popup-card-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}
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
                    onClick={(e) => { e.stopPropagation(); setPopupOpen((v) => !v); }}
                    title="Choose action"
                    aria-label="Choose action"
                >
                    {'▾︎'}
                </button>
            </div>
            <div className="ms-float-count">
                {count === 0 ? '—' : countLabel}
            </div>
        </div>
    );
}
