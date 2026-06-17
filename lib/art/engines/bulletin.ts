/*
 * Bulletin — an original piece (opus4-8): abstract animated teletext.
 *
 * A nod to the broadcast teletext era (Brendon's favourite vibe): a chunky grid
 * of the classic 8 teletext colours, drawn as 2x3 "sixel" mosaic blocks, solid
 * bars and quiet gaps — an abstract info page. On its own artwork view it's
 * ALIVE: a refresh line sweeps down re-rolling the mosaic beneath it, like a
 * teletext page loading over the air. In the gallery it's a cheap static frame
 * (one deterministic still) so a wall of them never taxes the browser.
 *
 * Deterministic still from tokenId; the animation is ephemeral motion on top.
 */

import { seededRng, pick } from '../rng';
import type { EngineFn, TraitsFn, TraitSchema, OutputTraits } from '../../project/types';

/* The 8 teletext colours (black is the ground / "off"). */
const TT = ['#ff3b3b', '#2fe24f', '#ffe23b', '#3a6bff', '#ff3bd0', '#3bf0e0', '#f0f0f0'];

interface Palette { name: string; cols: string[] }
const PALETTES: Palette[] = [
    { name: 'Ceefax',   cols: TT },
    { name: 'RGB',      cols: ['#ff3b3b', '#2fe24f', '#3a6bff', '#f0f0f0'] },
    { name: 'Amber',    cols: ['#ffb000', '#ff7a18', '#ffe23b', '#f0e0c0'] },
    { name: 'Phosphor', cols: ['#2fe24f', '#7bffa0', '#bfffce', '#f0f0f0'] },
    { name: 'Magenta',  cols: ['#ff3bd0', '#3bf0e0', '#3a6bff', '#f0f0f0'] },
];

const LAYOUTS = ['Mosaic', 'Bars', 'Columns'] as const;
const DENS = ['Sparse', 'Busy', 'Packed'] as const;

export const BULLETIN_ASPECTS: readonly number[] = [1, 1.33];

interface Params {
    palette: Palette;
    layout: typeof LAYOUTS[number];
    density: typeof DENS[number];
    aspect: number;
}

function cast(r: () => number): Params {
    const palette = pick(PALETTES, r);
    const layout = pick(LAYOUTS, r);
    const density = pick(DENS, r);
    const aspect = pick([1, 1.33], r);
    return { palette, layout, density, aspect };
}

function traitsFrom(p: Params): OutputTraits {
    return { Palette: p.palette.name, Layout: p.layout, Density: p.density };
}

export const bulletinTraits: TraitsFn = (tokenId) => traitsFrom(cast(seededRng(tokenId)));

/* Draw one teletext cell: a 2x3 sixel mosaic (bits 0-63), a solid block, or a
   gap, in colour `c`. */
function drawCell(ctx: CanvasRenderingContext2D, x: number, y: number, cw: number, ch: number, c: string, bits: number) {
    if (bits === 0) return;
    ctx.fillStyle = c;
    if (bits === 63) { ctx.fillRect(x, y, cw + 1, ch + 1); return; }
    const sw = cw / 2, sh = ch / 3;
    for (let i = 0; i < 6; i++) {
        if (bits & (1 << i)) {
            const sx = x + (i % 2) * sw, sy = y + Math.floor(i / 2) * sh;
            ctx.fillRect(sx, sy, sw + 0.6, sh + 0.6);
        }
    }
}

