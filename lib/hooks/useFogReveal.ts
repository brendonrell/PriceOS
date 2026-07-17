'use client';

/*
 * useFogReveal — the fog-mode tap-to-reveal, SITE-WIDE (2026-07-17 repair).
 *
 * The original port attached the reveal handler to #gallery only (the project
 * page), so fog on the home carousels — and every grid that isn't #gallery
 * (profile Collected, showcase, albums) — blurred the art but the first tap
 * fell straight through to the modal: fogged forever, never revealable
 * (Brendon's report). The handler now lives at the DOCUMENT level, capture
 * phase, gated on body.fog-mode — one listener, every .output-card on any
 * surface. First tap reveals; second tap opens the modal as normal.
 *
 * Mounted once in PriceOSShell (alongside useBodyClass, which drives the
 * body.fog-mode class from the same sort). Leaving fog scrubs every
 * .fog-revealed flag so the next entry re-fogs the whole site (sim
 * 8395-8398 cleanup, unchanged).
 */

import { useEffect } from 'react';
import { useSort } from '../state/SortContext';

export function useFogReveal(): void {
    const { sort } = useSort();
    useEffect(() => {
        if (sort !== 'fog') {
            document
                .querySelectorAll('.output-card.fog-revealed')
                .forEach((c) => c.classList.remove('fog-revealed'));
            return;
        }
        const handler = (ev: Event) => {
            // Re-check inside the handler in case body.fog-mode was dropped
            // between attach and click (defensive — sim 8375).
            if (!document.body.classList.contains('fog-mode')) return;
            const target = ev.target as HTMLElement | null;
            if (!target) return;
            const card = target.closest('.output-card');
            if (!card || card.classList.contains('fog-revealed')) return;
            card.classList.add('fog-revealed');
            ev.preventDefault();
            ev.stopPropagation();
        };
        // Capture phase — runs before any card's own click handling.
        document.addEventListener('click', handler, true);
        return () => {
            document.removeEventListener('click', handler, true);
        };
    }, [sort]);
}
