'use client';

/*
 * SortContext
 *
 * Owns the user's default sort preference for collection pages.
 * Four options matching the sim's Default Sort row:
 *   id     — sort by token ID (default)
 *   price  — sort by price asc/desc
 *   feed   — activity feed view
 *   fog    — fog mode reveal (collection unfolds artwork by artwork)
 *
 * Persisted in localStorage under 'pd_settings_sort'. The collection
 * page reads this in step 5+ to set its default view; for now the
 * value is just stored and reflected back in the Settings UI.
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

const STORAGE_KEY = 'pd_settings_sort';

interface SortContextValue {
    sort: SortKey;
    setSort: (s: SortKey) => void;
}

const SortContext = createContext<SortContextValue | null>(null);

function isSortKey(v: unknown): v is SortKey {
    return v === 'id' || v === 'price' || v === 'feed' || v === 'fog';
}

export function SortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<SortKey>('id');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isSortKey(raw)) setSortState(raw);
        } catch {
            // ignore
        }
    }, []);

    const setSort = useCallback((s: SortKey) => {
        setSortState(s);
        try {
            localStorage.setItem(STORAGE_KEY, s);
        } catch {
            // ignore
        }
    }, []);

    const value = useMemo<SortContextValue>(() => ({ sort, setSort }), [sort, setSort]);

    return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
    const ctx = useContext(SortContext);
    if (!ctx) {
        throw new Error('useSort must be used inside <SortProvider>');
    }
    return ctx;
}
