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
 *  on near-black, at or above the `widthPx` resolution so the view stays crisp.
 *
 *  Display compensation (stored palette/text stays untouched, exactly as
 *  sampled — all of this is paint-time only):
 *
 *  - INTEGER CELL GRID. Fractional cell heights + the browser rescaling the
 *    canvas up to the screen are what painted the faint horizontal "lines"
 *    (moiré banding — the recurring ~1/3-down line). Cells are now whole
 *    pixels — cellW a multiple of 3, cellH exactly 5/3 of it, honouring the
 *    0.6 Courier advance — and the internal render is always AT OR ABOVE the
 *    requested resolution, so the screen only ever scales it DOWN (averaging,
 *    no moiré). The ≥10px glyph size is also what fixes the small-font mush:
 *    Courier below ~7px doesn't rasterize into legible ink.
 *
 *  - PER-CELL COLOUR UNDERLAY. Glyph ink only covers ~40% of a cell, so ink
 *    colour alone reads at roughly half the piece's brightness — and the
 *    hue-preserving boost can't lift an already-saturated neon at all (its top
 *    channel is at 255; the clamp scales it straight back down). The only way
 *    to actually reach the image's brightness is more lit area: each non-space
 *    cell gets a fill of its own colour at reduced strength UNDER the
 *    full-strength glyph. Same hue exactly (pure scaling), blacks stay black
 *    (space cells stay bare #050505), and up close it still reads as glyphs. */
export function paintAsciiArtifact(target: HTMLCanvasElement, art: AsciiArtifact, widthPx: number): void {
    // Smallest multiple-of-3 cell width that meets the requested resolution,
    // floored at 6 (10px glyphs) and capped at 12 (20px glyphs).
    const cellW = Math.min(12, Math.max(6, Math.ceil(widthPx / art.cols / 3) * 3));
    const cellH = (cellW * 5) / 3;
    const w = cellW * art.cols;
    const h = cellH * art.rows;
    target.width = w;
    target.height = h;
    const ctx = target.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `bold ${cellH}px 'Courier New', Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    // Pre-lift the palette once (display-only brightness compensation).
    // HUE-PRESERVING: scale all three channels by ONE shared gain — never
    // per-channel and never a flat additive lift, both of which wash colour
    // toward grey/white (the neon green + blue read as grey — Brendon 2026-07-08).
    // When a channel would clip, scale the whole colour down so the hue holds at
    // full saturation instead of blowing out. Blacks stay black — no grey flood.
    const BOOST = 1.85;
    // Underlay strength — fraction of the lifted colour filling the cell
    // behind the glyph. 0.55 lands the cell's average (ink + fill) close to
    // the source pixel's brightness without flattening the glyph texture.
    const UNDERLAY = 0.55;
    const ink: string[] = [];
    const under: string[] = [];
    for (const hex of art.palette) {
        let r = parseInt(hex.slice(1, 3), 16) * BOOST;
        let g = parseInt(hex.slice(3, 5), 16) * BOOST;
        let b = parseInt(hex.slice(5, 7), 16) * BOOST;
        const m = Math.max(r, g, b);
        if (m > 255) { const s = 255 / m; r *= s; g *= s; b *= s; }
        ink.push(`rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`);
        under.push(`rgb(${Math.round(r * UNDERLAY)},${Math.round(g * UNDERLAY)},${Math.round(b * UNDERLAY)})`);
    }
    const lines = art.text.split('\n');
    for (let y = 0; y < art.rows; y++) {
        const line = lines[y] ?? '';
        const cy = (y + 0.5) * cellH;
        for (let x = 0; x < art.cols; x++) {
            const ch = line[x];
            if (!ch || ch === ' ') continue;
            const pi = parseInt(art.cells.slice((y * art.cols + x) * 2, (y * art.cols + x) * 2 + 2), 16);
            ctx.fillStyle = under[pi] ?? '#000000';
            ctx.fillRect(x * cellW, y * cellH, cellW, cellH);
            ctx.fillStyle = ink[pi] ?? '#ffffff';
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
