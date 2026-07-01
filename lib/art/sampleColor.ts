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
 *
 * v3 — the QUANTITATIVE read (2026-07-01, Brendon: humans notice counts and
 * objects, not adjectives — "two blue squares and a yellow circle"): a second
 * 48×48 pass finds the distinct connected regions of colour, classifies each
 * (circle / square / bar / shape), reads the arrangement (stripes / field /
 * scatter) and generates the human sentence via lib/art/scene.
 */

import { classifyRgb, type ColorBucket } from './outputColor';
import { colorTemperature } from '../output/derive';
import { describeScene, type ShapeInfo, type PatternKind } from './scene';

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
    /* ── v3 — the quantitative read ─────────────────────────────────── */
    shapes: ShapeInfo[];          // distinct colour regions, largest first
    shapeCount: number;           // countable regions found
    pattern: PatternKind;         // stripes / field / scatter / null
    scene: string | null;         // "two blue squares and a yellow circle"
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

        // The quantitative pass — shapes, arrangement, and the human sentence.
        const { shapes, pattern } = detectShapes(canvas);
        const scene = describeScene(shapes, pattern);

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
            shapes,
            shapeCount: shapes.length,
            pattern,
            scene,
        };
    } catch {
        return null;
    }
}

/* ── v3 shape detection ─────────────────────────────────────────────────
   48×48 read → per-cell colour bucket → connected same-bucket regions
   (4-way flood fill), background = the border's majority bucket. Each
   region ≥1.5% of the canvas becomes a ShapeInfo: circle / square / bar /
   shape by bounding-box fill + corner emptiness + elongation. Arrangement
   reads as stripes (3+ parallel bars), field (6+ similar shapes) or
   scatter (8+ small bits). Still one cheap synchronous read. */

