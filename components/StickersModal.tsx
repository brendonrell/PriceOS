'use client';

/*
 * StickersModal — "STICKER EXCHANGE"
 *
 * Fable 5's bottom-sheet sticker marketplace, opened from the home action row's
 * Stickers button (open('stickers')). Slides up from the bottom with a
 * single-row, scroll-snapping carousel of sticker SHEETS.
 *
 * The store design is kept exactly as Fable 5 built it (slide-up sheet, rail,
 * ticker, buy chips, terminal vibe). Adaptations:
 *   - Only OUR sheets show — Genesis and Petey — each card a fan of its actual
 *     recoloured-logo stickers. (The old placeholder teaser sheets were removed.)
 *   - Tapping a card opens the real SHEET: a die-cut grid of every sticker
 *     inside, like a peel-off sticker sheet. Back returns to the rail.
 * Buying is still a toast this pass; real grant/ownership (ERC-1155) wires later.
 *
 * Rides ModalContext: isOpen = openModal === 'stickers'. Mounted once in
 * PriceOSShell. Mouse drag-to-scroll on the rail mirrors the home carousels.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useDragScroll } from '../lib/hooks/useDragScroll';
import {
    SHEETS as REAL_SHEETS, stickersForSheet, type SheetMeta, type SheetId,
} from '../lib/stickers/catalog';
import { StickerArt } from './stickers/StickerArt';
import { BuySheetButton } from './stickers/BuySheetButton';
import { useOwnedStickerIds } from '../lib/stickers/owned';
import { buildTickerText } from '../lib/stickers/ticker';

const VS15 = '︎';

/* A 3-sticker fan for a live sheet's card art — spaced across the range. */
function fanFor(sheet: SheetMeta) {
    const all = stickersForSheet(sheet.id);
    if (all.length <= 3) return all;
    const mid = Math.floor(all.length / 2);
    return [all[0]!, all[mid]!, all[all.length - 1]!];
}

