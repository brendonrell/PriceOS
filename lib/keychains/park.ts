'use client';

/*
 * Park the charms nobody is looking at (Brendon, 2026-07-31).
 *
 * A charm's sway, blink and twinkle run forever, so a rack keeps every one of
 * them alive whether it is on screen or twenty rows down. This watches a grid's
 * tiles and marks the ones that have scrolled out; the stylesheet pauses their
 * art. Nothing about the animation changes — a parked charm picks up exactly
 * where it left off the moment it comes back.
 *
 * Same law, same class name, and the same observer shape the worn charm on a
 * profile already runs by (EquippedCharm).
 */

import { useEffect, type RefObject } from 'react';

export function useParkOffscreen(
    grid: RefObject<HTMLElement | null>,
    /** Re-observe when the tile count changes. */
    tiles: number,
): void {
    useEffect(() => {
        const el = grid.current;
        if (!el || !tiles || typeof IntersectionObserver === 'undefined') return;
        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    (e.target as HTMLElement).classList.toggle('is-parked', !e.isIntersecting);
                }
            },
            /* A margin either side so a tile is already running by the time it
               reaches the edge of the view — nothing ever starts mid-scroll. */
            { rootMargin: '150px' },
        );
        for (const child of Array.from(el.children)) io.observe(child);
        return () => io.disconnect();
    }, [grid, tiles]);
}
