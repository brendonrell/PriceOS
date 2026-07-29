/*
 * lib/tags/formula.ts — FORMULA (Brendon, 2026-07-29).
 *
 * A user's own generative art project, drawn in Unicode and worn as a tag.
 * Numbered, never named — Formula #1 … #22, numbered by position on the shelf
 * exactly like Albums.
 *
 * ⛔ FORMULA IS NOT TABSTRACT. It takes its inspiration from Tabstract (six
 * sets, six glyphs, redrawn every load) and then goes its own way: its own
 * vocabulary of ten sets that Tabstract does not have, a length, a weave, and
 * a spacing — all chosen by the owner from buttons in the picker row. Never
 * import Tabstract's sets here, and never let Formula's sets leak back there.
 *
 * IT REDRAWS every page load (Brendon's call) — a Formula is a living thing,
 * not a string frozen at save. The roll arrives from the client AFTER mount
 * (see useFormulaRoll) so the server's first paint can never disagree with the
 * browser's; roll 0 is the deterministic draw both sides agree on.
 *
 * Every glyph below is plain text presentation — no character here carries
 * Emoji_Presentation, so none can render as a colour emoji on iOS.
 */

export const MAX_FORMULAS = 22;

/* ── THE PANTRY — the ten ingredient sets ──────────────────────────────── */
export const FORMULA_SETS: ReadonlyArray<{ name: string; glyphs: readonly string[] }> = [
    { name: 'Sediment',  glyphs: ['⎺', '⎻', '⎼', '⎽', '─', '━'] },
    { name: 'Shading',   glyphs: ['░', '▒', '▓', '█', '▄', '▀'] },
    { name: 'Rain',      glyphs: ['╱', '╲', '╳', '⟋', '⟍', '⧸', '⧹'] },
    { name: 'Circuitry', glyphs: ['┼', '┽', '┾', '┿', '╀', '╁', '╂'] },
    { name: 'Orbit',     glyphs: ['◜', '◝', '◞', '◟', '◠', '◡'] },
    { name: 'Aperture',  glyphs: ['◴', '◵', '◶', '◷'] },
    { name: 'Halftone',  glyphs: ['▖', '▗', '▘', '▙', '▚', '▛', '▜', '▝', '▞', '▟'] },
    { name: 'Static',    glyphs: ['⠿', '⣿', '⠶', '⢿', '⡿', '⣻'] },
    { name: 'Ladder',    glyphs: ['⌸', '⌹', '⌺', '⌻', '⌼'] },
    { name: 'Ogham',     glyphs: ['ᚁ', 'ᚂ', 'ᚃ', 'ᚄ', 'ᚅ'] },
];

/* ── THE DIALS ─────────────────────────────────────────────────────────── */
export const FORMULA_LENGTHS = [4, 6, 8, 10] as const;

/** 0 Scatter · 1 Alternate · 2 Run · 3 Mirror. */
export const FORMULA_WEAVES = ['Scatter', 'Alternate', 'Run', 'Mirror'] as const;

/** Tight, or hair-spaced so each glyph stands on its own. */
const HAIR = ' ';

export interface Formula {
    /** Indices into FORMULA_SETS — the ingredients in the mix. */
    sets: number[];
    /** One of FORMULA_LENGTHS. */
    len: number;
    /** Index into FORMULA_WEAVES. */
    weave: number;
    /** Hair-spaced between glyphs. */
    spaced: boolean;
    /** Worn on the profile right now. */
    on: boolean;
}

/** A fresh Formula: one set, six long, scattered, tight — the plain start. */
export function newFormula(): Formula {
    return { sets: [0], len: 6, weave: 0, spaced: false, on: true };
}

/* ── validation — everything crossing the wire runs through this ───────── */

function cleanSets(v: unknown): number[] {
    if (!Array.isArray(v)) return [0];
    const out: number[] = [];
    for (const n of v) {
        const i = Math.trunc(Number(n));
        if (Number.isFinite(i) && i >= 0 && i < FORMULA_SETS.length && !out.includes(i)) out.push(i);
    }
    return out.length ? out.sort((a, b) => a - b) : [0];
}

