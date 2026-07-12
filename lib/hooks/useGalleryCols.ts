'use client';

/*
 * useGalleryCols — live column metrics of the #gallery grid, so a grouping
 * header can cap its own width to the columns its pieces actually occupy
 * (Brendon, 2026-07-12: the trailing dimension glyph must sit with the last
 * artwork of the group's first row, never off at the page edge).
 *
 * Reads the RESOLVED grid tracks (computed style returns per-track px), so it
 * works at any viewport. Returns null while the grid is unmeasurable (not
 * mounted / display:none) — callers skip the cap and keep the full row.
 */

import { useEffect, useState } from 'react';

export interface GalleryCols {
    /** Number of columns the grid resolved to. */
    cols: number;
    /** One column's width, px. */
    colW: number;
    /** The grid's column gap, px. */
    gap: number;
}

export function useGalleryCols(active: boolean): GalleryCols | null {
    const [m, setM] = useState<GalleryCols | null>(null);

    useEffect(() => {
        if (!active) return;
        const read = () => {
            const el = document.getElementById('gallery');
            if (!el || el.offsetParent === null) { setM(null); return; }
            const cs = getComputedStyle(el);
            const tracks = cs.gridTemplateColumns.split(' ').filter(Boolean);
            const colW = parseFloat(tracks[0]);
            if (!Number.isFinite(colW) || colW <= 0) { setM(null); return; }
            const gap = parseFloat(cs.columnGap) || 0;
            setM({ cols: tracks.length, colW, gap });
        };
        read();
        window.addEventListener('resize', read);
        return () => window.removeEventListener('resize', read);
    }, [active]);

    return active ? m : null;
}

/** Width capping `n` pieces' columns (their span incl. inner gaps), px. */
export function colsWidth(m: GalleryCols, n: number): number {
    const k = Math.max(1, Math.min(m.cols, n));
    return k * m.colW + (k - 1) * m.gap;
}
