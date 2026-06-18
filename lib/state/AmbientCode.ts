/**
 * Ambient Code — a self-contained encoder/decoder for the Ambient Light
 * options, totally separate from the main Setup Code / Workspaces system.
 *
 * Ambient Light is its own little world: these codes carry the core look
 * (palette, pattern, speed, dim) PLUS the two shareable light-FX sections
 * (rays, weather) — and never touch colorway, sort, notifs, spells, or tape.
 * The main Setup Code likewise never carries ambient state.
 *
 * Format (simple, no dashes, always starts with AMBI):
 *
 *   AMBI{palette}{pattern}{speed}{dim}{dim}{rays}{weather}
 *
 * palette / pattern / speed / rays / weather are one character each — the
 * option's index in its list below (A=0, B=1, …). Dim is a 0–100 percentage
 * encoded as TWO base-36 characters (so the slider value rides in the code),
 * zero-padded. A full Ambient Code is therefore 11 characters:
 *
 *   AMBIAAB1OAA  → aurora · wave · slow · dim 60% · rays off · weather clear
 *   AMBIGEC2SCB  → neon   · sweep · fast · dim 100% · rays halo · weather rain
 *
 * The two FX chars are OPTIONAL on decode — older 9-char codes (no rays/
 * weather) and legacy 8-char codes (single-letter dim A–F) still decode, the
 * missing tail defaulting to rays=off / weather=clear. Atmosphere (glow/reach/
 * spread/haze) is per-device calibration and is deliberately NOT in the code.
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
export type Pattern = 'wave' | 'pulse' | 'breathe' | 'solid' | 'sweep' | 'ripple' | 'flicker' | 'strobe' | 'drift' | 'throb' | 'shimmer' | 'lightning';
export type Speed = 'slow' | 'med' | 'fast' | 'turbo';

/* Atmosphere (3rd menu page) — the light's physical character. Persisted +
   DB-backed but NOT carried in the shareable code (the code stays the core
   look: palette/pattern/speed/dim). */
export type Glow = 'dim' | 'soft' | 'med' | 'bright';
export type Reach = 'near' | 'mid' | 'far' | 'flood';
export type Spread = 'narrow' | 'mid' | 'wide';
export type Haze = 'crisp' | 'soft' | 'dreamy';

/* Light FX (3rd menu page, bottom half) — shareable mood, so UNLIKE the
   atmosphere block these DO ride the code (appended after dim). */
export type Rays = 'off' | 'shafts' | 'beams' | 'halo';
/* "Nature" in the menu — ambient floating particles in the glow. */
export type Weather = 'clear' | 'fireflies' | 'pollen' | 'petals' | 'spores';

export interface AmbientOpts {
    palette: Palette;
    pattern: Pattern;
    speed: Speed;
    /** Page-dim strength, 0 (off) – 100 (blackout). */
    dim: number;
    /** Brightness of the light spill. */
    glow?: Glow;
    /** How far the spill washes down the page. */
    reach?: Reach;
    /** How wide the light fans across the screen. */
    spread?: Spread;
    /** Edge softness of the light (blur). */
    haze?: Haze;
    /** Volumetric light shafts fanning down from the bar. Shared in the code. */
    rays?: Rays;
    /** Drifting particles inside the glow. Shared in the code. */
    weather?: Weather;
    /** Hidden egg — the bar balled up into an orb. Persisted, never shared. */
    sphere?: boolean;
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
    'wave', 'pulse', 'breathe', 'solid', 'sweep', 'ripple', 'flicker', 'strobe', 'drift', 'throb', 'shimmer', 'lightning',
];
export const SPEED_IDS: ReadonlyArray<Speed> = ['slow', 'med', 'fast', 'turbo'];
export const RAYS_IDS: ReadonlyArray<Rays> = ['off', 'shafts', 'beams', 'halo'];
export const WEATHER_IDS: ReadonlyArray<Weather> = ['clear', 'fireflies', 'pollen', 'petals', 'spores'];

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
    const r = Math.max(0, RAYS_IDS.indexOf(opts.rays ?? 'off'));
    const w = Math.max(0, WEATHER_IDS.indexOf(opts.weather ?? 'clear'));
    return PREFIX + letter(p) + letter(t) + letter(s) + dim + letter(r) + letter(w);
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
    let tail = '';
    const dimPart = body.slice(3);
    if (dimPart.length >= 2) {
        const parsed = parseInt(dimPart.slice(0, 2), 36);
        if (!Number.isFinite(parsed)) return { ok: false, error: 'Bad dim in code' };
        dim = clampDim(parsed);
        tail = body.slice(5); // optional rays + weather chars
    } else {
        // Legacy single-letter dim (A–F) — no FX tail on those old codes.
        dim = LEGACY_DIM_PCT[index(dimPart)] ?? -1;
        if (dim < 0) return { ok: false, error: 'Bad dim in code' };
    }

    // Rays + weather are optional: a missing/unknown char falls back to the
    // first option (off / clear) so older + malformed codes still apply.
    const rays = pick(RAYS_IDS, tail[0], 'off');
    const weather = pick(WEATHER_IDS, tail[1], 'clear');

    if (!palette || !pattern || !speed) {
        return { ok: false, error: 'Unknown option in code' };
    }
    return { ok: true, opts: { palette, pattern, speed, dim, rays, weather } };
}

/** Map an optional code char to its option, falling back to a default when the
 *  char is absent or out of range. Keeps decode forgiving on the FX tail. */
function pick<T>(list: ReadonlyArray<T>, ch: string | undefined, fallback: T): T {
    if (!ch) return fallback;
    return list[index(ch)] ?? fallback;
}
