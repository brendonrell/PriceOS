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

import { useEffect, useRef, useState } from 'react';
import {
    formatPriceDate,
    priceDayContents,
    type PriceDayContents,
} from '../../lib/priceday/priceday';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { moodOfDay } from '../../lib/mood/mood';

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

    /* Keep the popover glued to the date stamp: as the page scrolls (or the
       window resizes), re-read the anchor and move the popover with it, writing
       straight to the node so the page never re-renders mid-scroll. */
    useEffect(() => {
        if (!open) return;
        const track = () => {
            const c = priceDayCoords();
            if (c && popRef.current) {
                popRef.current.style.top = `${c.top}px`;
                popRef.current.style.left = `${c.left}px`;
            }
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
                    <div className="dp-title">PRICEDAY #{contents.number}</div>
                    <div className="dp-title-spacer" />

                    {today && (() => {
                        const mood = moodOfDay(today);
                        return (
                            <>
                                <div className="dp-row dp-mood-row">
                                    <span className="dp-label">MOOD RING</span>
                                    <span className="dp-value">
                                        <span className="dp-mood-swatch" style={{ backgroundColor: mood.hex }} />
                                        {mood.name}
                                    </span>
                                </div>
                                <div className="pd-section-end" />
                            </>
                        );
                    })()}

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
                    <div className="pd-section-end" />
                </div>
            )}
        </span>
    );
}
