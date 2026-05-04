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
 *   - activeCategory  ← sim's `activeCategory` (sim ~6240). String key from
 *     traitData (Gateway → "Layer", Spectrum → "Mineral") plus 'Fate' /
 *     'Network' / 'Breadcrumb'. null = no category selected.
 *   - myNotesActive   ← sim's `myNotesActive` (sim ~6238) — toggled by the
 *     "My Notes" pill (sim 8550).
 *   - burnPileActive  ← sim's `burnPileActive` (sim ~6235) — the ⏚ icon.
 *   - multiSelectActive ← sim's `_multiSelectActive` (sim ~6234) — the ❐ icon.
 *   - searchActive    ← sim's `searchActive` (sim ~6232) — gates the
 *     `.search-row.open` modifier so the row collapses when off.
 *   - searchQuery     ← sim's `_searchQuery` (sim ~6233).
 *   - priceMin/priceMax ← sim's `feedPriceMin` / `feedPriceMax` input values.
 *
 * `hasActiveFilter` is the OR of every filter input — used by the
 * "Search Filter ON" chip in TraitsUI.tsx. (The chip itself is a port-only
 * addition — sim only fires this string as a toast at sim 8861. See the
 * note in TraitsUI.tsx for context.)
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

interface TraitsContextValue {
    /* Header-bar filter pills */
    activeCategory: TraitCategory | null;
    setActiveCategory: (c: TraitCategory | null) => void;

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
        setMyNotesActive(false);
        setBurnPileActive(false);
        setMultiSelectActive(false);
        setSearchActive(false);
        setSearchQueryState('');
        setPriceMinState('');
        setPriceMaxState('');
    }, []);

    const hasActiveFilter =
        activeCategory !== null ||
        myNotesActive ||
        burnPileActive ||
        searchQuery.trim() !== '' ||
        priceMin.trim() !== '' ||
        priceMax.trim() !== '';

    const value = useMemo<TraitsContextValue>(
        () => ({
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
            clearAllFilters,
        }),
        [
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
