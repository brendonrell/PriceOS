/*
 * ticker — the Sticker Store + Marketplace news crawls.
 *
 * Both are generated from the live SHEETS catalog, so sheet names / counts /
 * prices / tiers stay true on their own (add a sheet → the crawl updates, zero
 * edits). Tone: instructional + promotional, with two kinds of walk-on ASCII
 * characters for flair (Brendon, 2026-07-12):
 *   - FAMILIARS (the whole 100-strong bestiary) are the "pro athletes" — they
 *     endorse sheets. Fresh cast shuffled in on every open.
 *   - PRICESPRITES are the "platform reps" — real, locked-in users only
 *     (@brendon + @pricediscussion), shown as their sprite face. No placeholder
 *     handles anywhere in the crawl.
 *
 * Two crawls, one per storefront face:
 *   buildStoreTicker()  — onboarding + "buy the whole sheet" for the STORE.
 *   buildMarketTicker() — "list a spare, fund your next roll" for the MARKET.
 *       Encourages listing WITHOUT promising any return: the frame is recouping
 *       toward your next roll of stickers or art, never profit / flipping.
 */

import { SHEETS } from './catalog';
import { TIERS } from '../familiar/bestiary';

const ICON = '⊞︎';
/* Faces can carry newlines; the crawl is one line, so flatten. */
const oneLine = (s: string): string => s.replace(/\s*\n\s*/g, ' ').trim();

/* ── The cast ─────────────────────────────────────────────────────────────
   Familiars = endorsers (all 100). A single-line critter shows its face; the
   big multi-line tiers (Titans / Ascended / Old Gods) ride on their NAME alone
   — a flattened block-creature just reads as noise in a one-line crawl. */
type Critter = { name: string; art: string };
const FAMILIARS: Critter[] = TIERS.flatMap((t) => t.entries);
const famTag = (f: Critter): string => (/\n/.test(f.art) ? f.name : `${oneLine(f.art)} ${f.name}`);

/* PriceSprites = platform reps. Real, locked-in users only — @brendon and
   @pricediscussion. Their FACE is not generated here: it used to run through
   the sticker catalog's project-hash spriteFaceFor() fed a "user:handle"
   seed, which has nothing to do with either account's actual PriceSprite —
   it produced a plausible-looking but disconnected face, different every
   redeploy, with no relation to what's really equipped (Brendon, 2026-08-27:
   "shows wrong PriceSprites... random stuff with no context"). Callers now
   pass the REAL resolved faces in (the same /api/user/by-handle lookup
   AsciiId uses); a rep with no face yet renders name-only rather than a
   wrong one. */
const REPS: { handle: string }[] = [
    { handle: 'brendon' },
    { handle: 'pricediscussion' },
];
const repTag = (r: { handle: string }, face: string | undefined): string =>
    face ? `${oneLine(face)} @${r.handle}` : `@${r.handle}`;

/* ── Pickers (fresh cast each open — same use of Math.random as the eggs) ── */
function shuffled<T>(arr: readonly T[]): T[] {
    const out = [...arr];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out;
}
function pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(Math.random() * arr.length)]!;
}

/* Catalog facts, read live so the numbers never drift. */
function facts() {
    const total = SHEETS.reduce((a, s) => a + s.count, 0);
    const byPrice = [...SHEETS].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return {
        total,
        cheapest: byPrice[0]!,
        priciest: byPrice[byPrice.length - 1]!,
        mythic: SHEETS.filter((s) => s.tag === 'MYTHIC').length,
    };
}

/* ── Endorsement / rep templates ─────────────────────────────────────────── */
const BUY_FORMS = [
    (fam: string, a: string) => `${fam} rates the ${a} sheet a buy`,
    (fam: string, a: string) => `${fam} is collecting ${a}`,
    (fam: string, a: string) => `${fam} suggests the ${a} sheet`,
    (fam: string, a: string) => `${fam} co-signs ${a}`,
    (fam: string, a: string) => `${fam} wants the whole ${a} wall`,
    (fam: string, a: string) => `${fam} says ${a} is the one to grab`,
];
const PAIR_FORMS = [
    (fam: string, a: string, b: string) => `${fam} pairs ${a} with ${b}`,
    (fam: string, a: string, b: string) => `${fam} runs ${a} + ${b} together`,
];
const LIST_FORMS = [
    (fam: string, a: string) => `${fam} listed a spare ${a} and pulled another roll`,
    (fam: string, a: string) => `${fam} wants your spare ${a}`,
    (fam: string, a: string) => `${fam} swapped into ${a} this morning`,
    (fam: string, a: string) => `${fam} is hunting ${a} — got one to spare?`,
    (fam: string, a: string) => `${fam} turned a double into ${a}`,
];
const STORE_REP_FORMS = [
    (rep: string) => `${rep} · welcome to the sticker store`,
    (rep: string) => `${rep} · sheets sell whole, no singles`,
    (rep: string) => `${rep} · tap a sheet to peek inside`,
    (rep: string, a: string) => `${rep} just restocked the ${a} sheet`,
];
const MARKET_REP_FORMS = [
    (rep: string) => `${rep} · list a spare, fund your next roll`,
    (rep: string) => `${rep} · every trade settles in ETH`,
    (rep: string) => `${rep} · got doubles? put them up`,
    (rep: string) => `${rep} · the marketplace is open`,
];

