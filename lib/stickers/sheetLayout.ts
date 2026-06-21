/*
 * sheetLayout — the generative composer for a sticker sheet.
 *
 * Scatters a sheet's stickers across one backing: a jittered grid (guarantees no
 * ugly pile-ups) with random per-sticker offset, rotation and scale. Driven by a
 * seed, so the StickersModal can hand it a fresh seed on every open → the sheet
 * re-scatters each time you look at it. Same idea as our gen-art engines.
 */

import type { Sticker } from './catalog';

export interface Placed {
    sticker: Sticker;
    x: number;     // % across the paper
    y: number;     // % down the paper
    rot: number;   // deg
    scale: number;
}
export interface SheetLayout {
    cols: number;
    rows: number;
    items: Placed[];
}

function mulberry32(a: number) {
    return function () {
        a |= 0; a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function buildSheetLayout(hopper: readonly Sticker[], seed: number): SheetLayout {
    const rnd = mulberry32(seed || 1);

    // The sheet is a HOPPER — draw a random bunch to show this time, not all.
    const pool = [...hopper];
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [pool[i], pool[j]] = [pool[j]!, pool[i]!];
    }
    const draw = Math.min(pool.length, 12 + Math.floor(rnd() * 5)); // 12–16
    const stickers = pool.slice(0, draw);

    const n = stickers.length;
    const cols = Math.max(3, Math.round(Math.sqrt(n * 0.9)));
    const rows = Math.ceil(n / cols);

    // Shuffle which cell each sticker lands in.
    const cells = [...Array(cols * rows).keys()];
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [cells[i], cells[j]] = [cells[j]!, cells[i]!];
    }

    const cw = 100 / cols;
    const ch = 100 / rows;
    const items = stickers.map<Placed>((st, i) => {
        const cell = cells[i]!;
        const col = cell % cols;
        const row = Math.floor(cell / cols);
        const jx = (rnd() - 0.5) * cw * 0.45;
        const jy = (rnd() - 0.5) * ch * 0.45;
        return {
            sticker: st,
            x: (col + 0.5) * cw + jx,
            y: (row + 0.5) * ch + jy,
            rot: (rnd() - 0.5) * 34,
            scale: 0.78 + rnd() * 0.32,
        };
    });

    return { cols, rows, items };
}
