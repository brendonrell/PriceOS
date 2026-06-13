'use client';

/*
 * StickersModal — "STICKER EXCHANGE"
 *
 * A bottom-sheet sticker marketplace, opened from the home action row's
 * Stickers button (open('stickers')). Slides up from the bottom with a
 * single-row, scroll-snapping carousel of sticker SHEETS (the on-chain
 * shop sells whole sheets — PDStickers `_mintBatch`).
 *
 * Brendon 2026-06-13: a fun visual MOCKUP of the marketplace — no stickers
 * minted yet. Cyberpunk + utilitarian "terminal" styling (its own dark
 * surface regardless of colorway). Every sheet is locked/soon → a toast.
 * Real wiring (PDStickers reads + buy flow) lands later.
 *
 * Rides ModalContext like every other modal: isOpen = openModal === 'stickers',
 * so it inherits the shared scroll-lock + Escape-to-close. Mounted once in
 * PriceOSShell. Mouse drag-to-scroll on the rail mirrors the home carousels;
 * touch scrolls natively.
 */

import { useEffect, useRef } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';

const VS15 = '︎';

interface Sheet {
    name: string;
    glyph: string;
    count: number; // stickers in the sheet
    price: string; // ETH
    tag: string; // rarity / edition
}

/* Teaser sheet set — names/prices are placeholders (Brendon's to rename).
   The last is a locked "secret" sheet for flavour. */
const SHEETS: readonly Sheet[] = [
    { name: 'STARTER SET', glyph: '◈', count: 6, price: '0.004', tag: 'COMMON' },
    { name: 'GM PACK', glyph: '☼', count: 8, price: '0.006', tag: 'COMMON' },
    { name: 'DEGEN DROP', glyph: '⚔', count: 10, price: '0.009', tag: 'UNCOMMON' },
    { name: 'GLITCH SET', glyph: '⌁', count: 7, price: '0.012', tag: 'RARE' },
    { name: 'HOLO RARES', glyph: '❖', count: 5, price: '0.018', tag: 'RARE' },
    { name: 'PRICE GANG', glyph: '‰', count: 9, price: '0.014', tag: 'UNCOMMON' },
    { name: 'OG GENESIS', glyph: '✦', count: 4, price: '0.030', tag: 'MYTHIC' },
    { name: 'SECRET SHEET', glyph: '?', count: 0, price: '—', tag: 'LOCKED' },
];

export default function StickersModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'stickers';
    const railRef = useRef<HTMLDivElement | null>(null);

    /* Mouse drag-to-scroll on the rail (touch swipes natively). A drag past a
       few px swallows the trailing click so it doesn't fire a sheet's tap. */
    useEffect(() => {
        if (!isOpen) return;
        const rail = railRef.current;
        if (!rail) return;
        let down = false, moved = false, startX = 0, startLeft = 0;
        const onDown = (e: MouseEvent) => {
            down = true; moved = false; startX = e.pageX; startLeft = rail.scrollLeft;
            rail.classList.add('dragging');
        };
        const onMove = (e: MouseEvent) => {
            if (!down) return;
            const dx = e.pageX - startX;
            if (Math.abs(dx) > 4) moved = true;
            e.preventDefault();
            rail.scrollLeft = startLeft - dx;
        };
        const onUp = () => {
            if (!down) return;
            down = false;
            rail.classList.remove('dragging');
            if (moved) {
                const swallow = (ev: Event) => { ev.stopPropagation(); ev.preventDefault(); };
                rail.addEventListener('click', swallow, { capture: true, once: true });
            }
        };
        rail.addEventListener('mousedown', onDown);
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        return () => {
            rail.removeEventListener('mousedown', onDown);
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
    }, [isOpen]);

    const tap = (s: Sheet) => {
        showToast(s.tag === 'LOCKED' ? 'Sticker Exchange: LOCKED' : `${s.name}: COMING SOON`);
    };

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
                    <div className="ss-title">
                        <span className="ss-title-main">STICKER EXCHANGE</span>
                        <span className="ss-title-sub">// PD SHOP</span>
                    </div>
                    <div className="ss-stats">
                        <span className="ss-stat"><b>{SHEETS.length}</b> SHEETS</span>
                        <span className="ss-stat"><b>0</b> OWNED</span>
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
                </div>

                <div className="ss-ticker" aria-hidden="true">
                    <div className="ss-ticker-track">
                        <span>EXCHANGE OFFLINE · RESTOCK IMMINENT · NO STICKERS MINTED YET · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                        <span>EXCHANGE OFFLINE · RESTOCK IMMINENT · NO STICKERS MINTED YET · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                    </div>
                </div>

                <div className="ss-rail" ref={railRef}>
                    {SHEETS.map((s) => (
                        <div className={`ss-card${s.tag === 'LOCKED' ? ' locked' : ''}`} key={s.name}>
                            <div className="ss-card-art">
                                <span className="ss-card-glyph">{`${s.glyph}${VS15}`}</span>
                                <span className="ss-card-soon">{s.tag === 'LOCKED' ? 'LOCKED' : 'SOON'}</span>
                            </div>
                            <div className="ss-card-meta">
                                <div className="ss-card-name">{s.name}</div>
                                <div className="ss-card-line">
                                    <span className="ss-card-tag">{s.tag}</span>
                                    <span className="ss-card-count">{s.count > 0 ? `${s.count} stickers` : '— stickers'}</span>
                                </div>
                                <button className="ss-buy" type="button" onClick={() => tap(s)}>
                                    <span className="ss-buy-px">{`◊${VS15} ${s.price}`}</span>
                                    <span className="ss-buy-cta">{s.tag === 'LOCKED' ? 'LOCKED' : 'BUY SHEET'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ss-foot">restocking — no stickers minted yet · drag the row · tap a sheet for details</div>
            </div>
        </div>
    );
}
