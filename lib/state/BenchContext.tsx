'use client';

/*
 * BenchContext — The Bench (OS Tool / Comparison).
 *
 * Persistent + project-to-project: the set survives reloads and carries as you
 * move between projects (stored on-device, like the Cart). The live hold-drag
 * (pointer position) lives in benchDragStore, NOT here, so 60fps drag updates
 * don't re-render the gallery.
 *
 * Two display states (BenchDock reads `expanded`):
 *   - collapsed (peek)  → a small tab at the bottom. This is the resting state,
 *                         incl. right after you add art — the viewport stays clear.
 *   - expanded (full)   → the side-by-side comparison. Only when you TAP the tab,
 *                         never from adding art.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { useCollectionSync } from '../collections/useCollectionSync';

/** Max pieces on the bench at once — a comparison surface, not a list. */
export const BENCH_MAX = 8;
const STORAGE_KEY = 'pd_bench';

/** A bench entry — Project-exact (a bare id collides across Projects). */
export interface BenchItem {
    slug: string;
    id: number;
}

/** Split layout: Portrait = side-by-side columns, Landscape = stacked rows. */
export type BenchOrientation = 'portrait' | 'landscape';

interface BenchContextValue {
    items: BenchItem[];
    orientation: BenchOrientation;
    /** True when the full comparison is pulled up; false = the peek tab. */
    expanded: boolean;

    add: (slug: string, id: number) => 'added' | 'present' | 'full';
    remove: (slug: string, id: number) => void;
    clear: () => void;
    has: (slug: string, id: number) => boolean;
    toggleOrientation: () => void;
    expand: () => void;
    collapse: () => void;
}

const BenchCtx = createContext<BenchContextValue | null>(null);

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}
function parseKey(k: string): BenchItem {
    const i = k.indexOf(':');
    return { slug: k.slice(0, i), id: Number(k.slice(i + 1)) };
}
function loadFromStorage(): BenchItem[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        const arr = JSON.parse(raw);
        if (!Array.isArray(arr)) return [];
        return (arr as unknown[])
            .filter((k): k is string => typeof k === 'string' && k.includes(':'))
            .map(parseKey)
            .filter((it) => it.slug && Number.isFinite(it.id))
            .slice(0, BENCH_MAX);
    } catch {
        return [];
    }
}
function saveToStorage(items: BenchItem[]) {
    if (typeof window === 'undefined') return;
    try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items.map((it) => keyOf(it.slug, it.id))));
    } catch {
        /* quota / private mode — in-memory still works */
    }
}

export function BenchProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<BenchItem[]>([]);
    const [orientation, setOrientation] = useState<BenchOrientation>('portrait');
    const [expanded, setExpanded] = useState(false);

    /* Hydrate from storage on mount (SSR starts empty, same as the Cart). */
    useEffect(() => {
        const initial = loadFromStorage();
        if (initial.length > 0) setItems(initial);
    }, []);

    /* Mirror of items for synchronous reads — add() must return its real
       outcome (state updaters don't run synchronously). */
    const itemsRef = useRef<BenchItem[]>(items);
    itemsRef.current = items;

    const has = useCallback(
        (slug: string, id: number) =>
            itemsRef.current.some((it) => it.slug === slug && it.id === id),
        [],
    );

    const add = useCallback((slug: string, id: number): 'added' | 'present' | 'full' => {
        if (!slug || !Number.isFinite(id)) return 'present';
        const cur = itemsRef.current;
        if (cur.some((it) => it.slug === slug && it.id === id)) return 'present';
        if (cur.length >= BENCH_MAX) return 'full';
        setItems((prev) => {
            if (prev.some((it) => it.slug === slug && it.id === id)) return prev;
            const next = [...prev, { slug, id }];
            saveToStorage(next);
            return next;
        });
        setExpanded(false); // adding art recedes the tab — viewport stays clear
        return 'added';
    }, []);

    const remove = useCallback((slug: string, id: number) => {
        setItems((prev) => {
            const next = prev.filter((it) => !(it.slug === slug && it.id === id));
            saveToStorage(next);
            return next;
        });
    }, []);

    const clear = useCallback(() => {
        setItems([]);
        saveToStorage([]);
        setExpanded(false);
    }, []);

    const toggleOrientation = useCallback(
        () => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait')),
        [],
    );
    const expand = useCallback(() => setExpanded(true), []);
    const collapse = useCallback(() => setExpanded(false), []);

    /* Cross-device persistence (bench_items) — merges with the on-device set on
       sign-in, debounced save while signed in. Logged out → localStorage only. */
    const applyServer = useCallback((next: BenchItem[]) => {
        setItems(next);
        saveToStorage(next);
    }, []);
    useCollectionSync('/api/me/bench', items, applyServer, BENCH_MAX);

    /* Escape collapses the full view back to the peek tab. */
    useEffect(() => {
        if (!expanded) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setExpanded(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [expanded]);

    const value = useMemo<BenchContextValue>(
        () => ({
            items, orientation, expanded,
            add, remove, clear, has, toggleOrientation, expand, collapse,
        }),
        [items, orientation, expanded, add, remove, clear, has, toggleOrientation, expand, collapse],
    );

    return <BenchCtx.Provider value={value}>{children}</BenchCtx.Provider>;
}

export function useBench(): BenchContextValue {
    const ctx = useContext(BenchCtx);
    if (!ctx) {
        throw new Error('useBench must be used inside <BenchProvider>');
    }
    return ctx;
}
