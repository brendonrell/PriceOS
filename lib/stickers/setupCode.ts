/**
 * Sticker Setup Code — a self-contained encoder/decoder for the hero sticker
 * ARRANGEMENT look, modelled exactly on the Ambient Code (its own little world,
 * separate from the main Setup Code). Carries only how your stickers lay out:
 * layout, rows, align, tilt, width, flip. Never touches which stickers you own.
 *
 * Format (no dashes, always starts with STCKR):
 *
 *   STCKR{arrange}{rows}{align}{tilt}{width}{flip}
 *
 * Each field is one character — the option's index in its list (A=0, B=1, …).
 * A full code is 10 characters. Decoding is forgiving on case/whitespace, and
 * a short/old code fills any missing tail with the defaults.
 */

import type { Arrange, Tilt, Rows, Align } from './heroPrefs';

export const ARRANGE_IDS: ReadonlyArray<Arrange> = ['spread', 'row', 'stack', 'scatter', 'fill', 'collage'];
export const ROW_IDS: ReadonlyArray<Rows> = [1, 2];
export const ALIGN_IDS: ReadonlyArray<Align> = ['left', 'center', 'right'];
export const TILT_IDS: ReadonlyArray<Tilt> = ['flat', 'soft', 'jaunty'];

export interface StickerLook {
    arrange: Arrange;
    rows: Rows;
    align: Align;
    tilt: Tilt;
    expand: boolean;
    flip: boolean;
}

const PREFIX = 'STCKR';
const A = 'A'.charCodeAt(0);
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
    return PREFIX + letter(a) + letter(r) + letter(al) + letter(t) + letter(look.expand ? 1 : 0) + letter(look.flip ? 1 : 0);
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
    return {
        ok: true,
        look: {
            arrange,
            rows,
            align: pick(ALIGN_IDS, body[2], 'left'),
            tilt: pick(TILT_IDS, body[3], 'soft'),
            expand: index(body[4]) === 1,
            flip: index(body[5]) === 1,
        },
    };
}
