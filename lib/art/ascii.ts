/*
 * ASCII Backup — translates a rendered artwork canvas into a raw text/ASCII
 * representation (ClickUp 86bahh9f5). Deterministic, $0 runtime: a pure
 * downsample of the pixels already painted by the engine — never re-renders,
 * never touches the canonical art.
 *
 * Two outputs from one sample:
 *   - `text`  — the raw plain-text backup (rows joined by \n), copyable.
 *   - a painted CANVAS view — the same grid drawn in Courier, every glyph
 *     wearing its cell's true colour on near-black, so the on-screen ASCII
 *     keeps the piece's palette while the .txt stays pure text.
 *
 * Fidelity choices:
 *   - 70-glyph luminance ramp (the classic dense ramp), gamma-lifted so
 *     mid-tones don't mush into darkness.
 *   - Cell grid matches Courier's real 0.6 width:height advance, so the
 *     painted view has square-true proportions (no stretched art).
 */

/** Dark → bright. Index by luminance; denser ink = brighter pixel on dark bg. */
const RAMP =
    ' .\'`^",:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

/** Courier glyph advance ≈ 0.6 × font-size — the grid honours it. */
const CHAR_ASPECT = 0.6;

export interface AsciiArt {
    cols: number;
    rows: number;
    /** The raw text backup — rows joined by '\n'. */
    text: string;
    /** Per-cell glyph + CSS colour, row-major, for the painted canvas view. */
    cells: { ch: string; color: string }[][];
    /** Source canvas aspect (h/w), so the painted view keeps the art's shape. */
    aspect: number;
}

/**
 * Sample an already-painted canvas into an ASCII grid. `cols` sets fidelity;
 * rows follow from the source aspect and the Courier cell shape.
 */
export function asciiFromCanvas(src: HTMLCanvasElement, cols = 120): AsciiArt | null {
    const w = src.width;
    const h = src.height;
    if (!w || !h) return null;
    const aspect = h / w;
    const rows = Math.max(1, Math.round(cols * aspect * CHAR_ASPECT));

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

    const cells: { ch: string; color: string }[][] = [];
    const lines: string[] = [];
    for (let y = 0; y < rows; y++) {
        const rowCells: { ch: string; color: string }[] = [];
        let line = '';
        for (let x = 0; x < cols; x++) {
            const i = (y * cols + x) * 4;
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            const a = data[i + 3] / 255;
            // Perceived luminance (Rec. 601), alpha-composited over black,
            // gamma-lifted so mid-tones keep their detail in the ramp.
            const lum = ((0.299 * r + 0.587 * g + 0.114 * b) / 255) * a;
            const lifted = Math.pow(lum, 0.82);
            const ch = RAMP[Math.min(RAMP.length - 1, Math.round(lifted * (RAMP.length - 1)))];
            // Mild floor-lift so dim glyphs stay visible on the near-black bg
            // (the glyph choice itself already carries the true luminance).
            const lift = (v: number) => Math.min(255, Math.round(v * 0.88 + 30));
            rowCells.push({ ch, color: `rgb(${lift(r)},${lift(g)},${lift(b)})` });
            line += ch;
        }
        cells.push(rowCells);
        lines.push(line);
    }
    return { cols, rows, text: lines.join('\n'), cells, aspect };
}

/**
 * Paint an AsciiArt grid onto a canvas — Courier glyphs in their true cell
 * colours on near-black. Sized from `widthPx` so the view stays as crisp as
 * the live render it replaces.
 */
export function paintAscii(target: HTMLCanvasElement, art: AsciiArt, widthPx: number): void {
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
    ctx.font = `${cellH.toFixed(2)}px 'Courier New', Courier, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let y = 0; y < art.rows; y++) {
        const row = art.cells[y];
        const cy = (y + 0.5) * cellH;
        for (let x = 0; x < art.cols; x++) {
            const cell = row[x];
            if (cell.ch === ' ') continue;
            ctx.fillStyle = cell.color;
            ctx.fillText(cell.ch, (x + 0.5) * cellW, cy);
        }
    }
}

/* ── Backup text registry — the latest rendered .txt per piece, so the
      Copy affordance grabs exactly what's on screen. ─────────────────── */

const lastText = new Map<string, string>();
const key = (slug: string, id: number) => `${slug}/${id}`;

export function storeAsciiText(slug: string, id: number, text: string): void {
    lastText.set(key(slug, id), text);
}

export function getAsciiText(slug: string, id: number): string | null {
    return lastText.get(key(slug, id)) ?? null;
}
