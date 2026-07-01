/*
 * Output derivations — every SECONDARY attribute we read off an Output's
 * primaries. All pure + deterministic: natal sign → element/modality/polarity/
 * ruler; mint moment → weekday/season/time-of-day/lunar phase; Fate reading →
 * hexagram number/name/glyph/trigrams/changing lines/transform; sampled
 * fingerprint → brightness/saturation/complexity bands + tone mood + colour
 * temperature + orientation.
 *
 * This is the SINGLE source of truth for these derivations, shared by the
 * capture routes (which persist them on `outputs`) and the UI (which computes
 * them live as the fallback until a row is filled) — so stored + computed can
 * never disagree.
 */

import { readOutputFate, type FateReading } from '../project/fate';

/* ── Natal sign → traits ─────────────────────────────────────────────── */

const ELEMENT: Record<string, string> = {
    Aries: 'Fire', Leo: 'Fire', Sagittarius: 'Fire',
    Taurus: 'Earth', Virgo: 'Earth', Capricorn: 'Earth',
    Gemini: 'Air', Libra: 'Air', Aquarius: 'Air',
    Cancer: 'Water', Scorpio: 'Water', Pisces: 'Water',
};
const MODALITY: Record<string, string> = {
    Aries: 'Cardinal', Cancer: 'Cardinal', Libra: 'Cardinal', Capricorn: 'Cardinal',
    Taurus: 'Fixed', Leo: 'Fixed', Scorpio: 'Fixed', Aquarius: 'Fixed',
    Gemini: 'Mutable', Virgo: 'Mutable', Sagittarius: 'Mutable', Pisces: 'Mutable',
};
const RULER: Record<string, string> = {
    Aries: 'Mars', Taurus: 'Venus', Gemini: 'Mercury', Cancer: 'Moon',
    Leo: 'Sun', Virgo: 'Mercury', Libra: 'Venus', Scorpio: 'Mars',
    Sagittarius: 'Jupiter', Capricorn: 'Saturn', Aquarius: 'Saturn', Pisces: 'Jupiter',
};

export function natalElement(sign: string): string { return ELEMENT[sign] ?? ''; }
export function natalModality(sign: string): string { return MODALITY[sign] ?? ''; }
/** Fire + Air = Yang (active); Earth + Water = Yin (receptive). */
export function natalPolarity(sign: string): string {
    const e = ELEMENT[sign];
    if (e === 'Fire' || e === 'Air') return 'Yang';
    if (e === 'Earth' || e === 'Water') return 'Yin';
    return '';
}
export function natalRuler(sign: string): string { return RULER[sign] ?? ''; }
/** Sun & Moon share an element → the chart reads "in harmony", else "in tension". */
export function natalHarmony(sun: string, moon: string): string {
    const a = ELEMENT[sun]; const b = ELEMENT[moon];
    if (!a || !b) return '';
    return a === b ? 'Harmonious' : 'Tension';
}

/* ── Mint moment → calendar / sky ────────────────────────────────────── */

const TZ = 'America/Montreal'; // PD's fixed civil clock (matches PriceDay + natal)

export function birthWeekday(ms: number): string {
    return new Intl.DateTimeFormat('en-US', { timeZone: TZ, weekday: 'long' }).format(new Date(ms));
}
function montrealHour(ms: number): number {
    const h = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', hour12: false }).format(new Date(ms));
    return Number(h) % 24;
}
function montrealMonth(ms: number): number {
    return Number(new Intl.DateTimeFormat('en-US', { timeZone: TZ, month: 'numeric' }).format(new Date(ms)));
}
export function birthTimeOfDay(ms: number): string {
    const h = montrealHour(ms);
    if (h >= 5 && h < 8) return 'Dawn';
    if (h >= 8 && h < 12) return 'Morning';
    if (h >= 12 && h < 14) return 'Midday';
    if (h >= 14 && h < 18) return 'Afternoon';
    if (h >= 18 && h < 21) return 'Dusk';
    return 'Night';
}
/** Northern-hemisphere season on the Montreal calendar. */
export function birthSeason(ms: number): string {
    const m = montrealMonth(ms);
    if (m === 12 || m <= 2) return 'Winter';
    if (m <= 5) return 'Spring';
    if (m <= 8) return 'Summer';
    return 'Autumn';
}

/* Lunar phase at the mint moment. Synodic month from a known new-moon epoch
   (2000-01-06 18:14 UT). 8 traditional phases + fractional illumination. */
