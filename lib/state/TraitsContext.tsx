'use client';

/*
 * TraitsContext
 *
 * Owns the trait-filter / search / price-range UI state for the collection
 * page's TraitsUI block (sim 5167-5193 — .traits-ui + .sort-bar + .search-row).
 *
 * v0 scope: state only, no actual gallery filtering yet. The gallery in
 * app/collection/[slug]/page.tsx still renders all 222 tokens regardless
 * of the values stored here. A later build will subscribe Gallery /
 * ArtworkCard to this context and apply the predicates.
 *
 * Sim parity:
 *   - activeCategory   ← sim's `activeCategory` (sim ~6240). String key from
 *     traitData (Gateway → "Layer", Spectrum → "Mineral") plus 'Fate' /
 *     'Network' / 'Breadcrumb'. null = no category selected.
 *   - activeFilters    ← sim's `activeFilters` (sim ~6242). Record keyed by
 *     TraitCategory; each value is a Set of selected value names within that
 *     category. Toggled by the L2 sub-pills in the .traits-header-bar.
 *     Mirrors sim's `toggleFilter` (sim ~8299): clicking a value pill
 *     adds-or-removes it from the Set for the active category.
 *   - myNotesActive    ← sim's `myNotesActive` (sim ~6238) — toggled by the
 *     "My Notes" pill (sim 8550).
 *   - burnPileActive   ← sim's `burnPileActive` (sim ~6235) — the ⏚ icon.
 *   - multiSelectActive ← sim's `_multiSelectActive` (sim ~6234) — the ❐ icon.
 *   - searchActive     ← sim's `searchActive` (sim ~6232) — gates the
 *     `.search-row.open` modifier so the row collapses when off.
 *   - searchQuery      ← sim's `_searchQuery` (sim ~6233).
 *   - priceMin/priceMax ← sim's `feedPriceMin` / `feedPriceMax` input values.
 *
 * `hasActiveFilter` is the OR of every filter input — used by the
 * "Search Filter ON" chip in TraitsUI.tsx. Build 14 widens this to
 * include "any activeFilters Set non-empty" so the chip lights up when
 * the user has toggled L2 value pills even without a L1 category lock.
 *
 * Direction of the active sort (asc/desc) is intentionally not tracked
 * here — sort family lives in SortContext and the arrow state will land
 * when the gallery wiring goes in. v0 just shows ↓ on the active family.
 *
 * Scope guard: this context is mounted only inside the collection page
 * tree. Other pages do not need it; calling useTraits() outside the
 * provider throws.
 */

