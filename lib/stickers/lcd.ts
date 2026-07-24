/*
 * lcd — the SHOP segments of the LCD panel's daily carousel (Brendon,
 * 2026-07-24).
 *
 * The panel runs a carousel: today's 22-second episode of THE STICKER CHANNEL
 * (lib/stickers/episodes — pure fiction, no selling) and then these, the shop's
 * own segments, which do the advertising the fiction deliberately doesn't.
 * Three jobs, one per face of the shop: sell the sheets, sell the secondary,
 * sell the chase.
 *
 * Every line is built from facts that ALWAYS resolve — how many sheets are
 * live, how many stickers that is, the cheapest and the top shelf. Nothing
 * waits on a sale having happened, so the panel is full and truthful for the
 * first friends-and-family visitor with an empty order book.
 *
 * Discipline kept from the store crawl: we push COLLECTING, never RETURNS.
 * Nothing here hints that a sticker goes up in value.
 */

import { SHEETS } from './catalog';
import { TIERS } from '../familiar/bestiary';
import { spriteFaceFor } from './sprites';

/** One beat of a shop segment: who's on screen, and what they say. */
export interface LcdScene {
    face: string;
    line: string;
}

const oneLine = (s: string): string => s.replace(/\s*\n\s*/g, ' ').trim();

/* The two locked-in PriceSprites lead; the familiars are the ensemble. */
const REPS: string[] = [
    oneLine(spriteFaceFor('user:brendon')),
    oneLine(spriteFaceFor('user:pricediscussion')),
];
const FAMILIAR_FACES: string[] = TIERS.flatMap((t) => t.entries)
    .filter((e) => !/\n/.test(e.art))
    .map((e) => oneLine(e.art))
    .filter((a) => a.length > 0 && a.length <= 12);

function shuffled<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}

/** Catalog facts, read live so the numbers can never drift from the shelf. */
function facts() {
    const total = SHEETS.reduce((a, s) => a + s.count, 0);
    const byPrice = [...SHEETS].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return {
        total,
        sheets: SHEETS.length,
        cheapest: byPrice[0]!,
        priciest: byPrice[byPrice.length - 1]!,
        mythic: SHEETS.filter((s) => /mythic/i.test(s.tag)).length,
    };
}

/** The shop's pitch for whichever face of the store you're looking at. */
export function lcdLines(mode: 'store' | 'market' | 'binder'): string[] {
    const f = facts();
    const shared = [
        `${f.sheets} SHEETS · ${f.total} STICKERS TO CHASE`,
        `SEALED SHEETS FROM ${f.cheapest.price} ◊`,
        'SHEETS SELL WHOLE — NO SINGLES',
        'EVERY STICKER IS A PD LOGO, RECOLOURED',
    ];
    const own: Record<'store' | 'market' | 'binder', string[]> = {
        store: [
            '★ THE STICKER STORE IS OPEN ★',
            'BUY IT SEALED · DRAG IT OPEN',
            `TOP SHELF: ${f.priciest.name.toUpperCase()} · ${f.priciest.price} ◊`,
            `${f.mythic} MYTHIC SHEETS ON THE WALL`,
            'TAP ANY SHEET TO PEEK INSIDE — FREE',
            'STICK THEM ON YOUR PROFILE. MOVE THEM ANY TIME.',
        ],
        market: [
            '★ THE STICKER MARKETPLACE ★',
            'GOT DOUBLES? SOMEBODY NEEDS THAT EXACT ONE',
            'LIST A SPARE · NAME YOUR PRICE IN ETH',
            'MAKE AN OFFER ON ANY SHEET',
            'SWAP STRAIGHT ACROSS — STICKER FOR STICKER',
            'TURN A SPARE INTO YOUR NEXT ROLL',
        ],
        binder: [
            '★ YOUR STICKER BINDER ★',
            'GOT / NEED — THE WHOLE CHASE AT A GLANCE',
            'FINISH A SHEET. EARN THE ✓. IT NEVER COMES OFF.',
            'ONE STICKER SHORT IS STILL ONE STICKER SHORT',
            'TAP A SHEET TO SEE EXACTLY WHAT IS MISSING',
            `COMPLETE THE WALL. ALL ${f.sheets} SHEETS.`,
        ],
    };
    return [...own[mode], ...shared];
}

/**
 * Pair every line with a cast member — the two PriceSprites open, then
 * familiars take it in turn, reshuffled per build so two visits never play the
 * same order.
 */
export function lcdCast(lines: string[]): LcdScene[] {
    const pool = [...REPS, ...shuffled(FAMILIAR_FACES)];
    if (pool.length === 0) return lines.map((line) => ({ face: '( · _ · )', line }));
    return lines.map((line, i) => ({ face: pool[i % pool.length]!, line }));
}
