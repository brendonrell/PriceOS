'use client';

/*
 * useGridSettle — the one short ease a re-sort or re-group lands with
 * (Brendon, 2026-07-30: "the snappiness makes it *fun* to use").
 *
 * It touches the class list directly rather than going through state, because
 * a render is exactly what we are trying to save on these taps. One animation
 * plays on the GRID itself — never one per card, which at a hundred cards is
 * the jank this whole pass exists to remove.
 *
 * Never fires on first paint: a page arriving already settled has nothing to
 * settle from.
 */

import { useEffect, useRef } from 'react';

const MS = 180;

/** @param signature Changes whenever the arrangement changes (sort · group). */
export function useGridSettle(signature: string, enabled = true): void {
    const first = useRef(true);
    useEffect(() => {
        if (first.current) { first.current = false; return; }
        if (!enabled || typeof document === 'undefined') return;
        const el = document.getElementById('gallery');
        if (!el) return;
        el.classList.remove('is-settling');
        // Restart the animation rather than letting a second tap be swallowed.
        void el.offsetWidth;
        el.classList.add('is-settling');
        const t = window.setTimeout(() => el.classList.remove('is-settling'), MS + 40);
        return () => {
            window.clearTimeout(t);
            el.classList.remove('is-settling');
        };
    }, [signature, enabled]);
}
