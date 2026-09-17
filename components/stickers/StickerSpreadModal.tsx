'use client';

/*
 * StickerSpreadModal — tap a VISITOR's hero sticker pile to see what's in it.
 *
 * Stats on the composition currently on screen (locked or generative — same
 * set HeroStickers just rendered), then every unique sticker in it with a way
 * to buy it: BuySheetButton (primary) when the sheet has no active secondary
 * listings, or a SECONDARY pill (floor price, opens the Sticker Exchange's
 * market book for that sheet) when it does. Every sticker shown is buyable —
 * the point (Brendon, 2026-09-15).
 *
 * Own-profile taps still open the StickerManagerModal (HeroStickers.tsx) —
 * this is visitor-only, read-only.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../../lib/state/ModalContext';
import { SHEETS, type Sticker, type SheetId } from '../../lib/stickers/catalog';
import { StickerArt } from './StickerArt';
import { BuySheetButton } from './BuySheetButton';

const VS15 = '︎';
const SHEET_BY_ID = new Map(SHEETS.map((s) => [s.id, s] as const));

interface SheetSummary { floor: number | null; listed: number }

export function StickerSpreadModal({
    open, onClose, ownerHandle, stickers,
}: {
    open: boolean;
    onClose: () => void;
    ownerHandle: string | null | undefined;
    stickers: Sticker[];
}) {
    const { open: openModal } = useModal();
    const [summary, setSummary] = useState<Record<string, SheetSummary> | null>(null);

    useEffect(() => {
        if (!open) return;
        let dead = false;
        fetch('/api/stickers/market?summary=1', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { sheets?: Record<string, SheetSummary> } | null) => { if (!dead && j?.sheets) setSummary(j.sheets); })
            .catch(() => { /* no summary → every row just shows BUY SHEET */ });
        return () => { dead = true; };
    }, [open]);

    // De-dupe by id (a composition can repeat a sticker), then sort by sheet
    // so the buy actions read as a tidy shopping list, not a jumble.
    const unique = useMemo(() => {
        const seen = new Map<string, Sticker>();
        for (const s of stickers) if (!seen.has(s.id)) seen.set(s.id, s);
        return [...seen.values()].sort((a, b) => a.sheet.localeCompare(b.sheet) || a.name.localeCompare(b.name));
    }, [stickers]);

    const sheetIds = useMemo(() => [...new Set(unique.map((s) => s.sheet))], [unique]);
    const tierCounts = useMemo(() => {
        const out: Record<string, number> = {};
        for (const id of sheetIds) {
            const tag = SHEET_BY_ID.get(id)?.tag;
            if (tag) out[tag] = (out[tag] ?? 0) + 1;
        }
        return out;
    }, [sheetIds]);
    const rarestTier = ['MYTHIC', 'RARE', 'UNCOMMON', 'COMMON'].find((t) => tierCounts[t]) ?? null;

    if (!open || typeof document === 'undefined') return null;

    const goSecondary = (sheet: SheetId) => {
        onClose();
        openModal('stickers', `market:${sheet}`);
    };

    return createPortal(
        <div className="starred-confirm-overlay" role="dialog" aria-modal="true" style={{ zIndex: 1400 }} onClick={onClose}>
            <div className="ms-confirm-card is-centered spread-stats-card" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="spread-stats-x" aria-label="Close" onClick={onClose}>×</button>
                <div className="ms-confirm-question">
                    {ownerHandle ? `@${ownerHandle}` : 'THIS'}&rsquo;S STICKER PILE
                </div>
                <div className="spread-stats-row">
                    <span>{unique.length} STICKER{unique.length === 1 ? '' : 'S'}</span>
                    <span>{sheetIds.length} SHEET{sheetIds.length === 1 ? '' : 'S'}</span>
                    {rarestTier && <span>TOP: {rarestTier}</span>}
                </div>
                <div className="spread-stats-list">
                    {unique.map((s) => {
                        const sheet = SHEET_BY_ID.get(s.sheet);
                        if (!sheet) return null;
                        const sum = summary?.[s.sheet];
                        const onSecondary = !!sum && sum.listed > 0 && sum.floor != null;
                        return (
                            <div key={s.id} className="spread-sticker-row">
                                <StickerArt sticker={s} size={32} diecut />
                                <div className="spread-sticker-meta">
                                    <span className="spread-sticker-name">{s.name}</span>
                                    <span className="spread-sticker-tag">{sheet.name} · {sheet.tag}</span>
                                </div>
                                {onSecondary ? (
                                    <button type="button" className="ss-buy spread-secondary-btn" onClick={() => goSecondary(sheet.id)}>
                                        <span className="ss-buy-px">{`◊${VS15} ${sum!.floor}`}</span>
                                        <span className="ss-buy-cta">SECONDARY</span>
                                    </button>
                                ) : (
                                    <BuySheetButton sheet={sheet} className="spread-buy-btn" />
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>,
        document.body,
    );
}
