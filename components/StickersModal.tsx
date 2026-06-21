'use client';

/*
 * StickersModal — "STICKER EXCHANGE"
 *
 * Fable 5's bottom-sheet sticker marketplace, opened from the home action row's
 * Stickers button (open('stickers')). Slides up from the bottom with a
 * single-row, scroll-snapping carousel of sticker SHEETS (the on-chain shop
 * sells whole sheets — PDStickers `_mintBatch`).
 *
 * The store design is kept exactly as Fable 5 built it (slide-up sheet, rail,
 * ticker, buy chips, terminal vibe). The only adaptation: the first two cards
 * are now REAL — Genesis ($PRICE wordmark) and Petey (the mascot) — showing a
 * fan of their actual recoloured-logo stickers instead of a placeholder glyph.
 * The remaining cards stay as "soon" teasers. Buying is still a toast this pass;
 * real grant/ownership (ERC-1155) wires in later.
 *
 * Rides ModalContext like every other modal: isOpen = openModal === 'stickers',
 * so it inherits the shared scroll-lock + Escape-to-close. Mounted once in
 * PriceOSShell. Mouse drag-to-scroll on the rail mirrors the home carousels.
 */

import { useModal } from '../lib/state/ModalContext';
import { useToast } from '../lib/state/ToastContext';
import { useDragScroll } from '../lib/hooks/useDragScroll';
import { SHEETS as REAL_SHEETS, stickersForSheet, type SheetMeta } from '../lib/stickers/catalog';
import { StickerArt } from './stickers/StickerArt';

const VS15 = '︎';

interface TeaserSheet {
    name: string;
    glyph: string;
    count: number; // stickers in the sheet
    price: string; // ETH
    tag: string; // rarity / edition
}

/* Teaser sheet set — placeholders behind the two live sheets, Fable 5's flavour
   kept. The last is a locked "secret" sheet. */
const TEASERS: readonly TeaserSheet[] = [
    { name: 'STARTER SET', glyph: '◈', count: 6, price: '0.004', tag: 'COMMON' },
    { name: 'GM PACK', glyph: '☼', count: 8, price: '0.006', tag: 'COMMON' },
    { name: 'DEGEN DROP', glyph: '⚔', count: 10, price: '0.009', tag: 'UNCOMMON' },
    { name: 'GLITCH SET', glyph: '⌁', count: 7, price: '0.012', tag: 'RARE' },
    { name: 'HOLO RARES', glyph: '❖', count: 5, price: '0.018', tag: 'RARE' },
    { name: 'SECRET SHEET', glyph: '?', count: 0, price: '—', tag: 'LOCKED' },
];

/* A 3-sticker fan for a live sheet's card art — spaced across the range. */
function fanFor(sheet: SheetMeta) {
    const all = stickersForSheet(sheet.id);
    if (all.length <= 3) return all;
    const mid = Math.floor(all.length / 2);
    return [all[0]!, all[mid]!, all[all.length - 1]!];
}

export default function StickersModal() {
    const { openModal, close } = useModal();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'stickers';
    /* Desktop mouse drag-to-scroll on the rail (touch scrolls natively). The
       shared hook is mouse-only and swallows the trailing click after a real
       drag so a pan doesn't fire a sheet's tap. */
    const railRef = useDragScroll<HTMLDivElement>();

    const totalSheets = REAL_SHEETS.length + TEASERS.length;

    const tapReal = (s: SheetMeta) => showToast(`${s.name} SHEET: COMING SOON`);
    const tapTeaser = (s: TeaserSheet) =>
        showToast(s.tag === 'LOCKED' ? 'Sticker Exchange: LOCKED' : `${s.name}: COMING SOON`);

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
                        <span className="ss-stat"><b>{totalSheets}</b> SHEETS</span>
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
                        <span>GENESIS LIVE · PETEY LIVE · MORE SHEETS RESTOCKING · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                        <span>GENESIS LIVE · PETEY LIVE · MORE SHEETS RESTOCKING · SHEETS SELL WHOLE · PRIMARY ONLY · </span>
                    </div>
                </div>

                <div className="ss-rail" ref={railRef}>
                    {REAL_SHEETS.map((s) => (
                        <div className="ss-card ss-card-live" key={s.id}>
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
                                <button className="ss-buy" type="button" onClick={() => tapReal(s)}>
                                    <span className="ss-buy-px">{`◊${VS15} ${s.price}`}</span>
                                    <span className="ss-buy-cta">BUY SHEET</span>
                                </button>
                            </div>
                        </div>
                    ))}

                    {TEASERS.map((s) => (
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
                                <button className="ss-buy" type="button" onClick={() => tapTeaser(s)}>
                                    <span className="ss-buy-px">{`◊${VS15} ${s.price}`}</span>
                                    <span className="ss-buy-cta">{s.tag === 'LOCKED' ? 'LOCKED' : 'BUY SHEET'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="ss-foot">two sheets live · more restocking · drag the row · tap a sheet for details</div>
            </div>
        </div>
    );
}
