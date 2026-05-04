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
 *   - activeCategory   ← sim's `activeCategory` (sim 7163). String key from
 *     traitData (Gateway → "Layer", Spectrum → "Mineral") plus 'Fate' /
 *     'Network' / 'Breadcrumb'. null = no category selected.
 *   - activeFilters    ← sim's `activeFilters` (sim 7140). Record keyed by
 *     TraitCategory; each value is a Set of selected value names within that
 *     category. Toggled by the L2 sub-pills in the .traits-header-bar.
 *     Mirrors sim's `toggleFilter` (sim 8298): clicking a value pill
 *     adds-or-removes it from the Set for the active category.
 *   - myNotesActive    ← sim's `myNotesActive` — toggled by the
 *     "My Notes" pill (sim 8550).
 *   - burnPileActive   ← sim's `burnPileActive` — the ⏚ icon.
 *   - multiSelectActive ← sim's `_multiSelectActive` — the ❐ icon.
 *   - searchActive     ← sim's `searchActive` — gates the
 *     `.search-row.open` modifier so the row collapses when off.
 *   - searchQuery      ← sim's `_searchQuery`.
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
 *
 * Build 16 (current): L1 toggle-off semantics. Sim's setCategory at
 * sim 8272-8285 is a single-step toggler — clicking the active L1 again
 * sets `activeCategory = null`. The Build 9 spec residual #4 extends this
 * to also drain the value Set for that category in the same transaction
 * (so a stale L3 selection doesn't survive an L1 clear and re-emerge when
 * the same L1 is re-opened later). That behavior lives in the new
 * `clearActiveCategory` method below; `setActiveCategory` is a plain
 * setter — the prev===c toggle path is gone, BarPill picks the call site
 * based on whether the clicked pill is already active.
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
    /* Build 16: explicit L1 clear — drains activeFilters[activeCategory]
       atomically with the activeCategory=null write. See implementation
       comment below for why this isn't `setActiveCategory(null)` plus a
       follow-up clear. */
    clearActiveCategory: () => void;

    /* L2 value-pill selections — sim 7140 / sim 8298 toggleFilter */
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

    /* Build 16: plain setter. The prev===c toggle that used to live here
       is gone — the BarPill onClick decides between `setActiveCategory`
       (open / swap) and `clearActiveCategory` (toggle off) based on its
       own `active` prop. Centralizing the decision at the call site lets
       the toggle-off path also drain filters in the same setState batch
       without leaking that responsibility into the setter signature. */
    const setActiveCategory = useCallback((c: TraitCategory | null) => {
        setActiveCategoryState(c);
    }, []);

    /* Build 16: clear active L1 + drain its filter Set in one transaction.
       Both setState calls fire from the same event handler so React 18+
       batches them into a single render. The activeFilters update reads
       the previous activeCategory off the functional updater so it stays
       correct even if the surrounding closure has captured a stale value
       (this matters when clearActiveCategory is called from a non-React
       callback path — e.g. a future keyboard handler). If activeCategory
       is already null this is a no-op on both axes. */
    const clearActiveCategory = useCallback(() => {
        setActiveCategoryState((prevCat) => {
            if (prevCat !== null) {
                setActiveFiltersState((prevFilters) => ({
                    ...prevFilters,
                    [prevCat]: new Set<string>(),
                }));
            }
            return null;
        });
    }, []);

    /* Mirrors sim's toggleFilter (sim 8298): if the value is already in the
       Set for that category, remove it; otherwise add it. We clone the Set
       on every mutation so React detects the change and re-renders pills
       that derive from `activeFilters[cat]`.
       ────────────────────────────────────────────────────────────────────
       INVARIANT (Build 16, locked): toggleFilter MUST NOT touch
       activeCategory. Sim's toggleFilter at sim 8298-8310 only mutates
       activeFilters[internalCatKey] — it never inspects or assigns
       activeCategory, even when the toggle drains the Set to size 0.
       Removing the LAST value from activeFilters[activeCategory] keeps
       activeCategory pinned; the L1 pill stays lit and the L2/L3 rows
       stay rendered (just with no selections). The only paths that ever
       null activeCategory are:
         • clearActiveCategory()  — explicit L1 clear from BarPill
         • clearAllFilters()      — global reset from .search-clear ✕
       Do NOT add an `if (nextSet.size === 0) clearActiveCategory()` short-
       circuit here. That would diverge from sim and break the L3 toggle-
       off → re-toggle-on flow that depends on the L1 staying open.
       ──────────────────────────────────────────────────────────────────── */
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

    /* Sim's toggleSearch flips `.search-row.open` and clears the query
       when collapsing. closeSearch is the explicit ✕ path. */
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
            clearAllFilters,
        }),
        [
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
