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

export type AspectKind = 'square' | 'wide' | 'tall';

/* The aesthetic fingerprint of a piece, read from its painted pixels in the SAME
 * pass as the dominant colour. Reusable app-wide (gen-curated themes, gallery
 * facets, taste profiles). All scalars are 0..1. */
export interface Fingerprint {
    bucket: ColorBucket | null;
    aspect: AspectKind;
    brightness: number;   // mean luminance
    saturation: number;   // mean chroma (vivid ↔ muted)
    complexity: number;   // edge density (busy ↔ minimal)
}

function aspectOf(w: number, h: number): AspectKind {
    const r = h > 0 ? w / h : 1;
    if (r > 1.15) return 'wide';
    if (r < 0.87) return 'tall';
    return 'square';
}

/** Full fingerprint (colour + brightness + saturation + complexity + aspect)
 *  from one downsampled read of the painted canvas. Cheap (24×24), synchronous. */
export function sampleCanvasFingerprint(canvas: HTMLCanvasElement): Fingerprint | null {
    try {
        if (!canvas.width || !canvas.height) return null;
        const W = 24, H = 24;
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) return null;
        octx.drawImage(canvas, 0, 0, W, H);
        const { data } = octx.getImageData(0, 0, W, H);

        const tally = new Map<ColorBucket, number>();
        const lum = new Float32Array(W * H).fill(-1); // -1 = transparent (skip)
        let sumLum = 0, sumSat = 0, count = 0;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                if (data[i + 3] < 8) continue; // near-transparent
                const r = data[i], g = data[i + 1], b = data[i + 2];
                tally.set(classifyRgb(r, g, b), (tally.get(classifyRgb(r, g, b)) ?? 0) + 1);
                const L = 0.299 * r + 0.587 * g + 0.114 * b;
                lum[y * W + x] = L;
                sumLum += L / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                sumSat += max > 0 ? (max - min) / max : 0;
                count++;
            }
        }
        if (count === 0) return null;

        let best: ColorBucket | null = null, bestN = 0;
        for (const [bucket, n] of tally) if (n > bestN) { bestN = n; best = bucket; }

        // Edge density — mean abs luminance step to the right + down neighbour.
        let edgeSum = 0, edgeN = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const L = lum[y * W + x];
                if (L < 0) continue;
                if (x + 1 < W && lum[y * W + x + 1] >= 0) { edgeSum += Math.abs(L - lum[y * W + x + 1]); edgeN++; }
                if (y + 1 < H && lum[(y + 1) * W + x] >= 0) { edgeSum += Math.abs(L - lum[(y + 1) * W + x]); edgeN++; }
            }
        }
        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

        return {
            bucket: best,
            aspect: aspectOf(canvas.width, canvas.height),
            brightness: clamp01(sumLum / count),
            saturation: clamp01(sumSat / count),
            // Scaled so typical art spreads across 0..1 rather than bunching low.
            complexity: edgeN ? clamp01((edgeSum / edgeN / 255) * 4) : 0,
        };
    } catch {
        return null;
    }
}

/** Back-compat: just the dominant bucket. */
export function sampleCanvasBucket(canvas: HTMLCanvasElement): ColorBucket | null {
    return sampleCanvasFingerprint(canvas)?.bucket ?? null;
}
