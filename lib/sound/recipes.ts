/*
 * PD sound layer — the five locked recipes (Brendon, 2026-07-20).
 *
 * Pure data, no Web Audio here: each sound is a list of synth voices the
 * engine renders sample-by-sample. Everything is generated — no audio
 * files ship, ever. The set Brendon approved from the WAV rounds:
 *   chime   — mint success (five-note ascending run)
 *   sparkle — achievement unlock (four-note rising resolve + glitter)
 *   tick    — settings toggle flip (v1: dry 25ms click)
 *   coin    — your piece sold (v2: two bright metallic taps + glitter)
 *   seal    — offer/trade accepted (two rising bells)
 *   nudge   — any other ping landing (two soft taps)
 *   clunk   — a mint that failed (two low metal taps)
 *   tuck    — added to your wishlist (one soft rounded rise)
 * Two swaps on 2026-07-31 (Brendon): the mint traded with the accept, then
 * with the achievement — so the bloom ended up on the achievement.
 * nudge/clunk/tuck were chosen the same day from the audition page.
 * The v2 chime/sparkle/tick variants and boink/ping-pop were REJECTED —
 * do not resurrect them.
 */

export interface SoundVoice {
    /** start offset in seconds */
    at: number;
    /** voice length in seconds */
    dur: number;
    /** start frequency (Hz) */
    f0: number;
    /** glide target frequency — omitted = no glide */
    f1?: number;
    /** glide speed (exponential approach rate) */
    glide?: number;
    /** harmonic stack: [multiple, amplitude][] */
    partials: [number, number][];
    gain: number;
    /** attack seconds (default 0.004) */
    attack?: number;
    /** exponential decay rate (default 6) */
    tail?: number;
    /** slow phase wobble rate in Hz (the v1 "detune" vibrato) */
    wobble?: number;
    /** detuned twin partial at ×1.006 (the v2 sparkle sheen) */
    shimmer?: boolean;
}

export interface SoundRecipe {
    /** total render length in seconds */
    dur: number;
    voices: SoundVoice[];
}

export type SoundName =
    | 'chime' | 'sparkle' | 'tick' | 'coin' | 'seal'
    | 'nudge' | 'clunk' | 'tuck';

const BELL: [number, number][] = [[1, 1], [2, 0.35], [4, 0.12]];
const METAL: [number, number][] = [[1, 1], [2.76, 0.4], [5.4, 0.15]];
const METAL_HI: [number, number][] = [[1, 1], [2.76, 0.35], [5.4, 0.12]];
const GLASS: [number, number][] = [[1, 1], [3, 0.2], [5.4, 0.08]];
const SINE: [number, number][] = [[1, 1]];
const RUBBER: [number, number][] = [[1, 1], [2, 0.22], [3, 0.08]];

/* Deterministic PRNG for the glitter clouds — same seeds as the approved
   WAV renders, so what ships is byte-for-byte what Brendon heard. */
