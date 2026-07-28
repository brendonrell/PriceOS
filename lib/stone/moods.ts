/*
 * THE MOODS — the Command Stone's castable atmospheres (Brendon, 2026-07-28:
 * "can we have more than one mood? cozy was just an example").
 *
 * A mood is ONE castable word bundling colorway + ambient light + the DJ —
 * the shipped COZY MOOD pattern, generalized into data. The same word lifts
 * it and the colorway you were wearing comes back. Bare `moods` deals the
 * whole set as a tappable widget.
 *
 * Pure data + matching only (testable) — execution lives in the stone,
 * exactly like CAST: it is just settings with a fun name.
 */

import type { ColorwayKey } from '../state/ColorwayContext';

export interface MoodDef {
    key: string;
    /** Castable words, exact (CAST's own discipline — no prefix guessing). */
    words: readonly string[];
    label: string;
    /** The one-line recipe the dealt widget shows under the name. */
    recipe: string;
    /** The colorway the mood wears — each mood's is distinct, so the worn
        mood is detectable and only one can be on at a time. */
    colorway: NonNullable<ColorwayKey>;
    /** Ambient light strip on with the mood? */
    ambient: boolean;
    /** The DJ: 'play' starts them (and off hushes them) · 'hush' stops
        whatever is playing · 'keep' leaves the music alone. */
    dj: 'play' | 'hush' | 'keep';
}

export const MOODS: readonly MoodDef[] = [
    {
        key: 'cozy',
        /* 'mood' + 'cozy mood' stay cozy's — the shipped words (2026-07-28). */
        words: ['cozy', 'cozy mood', 'mood'],
        label: 'Cozy Mood',
        recipe: 'the haze · ambient light · the DJ',
        colorway: 'haze',
        ambient: true,
        dj: 'play',
    },
    {
        key: 'rave',
        words: ['rave', 'rave mood', 'hype'],
        label: 'Rave Mood',
        recipe: 'hot hurt · ambient light · the DJ',
        colorway: 'hothurt',
        ambient: true,
        dj: 'play',
    },
    {
        key: 'monk',
        words: ['monk', 'monk mood', 'focus'],
        label: 'Monk Mood',
        recipe: 'clean light · everything off · quiet',
        colorway: 'light',
        ambient: false,
        dj: 'hush',
    },
    {
        key: 'midnight',
        words: ['midnight', 'midnight mood'],
        label: 'Midnight Mood',
        recipe: 'dark mode · the dim wash · music stays',
        colorway: 'dark',
        ambient: true,
        dj: 'keep',
    },
    /* Brendon's morning encore (2026-07-28): "add another mood or two". */
    {
        key: 'golden',
        words: ['golden', 'golden hour'],
        label: 'Golden Hour',
        recipe: 'sunset orange · ambient light · the DJ',
        colorway: 'orange',
        ambient: true,
        dj: 'play',
    },
    {
        key: 'ocean',
        words: ['ocean', 'ocean mood'],
        label: 'Ocean Mood',
        recipe: 'open blue · ambient light · music stays',
        colorway: 'blue',
        ambient: true,
        dj: 'keep',
    },
];

/* ── MARKET MOODS (Brendon, 2026-07-28: "moods related to collecting:
   bullish, bearish, browsing, hunting") — the same one-word grammar, but
   these set your COLLECTING LENS instead of the room: sort + real app
   toggles, all existing vocabulary (Rule #0). Orthogonal to the room
   moods — one of each can be worn at once. ── */

/** The pdNotifs flags a market mood may hold ON while worn. */
export type MarketFlag = 'degen' | 'watch' | 'spell_arbitrage';

export interface MarketMoodDef {
    key: string;
    words: readonly string[];
    label: string;
    recipe: string;
    /** The lens's sort — null leaves the sort you had alone. */
    sort: 'id' | 'price' | 'feed' | 'fog' | 'az' | null;
    /** Flags held ON while worn; lifted on the way out. */
    on: readonly MarketFlag[];
}

export const MARKET_MOODS: readonly MarketMoodDef[] = [
    {
        key: 'bullish',
        words: ['bullish', 'bull'],
        label: 'Bullish',
        recipe: 'degen on · everything priced',
        sort: 'price',
        on: ['degen'],
    },
    {
        key: 'bearish',
        words: ['bearish', 'bear'],
        label: 'Bearish',
        recipe: 'the watch on · hands in pockets',
        sort: null,
        on: ['watch'],
    },
    {
        key: 'hunting',
        words: ['hunting', 'hunt'],
        label: 'Hunting',
        recipe: 'the spreads read · deals in sight',
        sort: 'price',
        on: ['spell_arbitrage'],
    },
    {
        key: 'browsing',
        words: ['browsing', 'browse', 'window shopping'],
        label: 'Browsing',
        recipe: 'the feed · no agenda',
        sort: 'feed',
        on: [],
    },
];

function norm(s: string): string {
    return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Exact-word mood match — anything inexact falls through (a miscast is
    worse than a search result). */
export function matchMood(line: string): MoodDef | null {
    const q = norm(line);
    if (!q) return null;
    for (const m of MOODS) if (m.words.includes(q)) return m;
    return null;
}

/** Exact-word market-mood match — same discipline. */
export function matchMarketMood(line: string): MarketMoodDef | null {
    const q = norm(line);
    if (!q) return null;
    for (const m of MARKET_MOODS) if (m.words.includes(q)) return m;
    return null;
}

/** The words that deal the whole set as a widget. */
export const MOODS_WORDS = new Set(['moods', 'the moods', 'mood set']);