export default function StickersModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'stickers';
    const railRef = useDragScroll<HTMLDivElement>();

    /* Which live sheet is open in detail (peel-sheet view), if any. */
    const [openSheet, setOpenSheet] = useState<SheetId | null>(null);
    /* Rail (sideways) vs expanded grid (two-up, scrolls down). */
    const [expanded, setExpanded] = useState(false);
    /* A fresh seed on every open → the sheet re-scatters each time you look. */
    const [seed, setSeed] = useState(1);

    /* Remember the carousel scroll position across opening a sheet / reopening
       the store, so it never snaps back to the start (Brendon 2026-06-21). */
    const railXRef = useRef(0);
    useEffect(() => {
        try { railXRef.current = Number(localStorage.getItem('pd_sticker_rail_x')) || 0; } catch { /* ignore */ }
    }, []);
    const saveRailX = (x: number) => {
        railXRef.current = x;
        try { localStorage.setItem('pd_sticker_rail_x', String(x)); } catch { /* ignore */ }
    };
    // Restore the rail position whenever the rail is on screen.
    useEffect(() => {
        if (isOpen && !openSheet && railRef.current) railRef.current.scrollLeft = railXRef.current;
    }, [isOpen, openSheet, railRef]);

    // Reset to the rail whenever the modal closes so it never reopens mid-sheet.
    useEffect(() => { if (!isOpen) setOpenSheet(null); }, [isOpen]);

    const openDetail = (id: SheetId) => { setSeed((Math.random() * 1e9) | 0); setOpenSheet(id); };

    /* Auto-generated salesman feed (content), refreshed each open. */
    const tickerText = useMemo(() => buildTickerText(), [isOpen]);

    const ownedIds = useOwnedStickerIds();
    const totalSheets = REAL_SHEETS.length;
    const detail = openSheet ? REAL_SHEETS.find((s) => s.id === openSheet) ?? null : null;
    /* The whole sheet, shuffled by the seed (fresh order each open) and shown in
       a tidy contained grid — never overlapping, never past the sheet edge. */
    const draw = useMemo(() => {
        if (!detail) return [];
        const pool = [...stickersForSheet(detail.id)];
        let a = seed || 1;
        const rnd = () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
        for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [pool[i], pool[j]] = [pool[j]!, pool[i]!]; }
        return pool;
    }, [detail, seed]);

    /* One sheet card — shared by the sideways rail and the expanded grid. */
    const renderCard = (s: SheetMeta) => (
        <div
            className="ss-card ss-card-live"
            key={s.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(s.id)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail(s.id); } }}
        >
            <div className="ss-card-art">
                <span className="ss-fan">
                    {fanFor(s).map((st, i) => (
                        <span
                            key={st.id}
                            className="ss-fan-item"
                            style={{ transform: `rotate(${[-9, 0, 9][i] ?? 0}deg)` }}
                        >
                            <StickerArt sticker={st} size={52} />
                        </span>
                    ))}
                </span>
                <span className="ss-card-soon ss-card-new">LIVE</span>
            </div>
            <div className="ss-card-meta">
                <div className="ss-card-name">{s.name}</div>
                <div className="ss-card-line">
                    <span className="ss-card-tag">{s.tag}</span>
                    <span className="ss-card-count">{s.count} stickers</span>
                </div>
                <BuySheetButton sheet={s} />
            </div>
        </div>
    );

    return (
        <div
            className={`sticker-sheet-backdrop${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Sticker Exchange"
            onClick={(e) => { if (e.target === e.currentTarget) close(); }}
        >
            <div className="sticker-sheet" onClick={(e) => e.stopPropagation()}>
                <div
                    className="ss-handle"
                    role="button"
                    tabIndex={0}
                    title="Close"
                    onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                />

                <div className="ss-head">
                    {detail ? (
                        <>
                            <div
                                className="ss-back"
                                role="button"
                                tabIndex={0}
                                title="Back to sheets"
                                onClick={() => setOpenSheet(null)}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet(null); } }}
                            >
                                {`⇠⇠${VS15}`}
                            </div>
                            <div className="ss-title">
                                <span className="ss-title-main">{detail.name}</span>
                                <span className="ss-title-sub">{`// ${detail.count} STICKERS`}</span>
                            </div>
                            <BuySheetButton sheet={detail} className="ss-buy-head" />
                        </>
                    ) : (
                        <>
                            <div className="ss-title">
                                <span className="ss-title-main">STICKER STORE</span>
                                <span className="ss-title-sub">// BY PD</span>
                            </div>
                            <button
                                className={`ss-expand${expanded ? ' is-on' : ''}`}
                                type="button"
                                title={expanded ? 'Single row' : 'Expand'}
                                aria-pressed={expanded}
                                onClick={() => setExpanded((v) => !v)}
                            >
                                {`⊞${VS15}`}
                            </button>
                            <div className="ss-stats">
                                <span className="ss-stat"><b>{totalSheets}</b> SHEETS</span>
                                <span className="ss-stat"><b>{ownedIds.length}</b> OWNED</span>
                                <span className="ss-stat ss-bal">{`◊${VS15} 0.00`}</span>
                            </div>
                            <div
                                className="ss-close"
                                role="button"
                                tabIndex={0}
                                title="Close"
                                onClick={close}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                            >
                                {`×${VS15}`}
                            </div>
                        </>
                    )}
                </div>

                {detail ? (
                    /* ── The sticker sheet. Logos/glyphs → tidy grid. Familiars →
                         wider grid. Outputs → masonry. Sprites + @names (skinny
                         chips) → wrapping flow at a larger size, auto-fitting. ── */
                    (() => {
                        const FLOW = new Set(['artist', 'pricesprite', 'handle', 'projectname', 'rarity', 'quip', 'truename', 'animated']);
                        const mode = detail.id === 'output' ? 'masonry'
                            : detail.id === 'familiar' ? 'fam'
                            : FLOW.has(detail.id) ? 'flow'
                            : 'grid';
                        const cls = mode === 'masonry' ? 'ss-masonry'
                            : mode === 'flow' ? 'ss-flow'
                            : mode === 'fam' ? 'ss-grid ss-grid-fam'
                            : 'ss-grid';
                        return (
                            <div className="ss-paper-wrap">
                                <div className={`ss-paper ${cls}`}>
                                    {draw.map((s) => (
                                        <span key={s.id} className="ss-cell" title={s.name}>
                                            {mode === 'flow'
                                                ? <StickerArt sticker={s} size={66} diecut />
                                                : <StickerArt sticker={s} fill diecut />}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        );
                    })()
                ) : (
                    <>
                        {/* Promo strip — attention yellow, empty for now. Hidden in the
                            expanded grid view. */}
                        {!expanded && <div className="ss-promo" aria-hidden="true" />}

                        <div className="ss-ticker" aria-hidden="true">
                            <div className="ss-ticker-track">
                                <span>{tickerText}</span>
                                <span>{tickerText}</span>
                            </div>
                        </div>

                        {expanded ? (
                            <div className="ss-grid-view">
                                {REAL_SHEETS.map((s) => renderCard(s))}
                            </div>
                        ) : (
                            <div className="ss-rail" ref={railRef} onScroll={(e) => saveRailX(e.currentTarget.scrollLeft)}>
                                {REAL_SHEETS.map((s) => renderCard(s))}
                            </div>
                        )}

                        <div className="ss-foot">
                            {totalSheets} sheets live · tap a sheet to peek inside · more restocking ·{' '}
                            <a className="ss-foot-link" href="https://opensea.io" target="_blank" rel="noopener noreferrer">OpenSea</a>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
