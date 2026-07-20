/*
 * PingArt ⎀ — the daily ascii transmission (Brendon, 2026-07-20; his name).
 *
 * One abstract text artwork per platform day, the same piece for every
 * subscriber — a Tabstract-style composition delivered as a native push.
 * $0 forever: no model, no fetch. The Montreal day-key seeds the art
 * engines' own mulberry32 (Rule #0 — the wallet-mark wave math at
 * transmission scale), so the day's piece is identical for everyone and
 * reproducible forever.
 *
 * Block-shade ramp on purpose: native notifications render in the system
 * font (proportional), where ░▒▓█ hold their width and the piece survives;
 * a letterform ramp would wobble off-grid.
 */

import { mulberry32, hashString } from '../art/rng';

const RAMP = ' ░▒▓█';

export const PINGART_COLS = 16;
export const PINGART_ROWS = 4;

export interface PingArtPiece {
    lines: string[];
    /** The Montreal day key ('YYYY-MM-DD') the piece belongs to. */
    day: string;
}

/** The day's transmission — pure function of the Montreal day key. */
export function buildPingArt(dayKey: string): PingArtPiece {
    const rand = mulberry32(hashString(`pingart:${dayKey}`));

    /* Three seeded interference waves — the wallet-mark's carve, smaller. */
    const waves = Array.from({ length: 3 }, () => ({
        fx: 0.5 + rand() * 2.4,
        fy: 0.5 + rand() * 2.4,
        phase: rand() * Math.PI * 2,
        swirl: (rand() - 0.5) * 2.6,
    }));

    const lines: string[] = [];
    for (let y = 0; y < PINGART_ROWS; y++) {
        let line = '';
        for (let x = 0; x < PINGART_COLS; x++) {
            const nx = (x / (PINGART_COLS - 1)) * 2 - 1;
            const ny = (y / (PINGART_ROWS - 1)) * 2 - 1;
            let v = 0;
            for (const w of waves) {
                v += Math.sin(nx * w.fx * Math.PI + ny * w.swirl + w.phase)
                   * Math.cos(ny * w.fy * Math.PI - nx * w.swirl);
            }
            const t = Math.min(1, Math.max(0, (v / 3 + 1) / 2));
            line += RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
        }
        lines.push(line);
    }
    return { lines, day: dayKey };
}
