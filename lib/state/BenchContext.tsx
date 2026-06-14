'use client';

/*
 * BenchContext — The Bench (OS Tool / Comparison) + the shared hold-drag state.
 *
 * The Bench is ONE thing: a tab that peeks up from the bottom the moment you
 * start dragging an artwork. You drag pieces onto it; they live in the tab,
 * side by side (price · floor delta · your Note), with a Portrait↔Landscape
 * split and a one-tap image export. Dismiss clears it. There is NO button and
 * NO separate panel — the tab IS the bench.
 *
 * Ephemeral: nothing is persisted; the bench lives in memory for the session
 * and clears on dismiss / reload.
 *
 * This context also holds the live hold-drag descriptor so the global BenchDock
 * can render the floating ghost + the tab from one place while the per-card
 * useHoldDrag engine drives it.
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

/** Where a hold-drag can be dropped. Cart is gated on the piece being listed. */
export type DropTarget = 'bench' | 'cart';

/** Live descriptor of an in-flight hold-drag, mirrored to the global dock. */
export interface BenchDragState {
    slug: string;
    id: number;
    /** Listed pieces can also be dropped on the Cart target. */
    listed: boolean;
    /** Current pointer position in viewport px. */
    x: number;
    y: number;
    /** True once the long-press fires — ghost + tab are shown. */
    engaged: boolean;
    /** Which target the pointer is currently over (highlight + drop). */
    armed: DropTarget | null;
}

interface BenchContextValue {
    items: BenchItem[];
    orientation: BenchOrientation;

    add: (slug: string, id: number) => 'added' | 'present' | 'full';
    remove: (slug: string, id: number) => void;
    clear: () => void;
    has: (slug: string, id: number) => boolean;
    toggleOrientation: () => void;

    /** Live hold-drag descriptor (null when idle). Driven by useHoldDrag. */
    drag: BenchDragState | null;
    setDrag: (next: BenchDragState | null) => void;
}

const BenchCtx = createContext<BenchContextValue | null>(null);

export function BenchProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<BenchItem[]>([]);
    const [orientation, setOrientation] = useState<BenchOrientation>('portrait');
    const [drag, setDragState] = useState<BenchDragState | null>(null);

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

    const setDrag = useCallback((next: BenchDragState | null) => setDragState(next), []);

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
        () => ({
            items,
            orientation,
            add,
            remove,
            clear,
            has,
            toggleOrientation,
            drag,
            setDrag,
        }),
        [items, orientation, add, remove, clear, has, toggleOrientation, drag, setDrag],
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