/* Draw `n` distinct familiars and have them endorse random sheets (every 4th is
   a two-sheet pairing suggestion). */
function endorsements(n: number): string[] {
    return shuffled(FAMILIARS).slice(0, n).map(famTag).map((fam, i) => {
        if (i % 4 === 3) {
            const two = shuffled(SHEETS).slice(0, 2);
            return pick(PAIR_FORMS)(fam, two[0]!.name, two[1]!.name);
        }
        return pick(BUY_FORMS)(fam, pick(SHEETS).name);
    });
}
function listNudges(n: number): string[] {
    return shuffled(FAMILIARS).slice(0, n).map(famTag).map((fam) => pick(LIST_FORMS)(fam, pick(SHEETS).name));
}
const storeReps = (repFaces: Record<string, string>): string[] =>
    REPS.map((r) => pick(STORE_REP_FORMS)(repTag(r, repFaces[r.handle]), pick(SHEETS).name));
const marketReps = (repFaces: Record<string, string>): string[] =>
    REPS.map((r) => pick(MARKET_REP_FORMS)(repTag(r, repFaces[r.handle])));

/* Rare secret lines — ~10% of opens show one, dropped at a random spot. Dry,
   blink-and-miss-it, and never promissory. */
const EGGS: string[] = [
    'Petey saw everything. ▶︎ Petey said nothing.',
    'a GRAIL familiar blinks once, then is gone',
    '◊︎ 0.000 — nice try',
    'the ticker is watching you back',
    `${ICON} you found the secret line — tell no one`,
    'GM to Petey, and Petey only',
];

/* Drop an extra after every `every` lines so the crawl mixes the machine copy
   with the walk-on characters rather than reading them in two blocks. */
function interleave(primary: string[], extras: string[], every: number): string[] {
    const out: string[] = [];
    let e = 0;
    primary.forEach((line, i) => {
        out.push(line);
        if ((i + 1) % every === 0 && e < extras.length) out.push(extras[e++]!);
    });
    while (e < extras.length) out.push(extras[e++]!);
    return out;
}

/* Join, sprinkle a rare egg, and set the terminal all-caps look (formatting is
   tuned separately from this copy). */
function weave(lines: string[]): string {
    const out = lines.filter(Boolean);
    if (Math.random() < 0.1) {
        const at = 1 + Math.floor(Math.random() * Math.max(1, out.length - 1));
        out.splice(at, 0, EGGS[Math.floor(Math.random() * EGGS.length)]!);
    }
    return `${out.join('  ·  ')}  ·  `.toUpperCase();
}

/** STORE crawl — learn the place, then buy the whole sheet. `repFaces` is the
 *  real resolved PriceSprite face per rep handle (brendon/pricediscussion);
 *  a rep with no entry yet renders name-only. */
export function buildStoreTicker(repFaces: Record<string, string> = {}): string {
    const f = facts();
    const px = (p: string) => `◊︎ ${p}`;
    const pitches = SHEETS.map((s, i) => {
        const forms = [
            `${s.name} · ${s.tag} · ${px(s.price)} · whole sheet, one tap`,
            `collect all ${s.count} in ${s.name} · ${px(s.price)}`,
            `${s.name} sells whole · ${s.tag} · ${px(s.price)}`,
        ];
        return forms[i % forms.length]!;
    });
    const onboarding = [
        `${ICON} ${SHEETS.length} sheets live · ${f.total} stickers in the store`,
        'sheets sell whole · no singles',
        'tap a sheet to peek inside',
        'buy it sealed · drag to peel it open',
        'every sticker is one of our logos, recoloured',
        'stick them on your profile · rearrange anytime',
        'complete a sheet for the ✓ in your binder',
        `cheapest in · ${f.cheapest.name} · ${px(f.cheapest.price)}`,
        `top shelf · ${f.priciest.name} · ${px(f.priciest.price)}`,
        `${f.mythic} mythic sheets on the wall`,
        'holo ✦ catches the light',
        'primary only in here · trade spares over in the market',
    ];
    const extras = shuffled([...endorsements(8), ...storeReps(repFaces)]);
    return weave(interleave([...onboarding, ...pitches], extras, 3));
}

/** MARKET crawl — list a spare, recoup toward your next roll. Never a return
 *  promise: the language stays on funding the next pack, not profit.
 *  `repFaces` — see buildStoreTicker. */
export function buildMarketTicker(liveLines: string[] = [], repFaces: Record<string, string> = {}): string {
    const copy = [
        `${ICON} the sticker marketplace · list · offer · swap`,
        'got doubles? the market wants them',
        'list a sheet · name your price in ETH',
        'make an offer on any sheet · bids settle in ETH',
        'swap doubles straight across · sticker for sticker',
        'set a want · get matched the moment one is listed',
        'everything settles in ETH',
        'turn a spare into your next roll',
        'list a double · put it toward more art',
        'recoup toward another roll of the sheets',
        'free up a shelf · fund the next one',
        "one collector's spare is another's set",
        'pass a sheet on · keep the wheel turning',
    ];
    const extras = shuffled([...listNudges(6), ...marketReps(repFaces)]);
    return weave([...liveLines, ...interleave(copy, extras, 3)]);
}
