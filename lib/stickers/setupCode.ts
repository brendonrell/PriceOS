/**
 * Sticker Setup Code — a self-contained encoder/decoder for the hero sticker
 * ARRANGEMENT look, modelled exactly on the Ambient Code (its own little world,
 * separate from the main Setup Code). Carries only how your stickers lay out:
 * layout, rows, align, tilt, width, flip, density, border — AND the generative
 * seed, so a code brings back the EXACT picture, not just the settings. (The
 * seed was the missing piece: without it a shuffle destroyed a look forever —
 * Brendon, 2026-07-10.) Never touches which stickers you own.
 *
 * Format (no dashes, always starts with STCKR):
 *
 *   STCKR{arrange}{rows}{align}{tilt}{width}{flip}{density}{border}{seed×6}
 *
 * Option fields are one character — the option's index in its list (A=0, B=1,
 * …). The seed is 6 chars of base-36. Decoding is forgiving on case/whitespace,
 * and a short/old code fills any missing tail with the defaults (an old 6-field
 * code still applies; it just doesn't carry a seed).
 */

import type { Arrange, Tilt, Rows, Align, Border } from './heroPrefs';

/* Positional — a saved/shared Setup Code encodes this as a single letter
   INDEX, not the id itself, so the array's positions are load-bearing for
   every code already out there. Row/Scatter/Fill are gone from the Arrange
   type (replaced by Flow — Brendon, 2026-08-30), but their old slots (1, 3,
   4) can't just be deleted or Stack/Collage/Slapped's indices — and every
   code that encodes them — would shift and decode wrong. Those three slots
   now decode to 'flow' instead, so old codes still resolve to something,
   just the new mode instead of a jitter type nothing renders anymore.
   New codes always encode Flow at index 1 (indexOf finds the first match). */
export const ARRANGE_IDS: ReadonlyArray<Arrange> = ['spread', 'flow', 'stack', 'flow', 'flow', 'collage', 'slapped'];
export const ROW_IDS: ReadonlyArray<Rows> = [1, 2, 3];
export const ALIGN_IDS: ReadonlyArray<Align> = ['left', 'center', 'right'];
export const TILT_IDS: ReadonlyArray<Tilt> = ['flat', 'soft', 'jaunty'];
export const BORDER_IDS: ReadonlyArray<Border> = ['off', 'white', 'bold'];

export interface StickerLook {
    arrange: Arrange;
    rows: Rows;
    align: Align;
    tilt: Tilt;
    expand: boolean;
    flip: boolean;
    density: number;
    border: Border;
    /** The generative roll. Present → the exact picture; absent (old codes,
     *  partial pastes) → the current seed is left alone. */
    seed?: number;
}

const PREFIX = 'STCKR';
const A = 'A'.charCodeAt(0);
const SEED_LEN = 6;
const SEED_SPACE = 36 ** SEED_LEN; // ~2.17e9 — covers the (rand*1e9)|0 seeds
const letter = (i: number): string => String.fromCharCode(A + Math.max(0, i));
const index = (ch: string | undefined): number => (ch ? ch.charCodeAt(0) - A : -1);
const pick = <T>(list: ReadonlyArray<T>, ch: string | undefined, fallback: T): T => {
    const v = list[index(ch)];
    return v === undefined ? fallback : v;
};

export interface StickerDecodeResult { ok: boolean; look?: StickerLook; error?: string; }

/** Build the Sticker Setup Code from a look. Pure. */
export function encodeStickerCode(look: StickerLook): string {
    const a = Math.max(0, ARRANGE_IDS.indexOf(look.arrange));
    const r = Math.max(0, ROW_IDS.indexOf(look.rows));
    const al = Math.max(0, ALIGN_IDS.indexOf(look.align));
    const t = Math.max(0, TILT_IDS.indexOf(look.tilt));
    const d = Math.max(0, Math.min(2, look.density | 0));
    const b = Math.max(0, BORDER_IDS.indexOf(look.border));
    const seed = ((look.seed ?? 1) >>> 0) % SEED_SPACE;
    const seed36 = seed.toString(36).toUpperCase().padStart(SEED_LEN, '0');
    return PREFIX
        + letter(a) + letter(r) + letter(al) + letter(t)
        + letter(look.expand ? 1 : 0) + letter(look.flip ? 1 : 0)
        + letter(d) + letter(b)
        + seed36;
}

/** Decode a Sticker Setup Code. Does NOT apply — caller decides. */
export function decodeStickerCode(raw: string): StickerDecodeResult {
    const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!s.startsWith(PREFIX)) return { ok: false, error: 'Missing STCKR prefix' };
    const body = s.slice(PREFIX.length);
    if (body.length < 4) return { ok: false, error: 'Code too short' };
    const arrange = ARRANGE_IDS[index(body[0])];
    const rows = ROW_IDS[index(body[1])];
    if (!arrange || rows === undefined) return { ok: false, error: 'Unknown option in code' };
    let seed: number | undefined;
    if (body.length >= 8 + SEED_LEN) {
        const parsed = parseInt(body.slice(8, 8 + SEED_LEN), 36);
        if (Number.isFinite(parsed)) seed = parsed;
    }
    return {
        ok: true,
        look: {
            arrange,
            rows,
            align: pick(ALIGN_IDS, body[2], 'left'),
            tilt: pick(TILT_IDS, body[3], 'soft'),
            expand: index(body[4]) === 1,
            flip: index(body[5]) === 1,
            density: Math.max(0, Math.min(2, index(body[6]) < 0 ? 0 : index(body[6]))),
            border: pick(BORDER_IDS, body[7], 'off'),
            ...(seed !== undefined ? { seed } : {}),
        },
    };
}
