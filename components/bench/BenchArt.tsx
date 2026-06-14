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

const RES = 360;

export default function BenchArt({
    slug,
    id,
    className,
}: {
    slug: string;
    id: number;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        try {
            paintOutput(canvas, slug, id, RES);
        } catch {
            /* registry miss / unknown slug — leave the canvas blank */
        }
    }, [slug, id]);

    return (
        <canvas
            ref={canvasRef}
            className={className ? `bench-art ${className}` : 'bench-art'}
            aria-label={`Output #${id}`}
            style={{ width: '100%', height: '100%', display: 'block', objectFit: 'cover' }}
        />
    );
}