function detectShapes(canvas: HTMLCanvasElement): { shapes: ShapeInfo[]; pattern: PatternKind } {
    const none: { shapes: ShapeInfo[]; pattern: PatternKind } = { shapes: [], pattern: null };
    try {
        const W = 48, H = 48;
        const off = document.createElement('canvas');
        off.width = W;
        off.height = H;
        const octx = off.getContext('2d', { willReadFrequently: true });
        if (!octx) return none;
        octx.drawImage(canvas, 0, 0, W, H);
        const { data } = octx.getImageData(0, 0, W, H);

        // Per-cell bucket (null = transparent).
        const cell: (string | null)[] = new Array(W * H).fill(null);
        for (let y = 0; y < H; y++) {
            for (let x = 0; x < W; x++) {
                const i = (y * W + x) * 4;
                if (data[i + 3] < 8) continue;
                cell[y * W + x] = classifyRgb(data[i], data[i + 1], data[i + 2]);
            }
        }

        // Background = majority bucket around the border ring.
        const borderTally = new Map<string, number>();
        for (let x = 0; x < W; x++) {
            for (const idx of [x, (H - 1) * W + x]) {
                const b = cell[idx];
                if (b) borderTally.set(b, (borderTally.get(b) ?? 0) + 1);
            }
        }
        for (let y = 0; y < H; y++) {
            for (const idx of [y * W, y * W + W - 1]) {
                const b = cell[idx];
                if (b) borderTally.set(b, (borderTally.get(b) ?? 0) + 1);
            }
        }
        let bg: string | null = null, bgN = 0;
        for (const [b, n] of borderTally) if (n > bgN) { bgN = n; bg = b; }

        // Connected same-bucket regions among non-background cells.
        const seen = new Uint8Array(W * H);
        interface Comp { bucket: string; cells: number; minx: number; maxx: number; miny: number; maxy: number; cx: number; cy: number; corner: number; }
        const comps: Comp[] = [];
        const stack: number[] = [];
        for (let start = 0; start < W * H; start++) {
            const b = cell[start];
            if (!b || b === bg || seen[start]) continue;
            seen[start] = 1;
            stack.length = 0;
            stack.push(start);
            const c: Comp = { bucket: b, cells: 0, minx: W, maxx: 0, miny: H, maxy: 0, cx: 0, cy: 0, corner: 0 };
            const members: number[] = [];
            while (stack.length) {
                const idx = stack.pop()!;
                const x = idx % W, y = (idx / W) | 0;
                c.cells++;
                members.push(idx);
                c.cx += x; c.cy += y;
                if (x < c.minx) c.minx = x;
                if (x > c.maxx) c.maxx = x;
                if (y < c.miny) c.miny = y;
                if (y > c.maxy) c.maxy = y;
                const neigh = [idx - 1, idx + 1, idx - W, idx + W];
                for (const n of neigh) {
                    if (n < 0 || n >= W * H || seen[n]) continue;
                    const nx = n % W;
                    if (Math.abs(nx - x) > 1) continue; // row wrap
                    if (cell[n] === b) { seen[n] = 1; stack.push(n); }
                }
            }
            if (c.cells >= Math.round(W * H * 0.015)) {
                // Corner occupancy — a circle leaves its bounding-box corners empty.
                const bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
                const qw = Math.max(1, Math.round(bw / 3)), qh = Math.max(1, Math.round(bh / 3));
                let cornerFilled = 0;
                for (const idx of members) {
                    const x = idx % W, y = (idx / W) | 0;
                    const nearL = x < c.minx + qw, nearR = x > c.maxx - qw;
                    const nearT = y < c.miny + qh, nearB = y > c.maxy - qh;
                    if ((nearL || nearR) && (nearT || nearB)) cornerFilled++;
                }
                c.corner = cornerFilled / (4 * qw * qh);
                comps.push(c);
            }
        }
        if (!comps.length) return none;

        comps.sort((a, b) => b.cells - a.cells);
        const top = comps.slice(0, 8);
        let bars = 0, barsWide = 0, barsTall = 0, small = 0;
        const shapes: ShapeInfo[] = top.map((c) => {
            const bw = c.maxx - c.minx + 1, bh = c.maxy - c.miny + 1;
            const fill = c.cells / (bw * bh);
            const aspect = bw / bh;
            let kind: ShapeInfo['kind'] = 'shape';
            if ((aspect > 2.4 || aspect < 1 / 2.4) && fill > 0.5) {
                kind = 'bar';
                bars++;
                if (aspect > 1) barsWide++; else barsTall++;
            } else if (fill > 0.8 && aspect > 0.7 && aspect < 1.43) {
                kind = 'square';
            } else if (fill > 0.55 && fill <= 0.85 && aspect > 0.7 && aspect < 1.43 && c.corner < 0.42) {
                kind = 'circle';
            }
            const share = c.cells / (W * H);
            if (share < 0.03) small++;
            const mx = c.cx / c.cells / W, my = c.cy / c.cells / H;
            const px = mx < 1 / 3 ? 'left' : mx > 2 / 3 ? 'right' : '';
            const py = my < 1 / 3 ? 'top' : my > 2 / 3 ? 'bottom' : '';
            const pos = px && py ? 'corner' : px || py || 'centre';
            return { bucket: c.bucket, kind, share, pos };
        });

        let pattern: PatternKind = null;
        if (bars >= 3 && (barsWide >= 3 || barsTall >= 3)) pattern = 'stripes';
        else if (shapes.length >= 8 && small >= 8) pattern = 'scatter';
        else if (shapes.length >= 6) {
            const sizes = shapes.map((s) => s.share);
            if (Math.max(...sizes) / Math.max(1e-6, Math.min(...sizes)) < 4) pattern = 'field';
        }
        return { shapes, pattern };
    } catch {
        return none;
    }
}

/** Back-compat: just the dominant bucket. */
export function sampleCanvasBucket(canvas: HTMLCanvasElement): ColorBucket | null {
    return sampleCanvasFingerprint(canvas)?.bucket ?? null;
}
