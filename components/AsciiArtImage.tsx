'use client';

/*
 * AsciiArtImage — the <img> stand-in for ASCII Art Mode. Drops into the
 * exact slot a stored-preview <img> occupies (same class, same sizing) and
 * paints the Output's mint-pinned ASCII artifact instantly. On a miss
 * (artifact not pinned) it calls onMiss so the parent falls back to its
 * normal image path — the mode never blanks a tile.
 */

import { useEffect, useRef, type CSSProperties, type MouseEventHandler } from 'react';
import { paintAsciiStandin } from '../lib/art/asciiStandin';

export default function AsciiArtImage({
    slug,
    id,
    widthPx,
    className,
    style,
    onMiss,
    onClick,
    title,
    domId,
}: {
    slug: string;
    id: number;
    /** Target render width in px — resolution knob, not layout (CSS owns layout). */
    widthPx: number;
    className?: string;
    style?: CSSProperties;
    onMiss?: () => void;
    onClick?: MouseEventHandler<HTMLCanvasElement>;
    title?: string;
    domId?: string;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const cv = ref.current;
        if (!cv) return;
        let alive = true;
        paintAsciiStandin(cv, slug, id, widthPx).then((ok) => {
            if (alive && !ok) onMiss?.();
        });
        return () => { alive = false; };
        // onMiss is a stable parent callback by convention; keyed on the piece.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, id, widthPx]);
    return (
        <canvas
            ref={ref}
            id={domId}
            className={className}
            style={{ width: '100%', height: '100%', display: 'block', ...style }}
            role="img"
            aria-label={`${slug} #${id} — ASCII artwork standin`}
            onClick={onClick}
            title={title}
        />
    );
}
