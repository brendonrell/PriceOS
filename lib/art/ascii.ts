/*
 * ASCII Backup — the text-medium backup of an artwork (ClickUp 86bahh9f5).
 *
 * GENERATED AT MINT (Brendon, 2026-07-05): the moment a piece mints, the same
 * deterministic render that pins the preview PNG also derives a HIGH-RES,
 * FULL-COLOUR ASCII artifact — raw text plus a per-glyph colour layer — and
 * pins it to storage, write-once, beside the PNG ({slug}/{id}.ascii.json).
 * Shown in the Output's "+More ▸ ASCII Backup" spot it reads basically like
 * the image; copied out, it's a plain-text backup of the art.
 *
 * Everything here is deterministic and $0: a pure downsample + quantize of
 * pixels the engine already painted. Identical inputs → byte-identical
 * artifact for every generator, which is what makes the open write-once
 * writer trustworthy (same argument as the preview PNG pin route).
 *
 * Fidelity choices:
 *   - 192-column grid (≈22k glyphs on a square piece) — image-like at page
 *     width, honest ASCII up close.
 *   - 70-glyph luminance ramp (the classic dense ramp), gamma-lifted so
 *     mid-tones don't mush into darkness.
 *   - Cell grid matches Courier's real 0.6 width:height advance, so the
 *     painted view keeps the art's true proportions.
 *   - Colour layer quantized to a ≤256-colour palette (per-glyph tint can't
 *     express more anyway) — keeps a full artifact ≈75KB.
 */

/** Dark → bright. Index by luminance; denser ink = brighter pixel on dark bg. */
const RAMP =
    ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

/** Courier glyph advance ≈ 0.6 × font-size — the grid honours it. */
const CHAR_ASPECT = 0.6;

/** Backup grid width, in characters. */
export const ASCII_COLS = 192;

/** The stored artifact — a self-describing, copy/paste-able colour backup:
 *  raw text + a palette-indexed colour layer, stamped with what it backs up. */
export interface AsciiArtifact {
    kind: 'pd-ascii-backup';
    v: 1;
    /** What this backs up — makes a pasted artifact self-identifying. */
    project: string;
    token: number;
    cols: number;
    rows: number;
    /** The raw text backup — rows joined by '\n'. */
    text: string;
    /** ≤256 '#rrggbb' entries. */
    palette: string[];
    /** Row-major, 2 lowercase-hex chars per cell — index into `palette`. */
    cells: string;
}

interface Sampled {
    cols: number;
    rows: number;
    text: string;
    /** Row-major per-cell true colour. */
    rgb: [number, number, number][];
}

/** Sample an already-painted canvas into the ASCII grid (glyphs + true colours). */
function sampleCanvas(src: HTMLCanvasElement, cols: number): Sampled | null {
    const w = src.width;
    const h = src.height;
    if (!w || !h) return null;
    const rows = Math.max(1, Math.round(cols * (h / w) * CHAR_ASPECT));

    const grid = document.createElement('canvas');
    grid.width = cols;
    grid.height = rows;
    const gctx = grid.getContext('2d', { willReadFrequently: true });
    if (!gctx) return null;
    gctx.drawImage(src, 0, 0, cols, rows);

    let data: Uint8ClampedArray;
    try {
        data = gctx.getImageData(0, 0, cols, rows).data;
    } catch {
        return null; // tainted canvas — never the case for our own renders
    }

    const rgb: [number, number, number][] = [];
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
        let line = '';
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const a = data[i + 3] / 255;
            const r = Math.round(data[i] * a);
            const g = Math.round(data[i + 1] * a);
            const b = Math.round(data[i + 2] * a);
            // Perceived luminance (Rec. 601), gamma-lifted so mid-tones keep
            // their detail in the ramp.
            const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            const lifted = Math.pow(lum, 0.82);
            line += RAMP[Math.min(RAMP.length - 1, Math.round(lifted * (RAMP.length - 1)))];
            rgb.push([r, g, b]);
        }
        lines.push(line);
    }
    return { cols, rows, text: lines.join('\n'), rgb };
}

/** Deterministic ≤256-colour quantize: bucket to 12-bit RGB, keep the most
 *  frequent buckets (ties broken by bucket id), palette entry = the bucket's
 *  true mean colour, stragglers map to the nearest kept entry. */
function quantize(rgb: [number, number, number][]): { palette: string[]; index: number[] } {
    const buckets = new Map<number, { n: number; r: number; g: number; b: number }>();
    for (const [r, g, b] of rgb) {
        const id = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        const bk = buckets.get(id) ?? { n: 0, r: 0, g: 0, b: 0 };
        bk.n += 1; bk.r += r; bk.g += g; bk.b += b;
        buckets.set(id, bk);
    }
    const kept = Array.from(buckets.entries())
        .sort((a, b) => b[1].n - a[1].n || a[0] - b[0])
        .slice(0, 256);
    const paletteRgb = kept.map(([, bk]) => [
        Math.round(bk.r / bk.n), Math.round(bk.g / bk.n), Math.round(bk.b / bk.n),
    ] as [number, number, number]);
    const keptIndex = new Map(kept.map(([id], i) => [id, i]));

    const nearest = (r: number, g: number, b: number): number => {
        let best = 0;
        let bestD = Infinity;
        for (let i = 0; i < paletteRgb.length; i++) {
            const [pr, pg, pb] = paletteRgb[i];
            const d = (pr - r) ** 2 + (pg - g) ** 2 + (pb - b) ** 2;
            if (d < bestD) { bestD = d; best = i; }
        }
        return best;
    };

    const index = rgb.map(([r, g, b]) => {
        const id = ((r >> 4) << 8) | ((g >> 4) << 4) | (b >> 4);
        return keptIndex.get(id) ?? nearest(r, g, b);
    });
    const hex = (n: number) => n.toString(16).padStart(2, '0');
    const palette = paletteRgb.map(([r, g, b]) => `#${hex(r)}${hex(g)}${hex(b)}`);
    return { palette, index };
}

