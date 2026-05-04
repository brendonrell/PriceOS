'use client';

/*
 * TraitsUI
 *
 * Renders the three sibling blocks that sit between the .profile-tabs-row
 * (Showcase / Artworks / + More) and the gallery section (sim 5168-5189):
 *
 *   1. .traits-ui            — header bar of filter pills
 *      └ .traits-header-bar  — flex-wrap row, dynamic pill content
 *        └ #traitCategories  — the actual pills
 *   2. .sort-bar             — theme pills + #ID / $PRICE / FEED sort tabs
 *   3. .search-row           — text search + min/max ETH price-range + ✕
 *
 * In sim these are populated by JS (renderTraitUI sim ~8463 + renderSortUI
 * sim ~8417). This port renders them statically for the PD-persona /
 * non-feed default state — every pill that JS injects is rendered once
 * here, with onClick handlers wired into TraitsContext.
 *
 * UI-only build (Build 13 scope): the gallery is unchanged. The pills
 * track active state via TraitsContext but no actual filter predicate
 * runs against the gallery yet.
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

import type { CSSProperties, ReactNode } from 'react';
import { useTraits, type TraitCategory } from '../../lib/state/TraitsContext';
import { useSort, type SortKey } from '../../lib/state/SortContext';
import { useTheme, type ThemeKey } from '../../lib/state/ThemeContext';

/* PD-persona dynamic trait categories (sim ~8517 — Network/Fate/Breadcrumb
   are pinned separately so they're excluded here). Display labels follow
   sim's STRATA-rebrand mapping at sim 8524 (Gateway → Layer, Spectrum →
   Mineral). For v0 we hard-code the two sim renders today. */
const DYNAMIC_TRAIT_PILLS: { key: TraitCategory; label: string }[] = [
    { key: 'Layer',   label: 'Layer'   },
    { key: 'Mineral', label: 'Mineral' },
];

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

interface TraitsUIProps {
    /* Whether the block should render at all. Sim hides .traits-ui +
       .sort-bar when the active tab is Showcase or Albums (sim 13150).
       The page passes `onArtworksTab` here. */
    visible: boolean;
}

export default function TraitsUI({ visible }: TraitsUIProps) {
    const {
        activeCategory,
        setActiveCategory,
        myNotesActive,
        toggleMyNotes,
        burnPileActive,
        toggleBurnPile,
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
    const { sort, setSort } = useSort();
    const { theme, setTheme } = useTheme();

    const hiddenStyle: CSSProperties | undefined = visible
        ? undefined
        : { display: 'none' };

    return (
        <>
            {/* .traits-ui — sim 5168-5175 */}
            <div className="traits-ui" style={hiddenStyle}>
                <div className="traits-header-bar">
                    <div className="stats-container" id="traitCategories">
                        {/* Dynamic trait pills (Layer / Mineral) — sim 8518-8529 */}
                        {DYNAMIC_TRAIT_PILLS.map((p) => (
                            <BarPill
                                key={p.key}
                                label={p.label}
                                active={activeCategory === p.key}
                                dimmed={
                                    activeCategory !== null &&
                                    activeCategory !== p.key
                                }
                                onClick={() => setActiveCategory(p.key)}
                            />
                        ))}

                        {/* Fate — pinned after dynamic block, sim 8533 */}
                        <BarPill
                            label="Fate"
                            active={activeCategory === 'Fate'}
                            dimmed={
                                activeCategory !== null &&
                                activeCategory !== 'Fate'
                            }
                            onClick={() => setActiveCategory('Fate')}
                            title="Fate Filter — iChing Destines"
                        />

                        {/* My Network — sim 8549 */}
                        <BarPill
                            label="My Network"
                            active={activeCategory === 'Network'}
                            dimmed={
                                activeCategory !== null &&
                                activeCategory !== 'Network'
                            }
                            onClick={() => setActiveCategory('Network')}
                        />

                        {/* My Notes — sim 8550 (toggle, not category swap) */}
                        <BarPill
                            label="My Notes"
                            active={myNotesActive}
                            dimmed={
                                activeCategory !== null && !myNotesActive
                            }
                            onClick={toggleMyNotes}
                            title="My Notes"
                        />

                        {/* Recent + icon cluster — sim 8551-8557.
                            Wrapped in inline-flex so they stay together when
                            the row wraps on mobile (sim parity, sim 8551). */}
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
                                    label="Recent"
                                    active={activeCategory === 'Breadcrumb'}
                                    dimmed={
                                        activeCategory !== null &&
                                        activeCategory !== 'Breadcrumb'
                                    }
                                    onClick={() =>
                                        setActiveCategory('Breadcrumb')
                                    }
                                    title="Recent — recently-seen tokens"
                                    extraClass="pill-breadcrumb"
                                />
                                <IconBtn
                                    cls="burn-btn"
                                    glyph="⏚\uFE0E"
                                    title="Burn Pile"
                                    active={burnPileActive}
                                    onClick={toggleBurnPile}
                                />
                                <IconBtn
                                    cls="epoch-btn"
                                    glyph="❐\uFE0E"
                                    title="Multi-Select"
                                    active={multiSelectActive}
                                    onClick={toggleMultiSelect}
                                />
                                <IconBtn
                                    cls="search-btn"
                                    glyph="⌕\uFE0E"
                                    title="Search"
                                    active={searchActive}
                                    onClick={toggleSearch}
                                />
                            </div>
                        </div>
                    </div>

                    {/* sim 5173-5174: sub-category + stats output. JS-injected
                        in sim — kept as empty mount points here so the DOM
                        shape matches when later builds wire them in. */}
                    <div
                        className="stats-container"
                        id="traitSubCategories"
                        style={{ display: 'none' }}
                    />
                    <div
                        className="stats-container"
                        id="statsOutput"
                        style={{ display: 'none' }}
                    />
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
                            onClick={() => setTheme(t.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setTheme(t.key);
                                }
                            }}
                            title={t.title}
                        >
                            <span>{t.glyph}</span>
                        </div>
                    ))}
                </div>
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
                        onClick={() => setSort('id')}
                    />
                    <SortBtn
                        label={'$\u202FPRICE'}
                        family="price"
                        active={sort === 'price'}
                        onClick={() => setSort('price')}
                    />
                    <SortBtn
                        label="FEED"
                        family="feed"
                        active={sort === 'feed'}
                        onClick={() => setSort('feed')}
                    />
                </div>
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
                    placeholder="# id, collector..."
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
            {hasActiveFilter && (
                <div
                    className="search-filter-chip"
                    role="status"
                    aria-live="polite"
                >
                    Search Filter ON
                </div>
            )}
        </>
    );
}

/* ── Sub-components ─────────────────────────────────────────────────── */

interface BarPillProps {
    label: ReactNode;
    active: boolean;
    dimmed: boolean;
    onClick: () => void;
    title?: string;
    extraClass?: string;
}

function BarPill({
    label,
    active,
    dimmed,
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
    onClick: () => void;
}

function SortBtn({ label, active, onClick }: SortBtnProps) {
    /* Sim renders the arrow off the precise sort variant (id-asc,
       id-desc, etc — sim 8420). v0 only has the family in SortContext,
       so we show ↓ on whichever family is active and leave direction
       cycling for the gallery wiring build. */
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
            <span className="sort-arrow">{active ? '↓\uFE0E' : ''}</span>
        </div>
    );
}
