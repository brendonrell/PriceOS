/*
 * Mood Ring — the platform's daily vibe (Brendon, 2026-06-12).
 *
 * A tiny built-in generative art project: every PriceDay the platform wakes
 * up with a new mood — a colour and a name — deterministic from the day
 * number, generative forever. The colour IS the home page's Custom (page-
 * owner) colour for the day (ColorwayContext's home branch reads it); the
 * name surfaces as the footer easter egg ("Platform vibe today: …").
 *
 * Same source rules as everything else daily on PD: keyed off PriceDay
 * (lib/priceday), UTC-bound, so every visitor worldwide shares one mood and
 * SSR/CSR can't disagree except across a midnight boundary (callers compute
 * after mount, same as the hero date).
 *
 * DECOUPLE GUARD: this is NOT the viewer's "Custom" slot (`pd_custom_color`),
 * NOT "Haze Mode" (`pd_haze_color`), and NOT a profile's `profile_hex`. It is
 * the HOME PAGE's own daily colour, computed — never persisted.
 */

import { PRICEDAY_EPOCH } from '../priceday/priceday';

/* The mood flips at MIDNIGHT IN MONTREAL (Brendon, 2026-06-12 — it's his
   wall clock, not UTC's). Day number = days since the PriceDay epoch of
   the date a Montreal clock shows, DST handled by the timezone database.
   ⚠ Must mirror the boot-paint script in app/layout.tsx exactly. */
function montrealDayNumber(d: Date): number {
    const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Montreal',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d); // "2026-06-12"
    const [y, m, day] = ymd.split('-').map(Number);
    return Math.max(
        1,
        Math.floor((Date.UTC(y, m - 1, day) - PRICEDAY_EPOCH) / 86400000) + 1,
    );
}

export interface Mood {
    /** Today's mood colour — the home page's daily Custom colour. */
    hex: string;
    /** Today's mood, chart-read from the colour — e.g. "MELLOW". */
    name: string;
    /** PriceDay number the mood derives from. */
    day: number;
}

/* Deterministic per-day rng — mulberry32 over the day number. One stream
   per day, drawn in a FIXED order (hue jitter, sat, light, adj, noun).
   Do not reorder draws: that re-rolls every historical mood. */
function rng(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/* The mood chart — a real 90s mood ring reads its colour against a chart,
   and so does this one: the day's HUE picks the mood family, the rng picks
   the word inside it. One word, gas-station-ring vocabulary (CALM, MELLOW,
   PASSIONATE…) — never a two-word combo (Brendon, 2026-06-12). The colour
   MEANS the mood, exactly like the ring on the chart card it came with.
   Bands are append-only; inserting mid-band re-rolls that band's history. */
const MOOD_CHART: ReadonlyArray<{ maxHue: number; moods: readonly string[] }> = [
    /* reds — the ring runs hot */
    { maxHue: 15, moods: ['EXCITED', 'AMPED', 'FIRED UP', 'BOLD'] },
    /* oranges */
    { maxHue: 45, moods: ['DARING', 'RESTLESS', 'STOKED', 'ADVENTUROUS'] },
    /* yellows */
    { maxHue: 70, moods: ['NERVOUS', 'GIDDY', 'JITTERY', 'WIRED'] },
    /* yellow-greens */
    { maxHue: 105, moods: ['UPBEAT', 'HOPEFUL', 'FRESH', 'SUNNY'] },
    /* greens — the chart's resting state */
    { maxHue: 150, moods: ['CALM', 'MELLOW', 'CHILL', 'STEADY'] },
    /* teals */
    { maxHue: 195, moods: ['RELAXED', 'SERENE', 'BREEZY', 'ZEN'] },
    /* blues */
    { maxHue: 240, moods: ['HAPPY', 'OPTIMISTIC', 'DREAMY', 'TRANQUIL'] },
    /* deep blues — the chart's best-case ring */
    { maxHue: 270, moods: ['ROMANTIC', 'BLISSFUL', 'SMITTEN', 'MOONSTRUCK'] },
    /* purples */
    { maxHue: 300, moods: ['PASSIONATE', 'INTENSE', 'MAGNETIC', 'MYSTERIOUS'] },
    /* pinks/magentas — wraps back to red at 345 */
    { maxHue: 360, moods: ['FLIRTY', 'LOVESTRUCK', 'AFFECTIONATE', 'SWEET'] },
] as const;

function moodForHue(hue: number, roll: number): string {
    /* 345–360 reads as red, like the wheel (and the ring) actually wraps. */
    const h = hue >= 345 ? hue - 345 : hue;
    const band =
        MOOD_CHART.find((b) => h < b.maxHue) ?? MOOD_CHART[MOOD_CHART.length - 1];
    return band.moods[Math.floor(roll * band.moods.length)];
}

function hslToHex(h: number, s: number, l: number): string {
    const a = (s / 100) * Math.min(l / 100, 1 - l / 100);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const c = l / 100 - a * Math.max(-1, Math.min(k - 3, Math.min(9 - k, 1)));
        return Math.round(255 * c)
            .toString(16)
            .padStart(2, '0');
    };
    return `#${f(0)}${f(8)}${f(4)}`.toUpperCase();
}

/** The mood for a given moment (defaults to now). Pure + deterministic. */
export function moodOfDay(d: Date = new Date()): Mood {
    const day = montrealDayNumber(d);
    const r = rng(day * 2654435761);
    /* Hue walks the golden angle day-over-day (consecutive days always read
       as different colours), with a per-day jitter so the walk never feels
       like a schedule. Sat/light stay in the bold-but-inhabitable band —
       the text colour auto-resolves off luminance (ColorwayContext YIQ). */
    const hue = (day * 137.508 + r() * 24) % 360;
    const sat = 38 + r() * 47; // 38–85%
    const light = 42 + r() * 34; // 42–76%
    /* The mood reads off the colour via the chart — fourth draw picks the
       word within the hue band, so colour math above stays untouched (it
       must keep matching the boot-paint script in app/layout.tsx). */
    const name = moodForHue(hue, r());
    return { hex: hslToHex(hue, sat, light), name, day };
}

/** Today's mood colour — ColorwayContext's home-page Custom fill. */
export function moodHexToday(): string {
    return moodOfDay().hex;
}