export const renderBulletin: EngineFn = (canvas, tokenId, width) => {
    const r = seededRng(tokenId);
    const p = cast(r);
    const W = Math.max(1, Math.floor(width));
    const H = Math.max(1, Math.round(W / p.aspect));
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { aspect: p.aspect, traits: traitsFrom(p) };

    const cols = 30, rows = Math.round(30 / p.aspect);
    const cw = W / cols, ch = H / rows;
    const fillP = p.density === 'Sparse' ? 0.4 : p.density === 'Packed' ? 0.68 : 0.54;

    // Deterministic base grid: each cell = {colour index, mosaic bits}. Row
    // "kinds" give the page structure (solid bars, mosaic fields, gaps).
    const cells: { c: string; bits: number }[] = [];
    const rowKind: number[] = [];
    for (let gy = 0; gy < rows; gy++) {
        // Bars layout favours solid colour rows; columns favours vertical runs.
        rowKind[gy] = p.layout === 'Bars' ? (r() < 0.5 ? 1 : 0) : 0;
    }
    const colColours: string[] = [];
    for (let gx = 0; gx < cols; gx++) colColours.push(pick(p.palette.cols, r));
    let prevC = pick(p.palette.cols, r);
    for (let gy = 0; gy < rows; gy++) {
        const barColour = pick(p.palette.cols, r);
        for (let gx = 0; gx < cols; gx++) {
            const on = r() < fillP;
            // Colour RUNS — a cell often inherits its neighbour's colour, so the
            // page reads as blocky teletext regions, not per-cell confetti.
            let c = (gx > 0 && r() < 0.62) ? prevC : pick(p.palette.cols, r);
            // Chunkier blocks: many full/edge mosaics, fewer scattered subpixels.
            let bits = on ? (r() < 0.45 ? 63 : 1 + Math.floor(r() * 63)) : 0;
            if (rowKind[gy] === 1) { c = barColour; bits = on ? 63 : 0; }        // solid bar
            if (p.layout === 'Columns') c = colColours[gx];
            prevC = c;
            cells.push({ c, bits });
        }
    }

    const paint = (sweepRow: number, flicker: boolean) => {
        ctx.fillStyle = '#050507';
        ctx.fillRect(0, 0, W, H);
        for (let gy = 0; gy < rows; gy++) {
            for (let gx = 0; gx < cols; gx++) {
                const idx = gy * cols + gx;
                let cell = cells[idx];
                // Cells right at the refresh line shimmer to new mosaic bits.
                if (flicker && Math.abs(gy - sweepRow) <= 1 && cell.bits !== 0 && cell.bits !== 63) {
                    cell = { c: cell.c, bits: 1 + Math.floor(Math.random() * 63) };
                }
                drawCell(ctx, gx * cw, gy * ch, cw, ch, cell.c, cell.bits);
            }
        }
        // The refresh line itself — a bright scan bar.
        if (flicker && sweepRow >= 0 && sweepRow < rows) {
            ctx.fillStyle = 'rgba(255,255,255,0.12)';
            ctx.fillRect(0, sweepRow * ch, W, ch);
        }
        // Scanline veil.
        ctx.fillStyle = 'rgba(0,0,0,0.16)';
        for (let yy = 0; yy < H; yy += 3) ctx.fillRect(0, yy, W, 1);
    };

    // Static deterministic still.
    paint(-1, false);

    // Animate only on a big single-view canvas (never the gallery tiles), and
    // self-terminate when the canvas leaves the DOM or is evicted to 1x1.
    if (W >= 320 && typeof window !== 'undefined' && !(canvas as HTMLCanvasElement & { _bull?: boolean })._bull) {
        const c = canvas as HTMLCanvasElement & { _bull?: boolean };
        c._bull = true;
        let sweep = 0, frame = 0;
        const loop = () => {
            if (!c.isConnected || c.width < 4) { c._bull = false; return; }
            frame++;
            if (frame % 3 === 0) sweep = (sweep + 1) % (rows + 6);
            paint(sweep, true);
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    return { aspect: p.aspect, traits: traitsFrom(p) };
};

export const bulletinSchema: TraitSchema = {
    traits: [
        { name: 'Palette', values: PALETTES.map((x) => x.name) },
        { name: 'Layout', values: [...LAYOUTS] },
        { name: 'Density', values: [...DENS] },
    ],
};
