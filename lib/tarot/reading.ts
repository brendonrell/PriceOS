/*
 * lib/tarot/reading — the deterministic draw behind the Tarot Spread.
 *
 * A reading is seeded by the reader's wallet + the local day + a re-roll count,
 * so it's fixed for the day (the same reading every time you open it) yet a
 * re-roll pulls a fresh spread on demand. Clientside RNG (Atlas: "3 random
 * Collected Outputs → Past/Present/Future, re-rolls daily"), no server round-trip.
 *
 * The draw picks 3 distinct Major Arcana, an orientation for each, and 3 of the
 * reader's Collected pieces to wear as the faces — then weaves a line per
 * position from the card's real meaning and the piece it landed on.
 */

import { MAJOR_ARCANA, type Arcana } from '../data/tarot';
import { getProject } from '../project/registry';

export type Position = 'PAST' | 'PRESENT' | 'FUTURE';
export const POSITIONS: readonly Position[] = ['PAST', 'PRESENT', 'FUTURE'];

export interface TarotHolding {
    slug: string;
    id: number;
}

export interface DrawnCard {
    position: Position;
    card: Arcana;
    reversed: boolean;
    holding: TarotHolding;
    /** The woven interpretive line for this position. */
    read: string;
}

// ── deterministic RNG (xmur3 seed → mulberry32 stream) ──────────────────────
function xmur3(str: string): () => number {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        h ^= h >>> 16;
        return h >>> 0;
    };
}
function mulberry32(a: number): () => number {
    return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function seededShuffle<T>(arr: readonly T[], rnd: () => number): T[] {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
}

/** Today in the reader's LOCAL day — the reading turns over at local midnight,
 *  the way "today's reading" should (a personal daily ritual, not a fixed zone). */
export function localDayKey(d: Date = new Date()): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

const POSITION_LEAD: Record<Position, string> = {
    PAST: 'Behind you',
    PRESENT: 'Where you stand',
    FUTURE: 'What comes',
};

function faceName(h: TarotHolding): string {
    const name = getProject(h.slug)?.displayName ?? h.slug;
    return `${name} #${h.id}`;
}

/** Weave the card's real meaning, its orientation, and the piece it fell on into
 *  one second-person line — the flavour that makes the reading feel authored. */
function weave(position: Position, card: Arcana, reversed: boolean, holding: TarotHolding): string {
    const meaning = reversed ? card.reversed : card.upright;
    const orient = reversed ? ', reversed,' : '';
    return `${POSITION_LEAD[position]}: ${card.name}${orient} — ${meaning}. It wears ${faceName(holding)}, and the piece knows it.`;
}

/**
 * Draw a full 3-card spread. Deterministic in (address, dayKey, reroll); assumes
 * `holdings` has at least 3 entries (the Spell Book gates the reading behind a
 * collection floor, so a reader who reaches here always has enough to deal).
 */
export function drawReading(
    address: string,
    holdings: readonly TarotHolding[],
    dayKey: string,
    reroll: number,
): DrawnCard[] {
    const seed = xmur3(`${address.toLowerCase()}|${dayKey}|${reroll}`)();
    const rnd = mulberry32(seed);

    const cards = seededShuffle(MAJOR_ARCANA, rnd).slice(0, 3);
    const faces = seededShuffle(holdings, rnd);
    const orientations = [rnd() < 0.5, rnd() < 0.5, rnd() < 0.5];

    return POSITIONS.map((position, i) => {
        // Wrap the faces if (defensively) fewer than 3 were passed.
        const holding = faces[i % faces.length];
        const reversed = orientations[i];
        const card = cards[i];
        return { position, card, reversed, holding, read: weave(position, card, reversed, holding) };
    });
}
