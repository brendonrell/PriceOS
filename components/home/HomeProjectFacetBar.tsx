'use client';

/*
 * HomeProjectFacetBar — the Now Minting control surface, transplanted from the
 * profile Collected tab (ProfileFacetBar) but operating on PROJECTS instead of
 * Outputs. Each carousel (one project) is treated the way a single Output is on
 * Collected: a project is "born" at upload, so it carries the same birth-order
 * platform facets (Artist · @name · PriceDay · Sun · Moon · Rising · Fate) plus
 * a live Status (mint progress). Same house classes as the project + profile
 * bars, so it inherits the exact styling with no new CSS.
 *
 * Differences from Collected, by design (Brendon, 2026-06-15):
 *   - Facets are project-level (registry projectTraits), not per-Output.
 *   - The price range filters MINT PRICE (each project has one).
 *   - Sort row is Date (birth order) + $ Mint, no #ID / FEED.
 *   - Multi-select still acts on the Output cards in the carousels, with the
 *     action set adapting per piece's ownership (HomeMsFloatBar) — home is the
 *     one mixed-ownership zone.
 *
 * Sort state is LOCAL to the home page (passed in as props), deliberately NOT
 * the global SortContext: that context is one shared instance persisted to
 * localStorage, so driving it here would change the project pages' default sort.
 */

import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { useToast } from '../../lib/state/ToastContext';
import type { OutputTraits } from '../../lib/project/types';
import {
    getPresets,
    getLoadedIndex,
    savePreset,
    deletePreset,
    setLoadedIndex,
    subscribePresets,
    type PresetEntry,
} from '../../lib/pins/presetStore';
import HomeMsFloatBar from './HomeMsFloatBar';
import { STATUS_LADDER } from '../../lib/home/milestones';
import { getArtistStars, toggleArtistStar, subscribeArtistStars } from '../../lib/pins/artistStarStore';
import { getProjectStars, toggleProjectStar, subscribeProjectStars } from '../../lib/pins/projectStarStore';
import { L3Pill } from '../project/traitsUIPills';
import { moodOfDay } from '../../lib/mood/mood';

/** One minting project, enriched with its computed birth-traits + mint price. */
export interface EnrichedProject {
    slug: string;
    title: string;
    mintPriceEth: number;
    /** Minted so far — seeds each carousel's project provider. */
    minted: number;
    /** Upload moment (Unix ms) — the project's birthday; source of its astrology
        / PriceDay traits. */
    birthMs: number | null;
    /** When it crossed 18 mints into Now Minting (Unix ms) — the Date sort key,
        so a fresh graduate pops to the top. Null sorts last. */
    reachedMs: number | null;
    /** Platform traits: Artist · Project(@name) · PriceDay · Sun · Moon · Rising · Fate · Status. */
    traits: OutputTraits;
}

/* Local sort model for the home sort-bar (kept off the global SortContext).
   'feed' swaps the carousels for the activity feed (new-art events for now;
   more event kinds later — Brendon 2026-06-15). 'az' sorts by project name.
   'social' ☻ swaps them for the social feed — your graph's market activity
   (top users when logged out), Brendon 2026-07-26. */
export type HomeSortKey = 'date' | 'price' | 'feed' | 'az' | 'social';
export type HomeSortDir = 'asc' | 'desc';

/* Facet order = birth-order; Fate is pinned LAST as the hexagram pill (Brendon,
   2026-06-15), matching the project page. */
export const HOME_FACETS = [
    'Artist', 'Project', 'PriceDay', 'Sun', 'Moon', 'Rising', 'Status', 'Fate',
] as const;

/* Fate's L1 pill wears the I Ching hexagram glyph (same as the project page's
   pill-fate-icon), not the word. */
const FATE_GLYPH = '䷲︎';

/** A project's value for a facet — single source both the value pools and the
 *  predicate in HomePageBody read, so they can't diverge. */
export function projectFacetValueOf(facet: string, p: EnrichedProject): string | undefined {
    return p.traits[facet];
}

