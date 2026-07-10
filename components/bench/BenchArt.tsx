'use client';

/*
 * BenchArt — a self-painting Output canvas, shared by the Bench cards, the
 * Cart rows, the drag ghost, and the image export. Paints the REAL artwork
 * (deterministic per slug/id) via the registry renderer, so every surface
 * reads as the same piece instead of a placeholder gradient.
 *
 * Renders at a fixed internal resolution and lets CSS size it to the slot —
 * the renderer sets the canvas intrinsic dims + returns the aspect, which we
 * stamp on the wrapper so layouts can reserve the right shape.
 */

import { useEffect, useRef } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

const RES = 360;

export default function BenchArt({
    slug,
    id,
    className,
    res,
}: {
    slug: string;
    id: number;
    className?: string;
    /** Paint resolution. Defaults to a light 360 for the drag ghost + cart
        thumbs; the open comparison passes a high value so the art reads crisp. */
    res?: number;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiArt;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const paintNormal = () => {
            try {
                paintOutput(canvas, slug, id, res ?? RES);
            } catch {
                /* registry miss / unknown slug — leave the canvas blank */
            }
        };
        /* ASCII Art Mode: the text-backup standin, same fallback seam as the
           gallery thumbs — a miss paints the normal art, never a blank. */
        if (ascii) {
            paintAsciiStandin(canvas, slug, id, res ?? RES)
                .then((ok) => { if (!ok) paintNormal(); })
                .catch(paintNormal);
            return;
        }
        paintNormal();
    }, [slug, id, res, ascii]);

    return (
        <canvas
            ref={canvasRef}
            className={className ? `bench-art ${className}` : 'bench-art'}
            aria-label={`Output #${id}`}
            style={{ width: '100%', display: 'block' }}
        />
    );
}
