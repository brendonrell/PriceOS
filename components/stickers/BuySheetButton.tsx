'use client';

/*
 * BuySheetButton — the simulated sheet-purchase flow, matching the art mint.
 *
 * Tap BUY SHEET → the same centred confirm card the MintButton uses → an
 * in-button progress bar fills → the sheet's stickers are granted (owned.ts) and
 * the button settles on OWNED. Wallet-gated like minting. The real wallet/buy
 * step (PDStickers) slots in where `confirm()` grants today.
 */

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { buySheet, ownsSheet, useOwnedStickerIds } from '../../lib/stickers/owned';
import type { SheetMeta } from '../../lib/stickers/catalog';

const VS15 = '︎';
type Phase = 'idle' | 'buying' | 'owned';

export function BuySheetButton({ sheet, className }: { sheet: SheetMeta; className?: string }) {
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const ownedIds = useOwnedStickerIds();
    const [phase, setPhase] = useState<Phase>('idle');
    const [confirming, setConfirming] = useState(false);
    const [pct, setPct] = useState(0);

    const isOwned = ownsSheet(sheet.id, ownedIds) || phase === 'owned';

    const start = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOwned || phase === 'buying') return;
        if (!siweAddress) { showToast('Wallet: CONNECT TO BUY'); return; }
        setConfirming(true);
    };

    const confirm = async () => {
        setConfirming(false);
        setPhase('buying');
        setPct(6);
        // Two rAFs so the width transition runs from ~0 to near-full.
        requestAnimationFrame(() => requestAnimationFrame(() => setPct(92)));
        await new Promise((r) => setTimeout(r, 900));
        setPct(100);
        buySheet(sheet.id);
        showToast(`${sheet.name} SHEET: OWNED`, 3000);
        setPhase('owned');
        setTimeout(() => setPct(0), 400);
    };

    const cta = isOwned ? 'OWNED ✦' : phase === 'buying' ? 'BUYING…' : 'BUY SHEET';

    return (
        <>
            <button
                type="button"
                className={`ss-buy${className ? ` ${className}` : ''}${isOwned ? ' ss-buy-owned' : ''}`}
                onClick={start}
                disabled={isOwned || phase === 'buying'}
                style={{ position: 'relative', overflow: 'hidden' }}
            >
                {phase === 'buying' && (
                    <span aria-hidden className="ss-buy-bar" style={{ width: `${pct}%` }} />
                )}
                <span className="ss-buy-px" style={{ position: 'relative' }}>{`◊${VS15} ${sheet.price}`}</span>
                <span className="ss-buy-cta" style={{ position: 'relative' }}>{cta}</span>
            </button>

            {confirming && typeof document !== 'undefined' && createPortal(
                <div
                    className="starred-confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    style={{ zIndex: 1400 }}
                    onClick={() => setConfirming(false)}
                >
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">
                            Buy the {sheet.name} sheet?<br />
                            {sheet.count} stickers · {`◊${VS15} ${sheet.price} ETH`}
                        </div>
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirming(false)}>Cancel</button>
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => void confirm()}>Buy</button>
                        </div>
                    </div>
                </div>,
                document.body,
            )}
        </>
    );
}
