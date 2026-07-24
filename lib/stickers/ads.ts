/*
 * ads — THE STICKER CHANNEL'S AD BREAK (Brendon, 2026-07-24).
 *
 * The panel is a broadcast day. Only two things ever air on it: the show
 * (lib/stickers/episodes — pure fiction, never sells) and these, the ads. This
 * is where the selling lives, and it is written like the back page of a comic
 * and the 2am infomercial that followed it: the big claim, the impossible
 * promise, the fine print that quietly takes it back.
 *
 * ── WHY THIS IS A REGISTRY AND NOT A LIST OF LINES ────────────────────────
 * Stickers are going to become a wide world. So a SPOT declares what it is
 * advertising (`sponsor`) and only airs when that thing is actually live
 * (`AIRING`). Nothing can advertise a feature that doesn't exist — that's
 * enforced here, not by anyone remembering. When swaps or wants or seasonal
 * drops ship, their spots are already written below; flip them on in AIRING and
 * they start airing. The panel never changes.
 *
 * ── THE ONE RULE OF THE COPY ──────────────────────────────────────────────
 * We sell the CHASE, never the RETURN. No spot may suggest a sticker gains
 * value, is an investment, or pays you back. The gag is always that the offer
 * is absurdly, cheerfully worthless in money terms and priceless in every other
 * way. That is both funnier and the only honest way to run it.
 */

import { SHEETS } from './catalog';

/** Everything the sticker world can advertise. Add as the world grows. */
export type Sponsor =
    | 'store'      // the shelf: sealed sheets
    | 'market'     // the secondary: list, offer
    | 'binder'     // got / need, and the ✓
    | 'swap'       // straight trades, sticker for sticker
    | 'wants'      // set a want, get matched
    | 'drops'      // new sheets landing
    | 'channel';   // the channel advertising itself

/**
 * WHAT IS LIVE TODAY. A spot for anything not in here simply never airs, so the
 * unshipped spots below are safe to leave written and waiting.
 */
const AIRING: ReadonlySet<Sponsor> = new Set<Sponsor>(['store', 'market', 'binder', 'channel']);

/** Which face of the shop a spot suits. 'any' airs everywhere. */
export type Face = 'store' | 'market' | 'binder' | 'any';

export interface Spot {
    id: string;
    sponsor: Sponsor;
    face: Face;
    /** The spot itself. First line is the hook, last is the sign-off. */
    lines: string[];
}

const f = (() => {
    const total = SHEETS.reduce((a, s) => a + s.count, 0);
    const byPrice = [...SHEETS].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    return {
        total,
        sheets: SHEETS.length,
        cheapest: byPrice[0]!,
        priciest: byPrice[byPrice.length - 1]!,
        mythic: SHEETS.filter((s) => /mythic/i.test(s.tag)).length,
    };
})();

/* ── THE SPOTS ────────────────────────────────────────────────────────────
   Every line is short on purpose — this plays on one row of a handheld. */
