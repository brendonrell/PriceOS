'use client';

/*
 * TraitsUI
 *
 * Renders the three sibling blocks that sit between the .profile-tabs-row
 * (Showcase / Artworks / + More) and the gallery section (sim 5168-5189):
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

import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';
import { useTraits, type TraitCategory } from '../../lib/state/TraitsContext';
import { useSort, type SortKey, type SortDir, type FeedKind } from '../../lib/state/SortContext';
import { useTheme, type ThemeKey } from '../../lib/state/ThemeContext';
import { usePersona } from '../../lib/state/PersonaContext';

/* PD-persona dynamic trait categories (sim ~8517 — Network/Fate/Breadcrumb
   are pinned separately so they're excluded here). Display labels follow
   sim's STRATA-rebrand mapping at sim 8524 (Gateway → Layer, Spectrum →
   Mineral). For v0 we hard-code the two sim renders today. */
const DYNAMIC_TRAIT_PILLS: { key: TraitCategory; label: string }[] = [
    { key: 'Layer',   label: 'Layer'   },
    { key: 'Mineral', label: 'Mineral' },
];

/* L2 value pools per category. Sim sources these from `traitData` /
   `GodModeDict`; for v0 we hard-code the STRATA-rebrand pools called
   out at sim 7693. Fate / Network / Breadcrumb have empty pools, which
   means the L2 row stays hidden when those categories are selected
   (parity with sim 8618). Gallery filtering is the next build's job. */
const VALUE_POOLS: Record<TraitCategory, readonly string[]> = {
    Layer:      ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'],
    Mineral:    ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'],
    Fate:       [],
    Network:    [],
    Breadcrumb: [],
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
        clearActiveCategory,
        activeFilters,
        toggleFilter,
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
    const { sort, dir, feedKind, cycleSort } = useSort();
    const { theme, setTheme } = useTheme();
    const { persona } = usePersona();

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
       Sim 8470: `traitsUI.style.display = (isRegular && !isFeed) ? 'none' : 'flex'`. */
    const traitsHiddenStyle: CSSProperties | undefined =
        !visible || (isRegular && !isFeed) ? { display: 'none' } : undefined;

    /* F41 — L2 row sub-category labels. Sim 8568-8616 gates the L2 row
       on Breadcrumb (What's Hot / My Breadcrumbs, sim 8584-8587) or
       Network (GodModeDict keys My Circle / Global, sim 8588-8615 +
       7392). All other categories hide L2 and surface their values in
       L3. v0 hardcodes the labels; sub-filter wiring (sim setSubFilter)
       lands when traitData is real. Pre-F41 the L2 row reused the L3
       value pool for every category, doubling every Layer/Mineral pill
       (BUG-01). */
    const L2_SUB_LABELS: Partial<Record<TraitCategory, readonly string[]>> = {
        Breadcrumb: ["What's Hot", 'My Breadcrumbs'],
        Network:    ['My Circle', 'Global'],
    };
    const l2SubLabels: readonly string[] =
        activeCategory !== null
            ? (L2_SUB_LABELS[activeCategory] ?? [])
            : [];
    const l2Visible = l2SubLabels.length > 0;

    /* L3 row value pool — Layer / Mineral hardcoded for v0 (sim 8623-8665
       parity for the non-Network branch at sim 8658-8668). Empty for
       Fate / Network / Breadcrumb until traitData lands. */
    const l3Pool: readonly string[] =
        activeCategory !== null ? VALUE_POOLS[activeCategory] : [];
    const l3Visible = l3Pool.length > 0;

    /* Per-category badge counts for L1 pills (sim 8488). */
    const countOf = (cat: TraitCategory): number =>
        activeFilters[cat]?.size ?? 0;

    return (
        <>
            {/* .traits-ui — sim 5168-5175. D006: persona+feed gate folded
                into traitsHiddenStyle (sim 8470). */}
            <div className="traits-ui" style={traitsHiddenStyle}>
                <div className="traits-header-bar">
                    <div className="stats-container" id="traitCategories">
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
                                    cls="epoch-btn"
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
                        {/* D007 (sim 8505) — feed-mode search-btn. Sim
                            wraps the LAST feed-mode L1 pill (Market) +
                            search-btn together in a
                            `display:flex;align-items:center;gap:10px`
                            container so the icon stays glued to the
                            pill row's right edge. v0 doesn't render
                            feed-mode pills (Event / Network / Traits /
                            Market — sim 8475-8509) yet, so the wrapper
                            is rendered standalone with just the
                            search-btn — preserves sim's container
                            shape so when feed-mode pill rendering
                            lands, it slots in alongside without a
                            second port pass. Wrapper kept inline-style
                            sim-verbatim. */}
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
                    8568-8617. F41: row gates on Breadcrumb (Hot /
                    Breadcrumbs sub-pills, sim 8584-8587) or Network
                    (GodModeDict keys, sim 8588-8615). Layer / Mineral /
                    Fate hide L2 and surface in L3 instead — sim 8618
                    sets display:none when l2Html is empty. */}
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
                        activeCategory !== null &&
                        l2SubLabels.map((value) => {
                            const isActive =
                                activeFilters[activeCategory].has(value);
                            /* Build 14: dim non-selected siblings only
                               once at least one value is selected — same
                               pattern sim uses for Hot/Breadcrumbs at
                               sim 8580-8583. */
                            const anySelected =
                                activeFilters[activeCategory].size > 0;
                            const dimmed = anySelected && !isActive;
                            return (
                                <SubPill
                                    key={value}
                                    label={value}
                                    active={isActive}
                                    dimmed={dimmed}
                                    onClick={() =>
                                        toggleFilter(
                                            activeCategory,
                                            value
                                        )
                                    }
                                />
                            );
                        })}
                </div>

                {/* L3 stat-pills — sim 5174 mount point + sim 8670-8682
                    render block. F41: gated on l3Pool (Layer /
                    Mineral) — independent of the L2 row's
                    Breadcrumb/Network gate. Sim 8625-8668 walks every
                    active category through traitData; v0 hardcodes
                    VALUE_POOLS for Layer/Mineral and leaves Fate /
                    Network / Breadcrumb empty (hidden) until
                    traitData wiring lands. Click handler shares
                    activeFilters[activeCategory] with the L2 row
                    above — intentional duplication mirroring sim's
                    split (L2 ↴ row vs L3 ↳ row, sim 8613 / 8681).
                    Mock count of 22 per value until gallery wiring
                    lands; the `.is-zero` class still applies whenever
                    count === 0 so the structural class logic is in
                    place for the wiring build.

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
                        activeCategory !== null &&
                        l3Pool.map((value) => {
                            const isActive =
                                activeFilters[activeCategory].has(value);
                            const anySelected =
                                activeFilters[activeCategory].size > 0;
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
                                    key={value}
                                    label={value}
                                    count={count}
                                    active={isActive}
                                    dimmed={dimmed}
                                    isZero={count === 0}
                                    category={activeCategory}
                                    onClick={() =>
                                        toggleFilter(
                                            activeCategory,
                                            value
                                        )
                                    }
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
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => cycleSort('id')}
                    />
                    <SortBtn
                        label={'$\u202FPRICE'}
                        family="price"
                        active={sort === 'price'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => cycleSort('price')}
                    />
                    <SortBtn
                        label="FEED"
                        family="feed"
                        active={sort === 'feed'}
                        dir={dir}
                        feedKind={feedKind}
                        onClick={() => cycleSort('feed')}
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
