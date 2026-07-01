'use client';

/*
 * sampleColor — the visual fingerprint of a piece, read from its actually-
 * rendered pixels. Engine-agnostic: unlike outputColor's palette-math (which
 * only knows Prisms), this works on ANY engine because it samples the painted
 * canvas. Downsamples to a small grid and reads everything in one pass. Cheap
 * (24×24) + synchronous; meant to run once per piece right after it paints,
 * then get persisted to the `outputs` table (lib/art/colorStore).
 *
 * v1 axes (unchanged, bit-identical to what's already stored): dominant colour
 * bucket, aspect, brightness, saturation, complexity.
 *
 * v2 axes (2026-07-01 — the "deep look"; how the NPC Cast truly SEES a piece,
 * and new Attributes Form tiles): accent colour, palette count, contrast,
 * measured warmth, gravity (where the visual weight sits), symmetry, air
 * (negative space), texture (fine grain). All computed in the same single
 * 24×24 pass, so the upgrade costs nothing.
 */

import { classifyRgb, type ColorBucket } from './outputColor';
import { colorTemperature } from '../output/derive';

export type AspectKind = 'square' | 'wide' | 'tall';

/** Where a piece's visual weight (edge energy) sits. */
export type GravityKind = 'Centered' | 'Low' | 'High' | 'Left' | 'Right';

/* The aesthetic fingerprint of a piece, read from its painted pixels in the SAME
 * pass as the dominant colour. Reusable app-wide (gen-curated themes, gallery
 * facets, taste profiles, the NPC Cast's sight). All scalars are 0..1. */
export interface Fingerprint {
    bucket: ColorBucket | null;
    aspect: AspectKind;
    brightness: number;   // mean luminance
    saturation: number;   // mean chroma (vivid ↔ muted)
    complexity: number;   // edge density (busy ↔ minimal)
    /* ── v2 — the deep look ─────────────────────────────────────────── */
    accent: ColorBucket | null;   // second colour (≥10% of pixels, ≠ dominant)
    accentShare: number | null;   // that colour's pixel share
    paletteCount: number;         // buckets holding ≥8% of pixels (1 = monochrome)
    contrast: number;             // luminance spread (p90 − p10)
    warmth: number | null;        // warm share among chromatic pixels (null = achromatic)
    gravity: GravityKind;         // where the visual weight sits
    symmetry: number;             // left↔right mirror similarity
    air: number;                  // flat / negative-space share
    texture: number;              // fine-detail share (grain)
}

function aspectOf(w: number, h: number): AspectKind {
    const r = h > 0 ? w / h : 1;
    if (r > 1.15) return 'wide';
    if (r < 0.87) return 'tall';
    return 'square';
}