const SYNODIC = 29.530588853;
const NEW_MOON_EPOCH = Date.UTC(2000, 0, 6, 18, 14);
export function lunarAgeDays(ms: number): number {
    const days = (ms - NEW_MOON_EPOCH) / 86400000;
    return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}
export function lunarPhase(ms: number): string {
    const a = lunarAgeDays(ms) / SYNODIC; // 0..1
    const i = Math.floor(a * 8 + 0.5) % 8;
    return [
        'New Moon', 'Waxing Crescent', 'First Quarter', 'Waxing Gibbous',
        'Full Moon', 'Waning Gibbous', 'Last Quarter', 'Waning Crescent',
    ][i];
}
export function lunarGlyph(ms: number): string {
    const a = lunarAgeDays(ms) / SYNODIC;
    const i = Math.floor(a * 8 + 0.5) % 8;
    /* Monochrome circle glyphs (no emoji on the app). Lit disc = white, dark
       disc = black; the fill grows new→full→new and the half-circles distinguish
       waxing (right-lit ◑) from waning (left-lit ◐).
       New · WaxCres · 1stQtr · WaxGib · Full · WanGib · LastQtr · WanCres */
    return ['●', '◕', '◑', '◔', '○', '◔', '◐', '◕'][i];
}
/** Illuminated fraction of the lunar disc, 0..1. */
export function lunarIllumination(ms: number): number {
    return (1 - Math.cos((2 * Math.PI * lunarAgeDays(ms)) / SYNODIC)) / 2;
}

/* ── Fate reading → hexagram detail ──────────────────────────────────── */

/* Trigram code (bit0 = bottom line, 1 = yang) → name + glyph + nature. */
const TRIGRAM: Record<number, { name: string; glyph: string; nature: string }> = {
    0b111: { name: 'Heaven', glyph: '☰', nature: 'The Creative' },
    0b011: { name: 'Lake', glyph: '☱', nature: 'The Joyous' },
    0b101: { name: 'Fire', glyph: '☲', nature: 'The Clinging' },
    0b001: { name: 'Thunder', glyph: '☳', nature: 'The Arousing' },
    0b110: { name: 'Wind', glyph: '☴', nature: 'The Gentle' },
    0b010: { name: 'Water', glyph: '☵', nature: 'The Abysmal' },
    0b100: { name: 'Mountain', glyph: '☶', nature: 'Keeping Still' },
    0b000: { name: 'Earth', glyph: '☷', nature: 'The Receptive' },
};
export function trigramName(code: number): string { return TRIGRAM[code]?.name ?? ''; }
export function trigramGlyph(code: number): string { return TRIGRAM[code]?.glyph ?? ''; }

export interface FateDetail {
    fate: string;
    hexagram: number;
    hexagramName: string;
    glyph: string;
    upper: string;       // upper trigram name
    upperGlyph: string;
    lower: string;       // lower trigram name
    lowerGlyph: string;
    changingLines: number[];
    changingCount: number;
    stable: boolean;     // no changing lines — a "locked" fate
    transformed: string | null; // the fate it becomes, if any line changes
}
export function fateDetail(slug: string, id: number): FateDetail {
    const r: FateReading = readOutputFate(slug, id);
    return {
        fate: r.fate,
        hexagram: r.primary.n,
        hexagramName: r.primary.name,
        glyph: r.glyph,
        upper: trigramName(r.primary.upper),
        upperGlyph: trigramGlyph(r.primary.upper),
        lower: trigramName(r.primary.lower),
        lowerGlyph: trigramGlyph(r.primary.lower),
        changingLines: r.changingLines,
        changingCount: r.changingLines.length,
        stable: r.changingLines.length === 0,
        transformed: r.transformed?.fate ?? null,
    };
}

/* ── Fingerprint scalars → bands / mood ──────────────────────────────── */

