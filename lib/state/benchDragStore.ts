'use client';

/*
 * benchDragStore — a module-level store for the LIVE hold-drag (position +
 * armed target), kept OUT of React context on purpose.
 *
 * The drag position updates ~60×/sec while a finger/cursor moves. If that lived
 * in BenchContext, every component reading the context — i.e. every gallery card
 * (each runs useHoldDrag) — would re-render on every move, which buries mobile
 * Safari and crashes the app once a few pieces are in play. Here, only the
 * BenchDock subscribes (via useSyncExternalStore), so the gallery stays still
 * during a drag.
 */

/* 'showcase' is a Showcase slot on your own profile in Static mode — the
   drop that REORDERS the set (Brendon, 2026-07-24). Same lift, same ghost,
   same dock arming as bench/cart; only the drop zone differs. */
export type DropTarget = 'bench' | 'cart' | 'showcase';

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
    /** Which target the pointer is over (highlight + drop). */
    armed: DropTarget | null;
    /** The armed zone's own key (`slug:id`) — set for 'showcase' slots so the
     *  hovered slot can light up and the drop knows where to insert. */
    armedKey: string | null;
}

let current: BenchDragState | null = null;
const listeners = new Set<() => void>();

export function getBenchDrag(): BenchDragState | null {
    return current;
}

/** SSR snapshot — always idle. */
export function getBenchDragServer(): BenchDragState | null {
    return null;
}

export function setBenchDrag(next: BenchDragState | null): void {
    current = next;
    for (const l of listeners) l();
}

export function subscribeBenchDrag(cb: () => void): () => void {
    listeners.add(cb);
    return () => {
        listeners.delete(cb);
    };
}
