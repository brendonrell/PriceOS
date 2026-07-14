'use client';

/*
 * SigilBubble — a forged Sigil worn AS a PD logo: the blank speech bubble in
 * the pick's colour with the wallet's Sigil sitting where the per-mille mark
 * normally is (Brendon 2026-07-14 — "our blank speech bubble options, the
 * factions, but with your Sigil on top"). The mark takes the bubble's cutout
 * ink so it reads BOLD against the bubble, never floating uncoloured on the
 * page. Reuses StickerArt (the bubble) + SigilArt (the mark) unchanged.
 */

import { StickerArt } from './stickers/StickerArt';
import SigilArt from './SigilArt';
import type { Sticker } from '../lib/stickers/catalog';

export default function SigilBubble({
    address, color, cutout, rotated, holo, fill, className,
}: {
    address: string;
    color: string;
    cutout: string;
    rotated?: boolean;
    holo?: boolean;
    fill?: boolean;
    className?: string;
}) {
    const bubble: Sticker = {
        id: `sigil-bubble-${color}-${rotated ? 'p' : 'u'}${holo ? 'h' : ''}`,
        sheet: rotated ? 'petey' : 'genesis',
        kind: 'logo',
        name: 'Sigil logo',
        color,
        cutout,
        blank: true,
        rotated,
        holo,
    };
    return (
        <span className={`sigil-bubble${className ? ` ${className}` : ''}`}>
            <StickerArt sticker={bubble} fill={fill} />
            <SigilArt address={address} hex={cutout} className="sigil-on-bubble" />
        </span>
    );
}
