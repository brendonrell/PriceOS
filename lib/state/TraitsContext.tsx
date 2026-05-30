'use client';

/*
 * TraitsContext
 *
 * Owns the trait-filter / search / price-range UI state for the project
 * page's TraitsUI block (sim 5167-5193 — .traits-ui + .sort-bar + .search-row).
 *
 * v0 scope: state only, no actual gallery filtering yet. The gallery in
 * app/art/[slug]/page.tsx still renders all 222 tokens regardless
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
 * Scope guard: this context is mounted only inside the project page
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
import { useToast } from './ToastContext';

export type TraitCategory =
    | 'Layer'
    | 'Mineral'
    | 'Fate'
    | 'Network'
    | 'Breadcrumb'
    /* Chat H item 3 — feed-mode L1 categories (sim 7391-7395 GodModeDict).
       'Event' and 'Market' carry their own filter Sets in activeFilters.
       'Traits' is a feed-mode wrapper L1 (sim 8484) that doesn't carry an
       own Set — it routes L3 toggles into activeFilters['Layer'] /
       activeFilters['Mineral'] depending on activeSubFilter. So 'Traits'
       lives in FeedCategory only, NOT in ActiveFilters. */
    | 'Event'
    | 'Market';

/* Feed-mode L1 categories. Sim 8477:
   `['Event', 'Network', 'Traits', 'Market']`. Disjoint-ish from
   TraitCategory — 'Network' overlaps (same filter Set is used). */
