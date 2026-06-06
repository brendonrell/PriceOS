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

const POPOVER_WIDTH = 260;
const MARGIN = 8;
const MOBILE_BP = 600;

export default function PriceDaySlot() {
    const ref = useRef<HTMLSpanElement>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
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
        if (ref.current) {
            const rect = ref.current.getBoundingClientRect();
            let left =
                window.innerWidth < MOBILE_BP
                    ? (window.innerWidth - POPOVER_WIDTH) / 2
                    : rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
            left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
            setPos({ top: rect.bottom + 4, left });
        }
        setOpen(true);
    };

    const dateLabel = today ? formatPriceDate(today) : '—';
    const contents: PriceDayContents | null = today ? priceDayContents(today) : null;

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
                    className="priceday-popover"
                    style={{ position: 'fixed', top: pos.top, left: pos.left }}
                >
                    <div className="dp-title">PRICEDAY #{contents.number}</div>
                    <div className="dp-title-spacer" />

                    <div className="pd-section-header">MINTED THIS DAY</div>
                    {contents.minted.map((r, i) => (
                        <div className="dp-row" key={`m${i}`}>
                            <span className="dp-label">{r.label}</span>
                            <span className="dp-value">{r.value}</span>
                        </div>
                    ))}
                    <div className="pd-section-end" />

                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                    {contents.uploaded.map((r, i) => (
                        <div className="dp-row" key={`u${i}`}>
                            <span className="dp-label">{r.label}</span>
                            <span className="dp-value">{r.value}</span>
                        </div>
                    ))}
                    <div className="pd-section-end" />

                    <div className="pd-section-header">BIGGEST SALE</div>
                    {contents.biggestSale && (
                        <div className="dp-row">
                            <span className="dp-label">{contents.biggestSale.label}</span>
                            <span className="dp-value">{contents.biggestSale.value}</span>
                        </div>
                    )}
                    <div className="pd-section-end" />
                </div>
            )}
        </span>
    );
}
