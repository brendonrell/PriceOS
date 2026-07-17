'use client';

/*
 * Celestial Tracker — the birth sky (redesigned 2026-07-17, Brendon's call:
 * "it should be showing sun moon and rising subtly around things" — NO words,
 * NO hexagram focus; the old fate-chip readout was wrong).
 *
 * The mode surfaces each Output's astrological BIG THREE from the real natal
 * engine (lib/project/natal.ts — the sky over Montreal at the mint instant):
 *   ☉ SUN sign      — the zodiac glyph
 *   ☽ MOON          — the TRUE phase disc (lunarGlyph; brightness = illumination)
 *   ↑ RISING sign   — the zodiac glyph
 * rendered as a silent three-glyph run around the piece (card top edge, output
 * title). Sun · Moon · Rising order is the astrological convention — the order
 * IS the label; no words render anywhere. Needs the stored mint timestamp
 * (fills in as pieces are browsed); no timestamp → no marks, nothing faked.
 *
 * Zodiac glyphs U+2648–U+2653 ship with VS-15 + forced Courier like every PD
 * glyph. Device-verify on iOS per the #1 glyph gate (GLYPHS.md).
 */

import { resolveStoredTraits, useStoredColors } from '../art/colorStore';
import { lunarPhase, lunarGlyph, lunarIllumination } from './derive';
import { natalChart } from '../project/natal';

const VS15 = '︎';

/** Zodiac sign → glyph (VS-15 text presentation). */
export const ZODIAC_GLYPH: Record<string, string> = {
    Aries: `♈${VS15}`, Taurus: `♉${VS15}`, Gemini: `♊${VS15}`,
    Cancer: `♋${VS15}`, Leo: `♌${VS15}`, Virgo: `♍${VS15}`,
    Libra: `♎${VS15}`, Scorpio: `♏${VS15}`, Sagittarius: `♐${VS15}`,
    Capricorn: `♑${VS15}`, Aquarius: `♒${VS15}`, Pisces: `♓${VS15}`,
};

export interface BirthSky {
    /** Sun sign glyph (♌︎). */
    sunGlyph: string;
    /** TRUE mint-moon phase disc (● ◕ ◑ ◔ ○ …). */
    moonGlyph: string;
    /** Rising sign glyph (♓︎). */
    risingGlyph: string;
    /** Words for tooltips / aria only — never rendered as text. */
    sun: string;
    phase: string;
    rising: string;
    /** Moon illumination at mint, 0..1 (drives the disc's brightness). */
    illum: number;
}

/** The Output's birth sky — null until the mint timestamp is stored. */
export function birthSky(slug: string, id: number): BirthSky | null {
    const t = resolveStoredTraits(slug, id);
    if (!t?.mintedAt) return null;
    const ms = Date.parse(t.mintedAt);
    if (!Number.isFinite(ms)) return null;
    const chart = natalChart(ms);
    const sunGlyph = ZODIAC_GLYPH[chart.sun];
    const risingGlyph = ZODIAC_GLYPH[chart.rising];
    if (!sunGlyph || !risingGlyph) return null;
    return {
        sunGlyph,
        moonGlyph: lunarGlyph(ms),
        risingGlyph,
        sun: chart.sun,
        phase: lunarPhase(ms),
        rising: chart.rising,
        illum: lunarIllumination(ms),
    };
}

/** Hook — re-renders as stored mint timestamps hydrate. */
export function useBirthSky(slug: string, id: number, enabled: boolean): BirthSky | null {
    useStoredColors(enabled ? [slug] : []);
    if (!enabled) return null;
    return birthSky(slug, id);
}

/** Brightness for the moon disc: the fade IS the illumination read, but the
 *  floor stays high enough that even a new moon is plainly visible (Rule #2 —
 *  meaning-carrying fade, never a washout). */
export function celestialOpacity(illum: number): number {
    return 0.55 + 0.45 * Math.max(0, Math.min(1, illum));
}
