'use client';

/*
 * FiatCurrencyPicker — the $ pill in the Wallet row (between the copy icon and
 * the incognito toggle) that turns fiat pricing on and picks the currency.
 *
 * Tapping opens an inline bubble — the SAME body-portal + tail placement the
 * 3D-Pingtoast confirm uses (escapes the dropdown's clipping, stays on-screen)
 * — but themed ATTENTION YELLOW instead of Hothurt red. It lists OFF · USD ·
 * CAD · GBP · EUR · AUD · JPY; picking one is set-and-forget. The pill glyph
 * then shows that currency's symbol — dollar currencies all wear the plain $
 * (Brendon, 2026-07-20: no A$/C$ prefixes, ever), plus £ € ¥.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useFiat, FIAT_OPTIONS, fiatSymbol } from '../../../lib/state/FiatContext';
import { useToast } from '../../../lib/state/ToastContext';
import type { FiatCode } from '../../../lib/fx/types';

export function FiatCurrencyPicker({ gated }: { gated: boolean }) {
    const { currency, setCurrency } = useFiat();
    const { showToast } = useToast();
    const [open, setOpen] = useState(false);
    const cellRef = useRef<HTMLSpanElement>(null);
    const bubbleRef = useRef<HTMLDivElement>(null);
    const [pos, setPos] = useState<{ top: number; pillCenterX: number } | null>(null);
    const [layout, setLayout] = useState<{ centerX: number; tailDx: number } | null>(null);

    const openPicker = () => {
        if (gated) return;
        if (cellRef.current) {
            const r = cellRef.current.getBoundingClientRect();
            setLayout(null);
            setPos({ top: r.top, pillCenterX: r.left + r.width / 2 });
        }
        setOpen(true);
    };

    const pick = (next: FiatCode | null) => {
        setCurrency(next);
        setOpen(false);
        // On → "Display Currency: FIAT $CAD"; off → back to native "SOVEREIGN".
        showToast(next ? `Display Currency: FIAT ${fiatSymbol(next)}${next}` : 'Currency: SOVEREIGN');
    };

    // Dismiss on outside tap / scroll / resize (same guard as the ping bubble).
    useEffect(() => {
        if (!open) return;
        const onPointerDown = (e: PointerEvent) => {
            if (bubbleRef.current?.contains(e.target as Node)) return;
            if (cellRef.current?.contains(e.target as Node)) return;
            setOpen(false);
        };
        const dismiss = () => setOpen(false);
        document.addEventListener('pointerdown', onPointerDown, true);
        window.addEventListener('scroll', dismiss, true);
        window.addEventListener('resize', dismiss);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown, true);
            window.removeEventListener('scroll', dismiss, true);
            window.removeEventListener('resize', dismiss);
        };
    }, [open]);

    // Clamp the bubble on-screen, then aim the tail back at the pill.
    useEffect(() => {
        if (!open || !pos || !bubbleRef.current) return;
        const half = bubbleRef.current.offsetWidth / 2;
        const margin = 8;
        const vw = window.innerWidth;
        const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
        const centerX = clamp(pos.pillCenterX, margin + half, vw - margin - half);
        const tailDx = clamp(pos.pillCenterX - centerX, -(half - 12), half - 12);
        setLayout({ centerX, tailDx });
    }, [open, pos]);

    return (
        <>
            <span
                ref={cellRef}
                className={`rpc-ping-btn fiat-cur-btn${currency ? ' rpc-active' : ''}${fiatSymbol(currency) !== '$' ? ' fiat-cur-nonusd' : ''}`}
                id="fiatCurrencyBtn"
                role="button"
                tabIndex={gated ? -1 : 0}
                title="Fiat pricing — pick a currency"
                onClick={(e) => {
                    e.stopPropagation();
                    openPicker();
                }}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        e.stopPropagation();
                        openPicker();
                    }
                }}
            >
                {fiatSymbol(currency)}
            </span>
            {open && pos && typeof document !== 'undefined' &&
                createPortal(
                    <div
                        ref={bubbleRef}
                        className="fiat-picker-bubble"
                        role="dialog"
                        style={{
                            top: pos.top,
                            left: layout?.centerX ?? pos.pillCenterX,
                            transform: 'translate(-50%, calc(-100% - 8px))',
                            visibility: layout ? 'visible' : 'hidden',
                            ['--p3d-tail-dx' as string]: `${layout?.tailDx ?? 0}px`,
                        } as CSSProperties}
                    >
                        <button
                            type="button"
                            className={`fiat-opt${!currency ? ' fiat-opt-on' : ''}`}
                            onClick={(e) => { e.stopPropagation(); pick(null); }}
                        >
                            OFF
                        </button>
                        {FIAT_OPTIONS.map((code) => (
                            <button
                                key={code}
                                type="button"
                                className={`fiat-opt${currency === code ? ' fiat-opt-on' : ''}`}
                                onClick={(e) => { e.stopPropagation(); pick(code); }}
                            >
                                {code}
                            </button>
                        ))}
                    </div>,
                    document.body,
                )}
        </>
    );
}
