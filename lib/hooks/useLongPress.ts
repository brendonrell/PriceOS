'use client';

/*
 * useLongPress — the app's press-and-hold contract, in one place
 * (Brendon, 2026-07-26: the action-row buttons need long-press actions, e.g.
 * hold the star to ADD TO LIST).
 *
 * This is the SAME gesture the Pings rows already use (hold ~500ms, ~10px of
 * drift cancels it, the hold swallows its own trailing click and iOS context
 * menu) — lifted verbatim so a hold on an action button feels like every other
 * hold in PD. Nothing new invented.
 */

import { useCallback, useRef } from 'react';

const HOLD_MS = 500;
/** Drift (px) that re-reads the gesture as a scroll and cancels the hold. */
const DRIFT_PX = 10;

export function useLongPress(onHold: () => void) {
    const cb = useRef(onHold);
    cb.current = onHold;

    const timer = useRef<number | null>(null);
    const start = useRef<{ x: number; y: number } | null>(null);
    const fired = useRef(false);

    const clear = useCallback(() => {
        if (timer.current != null) { window.clearTimeout(timer.current); timer.current = null; }
    }, []);

    return {
        onPointerDown: (e: React.PointerEvent) => {
            if (e.button != null && e.button !== 0) return;
            fired.current = false;
            start.current = { x: e.clientX, y: e.clientY };
            clear();
            timer.current = window.setTimeout(() => {
                timer.current = null;
                fired.current = true;
                cb.current();
            }, HOLD_MS);
        },
        onPointerMove: (e: React.PointerEvent) => {
            const s = start.current;
            if (s && Math.hypot(e.clientX - s.x, e.clientY - s.y) > DRIFT_PX) clear();
        },
        onPointerUp: clear,
        onPointerCancel: clear,
        /* A hold that fired owns the gesture — the tap action must not also run. */
        onClickCapture: (e: React.MouseEvent) => {
            if (fired.current) {
                fired.current = false;
                e.preventDefault();
                e.stopPropagation();
            }
        },
        onContextMenu: (e: React.MouseEvent) => {
            if (fired.current) e.preventDefault();
        },
    };
}
