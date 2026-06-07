'use client';

/*
 * ProfileFacetBar — the Collected-tab filter surface.
 *
 * A collection spans independent Projects, so its filters are the PLATFORM
 * facets every Output carries (from registry outputTraits), NOT any one
 * Project's trait schema. Facets, in birth-order:
 *
 *   Artist › Project › PriceDay › Sun › Moon › Rising › Fate › Status
 *
 * Each facet's value pool is derived from what the wallet actually OWNS — you
 * only see `@oracle` if you hold an Oracle Output, only see Leo if something you
 * own was born under it. Empty collection → no facets.
 *
 * State rides the shared TraitsContext (activeCategory = open facet,
 * activeFilters[facet] = selected values, searchQuery / priceMin / priceMax) and
 * SortContext, so the predicate in ProfilePageBody reads the same state the
 * project page uses. Pill classes mirror TraitsUI (pill-l1 / pill-l3) so the
 * house styling applies with no new CSS.
 */

import { useMemo } from 'react';
import { useTraits } from '../../lib/state/TraitsContext';
import { useSort } from '../../lib/state/SortContext';
import type { OutputTraits } from '../../lib/project/types';

export interface EnrichedHolding {
    slug: string;
    token_id: number;
    list_price_eth: string | null;
    /** Full platform traits (Artist/Project/PriceDay/Sun/Moon/Rising/Fate). */
    traits: OutputTraits;
    listed: boolean;
}

/* Facet order = birth-order. 'Status' is the live market facet (derived from
   listing presence), not a stored trait. */
export const PROFILE_FACETS = [
    'Artist', 'Project', 'PriceDay', 'Sun', 'Moon', 'Rising', 'Fate', 'Status',
] as const;

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

export default function ProfileFacetBar({ holdings }: { holdings: EnrichedHolding[] }) {
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
    } = useTraits();
    const { sort, dir, cycleSort } = useSort();

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

    if (holdings.length === 0) return null;

    return (
        <div className="traits-ui" style={{ display: 'flex' }}>
            <div className="traits-header-bar">
                {/* L1 facet pills */}
                <div className="stats-container">
                    {liveFacets.map((facet) => {
                        const isActive = activeCategory === facet;
                        const count = activeFilters[facet]?.size ?? 0;
                        const cls = `pill pill-l1${isActive ? ' active' : ''}${
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
                                <span className="stat-name">{facet}</span>
                                {count > 0 && <span className="badge">{count}</span>}
                            </div>
                        );
                    })}
                    {hasActiveFilter && (
                        <div
                            className="pill pill-l1"
                            role="button"
                            tabIndex={0}
                            onClick={clearAllFilters}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); clearAllFilters(); }
                            }}
                            title="Clear all filters"
                        >
                            <span className="stat-name">✕ Clear</span>
                        </div>
                    )}
                </div>
            </div>

            {/* L3 value pills for the open facet */}
            {openValues && (
                <div className="stats-container" id="statsOutput" style={{ display: 'flex' }}>
                    {openValues.map((value) => {
                        const set = activeFilters[activeCategory!];
                        const isActive = set?.has(value) ?? false;
                        const dimmed = (set?.size ?? 0) > 0 && !isActive;
                        const count = holdings.filter(
                            (h) => facetValueOf(activeCategory!, h) === value,
                        ).length;
                        const cls = `pill pill-l3${isActive ? ' active' : ''}${dimmed ? ' dimmed' : ''}`;
                        return (
                            <div
                                key={value}
                                className={cls}
                                role="button"
                                tabIndex={0}
                                onClick={() => toggleFilter(activeCategory!, value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleFilter(activeCategory!, value);
                                    }
                                }}
                            >
                                <span className="stat-name">↳ {value}</span>
                                <span className="stat-count">{count}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Search + price range + sort */}
            <div className="search-row open" id="searchRow" style={{ display: 'flex' }}>
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
                    className={`sort-btn${sort === 'id' ? ' active' : ''}`}
                    role="button"
                    tabIndex={0}
                    title="Sort by ID"
                    onClick={() => cycleSort('id')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSort('id'); } }}
                >
                    <span className="sort-lbl">{'# ID'}</span>
                    <span className="sort-arrow">{sort === 'id' ? (dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                </span>
                <span
                    className={`sort-btn${sort === 'price' ? ' active' : ''}`}
                    role="button"
                    tabIndex={0}
                    title="Sort by Price"
                    onClick={() => cycleSort('price')}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); cycleSort('price'); } }}
                >
                    <span className="sort-lbl">{'$ PRICE'}</span>
                    <span className="sort-arrow">{sort === 'price' ? (dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                </span>
            </div>
        </div>
    );
}
