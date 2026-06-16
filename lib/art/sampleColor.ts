'use client';

/*
 * sampleColor — the DOMINANT colour bucket of a piece, read from its actually-
 * rendered pixels. Engine-agnostic: unlike outputColor's palette-math (which
 * only knows Prisms), this works on ANY engine because it samples the painted
 * canvas. Downsamples to a small grid and takes the majority bucket across
 * opaque pixels. Cheap (24×24) + synchronous; meant to run once per piece right
 * after it paints, then get persisted to the `outputs` table (lib/art/colorStore).
 */

import { classifyRgb, type ColorBucket } from './outputColor';

export function sampleCanvasBucket(canvas: HTMLCanvasElement): ColorBucket | null {
    try {
        if (!canvas.width || !canvas.height) return null;
        const W = 24;
        const H = 24;
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) return null;
        octx.drawImage(canvas, 0, 0, W, H);
        const { data } = octx.getImageData(0, 0, W, H);

        const tally = new Map<ColorBucket, number>();
        for (let i = 0; i < data.length; i += 4) {
            if (data[i + 3] < 8) continue; // skip near-transparent pixels
            const b = classifyRgb(data[i], data[i + 1], data[i + 2]);
            tally.set(b, (tally.get(b) ?? 0) + 1);
        }
        let best: ColorBucket | null = null;
        let bestN = 0;
        for (const [bucket, n] of tally) {
            if (n > bestN) { bestN = n; best = bucket; }
        }
        return best;
    } catch {
        return null;
    }
}
