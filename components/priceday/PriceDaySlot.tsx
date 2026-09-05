'use client';

/*
 * PriceDaySlot — the global hero date stamp + PriceDay almanac popover.
 *
 * Renders the actual current date (computed client-side after mount so
 * SSR/CSR don't disagree at a midnight boundary) and, on tap, the
 * PriceDay popover. All data comes from lib/priceday (test-phase seed).
 *
 * Markup mirrors the existing inline popover on the project/profile hero
 * (.project-date-wrap / .project-date / .priceday-popover) so the shared
 * CSS applies with no new styles. Those two pages can adopt this
 * component later; this build only wires it into home.
 */

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
    formatPriceDate,
    priceDayContents,
    type PriceDayContents,
} from '../../lib/priceday/priceday';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { moodOfDay } from '../../lib/mood/mood';
import PriceDayTitleStar from './PriceDayTitleStar';

const POPOVER_WIDTH = 260;
const MARGIN = 8;
const MOBILE_BP = 600;

export default function PriceDaySlot() {
    const ref = useRef<HTMLSpanElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    /* Compute the popover position from the current anchor rect. */
    const priceDayCoords = () => {
        if (!ref.current) return null;
        const rect = ref.current.getBoundingClientRect();
        let left =
            window.innerWidth < MOBILE_BP
                ? (window.innerWidth - POPOVER_WIDTH) / 2
                : rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
        left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
        return { top: rect.bottom + 4, left };
    };

    /* Keep the popover inside the viewport regardless of where its anchor
       sits — below the anchor is the default, but if that would run the
       popover off the bottom of the screen it flips above the anchor, and
       if even that doesn't fit it's clamped flush to the screen edge
       (Brendon, 2026-08-27 — "just show it INSIDE THE VIEWPORT"). Needs the
       popover's real rendered height, so this runs after it's in the DOM. */
    const clampToViewport = () => {
        if (!ref.current || !popRef.current) return;
        const rect = ref.current.getBoundingClientRect();
        const popRect = popRef.current.getBoundingClientRect();
        let top = rect.bottom + 4;
        if (top + popRect.height > window.innerHeight - MARGIN) {
            const above = rect.top - popRect.height - 4;
            top = above >= MARGIN ? above : Math.max(MARGIN, window.innerHeight - popRect.height - MARGIN);
        }
        popRef.current.style.top = `${top}px`;
        // Horizontal clamp uses the popover's REAL rendered width, not the
        // POPOVER_WIDTH constant — needed now that the landscape wide/2-col
        // variant renders wider than 260px (Brendon, 2026-09-04).
        const left = Math.max(
            MARGIN,
            Math.min(parseFloat(popRef.current.style.left || '0'), window.innerWidth - popRect.width - MARGIN)
        );
        popRef.current.style.left = `${left}px`;
    };
    /* Compute "today" after mount to avoid an SSR/CSR hydration mismatch. */
    const [today, setToday] = useState<Date | null>(null);
    useEffect(() => {
        setToday(new Date());
    }, []);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = () => {
        if (open) {
            setOpen(false);
            return;
        }
        const c = priceDayCoords();
        if (c) setPos(c);
        setOpen(true);
    };

    useLayoutEffect(() => {
        if (!open) return;
        clampToViewport();
    }, [open, pos]);

    /* Keep the popover glued to the date stamp: as the page scrolls (or the
       window resizes), re-read the anchor and move the popover with it, writing
       straight to the node so the page never re-renders mid-scroll. */
    useEffect(() => {
        if (!open) return;
        const track = () => {
            const c = priceDayCoords();
            if (c && popRef.current) {
                popRef.current.style.left = `${c.left}px`;
            }
            clampToViewport();
        };
        window.addEventListener('scroll', track, true);
        window.addEventListener('resize', track);
        return () => {
            window.removeEventListener('scroll', track, true);
            window.removeEventListener('resize', track);
        };
    }, [open]);

    const dateLabel = today ? formatPriceDate(today) : '—';
    const livePdc = usePriceDay(today ?? new Date());
    const contents: (PriceDayContents & { flavor?: string | null }) | null = today ? livePdc : null;

    return (
        <span className="project-date-wrap" ref={ref}>
            <span
                className={`project-date${open ? ' pd-active' : ''}`}
                role="button"
                tabIndex={0}
                onClick={toggle}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        toggle();
                    }
                }}
                title="PriceDay"
            >
                {dateLabel}
            </span>
            {open && pos && contents && (
                <div
                    ref={popRef}
                    className="priceday-popover"
                    style={{ position: 'fixed', top: pos.top, left: pos.left }}
                >
                    <PriceDayTitleStar number={contents.number} color={today ? moodOfDay(today).hex : undefined} />
                    <div className="dp-title-spacer" />

                    <div className="pd-section-header">MINTED THIS DAY</div>
                    {contents.minted.length > 0 ? (
                        contents.minted.map((r, i) => (
                            <div className="dp-row" key={`m${i}`}>
                                <span className="dp-label">{r.label}</span>
                                <span className="dp-value">{r.value}</span>
                            </div>
                        ))
                    ) : (
                        <div className="dp-row dp-flavor dp-empty"><span className="dp-label">Nothing minted this day.</span></div>
                    )}
                    <div className="pd-section-end" />

                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                    {contents.uploaded.length > 0 ? (
                        contents.uploaded.map((r, i) => (
                            <div className="dp-row" key={`u${i}`}>
                                <span className="dp-label">{r.label}</span>
                                <span className="dp-value">{r.value}</span>
                            </div>
                        ))
                    ) : (
                        <div className="dp-row dp-flavor dp-empty"><span className="dp-label">Nothing uploaded this day.</span></div>
                    )}
                    <div className="pd-section-end" />

                    <div className="pd-section-header">BIGGEST SALE</div>
                    {contents.biggestSale ? (
                        <div className="dp-row">
                            <span className="dp-label">{contents.biggestSale.label}</span>
                            <span className="dp-value">{contents.biggestSale.value}</span>
                        </div>
                    ) : (
                        <div className="dp-row dp-flavor dp-empty"><span className="dp-label">No sale this day.</span></div>
                    )}
                    {/* THE DAY — the day's own written line (real ledger, seeded voice). */}
                    {contents.flavor && (
                        <>
                            <div className="pd-section-header">THE DAY</div>
                            <div className="dp-row dp-flavor"><span className="dp-label">{contents.flavor}</span></div>
                            <div className="pd-section-end" />
                        </>
                    )}

                    {/* MOOD RING — always the last item in the popover (Brendon, 2026-08-27). */}
                    {today && (() => {
                        const mood = moodOfDay(today);
                        return (
                            <div className="dp-row dp-mood-row">
                                <span className="dp-label">MOOD RING</span>
                                <span className="dp-value">
                                    <span className="dp-mood-swatch" style={{ backgroundColor: mood.hex }} />
                                    {mood.name}
                                </span>
                            </div>
                        );
                    })()}
                    <div className="pd-section-end" />
                </div>
            )}
        </span>
    );
}
