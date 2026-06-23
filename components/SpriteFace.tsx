'use client';

/*
 * SpriteFace — renders a full composed PriceSprite face string.
 *
 * On Apple/everything-not-Windows this renders the string verbatim, exactly as
 * before. On Windows — detected after mount, so server HTML and first paint are
 * byte-identical everywhere — each eye's combining eyebrow is pulled out and its
 * spacing twin overlaid above the eye, because Windows Courier New misplaces the
 * combining form. This is the SpriteEyeSlot fix (connect-menu sprite) generalised
 * to a whole face string, so every ID Rectangle gets correct brows
 * (Brendon 2026-06-19). The eye glyph + font are untouched.
 */

import { Fragment, useEffect, useState } from 'react';
import { isWindowsUA, splitFace } from '../lib/sprites/winBrow';

export default function SpriteFace({
    face,
    className,
    color,
}: {
    face: string;
    className?: string;
    /** Optional override colour (the owner's picked PriceSprite hex). When unset
     *  the sprite inherits the colorway text colour, exactly as before. */
    color?: string;
}) {
    const [win, setWin] = useState(false);
    useEffect(() => {
        setWin(isWindowsUA());
    }, []);

    const style = color ? { color } : undefined;

    if (!win) return <span className={className} style={style}>{face}</span>;

    const segs = splitFace(face);
    return (
        <span className={className} style={style}>
            {segs.map((s, i) =>
                s.kind === 'text' ? (
                    <Fragment key={i}>{s.text}</Fragment>
                ) : (
                    <span key={i} className="sprite-eye-win" style={{ position: 'relative' }}>
                        {s.eye}
                        <span className="sprite-brow-win" aria-hidden="true">{s.brow}</span>
                    </span>
                ),
            )}
        </span>
    );
}
