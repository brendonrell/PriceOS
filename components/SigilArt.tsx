'use client';

/*
 * SigilArt — renders a wallet's Sigil (the forged personal mark).
 *
 * Pure text in forced Courier (GLYPHS.md conventions). `hex` is the ink:
 * a faction colour when the mark flies a flag, bone otherwise. `fill`
 * scales it to its container (the carousel tile / corner logo); default is
 * inline-at-text-size — the after-the-@name slot.
 */

import { sigilFor, SIGIL_BONE } from '../lib/sigil/sigil';

interface Props {
    address: string;
    hex?: string | null;
    /** Scale up to fill a tile instead of sitting inline. */
    fill?: boolean;
    className?: string;
    title?: string;
}

export default function SigilArt({ address, hex, fill, className, title }: Props) {
    return (
        <span
            className={`sigil-mark${fill ? ' sigil-mark-fill' : ''}${className ? ` ${className}` : ''}`}
            style={{ color: hex ?? SIGIL_BONE }}
            title={title}
            aria-hidden={title ? undefined : true}
        >
            {sigilFor(address)}
        </span>
    );
}
