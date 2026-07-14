'use client';

/*
 * RarityReceiptButton — shares a piece's Rarity Receipt: the canonical art with
 * its PD Rarity, Isolation and Genome position composited onto one PNG card
 * (lib/output/receipt), handed to the native share sheet ($0, canonical-only).
 * Lives with the character sheet — it IS the shareable rarity object.
 */

import { useState } from 'react';
import { shareRarityReceipt } from '../../lib/output/receipt';

export default function RarityReceiptButton({ slug, id }: { slug: string; id: number }) {
    const [busy, setBusy] = useState(false);

    const onClick = async () => {
        if (busy) return;
        setBusy(true);
        try {
            await shareRarityReceipt(slug, id);
        } finally {
            setBusy(false);
        }
    };

    return (
        <button
            type="button"
            className="rarity-receipt-btn"
            onClick={onClick}
            disabled={busy}
            aria-busy={busy}
        >
            <span className="rrb-glyph">❖</span>
            <span className="rrb-label">{busy ? 'BUILDING RECEIPT…' : 'RARITY RECEIPT'}</span>
        </button>
    );
}
