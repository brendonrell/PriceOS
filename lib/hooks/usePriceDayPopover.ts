'use client';

/*
 * usePriceDayPopover — the identity-line date stamp's PriceDay popover:
 * open state, viewport-clamped position, outside-tap close, and the
 * scroll/resize tracker that keeps it glued to the stamp (writes straight
 * to the node so the page never re-renders mid-scroll). Split out of
 * ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useRef, useState } from 'react';

export function usePriceDayPopover() {
    const [priceDayOpen, setPriceDayOpen] = useState(false);
    const [priceDayPos, setPriceDayPos] = useState<{ top: number; left: number } | null>(null);
    const priceDayRef = useRef<HTMLSpanElement>(null);
    const priceDayPopRef = useRef<HTMLDivElement>(null);
    const priceDayCoords = () => {
        if (!priceDayRef.current) return null;
        const rect = priceDayRef.current.getBoundingClientRect();
        const POPOVER_WIDTH = 260;
        const MARGIN = 8;
        const MOBILE_BP = 600;
        let left: number;
        if (window.innerWidth < MOBILE_BP) {
            left = (window.innerWidth - POPOVER_WIDTH) / 2;
        } else {
            left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
            left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
        }
        return { top: rect.bottom + 4, left };
    };

    useEffect(() => {
        if (!priceDayOpen) return;
        const handler = (e: MouseEvent) => {
            if (priceDayRef.current && !priceDayRef.current.contains(e.target as Node)) {
                setPriceDayOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [priceDayOpen]);

    /* Keep the popover glued to the date stamp on scroll/resize — write straight
       to the node so the page never re-renders mid-scroll. */
    useEffect(() => {
        if (!priceDayOpen) return;
        const track = () => {
            const c = priceDayCoords();
            if (c && priceDayPopRef.current) {
                priceDayPopRef.current.style.top = `${c.top}px`;
                priceDayPopRef.current.style.left = `${c.left}px`;
            }
        };
        window.addEventListener('scroll', track, true);
        window.addEventListener('resize', track);
        return () => {
            window.removeEventListener('scroll', track, true);
            window.removeEventListener('resize', track);
        };
         
    }, [priceDayOpen]);

    const openPriceDay = () => {
        if (priceDayOpen) { setPriceDayOpen(false); return; }
        const c = priceDayCoords();
        if (c) setPriceDayPos(c);
        setPriceDayOpen(true);
    };

    return { priceDayOpen, priceDayPos, priceDayRef, priceDayPopRef, openPriceDay };
}