const SPOTS: Spot[] = [
    /* ══ THE STORE ══ */
    {
        id: 'store-sealed', sponsor: 'store', face: 'any',
        lines: [
            'TIRED OF KNOWING WHAT YOU OWN?',
            'INTRODUCING: THE SEALED SHEET.',
            'YOU CANNOT SEE INSIDE. NEITHER CAN WE.',
            'DRAG IT. PEEL IT. LIVE WITH IT.',
            `FROM ${f.cheapest.price} ◊ · AVAILABLE NOW, BELOW ↓`,
        ],
    },
    {
        id: 'store-collect-all', sponsor: 'store', face: 'any',
        lines: [
            `COLLECT ALL ${f.total}!`,
            'YES. ALL OF THEM.',
            'WE HAVE COUNTED. IT IS A LOT.',
            'NOBODY HAS DONE IT YET.',
            'SOMEBODY WILL. ↓',
        ],
    },
    {
        id: 'store-top-shelf', sponsor: 'store', face: 'store',
        lines: [
            'FROM THE TOP SHELF —',
            `${f.priciest.name.toUpperCase()}.`,
            `ONE OF ONLY ${f.mythic} MYTHIC SHEETS.`,
            'KEPT BEHIND GLASS FOR NO REASON.',
            `${f.priciest.price} ◊ · PEEKING IS FREE`,
        ],
    },
    {
        id: 'store-no-singles', sponsor: 'store', face: 'any',
        lines: [
            'ASK ABOUT OUR NO-SINGLES POLICY!',
            'THE POLICY IS: NO SINGLES.',
            'SHEETS SELL WHOLE. THAT IS THE POLICY.',
            'THANK YOU FOR ASKING ABOUT THE POLICY.',
            `${f.sheets} SHEETS ON THE WALL ↓`,
        ],
    },
    {
        id: 'store-side-effects', sponsor: 'store', face: 'any',
        lines: [
            'STICKERS! FROM PD!',
            'SIDE EFFECTS MAY INCLUDE:',
            'REARRANGING YOUR PROFILE AT 2AM.',
            'COUNTING THINGS. CHECKING BACK.',
            'ASK YOUR BINDER IF STICKERS ARE RIGHT FOR YOU.',
        ],
    },

    /* ══ THE MARKETPLACE ══ */
    {
        id: 'market-doubles', sponsor: 'market', face: 'any',
        lines: [
            'DO YOU HAVE DOUBLES?',
            'OF COURSE YOU DO. EVERYONE DOES.',
            'SOMEWHERE, SOMEONE NEEDS THAT EXACT ONE.',
            'LIST IT. NAME YOUR PRICE IN ETH.',
            'THE MARKETPLACE IS OPEN →',
        ],
    },
    {
        id: 'market-offer', sponsor: 'market', face: 'market',
        lines: [
            'SEE A SHEET YOU LIKE?',
            'DO NOT JUST STAND THERE.',
            'MAKE AN OFFER. ANY SHEET. ANY TIME.',
            'THEY CAN SAY NO. THEY OFTEN DO.',
            'BIDS SETTLE IN ETH →',
        ],
    },
    {
        id: 'market-fine-print', sponsor: 'market', face: 'any',
        lines: [
            'ACT NOW!',
            'ACT LATER, ALSO FINE.',
            'THE MARKETPLACE DOES NOT CLOSE.',
            'THERE IS NO TIMER. WE CHECKED.',
            'FINE PRINT: THERE IS GENUINELY NO TIMER.',
        ],
    },

    /* ══ THE BINDER ══ */
    {
        id: 'binder-one-short', sponsor: 'binder', face: 'any',
        lines: [
            'ARE YOU ONE STICKER SHORT?',
            'STUDIES SHOW YOU ARE.',
            'THE STUDY WAS US, LOOKING AT YOUR BINDER.',
            'GOT / NEED. IT IS ALL IN THERE.',
            'OPEN THE BINDER →',
        ],
    },
    {
        id: 'binder-the-tick', sponsor: 'binder', face: 'any',
        lines: [
            'INTRODUCING THE ✓.',
            'IT APPEARS WHEN A SHEET IS COMPLETE.',
            'IT DOES NOTHING.',
            'IT CANNOT BE SOLD, TRADED OR SPENT.',
            'YOU WILL WANT ALL OF THEM.',
        ],
    },
    {
        id: 'binder-completionist', sponsor: 'binder', face: 'binder',
        lines: [
            'ATTENTION COMPLETIONISTS.',
            'YES. YOU. WE KNOW.',
            `${f.sheets} SHEETS. ${f.total} SLOTS.`,
            'EVERY EMPTY ONE IS LISTED SOMEWHERE.',
            'TAP A SHEET TO SEE WHAT IS MISSING →',
        ],
    },

    /* ══ THE CHANNEL ADVERTISING ITSELF ══ */
    {
        id: 'channel-tomorrow', sponsor: 'channel', face: 'any',
        lines: [
            'TOMORROW ON THE STICKER CHANNEL —',
            'A DIFFERENT EPISODE.',
            'THAT IS THE WHOLE TRAILER.',
            'WE DO NOT KNOW EITHER. WE JUST WORK HERE.',
            '365 A YEAR. THEN AGAIN.',
        ],
    },
    {
        id: 'channel-missed', sponsor: 'channel', face: 'any',
        lines: [
            'MISSED AN EPISODE?',
            'IT IS GONE.',
            'FOR ABOUT A YEAR.',
            'THERE IS NO CATCH-UP SERVICE.',
            'THERE IS NO SERVICE OF ANY KIND.',
        ],
    },

    /* ══ WRITTEN AND WAITING — these do not air until AIRING says so ══ */
    {
        id: 'swap-straight-across', sponsor: 'swap', face: 'any',
        lines: [
            'THE STRAIGHT SWAP.',
            'YOUR DOUBLE. THEIR DOUBLE.',
            'NO ETH CHANGES HANDS.',
            'NOBODY WINS. BOTH BINDERS FILL.',
            'THIS IS THE PUREST FORM OF THE THING.',
        ],
    },
    {
        id: 'wants-matched', sponsor: 'wants', face: 'any',
        lines: [
            'SET A WANT.',
            'GO AND LIVE YOUR LIFE.',
            'THE MOMENT ONE IS LISTED, YOU HEAR.',
            'IT MIGHT BE MONTHS.',
            'IT WILL BE WORTH IT. PROBABLY.',
        ],
    },
    {
        id: 'drops-new-sheet', sponsor: 'drops', face: 'any',
        lines: [
            'A NEW SHEET HAS LANDED.',
            'THE WALL GOT LONGER.',
            'YOUR BINDER GOT EMPTIER.',
            'THAT IS HOW THIS WORKS.',
            'WE ARE NOT SORRY ↓',
        ],
    },
];

/** The bumper that opens a break, so an ad is never mistaken for the show. */
export const AD_BUMPER = "WE'LL BE RIGHT BACK";
/** And the one that hands back to the programme. */
export const AD_RETURN = 'AND NOW, BACK TO THE SHOP';

/** Spots that may air on this face of the shop, given what's live today. */
export function eligibleSpots(face: 'store' | 'market' | 'binder'): Spot[] {
    return SPOTS.filter((s) => AIRING.has(s.sponsor) && (s.face === 'any' || s.face === face));
}

/**
 * An ad break: `count` spots, shuffled fresh each time so two visits in a row
 * don't play the same commercials. Falls back to whatever is eligible if the
 * airing list is ever smaller than the break.
 */
export function adBreak(face: 'store' | 'market' | 'binder', count = 3): Spot[] {
    const pool = eligibleSpots(face);
    if (pool.length === 0) return [];
    const out = [...pool];
    for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [out[i], out[j]] = [out[j]!, out[i]!];
    }
    return out.slice(0, Math.min(count, out.length));
}