/** Sort a facet's values (PriceDay numeric, Status by progress, rest A–Z). */
function sortValues(facet: string, values: string[]): string[] {
    if (facet === 'PriceDay') {
        return [...values].sort(
            (a, b) => Number(a.replace(/\D/g, '')) - Number(b.replace(/\D/g, '')),
        );
    }
    if (facet === 'Status') {
        // Order by the milestone ladder (Graduated → … → Hi-Def), keep present.
        return STATUS_LADDER.map((s) => s.label).filter((v) => values.includes(v));
    }
    return [...values].sort((a, b) => a.localeCompare(b));
}

/* Colorway view-mode squares — identical cluster to ProfileFacetBar / TraitsUI. */
const THEME_PILLS: { key: ColorwayKey; cls: string; glyph: string; title: string }[] = [
    { key: 'custom', cls: 't-custom', glyph: '◩︎', title: 'Custom Color' },
    { key: 'light',  cls: 't-light',  glyph: '◻︎', title: 'Light' },
    { key: 'dark',   cls: 't-dark',   glyph: '◼︎', title: 'Dark' },
    { key: 'orange', cls: 't-orange', glyph: '▨︎', title: 'Orange' },
];
const THEME_NAMES: Record<string, string> = {
    custom: 'Custom', light: 'Light Mode', dark: 'Dark Mode', orange: 'Orange Mode',
};

/** A leading view-toggle pill (e.g. Created · Top 6 on the artist showcase),
 *  rendered before the facet pills in the same row. */
export interface FacetLeadPill {
    key: string;
    label: string;
    active: boolean;
    onClick: () => void;
}

