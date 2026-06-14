'use client';

/*
 * BenchContext — The Bench (OS Tool / Comparison) + the shared hold-drag state.
 *
 * The Bench is an EPHEMERAL comparison tray: hold-drag any Output onto the
 * bench dock, line pieces up side by side (price · floor delta · your Note),
 * flip the split between Portrait (columns) and Landscape (stacked rows),
 * export the comparison as one shareable image, and feed listed pieces
 * straight into the Cart — the same way Wishlist feeds it.
 *
 * Ephemeral by design (ClickUp 86b9jfjc3): nothing is persisted. The bench
 * lives in memory for the session and is gone on reload. Closing the panel
 * keeps the set so an accidental dismiss never wipes a comparison; CLEAR is
 * the explicit empty.
 *
 * This context ALSO holds the live hold-drag descriptor so the global
 * BenchDragLayer can render the floating ghost + the peek dock from one
 * place, while the per-card useHoldDrag engine drives it. Drag visuals and
 * the bench set colocate because a drop mutates both (engaged → armed → add).
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

/** Live descriptor of an in-flight hold-drag, mirrored to the global layer. */
export interface BenchDragState {
    slug: string;
    id: number;
    /** Listed pieces can also be dropped on the Cart dock. */
    listed: boolean;
    /** Current pointer position in viewport px. */
    x: number;
    y: number;
    /** True once the long-press fires — ghost + dock are shown. */
    engaged: boolean;
    /** Which dock the pointer is currently over (highlight + drop). */
    armed: DropTarget | null;
}

interface BenchContextValue {
    items: BenchItem[];
    panelOpen: boolean;
    orientation: BenchOrientation;

    add: (slug: string, id: number) => 'added' | 'present' | 'full';
    remove: (slug: string, id: number) => void;
    clear: () => void;
    has: (slug: string, id: number) => boolean;

    openPanel: () => void;
    closePanel: () => void;
    toggleOrientation: () => void;

    /** Live hold-drag descriptor (null when idle). Driven by useHoldDrag. */
    drag: BenchDragState | null;
    setDrag: (next: BenchDragState | null) => void;
}

const BenchCtx = createContext<BenchContextValue | null>(null);

function keyOf(slug: string, id: number): string {
    return `${slug}:${id}`;
}

export function BenchProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<BenchItem[]>([]);
    const [panelOpen, setPanelOpen] = useState(false);
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

    const openPanel = useCallback(() => setPanelOpen(true), []);
    const closePanel = useCallback(() => setPanelOpen(false), []);
    const toggleOrientation = useCallback(
        () => setOrientation((o) => (o === 'portrait' ? 'landscape' : 'portrait')),
        [],
    );

    const setDrag = useCallback((next: BenchDragState | null) => setDragState(next), []);

    /* Escape closes the panel — matches every other transient surface. */
    useEffect(() => {
        if (!panelOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setPanelOpen(false);
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [panelOpen]);

    const value = useMemo<BenchContextValue>(
        () => ({
            items,
            panelOpen,
            orientation,
            add,
            remove,
            clear,
            has,
            openPanel,
            closePanel,
            toggleOrientation,
            drag,
            setDrag,
        }),
        [items, panelOpen, orientation, add, remove, clear, has, openPanel, closePanel, toggleOrientation, drag, setDrag],
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

export { keyOf as benchKeyOf };
