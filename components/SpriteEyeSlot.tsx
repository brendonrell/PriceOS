'use client';

/*
 * SpriteEyeSlot — one eye slot of the composed PriceSprite.
 *
 * On Apple/everything-not-Windows this renders EXACTLY what it always
 * rendered: the slot string verbatim (eye + combining brow in one text
 * run). On Windows — detected after mount, so server HTML and first
 * paint never differ — the brow is overlaid as its spacing twin,
 * positioned above the eye, because Windows misplaces the combining
 * form (see lib/sprites/winBrow.ts). Unmappable brows render verbatim
 * everywhere.
 */

import { useEffect, useState } from 'react';
import { isWindowsUA, splitEyeSlot } from '../lib/sprites/winBrow';

export default function SpriteEyeSlot({
    text,
    className,
}: {
    text: string;
    className: string;
}) {
    const [win, setWin] = useState(false);
    useEffect(() => {
        setWin(isWindowsUA());
    }, []);

    if (!win) return <span className={className}>{text}</span>;

    const { eye, brow } = splitEyeSlot(text);
    if (!brow) return <span className={className}>{text}</span>;

    return (
        <span className={className} style={{ position: 'relative' }}>
            {eye}
            <span className="sprite-brow-win" aria-hidden="true">{brow}</span>
        </span>
    );
}