import {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type TraitCategory =
    | 'Layer'
    | 'Mineral'
    | 'Fate'
    | 'Network'
    | 'Breadcrumb';

export type ActiveFilters = Record<TraitCategory, Set<string>>;

/* Empty filter map factory — used at init and on clearAllFilters. New Set
   per call so we never share Set references between resets. */
function emptyFilters(): ActiveFilters {
    return {
        Layer: new Set<string>(),
        Mineral: new Set<string>(),
        Fate: new Set<string>(),
        Network: new Set<string>(),
        Breadcrumb: new Set<string>(),
    };
}

interface TraitsContextValue {
    /* Header-bar filter pills */
    activeCategory: TraitCategory | null;
    setActiveCategory: (c: TraitCategory | null) => void;

    /* L2 value-pill selections — sim ~6242 / sim 8299 toggleFilter */
    activeFilters: ActiveFilters;
    toggleFilter: (cat: TraitCategory, value: string) => void;

    /* Toggle pills sitting at the right end of the header bar */
    myNotesActive: boolean;
    toggleMyNotes: () => void;
    burnPileActive: boolean;
    toggleBurnPile: () => void;
    multiSelectActive: boolean;
    toggleMultiSelect: () => void;

    /* Search row */
    searchActive: boolean;
    toggleSearch: () => void;
    closeSearch: () => void;
    searchQuery: string;
    setSearchQuery: (q: string) => void;

    /* Price range (string so empty input stays empty, not 0) */
    priceMin: string;
    setPriceMin: (v: string) => void;
    priceMax: string;
    setPriceMax: (v: string) => void;

    /* Computed: any filter or search active */
    hasActiveFilter: boolean;

    /* Reset everything (used by the .search-clear ✕ in sim ~closeSearch) */
    clearAllFilters: () => void;
}

const TraitsContext = createContext<TraitsContextValue | null>(null);

export function TraitsProvider({ children }: { children: ReactNode }) {
    const [activeCategory, setActiveCategoryState] =
        useState<TraitCategory | null>(null);
    const [activeFilters, setActiveFiltersState] =
        useState<ActiveFilters>(emptyFilters);
    const [myNotesActive, setMyNotesActive] = useState(false);
    const [burnPileActive, setBurnPileActive] = useState(false);
    const [multiSelectActive, setMultiSelectActive] = useState(false);
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQueryState] = useState('');
    const [priceMin, setPriceMinState] = useState('');
    const [priceMax, setPriceMaxState] = useState('');

    /* Mirrors sim's setCategory: clicking the active category clears it,
       clicking a different one swaps. (sim ~7180-7200, simplified.) */
    const setActiveCategory = useCallback((c: TraitCategory | null) => {
        setActiveCategoryState((prev) => (c !== null && prev === c ? null : c));
    }, []);

    /* Mirrors sim's toggleFilter (sim 8299): if the value is already in the
       Set for that category, remove it; otherwise add it. We clone the Set
       on every mutation so React detects the change and re-renders pills
       that derive from `activeFilters[cat]`. */
    const toggleFilter = useCallback(
        (cat: TraitCategory, value: string) => {
            setActiveFiltersState((prev) => {
                const nextSet = new Set(prev[cat]);
                if (nextSet.has(value)) {
                    nextSet.delete(value);
                } else {
                    nextSet.add(value);
                }
                return { ...prev, [cat]: nextSet };
            });
        },
        []
    );

    const toggleMyNotes = useCallback(
        () => setMyNotesActive((v) => !v),
        []
    );
    const toggleBurnPile = useCallback(
        () => setBurnPileActive((v) => !v),
        []
    );
    const toggleMultiSelect = useCallback(
        () => setMultiSelectActive((v) => !v),
        []
    );

    /* Sim's toggleSearch (sim ~8843) flips `.search-row.open` and clears
       the query when collapsing. closeSearch is the explicit ✕ path. */
    const toggleSearch = useCallback(() => {
        setSearchActive((prev) => {
            if (prev) {
                setSearchQueryState('');
                setPriceMinState('');
                setPriceMaxState('');
            }
            return !prev;
        });
    }, []);

    const closeSearch = useCallback(() => {
        setSearchActive(false);
        setSearchQueryState('');
        setPriceMinState('');
        setPriceMaxState('');
    }, []);

    const setSearchQuery = useCallback((q: string) => {
        setSearchQueryState(q);
    }, []);

    const setPriceMin = useCallback((v: string) => {
        setPriceMinState(v);
    }, []);

    const setPriceMax = useCallback((v: string) => {
        setPriceMaxState(v);
    }, []);

    const clearAllFilters = useCallback(() => {
        setActiveCategoryState(null);
        setActiveFiltersState(emptyFilters());
        setMyNotesActive(false);
        setBurnPileActive(false);
        setMultiSelectActive(false);
        setSearchActive(false);
        setSearchQueryState('');
        setPriceMinState('');
        setPriceMaxState('');
    }, []);

    /* Build 14: any L1 active OR any activeFilters set non-empty OR
       myNotes / burn / search / price. Multi-select intentionally
       excluded — it's a UI mode, not a filter predicate. */
    const anyValueFiltersActive = useMemo(
        () =>
            (Object.keys(activeFilters) as TraitCategory[]).some(
                (k) => activeFilters[k].size > 0
            ),
        [activeFilters]
    );

    const hasActiveFilter =
        activeCategory !== null ||
        anyValueFiltersActive ||
        myNotesActive ||
        burnPileActive ||
        searchQuery.trim() !== '' ||
        priceMin.trim() !== '' ||
        priceMax.trim() !== '';

    const value = useMemo<TraitsContextValue>(
        () => ({
            activeCategory,
            setActiveCategory,
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
            clearAllFilters,
        }),
        [
            activeCategory,
            setActiveCategory,
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
            clearAllFilters,
        ]
    );

    return (
        <TraitsContext.Provider value={value}>{children}</TraitsContext.Provider>
    );
}

export function useTraits(): TraitsContextValue {
    const ctx = useContext(TraitsContext);
    if (!ctx) {
        throw new Error('useTraits must be used inside <TraitsProvider>');
    }
    return ctx;
}