export function brightnessBand(v: number): string {
    if (v < 0.2) return 'Dark';
    if (v < 0.4) return 'Dim';
    if (v < 0.6) return 'Mid';
    if (v < 0.8) return 'Bright';
    return 'Luminous';
}
export function saturationBand(v: number): string {
    if (v < 0.15) return 'Muted';
    if (v < 0.35) return 'Soft';
    if (v < 0.6) return 'Balanced';
    if (v < 0.8) return 'Rich';
    return 'Vivid';
}
export function complexityBand(v: number): string {
    if (v < 0.2) return 'Minimal';
    if (v < 0.4) return 'Calm';
    if (v < 0.6) return 'Balanced';
    if (v < 0.8) return 'Detailed';
    return 'Busy';
}
/** A single evocative "tone" word from the brightness × saturation cross. */
export function toneMood(brightness: number, saturation: number): string {
    const dark = brightness < 0.45;
    const bright = brightness > 0.7;
    const vivid = saturation > 0.6;
    const muted = saturation < 0.3;
    if (dark && vivid) return 'Brooding';
    if (dark && muted) return 'Sombre';
    if (dark) return 'Moody';
    if (bright && vivid) return 'Electric';
    if (bright && muted) return 'Serene';
    if (bright) return 'Airy';
    if (vivid) return 'Bold';
    if (muted) return 'Hushed';
    return 'Balanced';
}
const WARM = new Set(['Hothurt', 'Red', 'Orange', 'Yellow', 'Brown', 'Cream', 'Magenta']);
const COOL = new Set(['Green', 'Blue', 'Purple', 'Moon']);
export function colorTemperature(bucket: string): string {
    if (WARM.has(bucket)) return 'Warm';
    if (COOL.has(bucket)) return 'Cool';
    return 'Neutral';
}

/* ── Fingerprint v2 scalars → bands (the deep look, 2026-07-01) ──────────
   Same single-source contract as the v1 bands above: the capture route
   denormalises these onto `outputs`, the UI computes them live as fallback. */

/** Distinct colour count (buckets ≥8% of pixels) → palette word. */
export function paletteBand(count: number): string {
    if (count <= 1) return 'Monochrome';
    if (count === 2) return 'Duotone';
    if (count === 3) return 'Trichrome';
    return 'Polychrome';
}
/** Luminance spread (p90 − p10, 0..1) → contrast word. */
export function contrastBand(v: number): string {
    if (v < 0.12) return 'Flat';
    if (v < 0.3) return 'Soft';
    if (v < 0.55) return 'Measured';
    if (v < 0.78) return 'Crisp';
    return 'Stark';
}
/** Warm share among chromatic pixels (0..1) → temperature word, finer than
 *  the bucket-derived colorTemperature. */
export function warmthBand(v: number): string {
    if (v < 0.15) return 'Cold';
    if (v < 0.42) return 'Cool';
    if (v < 0.58) return 'Split';
    if (v < 0.85) return 'Warm';
    return 'Molten';
}
/** Left↔right mirror similarity (0..1) → symmetry word. */
export function symmetryBand(v: number): string {
    if (v >= 0.9) return 'Mirrored';
    if (v >= 0.72) return 'Balanced';
    if (v >= 0.5) return 'Leaning';
    return 'Askew';
}
/** Flat / negative-space share (0..1) → air word. */
export function airBand(v: number): string {
    if (v >= 0.72) return 'Vast';
    if (v >= 0.5) return 'Airy';
    if (v >= 0.28) return 'Open';
    return 'Packed';
}
/** Fine-detail share (0..1) → texture word. */
export function textureBand(v: number): string {
    if (v < 0.18) return 'Smooth';
    if (v < 0.38) return 'Even';
    if (v < 0.6) return 'Textured';
    return 'Grainy';
}
/** Gravity direction → display phrase for the attribute tile. */
export function gravityWord(g: string): string {
    if (g === 'Low') return 'Sits Low';
    if (g === 'High') return 'Held High';
    if (g === 'Left') return 'Leans Left';
    if (g === 'Right') return 'Leans Right';
    return 'Centered';
}
/** Aspect bucket ('square' | 'wide' | 'tall') → orientation word. */
export function orientationOf(aspect: string | null, ratio?: number | null): string {
    if (aspect === 'wide') return 'Landscape';
    if (aspect === 'tall') return 'Portrait';
    if (aspect === 'square') return 'Square';
    if (ratio != null && isFinite(ratio)) {
        if (ratio > 1.15) return 'Landscape';
        if (ratio < 0.87) return 'Portrait';
        return 'Square';
    }
    return '';
}

/* A representative display hex for each colour bucket (for the swatch chip).
   Mid-tone, legible on both themes — purely cosmetic, not the real pixel. */
export const BUCKET_HEX: Record<string, string> = {
    Hothurt: '#FF0055', Red: '#E0392B', Orange: '#E8821E', Yellow: '#E8C32E',
    Green: '#3FA85B', Blue: '#3F7FE0', Purple: '#8A52D6', Magenta: '#D63FA8',
    Brown: '#8A5A33', Cream: '#E6D6B8', Moon: '#B9A8E0', Grey: '#9099A0',
    Black: '#1C1C1E', White: '#F2F2F2',
};