/** Full fingerprint from one downsampled read of the painted canvas.
 *  Cheap (24×24), synchronous. */
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
        let warmN = 0, coolN = 0;

        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                if (data[i + 3] < 8) continue; // near-transparent
                const r = data[i], g = data[i + 1], b = data[i + 2];
                const bucket = classifyRgb(r, g, b);
                tally.set(bucket, (tally.get(bucket) ?? 0) + 1);
                const temp = colorTemperature(bucket);
                if (temp === 'Warm') warmN++;
                else if (temp === 'Cool') coolN++;
                const L = 0.299 * r + 0.587 * g + 0.114 * b;
                lum[y * W + x] = L;
                sumLum += L / 255;
                const max = Math.max(r, g, b), min = Math.min(r, g, b);
                sumSat += max > 0 ? (max - min) / max : 0;
                count++;
            }
        }
        if (count === 0) return null;

        // Dominant + accent + palette size from the same bucket tally.
        const ranked = [...tally.entries()].sort((a, b) => b[1] - a[1]);
        const best = ranked[0]?.[0] ?? null;
        const second = ranked[1] ?? null;
        const accentShare = second ? second[1] / count : null;
        const accent = second && accentShare != null && accentShare >= 0.10 ? second[0] : null;
        const paletteCount = Math.max(1, ranked.filter(([, n]) => n / count >= 0.08).length);

        /* Edge pass — one sweep feeds complexity (v1 formula, untouched),
           texture, air, and the gravity centroid. */
        let edgeSum = 0, edgeN = 0;
        let fineN = 0, flatN = 0;
        let wSum = 0, wx = 0, wy = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const L = lum[y * W + x];
                if (L < 0) continue;
                let cellEdge = 0;
                if (x + 1 < W && lum[y * W + x + 1] >= 0) {
                    const d = Math.abs(L - lum[y * W + x + 1]);
                    edgeSum += d; edgeN++;
                    cellEdge += d;
                    if (d < 6) flatN++;
                    else if (d < 45) fineN++;
                }
                if (y + 1 < H && lum[(y + 1) * W + x] >= 0) {
                    const d = Math.abs(L - lum[(y + 1) * W + x]);
                    edgeSum += d; edgeN++;
                    cellEdge += d;
                    if (d < 6) flatN++;
                    else if (d < 45) fineN++;
                }
                if (cellEdge > 0) {
                    wSum += cellEdge;
                    wx += cellEdge * (x + 0.5);
                    wy += cellEdge * (y + 0.5);
                }
            }
        }
        const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

        // Contrast — luminance spread between the 10th and 90th percentile.
        const lums: number[] = [];
        for (let i = 0; i < lum.length; i++) if (lum[i] >= 0) lums.push(lum[i]);
        lums.sort((a, b) => a - b);
        const p = (q: number) => lums[Math.min(lums.length - 1, Math.floor(q * lums.length))];
        const contrast = clamp01((p(0.9) - p(0.1)) / 255);

        // Warmth — warm share among chromatic pixels; null when the piece is
        // essentially achromatic (nothing warm OR cool to measure).
        const chroma = warmN + coolN;
        const warmth = chroma >= count * 0.1 ? clamp01(warmN / chroma) : null;

        // Gravity — the edge-energy centroid, mapped to a coarse direction.
        let gravity: GravityKind = 'Centered';
        if (wSum > 0) {
            const dx = wx / wSum / W - 0.5;
            const dy = wy / wSum / H - 0.5;
            if (Math.max(Math.abs(dx), Math.abs(dy)) >= 0.045) {
                gravity = Math.abs(dy) >= Math.abs(dx)
                    ? (dy > 0 ? 'Low' : 'High')
                    : (dx > 0 ? 'Right' : 'Left');
            }
        }

        // Symmetry — mean left↔right mirror difference, folded to 0..1.
        let symSum = 0, symN = 0;
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W / 2; x++) {
                const a = lum[y * W + x], b = lum[y * W + (W - 1 - x)];
                if (a < 0 || b < 0) continue;
                symSum += Math.abs(a - b);
                symN++;
            }
        }
        const symmetry = symN ? clamp01(1 - (symSum / symN / 255) * 2.2) : 1;

        return {
            bucket: best,
            aspect: aspectOf(canvas.width, canvas.height),
            brightness: clamp01(sumLum / count),
            saturation: clamp01(sumSat / count),
            // Scaled so typical art spreads across 0..1 rather than bunching low.
            complexity: edgeN ? clamp01((edgeSum / edgeN / 255) * 4) : 0,
            accent,
            accentShare: accent != null ? accentShare : null,
            paletteCount,
            contrast,
            warmth,
            gravity,
            symmetry,
            air: edgeN ? clamp01(flatN / edgeN) : 1,
            texture: edgeN ? clamp01(fineN / edgeN) : 0,
        };
    } catch {
        return null;
    }
}

/** Back-compat: just the dominant bucket. */
export function sampleCanvasBucket(canvas: HTMLCanvasElement): ColorBucket | null {
    return sampleCanvasFingerprint(canvas)?.bucket ?? null;
}