/** Build the storable artifact from an already-painted canvas. */
export function buildAsciiArtifact(
    src: HTMLCanvasElement,
    project: string,
    token: number,
    cols = ASCII_COLS,
): AsciiArtifact | null {
    const s = sampleCanvas(src, cols);
    if (!s) return null;
    const { palette, index } = quantize(s.rgb);
    let cells = '';
    for (const i of index) cells += i.toString(16).padStart(2, '0');
    return { kind: 'pd-ascii-backup', v: 1, project, token, cols: s.cols, rows: s.rows, text: s.text, palette, cells };
}

/** Paint an artifact onto a canvas — Courier glyphs in their palette colours
 *  on near-black, sized from `widthPx` so the view stays crisp.
 *
 *  Display compensation: glyph ink only covers ~45% of each cell, so drawing
 *  the honest stored colours reads DARK next to the source image. The painted
 *  view lifts brightness (bold glyphs + a colour boost with a small black-lift,
 *  clamped) so the on-screen ASCII reads like the piece — the stored
 *  palette/text stays untouched, exactly as sampled. */
export function paintAsciiArtifact(target: HTMLCanvasElement, art: AsciiArtifact, widthPx: number): void {
    const cellW = widthPx / art.cols;
    const cellH = cellW / CHAR_ASPECT;
    const w = Math.round(widthPx);
    const h = Math.round(cellH * art.rows);
    target.width = w;
    target.height = h;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `bold ${cellH.toFixed(2)}px 'Courier New', Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Pre-lift the palette once (display-only brightness compensation). A gain
    // plus a small additive black-lift so the dark ink that dominates most
    // pieces reads brighter — the ASCII panel was too dark (Brendon 2026-07-08).
    const lift = (hex: string): string => {
        // Gamma lift — raises the DARK ink that dominates most pieces far more
        // than a flat multiply did, so the panel reads clearly brighter.
        // 369.75 = 255 * 1.45, pre-folded so the multiply can't be dropped.
        const up = (c: number) => {
            const v = Math.pow(c / 255, 0.4) * 369.75 + 30;
            return v > 255 ? 255 : Math.round(v);
        };
        const r = up(parseInt(hex.slice(1, 3), 16));
        const g = up(parseInt(hex.slice(3, 5), 16));
        const b = up(parseInt(hex.slice(5, 7), 16));
        return `rgb(${r},${g},${b})`;
    };
    const lifted = art.palette.map(lift);
    const lines = art.text.split('\n');
    for (let y = 0; y < art.rows; y++) {
        const line = lines[y] ?? '';
        const cy = (y + 0.5) * cellH;
        for (let x = 0; x < art.cols; x++) {
            const ch = line[x];
            if (!ch || ch === ' ') continue;
            const pi = parseInt(art.cells.slice((y * art.cols + x) * 2, (y * art.cols + x) * 2 + 2), 16);
            ctx.fillStyle = lifted[pi] ?? '#ffffff';
            ctx.fillText(ch, (x + 0.5) * cellW, cy);
        }
    }
}

/** Shape-check a parsed artifact (shared by the writer route + the reader). */
export function isValidAsciiArtifact(a: unknown): a is AsciiArtifact {
    if (!a || typeof a !== 'object') return false;
    const o = a as Record<string, unknown>;
    if (o.kind !== 'pd-ascii-backup' || o.v !== 1) return false;
    if (typeof o.project !== 'string' || !o.project) return false;
    if (!Number.isInteger(o.token) || (o.token as number) < 1) return false;
    const cols = o.cols, rows = o.rows;
    if (!Number.isInteger(cols) || !Number.isInteger(rows)) return false;
    if ((cols as number) < 8 || (cols as number) > 256 || (rows as number) < 4 || (rows as number) > 256) return false;
    if (typeof o.text !== 'string' || typeof o.cells !== 'string' || !Array.isArray(o.palette)) return false;
    const c = cols as number, r = rows as number;
    const lines = o.text.split('\n');
    if (lines.length !== r || lines.some((l) => l.length !== c)) return false;
    if (o.cells.length !== c * r * 2 || !/^[0-9a-f]*$/.test(o.cells)) return false;
    if (o.palette.length < 1 || o.palette.length > 256) return false;
    if (o.palette.some((p) => typeof p !== 'string' || !/^#[0-9a-f]{6}$/.test(p))) return false;
    return true;
}