function mulberry32(seed: number): () => number {
    return function () {
        seed |= 0;
        seed = (seed + 0x6d2b79f5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const TWINKLE_HI = [2637, 3136, 3520, 3951, 4699]; // high E-major pentatonic

function glitter(
    seed: number, at: number, span: number, count: number, gain: number
): SoundVoice[] {
    const rnd = mulberry32(seed);
    const out: SoundVoice[] = [];
    for (let i = 0; i < count; i++) {
        out.push({
            at: at + rnd() * span,
            dur: 0.10 + rnd() * 0.12,
            f0: TWINKLE_HI[Math.floor(rnd() * TWINKLE_HI.length)],
            partials: [[1, 1], [2, 0.15]],
            gain: gain * (0.5 + rnd() * 0.5),
            shimmer: true,
            attack: 0.002,
            tail: 8,
        });
    }
    return out;
}

export const SOUND_RECIPES: Record<SoundName, SoundRecipe> = {
    // chime — the mint: five-note ascending pentatonic run, soft wobble.
    // (Swapped with sparkle 2026-07-31.)
    chime: {
        dur: 0.85,
        voices: [
            { at: 0.00, dur: 0.30, f0: 880.00, partials: SINE, gain: 0.7, wobble: 6, tail: 8 },
            { at: 0.06, dur: 0.30, f0: 1108.73, partials: SINE, gain: 0.7, wobble: 6, tail: 8 },
            { at: 0.12, dur: 0.32, f0: 1318.51, partials: SINE, gain: 0.75, wobble: 6, tail: 8 },
            { at: 0.18, dur: 0.36, f0: 1760.00, partials: SINE, gain: 0.8, wobble: 6, tail: 7 },
            { at: 0.24, dur: 0.50, f0: 2217.46, partials: BELL, gain: 0.9, wobble: 6, tail: 6 },
        ],
    },
    // sparkle — the achievement: a rising four-note resolve that blooms into
    // glitter. (Swapped with chime 2026-07-31.)
    sparkle: {
        dur: 1.25,
        voices: [
            { at: 0.00, dur: 0.40, f0: 523.25, partials: BELL, gain: 0.8, shimmer: true, tail: 6 },
            { at: 0.10, dur: 0.45, f0: 659.26, partials: BELL, gain: 0.85, shimmer: true, tail: 6 },
            { at: 0.20, dur: 0.60, f0: 783.99, partials: BELL, gain: 0.9, shimmer: true, tail: 5 },
            { at: 0.30, dur: 0.85, f0: 1046.50, partials: GLASS, gain: 1.0, shimmer: true, tail: 4 },
            ...glitter(13, 0.40, 0.45, 8, 0.22),
        ],
    },
    // v1 toggle tick — one dry 25ms click with a bright transient.
    tick: {
        dur: 0.08,
        voices: [
            { at: 0, dur: 0.025, f0: 1800, partials: SINE, gain: 1.0, attack: 0.001, tail: 9 },
            { at: 0, dur: 0.010, f0: 3600, partials: SINE, gain: 0.35, attack: 0.0005, tail: 10 },
        ],
    },
    // coin — the sale: two bright metallic taps, octave hop, small glitter.
    coin: {
        dur: 0.85,
        voices: [
            { at: 0.00, dur: 0.18, f0: 1975.53, partials: METAL, gain: 0.9, shimmer: true, attack: 0.001, tail: 7 },
            { at: 0.09, dur: 0.55, f0: 2637.02, partials: METAL_HI, gain: 1.0, shimmer: true, attack: 0.001, tail: 5 },
            ...glitter(5, 0.18, 0.25, 5, 0.2),
        ],
    },
    // seal — deal done: E5 then B5, warm bells, nothing else.
    // (Swapped with chime 2026-07-31.)
    seal: {
        dur: 0.75,
        voices: [
            { at: 0.00, dur: 0.45, f0: 659.26, partials: BELL, gain: 0.9, tail: 7 },
            { at: 0.09, dur: 0.55, f0: 987.77, partials: BELL, gain: 1.0, tail: 6 },
        ],
    },
    // nudge — a ping lands: two soft taps, close together (Brendon, 2026-07-31).
    // The most-heard blip on the site, so it stays small and never bright.
    nudge: {
        dur: 0.24,
        voices: [
            { at: 0.000, dur: 0.10, f0: 1046.50, partials: SINE, gain: 0.75, attack: 0.003, tail: 9 },
            { at: 0.065, dur: 0.16, f0: 1318.51, partials: SINE, gain: 0.90, attack: 0.003, tail: 8 },
        ],
    },
    // clunk — it didn't go through: two low metal taps, the second lower.
    clunk: {
        dur: 0.30,
        voices: [
            { at: 0.00, dur: 0.13, f0: 420, partials: METAL, gain: 1.0, attack: 0.001, tail: 8 },
            { at: 0.09, dur: 0.19, f0: 300, partials: METAL, gain: 0.8, attack: 0.001, tail: 7 },
        ],
    },
    // tuck — onto your wishlist: one soft rounded rise, pocketing it.
    tuck: {
        dur: 0.15,
        voices: [
            { at: 0, dur: 0.11, f0: 520, f1: 880, glide: 38, partials: RUBBER, gain: 1.0, attack: 0.002, tail: 8 },
        ],
    },
};

/**
 * Render a recipe to raw samples — the same math the WAV approval rounds
 * used. Exported so the engine (and tests) share one renderer.
 *
 * Two doors: `renderRecipe` levels the result to a fixed peak, which is what
 * a one-shot blip wants. `renderRaw` leaves the level alone, which is what
 * theme music needs — it is rendered a block at a time, and levelling each
 * block on its own would make the loudness lurch between them.
 */
export function renderRaw(recipe: SoundRecipe, sampleRate: number): Float32Array {
    const n = Math.ceil(recipe.dur * sampleRate);
    const buf = new Float32Array(n);
    for (const v of recipe.voices) {
        const start = Math.floor(v.at * sampleRate);
        const len = Math.ceil(v.dur * sampleRate);
        const f1 = v.f1 ?? v.f0;
        const k = v.glide ?? 18;
        const attack = v.attack ?? 0.004;
        const tail = v.tail ?? 6;
        let phase = 0;
        for (let i = 0; i < len && start + i < n; i++) {
            const t = i / sampleRate;
            const f = f1 + (v.f0 - f1) * Math.exp(-k * t);
            phase += (2 * Math.PI * f) / sampleRate;
            const wob = v.wobble ? Math.sin(2 * Math.PI * v.wobble * t) : 0;
            let s = 0;
            for (const [mult, amp] of v.partials) {
                s += amp * Math.sin(phase * mult + wob);
                if (v.shimmer) s += amp * 0.5 * Math.sin(phase * mult * 1.006);
            }
            const a = t < attack ? t / attack : 1;
            buf[start + i] += v.gain * s * a * Math.exp(-tail * (t / v.dur));
        }
    }
    return buf;
}

export function renderRecipe(recipe: SoundRecipe, sampleRate: number): Float32Array {
    const buf = renderRaw(recipe, sampleRate);
    let peak = 0;
    for (let i = 0; i < buf.length; i++) peak = Math.max(peak, Math.abs(buf[i]));
    if (peak > 0) {
        const norm = 0.707 / peak;
        for (let i = 0; i < buf.length; i++) buf[i] *= norm;
    }
    return buf;
}
