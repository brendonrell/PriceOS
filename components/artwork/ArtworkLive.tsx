'use client';

/*
 * ArtworkLive — paints the REAL, high-resolution generative artwork for one
 * Output (not the 400px gallery thumbnail). Same deterministic engine as the
 * card and the modal (paintOutput), just rendered at a viewport-scaled size so
 * the feature page and the fullscreen view show crisp art.
 *
 * ASCII Art Mode (Brendon, 2026-07-10 — this surface was missed at launch):
 * while the sitewide mode is on, the mint-pinned ASCII artifact stands in for
 * the artwork here too, painted at the same viewport-scaled resolution. A
 * missing pin derives the artifact fresh from the engine (identical bytes),
 * so the feature page always honours the mode.
 *
 * `contain` controls the fit:
 *   - default (false): canvas fills its container's WIDTH (height follows the
 *     artwork's aspect) — wide pieces use the full horizontal space.
 *   - true: canvas is contained within BOTH dimensions of its container
 *     (used by the fullscreen view so the art is as large as its aspect allows
 *     inside the padded frame).
 */

import { useEffect, useRef, type CSSProperties } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { needsColorSample, reportFingerprint, reportTraits } from '../../lib/art/colorStore';
import { sampleCanvasFingerprint } from '../../lib/art/sampleColor';
import { publishPieceInView, clearPieceInView } from '../../lib/npc/inview';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { buildAsciiArtifact, paintAsciiArtifact } from '../../lib/art/ascii';
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
    const ascii = notifs.asciiArt;

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

        if (ascii) {
            // ASCII Art Mode — the pinned artifact stands in. The pixel-read
            // side effects below stay OFF this path: sampling the ASCII paint
            // would report a false fingerprint for the piece.
            let cancelled = false;
            paintAsciiStandin(canvas, slug, id, target).then((ok) => {
                if (cancelled || ok) return;
                // No pin yet — derive fresh from the engine (identical bytes
                // to any pin, same seam as the ASCII Backup panel) so the
                // feature page never drops out of the mode.
                const live = document.createElement('canvas');
                try {
                    paintOutput(live, slug, id, 512, true);
                } catch {
                    return;
                }
                const a = buildAsciiArtifact(live, slug, id);
                if (a) paintAsciiArtifact(canvas, a, target);
                else paintOutput(canvas, slug, id, target, true);
            });
            return () => { cancelled = true; };
        }

        paintOutput(canvas, slug, id, target, true);
        // One cheap pixel read serves two masters: the stored fingerprint
        // backfill (same self-populating model as the gallery cards) and the
        // NPC Cast's live sight of the piece actually on screen.
        const fp = sampleCanvasFingerprint(canvas);
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

    return (
        <canvas
            ref={canvasRef}
            className={className}
            style={style}
            role="img"
            aria-label={`${slug} #${id} — generative artwork, live render`}
        />
    );
}
