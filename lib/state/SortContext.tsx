'use client';

/*
 * SortContext
 *
 * Owns the user's default sort preference for project pages.
 * Four families matching the sim's Default Sort row:
 *   id     — sort by token ID (default)
 *   price  — sort by price asc/desc
 *   feed   — activity feed view
 *   fog    — fog mode reveal (project unfolds artwork by artwork)
 *
 * Persisted in localStorage under 'pd_settings_sort' (family only —
 * matches sim's persisted defaultSort which is family-level too).
 *
 * Build 29 — D13 + D14 add direction state to the same context so
 * the in-project SortBtn (TraitsUI) and the settings DefaultSortRow
 * pill share a single source of truth for the direction arrow.
 *
 *   Sim's `currentSort` is a hyphenated string ('id-asc', 'price-desc',
 *   'feed-time-desc', 'feed-time-asc', 'feed-price-desc',
 *   'feed-price-asc', 'fog'). The port factors that into three fields:
 *     - sort     : family ('id' | 'price' | 'feed' | 'fog')
 *     - dir      : 'asc' | 'desc'  (meaningless for fog)
 *     - feedKind : 'time' | 'price' (only meaningful when sort === 'feed')
 *
 *   `setSort(family)` keeps its old contract — it sets the family and
 *   resets dir/feedKind to that family's default state (sim 8329 / 8320:
 *   id and price default to asc, feed defaults to feed-time-desc). This
 *   keeps WorkspacesContext.applyCode and the rest of the existing
 *   setSort callers backward-compatible with the previous family-only
 *   surface.
 *
 *   `cycleSort(family)` mirrors sim's window.setSort cycling logic
 *   (sim 8312-8331): clicking the active family flips direction (or
 *   advances through the 4-step FEED_SORTS sequence); clicking an
 *   inactive family enters at that family's default. Used by the
 *   in-project SortBtn (D13) and the settings DefaultSortRow
 *   pills (D14) — both of which want sim-faithful cycle-on-click.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type SortKey = 'id' | 'price' | 'feed' | 'fog';
export type SortDir = 'asc' | 'desc';
export type FeedKind = 'time' | 'price';

const STORAGE_KEY = 'pd_settings_sort';

interface SortContextValue {
    sort: SortKey;
    dir: SortDir;
    feedKind: FeedKind;
    /** Set sort family and reset dir/feedKind to family's default. */
    setSort: (s: SortKey) => void;
    /** Sim-faithful click handler — cycles direction within the family. */
    cycleSort: (s: SortKey) => void;
    /** Restore a full sort snapshot (used by Gallery View Presets). */
    applySort: (sort: SortKey, dir: SortDir, feedKind: FeedKind) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

function isSortKey(v: unknown): v is SortKey {
    return v === 'id' || v === 'price' || v === 'feed' || v === 'fog';
}

export function SortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<SortKey>('id');
    const [dir, setDir] = useState<SortDir>('asc');
    // Sim 8320 — feed entry point is feed-time-desc. Default kind = 'time'.
    const [feedKind, setFeedKind] = useState<FeedKind>('time');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isSortKey(raw)) {
                setSortState(raw);
                // Family-only restore — reset dir/feedKind to that family's
                // default state. Sim doesn't persist dir either; currentSort
                // initializes to defaultSort + family default direction.
                if (raw === 'feed') {
                    setFeedKind('time');
                    setDir('desc');
                } else if (raw === 'id' || raw === 'price') {
                    setDir('asc');
                }
            }
        } catch {
            // ignore
        }
    }, []);

    const setSort = useCallback((s: SortKey) => {
        setSortState(s);
        // Reset to family-default direction state (sim 8329 / 8320).
        if (s === 'id' || s === 'price') {
            setDir('asc');
        } else if (s === 'feed') {
            setFeedKind('time');
            setDir('desc');
        }
        try {
            localStorage.setItem(STORAGE_KEY, s);
        } catch {
            // ignore
        }
    }, []);

    const persistFamily = (next: SortKey) => {
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    };

    /* Sim 8312-8331 — window.setSort('feed' | 'fog' | 'id' | 'price').
       For feed: cycles through ['feed-time-desc', 'feed-time-asc',
       'feed-price-desc', 'feed-price-asc'] (sim 8313). For fog: toggle
       to id-asc if already fog, else to fog. For id/price: flip dir if
       already that family, else enter at `${type}-asc`. */
    const cycleSort = useCallback((target: SortKey) => {
        if (target === 'feed') {
            if (sort === 'feed') {
                // 4-step cycle within feed: matches FEED_SORTS order.
                if (feedKind === 'time' && dir === 'desc') {
                    setDir('asc');
                } else if (feedKind === 'time' && dir === 'asc') {
                    setFeedKind('price');
                    setDir('desc');
                } else if (feedKind === 'price' && dir === 'desc') {
                    setDir('asc');
                } else {
                    // price-asc → wrap back to time-desc
                    setFeedKind('time');
                    setDir('desc');
                }
            } else {
                // Enter feed at feed-time-desc (sim 8320).
                setSortState('feed');
                setFeedKind('time');
                setDir('desc');
                persistFamily('feed');
            }
            return;
        }
        if (target === 'fog') {
            if (sort === 'fog') {
                // Sim 8324 — toggle out of fog returns to id-asc.
                setSortState('id');
                setDir('asc');
                persistFamily('id');
            } else {
                setSortState('fog');
                persistFamily('fog');
            }
            return;
        }
        // id or price
        if (sort === target) {
            // Already this family — flip direction (sim 8327).
            setDir(dir === 'asc' ? 'desc' : 'asc');
        } else {
            // Enter at asc (sim 8329).
            setSortState(target);
            setDir('asc');
            persistFamily(target);
        }
    }, [sort, dir, feedKind]);

    const applySort = useCallback((s: SortKey, d: SortDir, fk: FeedKind) => {
        setSortState(s);
        setDir(d);
        setFeedKind(fk);
    }, []);

    const value = useMemo<SortContextValue>(
        () => ({ sort, dir, feedKind, setSort, cycleSort, applySort }),
        [sort, dir, feedKind, setSort, cycleSort, applySort]
    );

    return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
    const ctx = useContext(SortContext);
    if (!ctx) {
        throw new Error('useSort must be used inside <SortProvider>');
    }
    return ctx;
}
