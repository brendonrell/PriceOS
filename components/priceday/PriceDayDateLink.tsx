'use client';

/*
 * PriceDayDateLink — PriceDaySlot's popover behavior generalized to any
 * date, not just today. Same anchor/position/outside-tap/scroll-tracking
 * logic, same .priceday-popover markup (shared CSS, no new styles), just
 * parameterized by `date` + `label` so any date stamp on the site (e.g. the
 * Price Story chapter dates) can open the real PriceDay almanac for that
 * day (Brendon, 2026-08-15).
 */

import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type PointerEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { moodOfDay } from '../../lib/mood/mood';

const POPOVER_WIDTH = 260;
const MARGIN = 8;
const MOBILE_BP = 600;

export default function PriceDayDateLink({
    date,
    label,
    className = 'project-date',
    wrapClassName = 'project-date-wrap',
    titleAttr = 'PriceDay',
    /* topExtra — an extra almanac row rendered right after the title (e.g.
       the profile's JOINED row), so callers with a bespoke first section
       don't need to fork the whole popover to get it (Brendon, 2026-08-22). */
    topExtra = null,
    /* Optional long-press plumbing (the profile date flips to the user's
       PD number on long-press) — same gesture guard, now shareable instead
       of forking the popover to get it. */
    onPointerDownCapture,
    onPointerMoveCapture,
    onPointerUpCapture,
    onPointerLeaveCapture,
    onPointerCancelCapture,
    onBeforeToggle,
    spanStyle,
    onContextMenuCapture,
}: {
    date: Date;
    label: string;
    className?: string;
    wrapClassName?: string;
    titleAttr?: string;
    topExtra?: ReactNode;
    onPointerDownCapture?: (e: PointerEvent) => void;
    onPointerMoveCapture?: (e: PointerEvent) => void;
    onPointerUpCapture?: (e: PointerEvent) => void;
    onPointerLeaveCapture?: (e: PointerEvent) => void;
    onPointerCancelCapture?: (e: PointerEvent) => void;
    /* Return true to swallow this click (e.g. a long-press already fired). */
    onBeforeToggle?: () => boolean;
    onContextMenuCapture?: (e: ReactMouseEvent) => void;
    spanStyle?: CSSProperties;
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
        if (onBeforeToggle?.()) return;
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
                onPointerDown={onPointerDownCapture}
                onPointerMove={onPointerMoveCapture}
                onPointerUp={onPointerUpCapture}
                onPointerLeave={onPointerLeaveCapture}
                onPointerCancel={onPointerCancelCapture}
                onContextMenu={onContextMenuCapture}
                style={spanStyle}
                title={titleAttr}
            >
                {label}
            </span>
            {/* Portaled to <body> — this link renders inside animated
                ancestors in some spots (e.g. the Price Story chapter spine's
                entrance animation), and any transform on an ancestor turns
                position:fixed into "fixed to that ancestor" instead of the
                viewport, stranding the popover off-position. A body portal
                sidesteps that everywhere, unconditionally (Brendon, 2026-08-17). */}
            {open && pos && contents && typeof document !== 'undefined' && createPortal(
                <div
                    ref={popRef}
                    className="priceday-popover"
                    style={{ position: 'fixed', top: pos.top, left: pos.left }}
                >
                    <div className="dp-title">PRICEDAY #{contents.number}</div>
                    <div className="dp-title-spacer" />

                    {topExtra}

                    {(() => {
                        const mood = moodOfDay(date);
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
                    {contents.flavor && (
                        <>
                            <div className="pd-section-header">THE DAY</div>
                            <div className="dp-row dp-flavor"><span className="dp-label">{contents.flavor}</span></div>
                            <div className="pd-section-end" />
                        </>
                    )}
                    <div className="pd-section-end" />
                </div>,
                document.body
            )}
        </span>
    );
}