export function cleanFormula(v: unknown): Formula | null {
    if (!v || typeof v !== 'object') return null;
    const o = v as Record<string, unknown>;
    const len = Math.trunc(Number(o.len));
    const weave = Math.trunc(Number(o.weave));
    return {
        sets: cleanSets(o.sets),
        len: (FORMULA_LENGTHS as readonly number[]).includes(len) ? len : 6,
        weave: Number.isFinite(weave) && weave >= 0 && weave < FORMULA_WEAVES.length ? weave : 0,
        spaced: o.spaced === true,
        on: o.on !== false,
    };
}

/** Validate a whole shelf. Anything unreadable is dropped, never guessed at. */
export function cleanFormulas(v: unknown): Formula[] {
    if (!Array.isArray(v)) return [];
    const out: Formula[] = [];
    for (const raw of v) {
        const f = cleanFormula(raw);
        if (f) out.push(f);
        if (out.length >= MAX_FORMULAS) break;
    }
    return out;
}

/* ── the draw ──────────────────────────────────────────────────────────── */

/** Small deterministic PRNG so one roll always yields the same string. */
function rng(seed: number): () => number {
    let s = (seed | 0) || 0x9e3779b9;
    return () => {
        s ^= s << 13; s |= 0;
        s ^= s >>> 17;
        s ^= s << 5; s |= 0;
        return ((s >>> 0) % 100000) / 100000;
    };
}

/**
 * Draw a Formula. `roll` changes on every page load — the same Formula with the
 * same roll always renders identically, which is what keeps a re-render from
 * flickering into a different piece mid-scroll.
 */
export function drawFormula(f: Formula, roll: number): string {
    const sets = f.sets.length ? f.sets : [0];
    const pools = sets.map((i) => FORMULA_SETS[i]?.glyphs ?? FORMULA_SETS[0].glyphs);
    const rand = rng(roll * 2654435761 + f.len * 131 + f.weave * 17 + sets.reduce((a, b) => a * 31 + b, 7));
    const pick = (pool: readonly string[]) => pool[Math.floor(rand() * pool.length)] ?? pool[0];

    const chars: string[] = [];
    switch (f.weave) {
        /* ALTERNATE — ping-pong through the chosen sets in order, so the mix
           reads as a rhythm rather than a soup. */
        case 1: {
            for (let i = 0; i < f.len; i++) chars.push(pick(pools[i % pools.length]));
            break;
        }
        /* RUN — a glyph repeats 1–3 times before the next is drawn, which is
           what turns a row of marks into texture. */
        case 2: {
            while (chars.length < f.len) {
                const g = pick(pools[Math.floor(rand() * pools.length)]);
                const n = 1 + Math.floor(rand() * 3);
                for (let i = 0; i < n && chars.length < f.len; i++) chars.push(g);
            }
            break;
        }
        /* MIRROR — draw half, reflect it. Odd lengths keep a single pivot. */
        case 3: {
            const half = Math.ceil(f.len / 2);
            for (let i = 0; i < half; i++) chars.push(pick(pools[Math.floor(rand() * pools.length)]));
            for (let i = f.len - half - 1; i >= 0; i--) chars.push(chars[i]);
            break;
        }
        /* SCATTER — pure draw from the whole mix. */
        default: {
            for (let i = 0; i < f.len; i++) chars.push(pick(pools[Math.floor(rand() * pools.length)]));
        }
    }
    return chars.join(f.spaced ? HAIR : '');
}

/** "Sediment + Rain · 6 · Mirror" — the plain-text read, for titles and toasts. */
export function formulaBlurb(f: Formula): string {
    const names = f.sets.map((i) => FORMULA_SETS[i]?.name).filter(Boolean).join(' + ');
    return `${names} · ${f.len} · ${FORMULA_WEAVES[f.weave]}${f.spaced ? ' · Spaced' : ''}`;
}