export default function HomeProjectFacetBar({
    projects,
    sortKey,
    sortDir,
    onSort,
    applySort,
    facets,
    leadPills,
    compact = false,
}: {
    projects: EnrichedProject[];
    sortKey: HomeSortKey;
    sortDir: HomeSortDir;
    /** Click a sort button — flips dir if already active, else enters at default. */
    onSort: (key: HomeSortKey) => void;
    /** Restore a sort snapshot (Grid Presets). */
    applySort: (key: HomeSortKey, dir: HomeSortDir) => void;
    /** Facet pills to offer (default: the full home set). The artist showcase
        drops Artist + Project (redundant for a single artist) and leads with
        Created · Top 6 view-toggle pills instead. */
    facets?: readonly string[];
    /** View-toggle pills rendered before the facet pills (Created · Top 6). */
    leadPills?: FacetLeadPill[];
    /** Strip everything but the lead pills + colorway squares — used by the
        Top 6 grid view, where facet filtering / sorting don't apply. */
    compact?: boolean;
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
    const { colorway, setColorway } = useColorway();
    const { showToast } = useToast();

    /* Live starred-artist + starred-project sets, so an Artist or Project value
       pill carries the SAME star the rest of the app uses — star an artist or
       project on its page and it reads as starred here too; long-press here to
       unstar. Other facets stay non-starrable and render exactly as before. */
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

    /* No saved pick (logged-out / first visit) = the Custom colorway, which on
       home is the daily Mood Ring the page is already painted in. So the picker
       lands on Custom rather than nothing highlighted (Brendon, 2026-06-15). */
    const activeColorway = colorway ?? 'custom';

    const facetList = facets ?? HOME_FACETS;

    /* Facet → present value pool, from the live minting projects. Only facets
       with ≥1 value render. */
    const facetValues = useMemo(() => {
        const m = new Map<string, string[]>();
        for (const facet of facetList) {
            const seen = new Set<string>();
            for (const p of projects) {
                const v = projectFacetValueOf(facet, p);
                if (v) seen.add(v);
            }
            if (seen.size > 0) m.set(facet, sortValues(facet, [...seen]));
        }
        return m;
    }, [projects, facetList]);

    const liveFacets = facetList.filter((f) => facetValues.has(f));
    const openValues = activeCategory && facetValues.get(activeCategory);

    const setColorwayWithToast = (key: ColorwayKey) => {
        setColorway(key);
        if (!key) return;
        if (key === 'custom') {
            /* Custom resolves per page, so the toast spells out what it
               painted (Brendon, 2026-07-06): home = today's Mood Ring (the
               footer's read); the artist showcase rides a profile, where
               Custom = the profile colour. Category stays "Custom" — the
               wording change is toast-only. */
            if (typeof window !== 'undefined' && window.location.pathname === '/') {
                const mood = moodOfDay();
                showToast(`Colorway: Mood Ring · ${mood.name} [${mood.hex}]`);
            } else {
                showToast('Colorway: Profile Colorway');
            }
            return;
        }
        showToast('Colorway: ' + (THEME_NAMES[key] ?? key));
    };

    const arrow = (key: HomeSortKey) =>
        sortKey === key ? (sortDir === 'asc' ? '↑︎' : '↓︎') : '';

    if (projects.length === 0 && !leadPills) return null;

    return (
        <div className="home-facet-bar">
            <div className="traits-ui" style={{ display: 'flex' }}>
                <div className="traits-header-bar">
                    <div className="stats-container" id="traitCategories">
                        {leadPills?.map((p) => (
                            <div
                                key={p.key}
                                className={`pill pill-l1${p.active ? ' active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={p.onClick}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); p.onClick(); }
                                }}
                                title={p.label}
                            >
                                <span className="stat-name">{p.label}</span>
                            </div>
                        ))}
                        {!compact && liveFacets.map((facet) => {
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
                        {!compact && hasActiveFilter && (
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

                        {/* Sort-icons cluster — ⏚ Grid Presets · ❐ Multi-Select ·
                            ⌕ Search (same glyphs/classes as the Collected bar). */}
                        {!compact && (
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
                        )}
                    </div>
                </div>

                {/* L3 value pills for the open facet. */}
                {!compact && openValues && (
                    <div className="stats-container" id="statsOutput" style={{ display: 'flex' }}>
                        {openValues.map((value) => {
                            const set = activeFilters[activeCategory!];
                            const isActive = set?.has(value) ?? false;
                            const dimmed = (set?.size ?? 0) > 0 && !isActive;
                            const count = projects.filter(
                                (p) => projectFacetValueOf(activeCategory!, p) === value,
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

            {/* Sort bar — colorway squares + Date (birth order) / $ Mint. Hidden
               entirely in the Top 6 (compact) view so the colorway picker doesn't
               show there; in compact the sort buttons are already gone, leaving
               only the picker (Brendon, 2026-06-17). */}
            {!compact && (
            <div className="sort-bar" id="sortOptions" style={{ display: 'flex' }}>
                <div className="colorway-pills">
                    {THEME_PILLS.map((t) => (
                        <div
                            key={t.key ?? 'default'}
                            className={`pill-colorway ${t.cls}${activeColorway === t.key ? ' active' : ''}`}
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
                {!compact && (
                <div
                    className="sort-btn-group"
                    style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'nowrap' }}
                >
                    <span
                        className={`sort-btn${sortKey === 'date' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort by date (newest / oldest)"
                        onClick={() => onSort('date')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort('date'); } }}
                    >
                        {/* Date sort wears the canonical ◷ clock glyph, not the
                            word (Brendon, 2026-07-12) — same treatment as the
                            Starred/Wishlist Recent sort. */}
                        <span className="sort-lbl sort-lbl-recent">◷︎</span>
                        <span className="sort-arrow">{arrow('date')}</span>
                    </span>
                    <span
                        className={`sort-btn${sortKey === 'price' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort by mint price"
                        onClick={() => onSort('price')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort('price'); } }}
                    >
                        <span className="sort-lbl">{'$PRICE'}</span>
                        <span className="sort-arrow">{arrow('price')}</span>
                    </span>
                    <span
                        className={`sort-btn${sortKey === 'az' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Sort A–Z by name"
                        onClick={() => onSort('az')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort('az'); } }}
                    >
                        <span className="sort-lbl">{sortKey === 'az' && sortDir === 'desc' ? 'ZA' : 'AZ'}</span>
                        <span className="sort-arrow">{arrow('az')}</span>
                    </span>
                    <span
                        className={`sort-btn${sortKey === 'feed' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Activity Feed"
                        onClick={() => onSort('feed')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort('feed'); } }}
                    >
                        <span className="sort-lbl">FEED</span>
                        <span className="sort-arrow">{arrow('feed')}</span>
                    </span>
                    <span
                        className={`sort-btn sort-btn-social${sortKey === 'social' ? ' active' : ''}`}
                        role="button"
                        tabIndex={0}
                        title="Social Feed"
                        onClick={() => onSort('social')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSort('social'); } }}
                    >
                        {/* ☻ — the collector/user smiley as the social mark
                            (Brendon, 2026-07-26). Glyph only, no word — the row
                            has no room; same Courier icon treatment as the ◷
                            date sort. Works exactly like FEED, social focus. */}
                        <span className="sort-lbl sort-lbl-recent">☻&#xFE0E;</span>
                        <span className="sort-arrow">{arrow('social')}</span>
                    </span>
                </div>
                )}
            </div>
            )}

            {!compact && (
            <>
            {/* Grid Presets row — home scope, 3 slots. */}
            <HomePresetRow
                open={presetRowActive}
                sortKey={sortKey}
                sortDir={sortDir}
                applySort={applySort}
                applyPreset={applyPreset}
                activeFilters={activeFilters}
                activeCategory={activeCategory}
                searchQuery={searchQuery}
                priceMin={priceMin}
                priceMax={priceMax}
            />

            {/* Search + mint-price range — pops up on ⌕. */}
            <div className={`search-row${searchActive ? ' open' : ''}`} id="searchRow">
                <input
                    className="search-input"
                    type="text"
                    placeholder="@artist, @project, project name…"
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

            {/* Multi-select floating action bar — ownership-aware (mixed zone). */}
            <HomeMsFloatBar />
            </>
            )}
        </div>
    );
}

/* ── IconBtn ─────────────────────────────────────────────────────────── */
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

/* ── HomePresetRow ───────────────────────────────────────────────────── */
/*
 * Grid View Presets for the home Now Minting view — 'home' store scope, 3 slots.
 * Saves the project-facet filters + the local sort. The home sort (date/price)
 * is mapped onto the preset store's sort fields (date→'id', price→'price') so
 * the generic store stays unchanged; restore maps back.
 */
const SLOT_GLYPHS = ['①', '②', '③'] as const;
const HOME_SCOPE = 'home';

function homeSortToStore(key: HomeSortKey): import('../../lib/state/SortContext').SortKey {
    return key === 'price' ? 'price' : 'id';
}
function storeSortToHome(s: import('../../lib/state/SortContext').SortKey): HomeSortKey {
    return s === 'price' ? 'price' : 'date';
}

interface HomePresetRowProps {
    open: boolean;
    sortKey: HomeSortKey;
    sortDir: HomeSortDir;
    applySort: (key: HomeSortKey, dir: HomeSortDir) => void;
    applyPreset: (state: Parameters<import('../../lib/state/TraitsContext').TraitsContextValue['applyPreset']>[0]) => void;
    activeFilters: import('../../lib/state/TraitsContext').ActiveFilters;
    activeCategory: string | null;
    searchQuery: string;
    priceMin: string;
    priceMax: string;
}

function HomePresetRow({
    open,
    sortKey,
    sortDir,
    applySort,
    applyPreset,
    activeFilters,
    activeCategory,
    searchQuery,
    priceMin,
    priceMax,
}: HomePresetRowProps) {
    const { showToast } = useToast();
    const [presets, setPresets] = useState<readonly PresetEntry[]>(() => getPresets(HOME_SCOPE));
    const [loadedIndex, setLoadedIndexState] = useState<number>(() => getLoadedIndex(HOME_SCOPE));

    useEffect(() => {
        return subscribePresets(HOME_SCOPE, (next, idx) => {
            setPresets(next);
            setLoadedIndexState(idx);
        });
    }, []);

    if (!open) return null;

    const handleSave = () => {
        const filtersSnapshot = Object.fromEntries(
            Object.entries(activeFilters).map(([k, v]) => [k, Array.from(v as Set<string>)])
        ) as Record<string, string[]>;
        const { result, index } = savePreset(HOME_SCOPE, {
            sort: homeSortToStore(sortKey),
            dir: sortDir,
            feedKind: 'time',
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
        applySort(storeSortToHome(s.sort), s.dir);
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
        setLoadedIndex(HOME_SCOPE, index);
        const slotLabel = SLOT_GLYPHS[index] ?? `${index + 1}`;
        showToast(`PRESET ${slotLabel} LOADED`);
    };

    const handleDelete = (e: ReactMouseEvent, index: number) => {
        e.stopPropagation();
        deletePreset(HOME_SCOPE, index);
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
