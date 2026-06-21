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

import { useEffect, useState } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useDragScroll } from '../lib/hooks/useDragScroll';
import {
    SHEETS as REAL_SHEETS, stickersForSheet, type SheetMeta, type SheetId,
} from '../lib/stickers/catalog';
import { StickerArt } from './stickers/StickerArt';
import { BuySheetButton } from './stickers/BuySheetButton';
import { useOwnedStickerIds } from '../lib/stickers/owned';

const VS15 = '︎';

/* A 3-sticker fan for a live sheet's card art — spaced across the range. */
function fanFor(sheet: SheetMeta) {
    const all = stickersForSheet(sheet.id);
    if (all.length <= 3) return all;
    const mid = Math.floor(all.length / 2);
    return [all[0]!, all[mid]!, all[all.length - 1]!];
}

/* Stable whisper-tilt per sheet slot. */
function tilt(i: number): number {
    const seq = [-5, 4, -3, 5, -4, 3, -5, 4, -2, 5];
    return seq[i % seq.length]!;
}

export default function StickersModal() {
    const { openModal, close } = useModal();
    const isOpen = openModal?.name === 'stickers';
    const railRef = useDragScroll<HTMLDivElement>();

    /* Which live sheet is open in detail (peel-sheet view), if any. */
    const [openSheet, setOpenSheet] = useState<SheetId | null>(null);
    // Reset to the rail whenever the modal closes so it never reopens mid-sheet.
    useEffect(() => { if (!isOpen) setOpenSheet(null); }, [isOpen]);

    const ownedIds = useOwnedStickerIds();
    const totalSheets = REAL_SHEETS.length;
    const detail = openSheet ? REAL_SHEETS.find((s) => s.id === openSheet) ?? null : null;

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
                                {`←${VS15}`}
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
                                <span className="ss-title-main">STICKER EXCHANGE</span>
                                <span className="ss-title-sub">// PD SHOP</span>
                            </div>
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
                    /* ── Peel-off sticker sheet — every sticker inside ───────── */
                    <div className="ss-sheet-grid">
                        {stickersForSheet(detail.id).map((st, i) => (
                            <div className="ss-peel" key={st.id} title={st.name}>
                                <span className="ss-peel-art" style={{ transform: `rotate(${tilt(i)}deg)` }}>
                                    <StickerArt sticker={st} size={62} />
                                </span>
                                <span className="ss-peel-name">{st.name}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <>
                        <div className="ss-ticker" aria-hidden="true">
                            <div className="ss-ticker-track">
                                <span>GENESIS LIVE · PETEY LIVE · MORE SHEETS RESTOCKING · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                                <span>GENESIS LIVE · PETEY LIVE · MORE SHEETS RESTOCKING · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                            </div>
                        </div>

                        <div className="ss-rail" ref={railRef}>
                            {REAL_SHEETS.map((s) => (
                                <div
                                    className="ss-card ss-card-live"
                                    key={s.id}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setOpenSheet(s.id)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpenSheet(s.id); } }}
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
                            ))}
                        </div>

                        <div className="ss-foot">two sheets live · tap a sheet to peek inside · more restocking</div>
                    </>
                )}
            </div>
        </div>
    );
}
