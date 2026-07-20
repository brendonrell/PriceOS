/*
 * THE WALLET MARK — deterministic ASCII gen art from the logged-in wallet
 * (the Command Stone's gen-art hand — docs/briefs/command-stone.md #11).
 *
 * $0 forever: no model, no fetch. The wallet address hashes into a seeded
 * RNG (the art engines' own mulberry32 — Rule #0) and three interference
 * waves carve a character field, the ASCII-artifact aesthetic (density
 * ramp glyphs on near-black) at stone-widget scale. Same wallet → same
 * mark, every time, on every device — it's THE wallet's mark, not a
 * reroll toy. Pure function, unit-testable.
 */

import { mulberry32, hashString } from '../art/rng';

/** Dark→bright density ramp — plain ASCII + middle dot, all Courier-safe. */
const RAMP = ' ·:;+=*#%@';

export interface WalletMark {
    lines: string[];
    cols: number;
    rows: number;
    /** The mark's own hue (0–359) — one accent colour per wallet. */
    hue: number;
}

export const MARK_COLS = 46;
export const MARK_ROWS = 18;

export function buildWalletMark(address: string): WalletMark {
    const rand = mulberry32(hashString(address.trim().toLowerCase()));

    /* Three seeded interference waves — frequency, phase, direction. */
    const waves = Array.from({ length: 3 }, () => ({
        fx: 0.6 + rand() * 2.2,
        fy: 0.6 + rand() * 2.2,
        phase: rand() * Math.PI * 2,
        swirl: (rand() - 0.5) * 2.4,
    }));
    const hue = Math.floor(rand() * 360);

    const lines: string[] = [];
    for (let y = 0; y < MARK_ROWS; y++) {
        let line = '';
        for (let x = 0; x < MARK_COLS; x++) {
            /* Normalized coords, centred — the mark composes around its
               middle like a carved seal. */
            const nx = (x / (MARK_COLS - 1)) * 2 - 1;
            const ny = (y / (MARK_ROWS - 1)) * 2 - 1;
            let v = 0;
            for (const w of waves) {
                v += Math.sin(nx * w.fx * Math.PI + ny * w.swirl + w.phase)
                   * Math.cos(ny * w.fy * Math.PI - nx * w.swirl);
            }
            /* −3…3 → 0…1, with a vignette so the edges breathe dark. */
            const vignette = 1 - Math.max(Math.abs(nx), Math.abs(ny)) * 0.55;
            const t = Math.min(1, Math.max(0, ((v / 3 + 1) / 2) * vignette));
            line += RAMP[Math.min(RAMP.length - 1, Math.floor(t * RAMP.length))];
        }
        lines.push(line);
    }
    return { lines, cols: MARK_COLS, rows: MARK_ROWS, hue };
}
