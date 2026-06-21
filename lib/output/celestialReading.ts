'use client';

/*
 * Celestial Reading — a per-Output "birth sky" horoscope, composed deterministically
 * from the piece's real attributes (mint moon, season, time of day, natal Sun/Moon,
 * element, harmony, and its I Ching Fate). No model call, no runtime cost — authored
 * fragment pools assembled with a seed hashed from (slug, id), so every Output reads
 * uniquely but the same reading appears for everyone, forever.
 *
 * Surfaced in the Attributes character sheet when the Celestial Tracker spell is on.
 */

import {
    lunarPhase,
    lunarIllumination,
    birthSeason,
    birthTimeOfDay,
    natalElement,
    natalHarmony,
    fateDetail,
} from './derive';

/* Tiny deterministic RNG seeded from a string (mulberry32). */
function seeded(str: string): () => number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    let a = h >>> 0;
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

const ELEMENT_TRAIT: Record<string, string> = {
    Fire: 'quick to ignite and slow to forget',
    Earth: 'patient, rooted, sure of its own weight',
    Air: 'restless and many-minded, hard to pin down',
    Water: 'deep-running and quietly tidal',
};

interface ReadingInput {
    slug: string;
    id: number;
    mintMs: number | null;
    sun?: string | null;
    moon?: string | null;
    rising?: string | null;
}

export function composeCelestialReading(input: ReadingInput): string | null {
    const { slug, id, mintMs } = input;
    if (mintMs == null || !Number.isFinite(mintMs)) return null;

    const pick = seeded(`${slug}:${id}`);
    const choose = <T,>(arr: readonly T[]): T => arr[Math.floor(pick() * arr.length) % arr.length];

    const phase = lunarPhase(mintMs);
    const lit = Math.round(lunarIllumination(mintMs) * 100);
    const season = birthSeason(mintMs).toLowerCase();
    const tod = birthTimeOfDay(mintMs).toLowerCase();

    const subject = choose(['This piece', 'This Output', 'It']);
    const verb = choose(['was struck', 'first drew breath', 'came into being', 'surfaced', 'was minted into the world']);

    // 1 — birth circumstances (always present).
    const s1 = `${subject} ${verb} under a ${phase} — ${lit}% lit — in the ${tod} of ${season}.`;

    // 2 — natal character (only when the sky is known).
    let s2 = '';
    const sun = input.sun ?? null;
    const moon = input.moon ?? null;
    if (sun) {
        const el = natalElement(sun);
        const trait = ELEMENT_TRAIT[el] ?? 'its own quiet logic';
        if (moon) {
            const harm = natalHarmony(sun, moon);
            const weather =
                harm === 'Harmonious'
                    ? 'its inner and outer weather agree'
                    : 'its inner and outer weather pull against each other';
            s2 = `A ${sun} sun over a ${moon} moon — ${weather} — leaving it ${trait}.`;
        } else {
            s2 = `Born to a ${sun} sun, it is ${trait}.`;
        }
    }

    // 3 — the Fate (always present, pure from slug:id).
    const fd = fateDetail(slug, id);
    const closer = choose([
        `The oracle settles on ${fd.hexagramName} — its fate is ${fd.fate}.`,
        `Cast against the I Ching, it reads ${fd.hexagramName}: ${fd.fate}.`,
        `Its hexagram is ${fd.hexagramName}; the line it walks is ${fd.fate}.`,
    ]);

    return [s1, s2, closer].filter(Boolean).join(' ');
}