export type FeedCategory = 'Event' | 'Network' | 'Traits' | 'Market';

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
        Event: new Set<string>(),
        Market: new Set<string>(),
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

    /* Chat H item 3 — feed-mode L1 selection. Sim's `activeFeedCategory`
       (sim 7400). When sort==='feed', the trait pill row swaps from the
       non-feed cats (Layer/Mineral/Fate/Network/Breadcrumb) to the feed
       cats (Event/Network/Traits/Market — sim 8477). This state mirrors
       sim's separate `activeFeedCategory` so a non-feed Layer selection
       doesn't leak into feed mode (and vice versa). null = no feed L1
       selected. */
    activeFeedCategory: FeedCategory | null;
    setActiveFeedCategory: (c: FeedCategory | null) => void;
    clearActiveFeedCategory: () => void;

    /* Chat H item 4 — L2 sub-filter narrowing. Sim's `activeSubFilter`
       (sim 7163) + `activeFeedSubFilter` (sim 7401). Single piece of
       state because only one L1 (feed or non-feed) is active at a time.
       Default 'All' — shows every L3 leaf across all sub-buckets. When
       set to a specific sub-bucket name (e.g. 'My Circle'), L3 narrows
       to just that bucket's leaves. setSubFilter toggles between the
       bucket and 'All' (sim 8293-8294 / 8290 — feed-mode Traits L1
       defaults sub to 'Gateway' instead of 'All' since both Layer +
       Mineral can't co-exist in a single L3 view). */
    activeSubFilter: string;
    setSubFilter: (sub: string) => void;

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

    /* Multi-select selection set */
    selectedIds: ReadonlySet<number>;
    toggleSelected: (id: number) => void;
    clearSelected: () => void;

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
    /* Chat H item 3 — feed-mode L1 (sim 7400). */
    const [activeFeedCategory, setActiveFeedCategoryState] =
        useState<FeedCategory | null>(null);
    /* Chat H item 4 — L2 narrowing (sim 7163 / 7401). 'All' = no narrow. */
    const [activeSubFilter, setActiveSubFilterState] =
        useState<string>('All');
    const [activeFilters, setActiveFiltersState] =
        useState<ActiveFilters>(emptyFilters);
    const [myNotesActive, setMyNotesActive] = useState(false);
    const [burnPileActive, setBurnPileActive] = useState(false);
    const [multiSelectActive, setMultiSelectActive] = useState(false);
    const [selectedIds, setSelectedIds] = useState<ReadonlySet<number>>(
        () => new Set<number>()
    );
    const [searchActive, setSearchActive] = useState(false);
    const [searchQuery, setSearchQueryState] = useState('');
    const [priceMin, setPriceMinState] = useState('');
    const [priceMax, setPriceMaxState] = useState('');

    /* D009 — toggleSearch's two side effects (sim 8859 autofocus + sim 8861
       ON/OFF toast) need showToast. ToastProvider wraps TraitsProvider in
       app/layout.tsx (line 187 wraps the page tree which mounts
       TraitsProvider in app/art/[slug]/page.tsx:1126). closeSearch
       deliberately does NOT toast — sim's window.closeSearch (sim 8864-8870)
       skips the toast even though it flips searchActive=false. Same here. */
    const { showToast } = useToast();

    /* Build 16: plain setter. The prev===c toggle that used to live here
       is gone — the BarPill onClick decides between `setActiveCategory`
       (open / swap) and `clearActiveCategory` (toggle off) based on its
       own `active` prop. Centralizing the decision at the call site lets
       the toggle-off path also drain filters in the same setState batch
       without leaking that responsibility into the setter signature.
       Chat H item 4: also resets activeSubFilter to 'All' on every L1
       open/swap (sim 8282 — `activeSubFilter = 'All'` after the
       activeCategory write). */
    const setActiveCategory = useCallback((c: TraitCategory | null) => {
        setActiveCategoryState(c);
        setActiveSubFilterState('All');
    }, []);

    /* Build 16: clear active L1 + drain its filter Set in one transaction.
       Both setState calls fire from the same event handler so React 18+
       batches them into a single render. The activeFilters update reads
       the previous activeCategory off the functional updater so it stays
       correct even if the surrounding closure has captured a stale value
       (this matters when clearActiveCategory is called from a non-React
       callback path — e.g. a future keyboard handler). If activeCategory
       is already null this is a no-op on both axes.
       Chat H item 4: also resets activeSubFilter to 'All' (sim 8282 — the
       `activeSubFilter = 'All'` line runs on every setCategory call,
       open OR close path). */
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
        setActiveSubFilterState('All');
    }, []);

    /* Chat H item 3 — feed-mode L1 setter. Mirrors sim 8274-8279:
       opening a feed L1 sets activeFeedSubFilter to 'Gateway' for Traits
       (so the Layer pool is the default L3 view) or 'All' for the others.
       Stored in activeSubFilter (one piece of state shared between feed
       and non-feed) since only one L1 is active at a time. */
    const setActiveFeedCategory = useCallback((c: FeedCategory | null) => {
        setActiveFeedCategoryState(c);
        if (c === 'Traits') {
            setActiveSubFilterState('Gateway');
        } else {
            setActiveSubFilterState('All');
        }
    }, []);

    /* Chat H item 3 — feed-mode L1 clear. Drains the feed-cat-specific
       filter Sets in one transaction (sim doesn't drain on toggle-off,
       but the React port mirrors the non-feed clearActiveCategory shape
       so a stale L3 selection doesn't survive an L1 close). For 'Traits'
       the drain hits both Layer + Mineral since both route through the
       Traits L1. */
    const clearActiveFeedCategory = useCallback(() => {
        setActiveFeedCategoryState((prevCat) => {
            if (prevCat !== null) {
                setActiveFiltersState((prevFilters) => {
                    if (prevCat === 'Traits') {
                        return {
                            ...prevFilters,
                            Layer: new Set<string>(),
                            Mineral: new Set<string>(),
                        };
                    }
                    /* prevCat is 'Event' | 'Network' | 'Market' — all in
                       ActiveFilters keys. */
                    return {
                        ...prevFilters,
                        [prevCat]: new Set<string>(),
                    };
                });
            }
            return null;
        });
        setActiveSubFilterState('All');
    }, []);

    /* Chat H item 4 — L2 narrowing toggler. Sim 8287-8297. If clicking the
       already-active sub, reset to 'All' (or 'Gateway' for feed-mode
       Traits L1). Otherwise narrow to that sub. Read by the L3 render
       block to filter which leaves are visible. */
    const setSubFilter = useCallback((sub: string) => {
        setActiveSubFilterState((prev) => {
            if (prev === sub) {
                /* sim 8290 — feed-mode Traits sub-default is 'Gateway',
                   not 'All'. We can't read activeFeedCategory off the
                   functional updater here, so check it via closure
                   (this callback is recreated when activeFeedCategory
                   flips because of the dep below). */
                return 'All';
            }
            return sub;
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

    const toggleMyNotes = useCallback(() => {
        setMyNotesActive((v) => {
            const next = !v;
            showToast('My Notes ' + (next ? 'ON' : 'OFF'));
            return next;
        });
    }, [showToast]);
    /* Sim 6625-6643: toggleBurnPile toasts on every flip ("Burn Pile ON" /
       "Burn Pile OFF"). Random burn-pick draw + #gallery.burn-mode class
       are owned by app/art/[slug]/page.tsx (F61 effect at sim
       6629-6635). Toast was missing here pre-chat-B — the pill went
       active but the user got no audible-equivalent confirmation. */
    const toggleBurnPile = useCallback(() => {
        setBurnPileActive((v) => {
            const next = !v;
            showToast('Burn Pile ' + (next ? 'ON' : 'OFF'));
            return next;
        });
    }, [showToast]);
    /* Sim 7196-7200: toggleMultiSelect flips body.multi-select-mode AND
       toasts. The body-class write makes `.multi-select-mode` CSS rules
       (sim 4607 + others — selection sticky-bar, breadcrumb chip mode)
       light up. Pre-chat-B the React port flipped state only; the body
       class + toast were missing, so multi-select was visually inert. */
    const toggleMultiSelect = useCallback(() => {
        setMultiSelectActive((v) => {
            const next = !v;
            if (typeof document !== 'undefined') {
                document.body.classList.toggle('multi-select-mode', next);
            }
            showToast('Multi-Select ' + (next ? 'ON' : 'OFF'));
            return next;
        });
    }, [showToast]);

    const toggleSelected = useCallback((id: number) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    }, []);

    const clearSelected = useCallback(() => {
        setSelectedIds(new Set<number>());
    }, []);

    /* Sim's toggleSearch flips `.search-row.open` and clears the query
       when collapsing. closeSearch is the explicit ✕ path.
       ────────────────────────────────────────────────────────────────────
       D009 — sim parity for two toggle side effects:
         • Autofocus the search input on the true edge (sim 8859 — 50ms
           setTimeout so the row's CSS transition has applied display:flex
           before focus, otherwise iOS Safari refuses focus on a hidden
           element). Field lookup mirrors sim verbatim:
           document.getElementById('searchInput') — the React render
           pins this id at TraitsUI.tsx:492.
         • Toast on every toggle, both edges (sim 8861 — fires
           'Search Filter ON' OR 'Search Filter OFF' depending on the
           NEW value, regardless of direction). Sim's closeSearch (sim
           8864) does NOT toast, only toggleSearch does, so the toast
           lives in the toggle path only.

       Closure-captured `searchActive` reads the pre-update value, so
       `next = !searchActive` is the new value and feeds both side
       effects + the setSearchActive call. useCallback deps include
       [searchActive, showToast] which forces re-creation on each
       toggle — fine, this isn't a hot path.

       NOTE: the .search-filter-chip surface (TraitsUI.tsx:562-570) is a
       Brendon-approved Build 13 port-only addition that lives ALONGSIDE
       this toast — sim has no persistent chip. Toast and chip together,
       not as replacements for each other. */
    const toggleSearch = useCallback(() => {
        const next = !searchActive;
        setSearchActive(next);
        if (!next) {
            setSearchQueryState('');
            setPriceMinState('');
            setPriceMaxState('');
        }
        if (next) {
            // sim 8859: setTimeout(..., 50) — wait for display:flex
            // transition before focus().
            setTimeout(() => {
                const inp = document.getElementById(
                    'searchInput'
                ) as HTMLInputElement | null;
                inp?.focus();
            }, 50);
        }
        // No toast — the search bar appearing/disappearing is unambiguous
        // labelled UI. Brendon: "obvious, don't toast it."
    }, [searchActive]);

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
        setActiveFeedCategoryState(null);
        setActiveSubFilterState('All');
        setActiveFiltersState(emptyFilters());
        setMyNotesActive(false);
        setBurnPileActive(false);
        setMultiSelectActive(false);
        if (typeof document !== 'undefined') {
            document.body.classList.remove('multi-select-mode');
        }
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
        activeFeedCategory !== null ||
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
            activeFeedCategory,
            setActiveFeedCategory,
            clearActiveFeedCategory,
            activeSubFilter,
            setSubFilter,
            activeFilters,
            toggleFilter,
            myNotesActive,
            toggleMyNotes,
            burnPileActive,
            toggleBurnPile,
            multiSelectActive,
            toggleMultiSelect,
            selectedIds,
            toggleSelected,
            clearSelected,
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
            activeFeedCategory,
            setActiveFeedCategory,
            clearActiveFeedCategory,
            activeSubFilter,
            setSubFilter,
            activeFilters,
            toggleFilter,
            myNotesActive,
            toggleMyNotes,
            burnPileActive,
            toggleBurnPile,
            multiSelectActive,
            toggleMultiSelect,
            selectedIds,
            toggleSelected,
            clearSelected,
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
