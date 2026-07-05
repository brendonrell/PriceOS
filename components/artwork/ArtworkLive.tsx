'use client';

/*
 * ArtworkLive — paints the REAL, high-resolution generative artwork for one
 * Output (not the 400px gallery thumbnail). Same deterministic engine as the
 * card and the modal (paintOutput), just rendered at a viewport-scaled size so
 * the feature page and the fullscreen view show crisp art.
 *
 * `contain` controls the fit:
 *   - default (false): canvas fills its container's WIDTH (height follows the
 *     artwork's aspect) — wide pieces use the full horizontal space.
 *   - true: canvas is contained within BOTH dimensions of its container
 *     (used by the fullscreen view so the art is as large as its aspect allows
 *     inside the padded frame).
 *
 * ASCII Backup (Spell Book): when the `asciiBackup` flag is on, the live
 * render happens on an offscreen canvas (so the fingerprint sample + NPC sight
 * still read the TRUE pixels) and the visible canvas paints the ASCII
 * translation instead. The raw .txt is registered for the Copy affordance.
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { needsColorSample, reportFingerprint, reportTraits } from '../../lib/art/colorStore';
import { sampleCanvasFingerprint } from '../../lib/art/sampleColor';
import { publishPieceInView, clearPieceInView } from '../../lib/npc/inview';
import { asciiFromCanvas, paintAscii, storeAsciiText } from '../../lib/art/ascii';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

export default function ArtworkLive({
    slug,
    id,
    contain = false,
    className,
}: {
    slug: string;
    id: number;
    contain?: boolean;
    className?: string;
}) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiBackup;

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        // Render at the larger viewport dimension × DPR (capped) so the art is
        // crisp on any screen without painting an absurd canvas. CSS scales the
        // canvas down to its display box; the intrinsic aspect ratio is the
        // engine's, so the box always matches the artwork's shape.
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const big = Math.max(window.innerWidth, window.innerHeight);
        const target = Math.round(Math.min(2000, Math.max(640, big * dpr)));
        // ASCII Backup renders the TRUE art offscreen, then paints the ASCII
        // translation on the visible canvas. Fingerprint + NPC sight always
        // sample the true pixels, never the ASCII view.
        const liveCanvas = ascii ? document.createElement('canvas') : canvas;
        paintOutput(liveCanvas, slug, id, target, true);
        if (ascii) {
            const art = asciiFromCanvas(liveCanvas);
            if (art) {
                storeAsciiText(slug, id, art.text);
                paintAscii(canvas, art, liveCanvas.width);
            }
        }
        // One cheap pixel read serves two masters: the stored fingerprint
        // backfill (same self-populating model as the gallery cards) and the
        // NPC Cast's live sight of the piece actually on screen.
        const fp = sampleCanvasFingerprint(liveCanvas);
        if (needsColorSample(slug, id)) {
            reportFingerprint(slug, id, fp);
        }
        reportTraits(slug, id);
        publishPieceInView(slug, id, fp);
        return () => clearPieceInView(slug, id);
    }, [slug, id, ascii]);

    // Sizing is CSS-driven via `className` (so it can use viewport-relative
    // caps); inline only guards against horizontal overflow. `contain` is kept
    // for callers but the fit is expressed in CSS, not a parent-relative % cap.
    void contain;
    const style: CSSProperties = { display: 'block', maxWidth: '100%' };

    return <canvas ref={canvasRef} className={className} style={style} />;
}
