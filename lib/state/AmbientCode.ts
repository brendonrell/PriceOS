/**
 * Ambient Code — a self-contained encoder/decoder for the Ambient Light
 * options, totally separate from the main Setup Code / Workspaces system.
 *
 * Ambient Light is its own little world: these codes carry ONLY the four
 * ambient options (palette, pattern, speed, dim) and never touch colorway,
 * sort, notifs, spells, or tape. The main Setup Code likewise never carries
 * ambient state.
 *
 * Format (simple, no dashes, always starts with AMBI):
 *
 *   AMBI{palette}{pattern}{speed}{dim}{dim}
 *
 * palette / pattern / speed are one character each — the option's index in
 * its list below (A=0, B=1, …). Dim is a 0–100 percentage encoded as TWO
 * base-36 characters (so the slider value rides in the code), zero-padded.
 * An Ambient Code is therefore 9 characters:
 *
 *   AMBIAAB1O  → aurora · wave · pulse-speed… etc, dim 60%
 *   AMBIGEC2S  → neon   · sweep · fast · dim 100%
 *
 * Legacy codes (8 chars, single-letter dim A–F from before the slider) still
 * decode: the lone dim letter maps onto its old preset percentage.
 *
 * Decoding is forgiving on case/whitespace but strict on shape.
 */

export type Palette =
    | 'aurora' | 'sunset' | 'ocean' | 'lava' | 'forest' | 'mono'
    | 'neon' | 'gold' | 'ice' | 'ultra' | 'candy' | 'rose'
    /* Hidden — never shown as chips; only reached via the secret long-press. */
    | 'prism' | 'petey'
    /* Hidden — no chip and no documented entry point. */
    | 'spectrum' | 'nova';
export type Pattern = 'wave' | 'pulse' | 'breathe' | 'solid' | 'sweep' | 'ripple' | 'flicker' | 'strobe';
export type Speed = 'slow' | 'med' | 'fast';

export interface AmbientOpts {
    palette: Palette;
    pattern: Pattern;
    speed: Speed;
    /** Page-dim strength, 0 (off) – 100 (blackout). */
    dim: number;
}

// ── Ordered ID lists — index = encoded character (A=0, B=1, …). ──────
// These are the single source of truth for both the code and the menu
// chip order. Appending a new option is safe; reordering breaks old codes.
export const PALETTE_IDS: ReadonlyArray<Palette> = [
    'aurora', 'sunset', 'ocean', 'lava', 'forest', 'mono',
    'neon', 'gold', 'ice', 'ultra', 'candy', 'rose',
    'prism', 'petey', 'spectrum', 'nova',
];
export const PATTERN_IDS: ReadonlyArray<Pattern> = [
    'wave', 'pulse', 'breathe', 'solid', 'sweep', 'ripple', 'flicker', 'strobe',
];
export const SPEED_IDS: ReadonlyArray<Speed> = ['slow', 'med', 'fast'];

/** Legacy single-letter dim (A–F) → percentage, for decoding old 8-char codes
 *  written before dim became a slider. Order matches the old preset list. */
const LEGACY_DIM_PCT: ReadonlyArray<number> = [0, 28, 46, 60, 74, 90];

const PREFIX = 'AMBI';
const A = 'A'.charCodeAt(0);

/** index → uppercase letter (0 → 'A'). Lists are well under 26 long. */
const letter = (i: number): string => String.fromCharCode(A + i);
/** uppercase letter → index, or -1 if out of A–Z range. */
const index = (ch: string): number => ch.charCodeAt(0) - A;

export const clampDim = (n: number): number =>
    Math.max(0, Math.min(100, Math.round(Number.isFinite(n) ? n : 0)));

export interface AmbientDecodeResult {
    ok: boolean;
    opts?: AmbientOpts;
    error?: string;
}

/* ────────────────────────────────────────────────────────────── */
/*  ENCODE                                                         */
/* ────────────────────────────────────────────────────────────── */

/** Build the Ambient Code from the current options. Pure function. */
export function encodeAmbientCode(opts: AmbientOpts): string {
    const p = Math.max(0, PALETTE_IDS.indexOf(opts.palette));
    const t = Math.max(0, PATTERN_IDS.indexOf(opts.pattern));
    const s = Math.max(0, SPEED_IDS.indexOf(opts.speed));
    const dim = clampDim(opts.dim).toString(36).toUpperCase().padStart(2, '0');
    return PREFIX + letter(p) + letter(t) + letter(s) + dim;
}

/* ────────────────────────────────────────────────────────────── */
/*  DECODE                                                         */
/* ────────────────────────────────────────────────────────────── */

/** Decode an Ambient Code into options. Does NOT apply — caller decides. */
export function decodeAmbientCode(raw: string): AmbientDecodeResult {
    // Forgiving on case/whitespace; strip anything that isn't alphanumeric.
    const s = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!s.startsWith(PREFIX)) return { ok: false, error: 'Missing AMBI prefix' };

    const body = s.slice(PREFIX.length);
    if (body.length < 4) return { ok: false, error: 'Code too short' };

    const palette = PALETTE_IDS[index(body[0])];
    const pattern = PATTERN_IDS[index(body[1])];
    const speed = SPEED_IDS[index(body[2])];

    let dim: number;
    const dimPart = body.slice(3);
    if (dimPart.length >= 2) {
        const parsed = parseInt(dimPart.slice(0, 2), 36);
        if (!Number.isFinite(parsed)) return { ok: false, error: 'Bad dim in code' };
        dim = clampDim(parsed);
    } else {
        // Legacy single-letter dim (A–F).
        dim = LEGACY_DIM_PCT[index(dimPart)] ?? -1;
        if (dim < 0) return { ok: false, error: 'Bad dim in code' };
    }

    if (!palette || !pattern || !speed) {
        return { ok: false, error: 'Unknown option in code' };
    }
    return { ok: true, opts: { palette, pattern, speed, dim } };
}
