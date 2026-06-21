'use client';

/*
 * OutputSticker — a real project Output, painted small, as a sticker.
 *
 * Uses the live art painter (paintOutput) onto a small canvas. `diecut` wraps it
 * in a paper-coloured frame so it reads as cut from the sheet, matching the SVG
 * stickers. Paints client-side on mount; SSR renders an empty canvas.
 */

import { useEffect, useRef } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';

const PAINT_RES = 168;

export function OutputSticker({
    slug, id, size = 44, fill, diecut,
}: {
    slug: string;
    id: number;
    size?: number;
    fill?: boolean;
    diecut?: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        try { paintOutput(c, slug, id, PAINT_RES); } catch { /* engine missing — leave blank */ }
    }, [slug, id]);

    const box: React.CSSProperties = fill ? { width: '100%' } : { width: size, height: size };
    return (
        <span className={`out-sticker${diecut ? ' diecut' : ''}`} style={box}>
            <canvas ref={ref} width={PAINT_RES} height={PAINT_RES} className="out-sticker-canvas" />
        </span>
    );
}
