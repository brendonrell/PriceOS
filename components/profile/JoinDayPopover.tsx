'use client';

/*
 * JoinDayPopover — the profile date stamp's PriceDay almanac (Brendon
 * 2026-06-10 — the bespoke "origin" card was never asked for). Shows the
 * PriceDay of the user's join date, with their joining as the first event,
 * then the standard almanac sections for that day. Split out of
 * ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import type { RefObject } from 'react';
import type { LivePriceDay } from '../../lib/priceday/usePriceDay';

export default function JoinDayPopover({
    popRef,
    pos,
    joinPriceDay,
    memberSince,
    displayHandle,
    contents,
}: {
    popRef: RefObject<HTMLDivElement | null>;
    pos: { top: number; left: number };
    joinPriceDay: number | null;
    memberSince: string;
    displayHandle: string;
    contents: LivePriceDay;
}) {
    return (
        <div
            ref={popRef}
            className="priceday-popover"
            style={{ position: 'fixed', top: pos.top, left: pos.left }}
        >
            <div className="dp-title">PRICEDAY #{joinPriceDay}</div>
            <div className="dp-title-spacer" />

            <div className="pd-section-header">JOINED</div>
            <div className="dp-row">
                <span className="dp-label">{memberSince || '—'}</span>
                <span className="dp-value">@{displayHandle}</span>
            </div>
            <div className="pd-section-end" />

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
    );
}
