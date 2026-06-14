'use client';

/*
 * BenchContext — The Bench (OS Tool / Comparison): the set of pieces on the
 * bench, plus the split orientation. Low-frequency state only.
 *
 * The LIVE hold-drag (pointer position + armed target) deliberately does NOT
 * live here — it's in lib/state/benchDragStore so the 60fps drag updates don't
 * re-render every gallery card. See that file.
 *
 * The Bench is ONE thing: a tab that peeks up from the bottom the moment you
 * start dragging an artwork. You drag pieces onto it; they live in the tab side
 * by side, with a Portrait↔Landscape split + image export. Dismiss clears it.
 * Ephemeral — nothing is persisted.
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

/** Max pieces on the bench at once — a comparison surface, not a list. */
export const BENCH_MAX = 8;

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

    add: (slug: string, id: number) => 'added' | 'present' | 'full';
    remove: (slug: string, id: number) => void;
    clear: () => void;
    has: (slug: string, id: number) => boolean;
    toggleOrientation: () => void;
}

const BenchCtx = createContext<BenchContextValue | null>(null);

export function BenchProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<BenchItem[]>([]);
    const [orientation, setOrientation] = useState<BenchOrientation>('portrait');

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
        setItems((prev) =>
            prev.some((it) => it.slug === slug && it.id === id) ? prev : [...prev, { slug, id }],
        );
        return 'added';
    }, []);

    const remove = useCallback((slug: string, id: number) => {
        setItems((prev) => prev.filter((it) => !(it.slug === slug && it.id === id)));
    }, []);

    const clear = useCallback(() => setItems([]), []);

    const toggleOrientation = useCallback(
        () => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait')),
        [],
    );

    /* Escape dismisses (clears) the bench when it's holding pieces. */
    useEffect(() => {
        if (items.length === 0) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setItems([]);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [items.length]);

    const value = useMemo<BenchContextValue>(
        () => ({ items, orientation, add, remove, clear, has, toggleOrientation }),
        [items, orientation, add, remove, clear, has, toggleOrientation],
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
