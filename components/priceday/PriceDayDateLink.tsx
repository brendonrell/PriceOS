'use client';

/*
 * PriceDayDateLink — PriceDaySlot's popover behavior generalized to any
 * date, not just today. Same anchor/position/outside-tap/scroll-tracking
 * logic, same .priceday-popover markup (shared CSS, no new styles), just
 * parameterized by `date` + `label` so any date stamp on the site (e.g. the
 * Price Story chapter dates) can open the real PriceDay almanac for that
 * day (Brendon, 2026-08-15).
 */

import { useEffect, useRef, useState } from 'react';
import { usePriceDay } from '../../lib/priceday/usePriceDay';

const POPOVER_WIDTH = 260;
const MARGIN = 8;
const MOBILE_BP = 600;

export default function PriceDayDateLink({
    date,
    label,
    className = 'project-date',
    wrapClassName = 'project-date-wrap',
}: {
    date: Date;
    label: string;
    className?: string;
    wrapClassName?: string;
}) {
    const ref = useRef<HTMLSpanElement>(null);
    const popRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

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

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const toggle = () => {
        if (open) { setOpen(false); return; }
        const c = priceDayCoords();
        if (c) setPos(c);
        setOpen(true);
    };

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

    const contents = usePriceDay(date);

    return (
        <span className={wrapClassName} ref={ref}>
            <span
                className={`${className}${open ? ' pd-active' : ''}`}
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
                {label}
            </span>
            {open && pos && contents && (
                <div
                    ref={popRef}
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
