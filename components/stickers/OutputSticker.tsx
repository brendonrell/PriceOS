'use client';

/*
 * OutputSticker — a real project Output, painted small, as a sticker.
 *
 * Uses the live art painter (paintOutput) onto a small canvas. `diecut` wraps it
 * in a paper-coloured frame so it reads as cut from the sheet, matching the SVG
 * stickers. Paints client-side on mount; SSR renders an empty canvas.
 */

import { memo, useEffect, useRef } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { useArtNotifs } from '../../lib/state/PdNotifsContext';

const PAINT_RES = 168;

function OutputStickerImpl({
    slug, id, size = 44, fill, diecut,
}: {
    slug: string;
    id: number;
    size?: number;
    fill?: boolean;
    diecut?: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const notifs = useArtNotifs();
    const ascii = notifs.asciiArt;
    useEffect(() => {
        const c = ref.current;
        if (!c) return;
        const paintNormal = () => {
            try { paintOutput(c, slug, id, PAINT_RES); } catch { /* engine missing — leave blank */ }
        };
        /* ASCII Art Mode: text-backup standin; miss → normal paint. */
        if (ascii) {
            paintAsciiStandin(c, slug, id, PAINT_RES)
                .then((ok) => { if (!ok) paintNormal(); })
                .catch(paintNormal);
            return;
        }
        paintNormal();
    }, [slug, id, ascii]);

    const box: React.CSSProperties = fill ? { width: '100%' } : { width: size, height: size };
    return (
        <span className={`out-sticker${diecut ? ' diecut' : ''}`} style={box}>
            <canvas ref={ref} width={PAINT_RES} height={PAINT_RES} className="out-sticker-canvas" />
        </span>
    );
}

export const OutputSticker = memo(OutputStickerImpl);
