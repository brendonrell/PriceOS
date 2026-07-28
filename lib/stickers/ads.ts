/*
 * ads — THE STICKER CHANNEL'S AD BREAK (Brendon, 2026-07-24).
 *
 * The panel is a broadcast day, and since 2026-07-28 (Brendon: "commercials
 * only and we want LOTS of them") the ads are the ONLY thing that airs on it —
 * the daily episode is off. This is where the selling lives, and it is written
 * like the back page of a comic and the 2am infomercial that followed it: the
 * big claim, the impossible promise, the fine print that quietly takes it back.
 *
 * Because the break is now the whole channel, the shelf has to be deep — every
 * eligible spot airs in one shuffled pass, so thin writing shows immediately.
 * Add spots freely; that is the maintenance this file wants.
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

    {
        id: 'store-peel', sponsor: 'store', face: 'any',
        lines: [
            'THE PEEL.',
            'THAT SOUND. YOU KNOW THE ONE.',
            'WE PUT IT IN ON PURPOSE.',
            'IT IS THE BEST PART AND IT IS FREE.',
            'THE STICKER COSTS. THE PEEL DOES NOT ↓',
        ],
    },
    {
        id: 'store-holo', sponsor: 'store', face: 'store',
        lines: [
            'HOLO.',
            'IT CATCHES THE LIGHT.',
            'THERE IS NO LIGHT. IT CATCHES IT ANYWAY.',
            'DO NOT ASK US HOW.',
            'THE SHINY ONE IS ON THE WALL ↓',
        ],
    },
    {
        id: 'store-animated', sponsor: 'store', face: 'any',
        lines: [
            'SOME OF THEM MOVE.',
            'YES. ON THEIR OWN.',
            'NO, YOU CANNOT STOP THEM.',
            'THE ANIMATED SHEET. FOR PEOPLE WITH NERVE.',
            'IT IS ALREADY MOVING ↓',
        ],
    },
    {
        id: 'store-truenames', sponsor: 'store', face: 'any',
        lines: [
            'A TRUE NAME.',
            'SPEAK IT AND NOTHING HAPPENS.',
            'WE TESTED. NOTHING HAPPENS.',
            'BUT YOU WILL KNOW IT.',
            'AND SO WILL YOUR BINDER ↓',
        ],
    },
    {
        id: 'store-common-pride', sponsor: 'store', face: 'any',
        lines: [
            'IN PRAISE OF THE COMMON.',
            'EVERYONE PULLS IT. EVERYONE HAS IT.',
            'THE SHEET STILL NEEDS IT.',
            'A COMPLETE SHEET IS MOSTLY COMMONS.',
            'NOBODY PUTS THAT ON A POSTER ↓',
        ],
    },
    {
        id: 'store-operators', sponsor: 'store', face: 'any',
        lines: [
            'OPERATORS ARE STANDING BY!',
            'THERE ARE NO OPERATORS.',
            'THERE IS A BUTTON. IT WORKS.',
            'IT WORKS AT 4AM. IT WORKS ON SUNDAY.',
            'THE BUTTON IS BELOW ↓',
        ],
    },
    {
        id: 'store-batteries', sponsor: 'store', face: 'any',
        lines: [
            'BATTERIES NOT INCLUDED.',
            'BATTERIES NOT REQUIRED.',
            'BATTERIES NOT RELEVANT IN ANY WAY.',
            'WE JUST LIKE SAYING IT.',
            'STICKERS. NO BATTERIES ↓',
        ],
    },
    {
        id: 'store-warning', sponsor: 'store', face: 'any',
        lines: [
            'WARNING:',
            'CONTAINS STICKERS.',
            'MAY CAUSE ARRANGING.',
            'MAY CAUSE RE-ARRANGING.',
            'DISCONTINUE USE IF SHEET COMPLETES.',
        ],
    },
    {
        id: 'store-testimonial', sponsor: 'store', face: 'any',
        lines: [
            '"I OPENED ONE SHEET."',
            '"THEN I OPENED ANOTHER SHEET."',
            '"THAT IS THE WHOLE STORY."',
            '— A COLLECTOR, PROBABLY',
            'RESULTS TYPICAL ↓',
        ],
    },
    {
        id: 'store-satisfaction', sponsor: 'store', face: 'any',
        lines: [
            'SATISFACTION GUARANTEED!',
            'GUARANTEED BY WHOM, YOU ASK.',
            'BY YOU. YOU WILL BE SATISFIED.',
            'WE HAVE ENORMOUS CONFIDENCE IN YOU.',
            'GO ON THEN ↓',
        ],
    },
    {
        id: 'store-shelf', sponsor: 'store', face: 'store',
        lines: [
            `${f.sheets} SHEETS ON THE WALL.`,
            'NOT ONE OF THEM IS OPEN.',
            'THAT IS THE ENTIRE BUSINESS MODEL.',
            'WE STAND BEHIND IT.',
            'PICK ONE ↓',
        ],
    },
    {
        id: 'store-limited', sponsor: 'store', face: 'any',
        lines: [
            'LIMITED TIME OFFER!',
            'THE LIMIT IS TIME ITSELF.',
            'EVERYTHING IS A LIMITED TIME OFFER.',
            'WE ARE BEING PHILOSOPHICAL AT YOU.',
            'ANYWAY. STICKERS ↓',
        ],
    },
    {
        id: 'store-gift', sponsor: 'store', face: 'any',
        lines: [
            'GIVE THE GIFT OF STICKERS.',
            'TO WHOM? TO YOURSELF.',
            'YOU HAVE BEEN VERY GOOD.',
            'WE HAVE BEEN WATCHING. YOU HAVE.',
            'TREAT YOURSELF ↓',
        ],
    },
    {
        id: 'store-2am', sponsor: 'store', face: 'any',
        lines: [
            'STILL AWAKE?',
            'SO IS THE SHOP.',
            'THE SHOP DOES NOT SLEEP. IT CANNOT.',
            'IT IS A SHOP.',
            'OPEN NOW. OPEN ALWAYS ↓',
        ],
    },
    {
        id: 'store-achievements', sponsor: 'store', face: 'any',
        lines: [
            'ACHIEVEMENT STICKERS.',
            'FOR THINGS YOU ALREADY DID.',
            'NO, YOU CANNOT EARN THEM.',
            'YOU BUY THEM. IT IS MUCH FASTER.',
            'HONOUR, SOLD BY THE SHEET ↓',
        ],
    },
    {
        id: 'store-quips', sponsor: 'store', face: 'any',
        lines: [
            'THE QUIP SHEET.',
            'SMALL WORDS. STRONG OPINIONS.',
            'STICK ONE ON SOMETHING.',
            'LET IT SPEAK FOR YOU.',
            'YOU WILL NOT HAVE TO ↓',
        ],
    },
    {
        id: 'store-warbanners', sponsor: 'store', face: 'any',
        lines: [
            'WAR BANNERS.',
            'THERE IS NO WAR.',
            'THERE ARE BANNERS.',
            'WE MADE THE BANNERS FIRST.',
            'PLANT ONE SOMEWHERE ↓',
        ],
    },
    {
        id: 'store-rarity', sponsor: 'store', face: 'any',
        lines: [
            'THE RARITY SHEET.',
            'STICKERS THAT SAY HOW RARE THINGS ARE.',
            'THEY ARE NOT THAT RARE.',
            'WE APPRECIATE THE IRONY.',
            'SO WILL YOU ↓',
        ],
    },
    {
        id: 'store-projects', sponsor: 'store', face: 'store',
        lines: [
            'PROJECT STICKERS.',
            'THE PIECES YOU ALREADY ARGUE ABOUT.',
            'NOW IN A FORM YOU CAN STICK DOWN.',
            'ARGUE HARDER. ARGUE VISUALLY.',
            'ON THE WALL ↓',
        ],
    },
    {
        id: 'store-mythic-count', sponsor: 'store', face: 'any',
        lines: [
            `${f.mythic} MYTHIC SHEETS EXIST.`,
            'WE COUNTED THEM TWICE.',
            'THE NUMBER DID NOT CHANGE.',
            'IT NEVER DOES. THAT IS THE POINT.',
            'GOOD LUCK ↓',
        ],
    },

    {
        id: 'market-lowball', sponsor: 'market', face: 'market',
        lines: [
            'THE LOWBALL OFFER.',
            'A TIME-HONOURED TRADITION.',
            'SEND IT. THEY WILL SURVIVE.',
            'YOU WILL SURVIVE THE NO.',
            'EVERYONE SURVIVES →',
        ],
    },
    {
        id: 'market-your-price', sponsor: 'market', face: 'any',
        lines: [
            'WHAT IS IT WORTH?',
            'WHATEVER YOU TYPE IN THE BOX.',
            'THAT IS NOT A DODGE. THAT IS THE MECHANISM.',
            'SOMEBODY AGREES OR NOBODY DOES.',
            'NAME IT →',
        ],
    },
    {
        id: 'market-patience', sponsor: 'market', face: 'any',
        lines: [
            'LISTED IT. NOTHING HAPPENED.',
            'GIVE IT A WEEK.',
            'GIVE IT A MONTH.',
            'THE ONE PERSON WHO NEEDS IT IS BUSY.',
            'THEY WILL COME →',
        ],
    },
    {
        id: 'market-nobody', sponsor: 'market', face: 'market',
        lines: [
            'SOME SHEETS HAVE NO SELLERS.',
            'NONE. ZERO. AN EMPTY ROW.',
            'THAT IS NOT A BUG. THAT IS SCARCITY.',
            'BE THE FIRST ONE IN THE ROW.',
            'OR WAIT FOR SOMEONE BRAVER →',
        ],
    },
    {
        id: 'market-eth', sponsor: 'market', face: 'any',
        lines: [
            'EVERYTHING SETTLES IN ETH.',
            'NO POINTS. NO TOKENS. NO TICKETS.',
            'NO WHEEL TO SPIN.',
            'JUST TWO PEOPLE AGREEING ON A NUMBER.',
            'REFRESHINGLY OLD-FASHIONED →',
        ],
    },
    {
        id: 'market-testimonial', sponsor: 'market', face: 'any',
        lines: [
            '"I LISTED MY DOUBLE."',
            '"SOMEBODY BOUGHT IT IN NINE MINUTES."',
            '"I DO NOT KNOW WHO THEY WERE."',
            '"I THINK ABOUT THEM SOMETIMES."',
            '— A SELLER →',
        ],
    },
    {
        id: 'market-watch', sponsor: 'market', face: 'market',
        lines: [
            'WATCHING A ROW GO UP?',
            'DELIGHTFUL. TRULY.',
            'IT MEANS SOMEONE ELSE WANTS IT TOO.',
            'THAT IS THE ONLY SCOREBOARD HERE.',
            'THE ROW IS BELOW →',
        ],
    },

    {
        id: 'binder-empty-slot', sponsor: 'binder', face: 'any',
        lines: [
            'THE EMPTY SLOT.',
            'IT IS NOT DOING ANYTHING.',
            'IT IS JUST SITTING THERE.',
            'BEING EMPTY. AT YOU.',
            'YOU WILL THINK ABOUT IT LATER →',
        ],
    },
    {
        id: 'binder-rearrange', sponsor: 'binder', face: 'binder',
        lines: [
            'REARRANGE YOUR BINDER!',
            'IT CHANGES NOTHING.',
            'IT IS ENORMOUSLY SATISFYING.',
            'THOSE TWO FACTS COEXIST.',
            'DRAG SOMETHING →',
        ],
    },
    {
        id: 'binder-almost', sponsor: 'binder', face: 'any',
        lines: [
            'ONE OFF A FULL SHEET.',
            'THE WORST PLACE TO BE.',
            'ALSO THE BEST PLACE TO BE.',
            'WE DO NOT MAKE THE RULES OF THE HUMAN MIND.',
            'CHECK WHICH ONE →',
        ],
    },
    {
        id: 'binder-doubles-drawer', sponsor: 'binder', face: 'any',
        lines: [
            'YOUR DOUBLES ARE PILING UP.',
            'WE CAN SEE THEM FROM HERE.',
            'THEY ARE SOMEBODY ELSE\'S MISSING ONE.',
            'EVERY SINGLE TIME.',
            'GO AND FIND THEM →',
        ],
    },
    {
        id: 'binder-page-turn', sponsor: 'binder', face: 'binder',
        lines: [
            'TURN THE PAGE.',
            'THERE IS ANOTHER ONE.',
            'THERE IS ALWAYS ANOTHER ONE.',
            `${f.sheets} OF THEM, TO BE EXACT.`,
            'KEEP TURNING →',
        ],
    },
    {
        id: 'binder-showcase', sponsor: 'binder', face: 'any',
        lines: [
            'PUT ONE ON YOUR PROFILE.',
            'LET PEOPLE SEE IT.',
            'THAT IS THE ENTIRE REWARD.',
            'IT IS A BIGGER REWARD THAN IT SOUNDS.',
            'STICK IT SOMEWHERE →',
        ],
    },
    {
        id: 'binder-nobody-checks', sponsor: 'binder', face: 'binder',
        lines: [
            'DOES ANYONE CHECK YOUR BINDER?',
            'YES.',
            'YOU. CONSTANTLY.',
            'THAT IS ENOUGH. THAT WAS ALWAYS ENOUGH.',
            'GO ON, CHECK IT AGAIN →',
        ],
    },

    /* ══ THE CHANNEL ADVERTISING ITSELF ══
       The show is gone (Brendon, 2026-07-28) — this channel is nothing but
       commercials now, and it is extremely relaxed about that. */
    {
        id: 'channel-all-ads', sponsor: 'channel', face: 'any',
        lines: [
            'WELCOME TO THE STICKER CHANNEL.',
            'WE HAVE ONE FORMAT.',
            'IT IS THIS.',
            'BACK TO BACK, FOREVER, NO GAPS.',
            'NOBODY ASKED US TO STOP.',
        ],
    },
    {
        id: 'channel-schedule', sponsor: 'channel', face: 'any',
        lines: [
            'TONIGHT\'S SCHEDULE:',
            '8PM — COMMERCIALS.',
            '9PM — COMMERCIALS.',
            'LATE NIGHT — COMMERCIALS.',
            'A BOLD, CONSISTENT VISION.',
        ],
    },
    {
        id: 'channel-no-programme', sponsor: 'channel', face: 'any',
        lines: [
            'WAITING FOR THE PROGRAMME?',
            'THERE IS NO PROGRAMME.',
            'THE ADS ATE IT.',
            'THEY WERE HUNGRY AND IT WAS SLOW.',
            'STAY TUNED FOR MORE ADS.',
        ],
    },
    {
        id: 'channel-sponsors', sponsor: 'channel', face: 'any',
        lines: [
            'A WORD FROM OUR SPONSORS —',
            'OUR SPONSOR IS THE SHOP.',
            'THE SHOP IS DOWNSTAIRS.',
            'IT IS ALSO OUR ONLY SPONSOR.',
            'WE ARE VERY LOYAL TO IT.',
        ],
    },
    {
        id: 'channel-volume', sponsor: 'channel', face: 'any',
        lines: [
            'IS THIS LOUDER THAN THE REST OF THE SITE?',
            'YES.',
            'THAT IS TRADITIONAL.',
            'ADS HAVE ALWAYS BEEN LOUDER.',
            'WE ARE HONOURING THE CRAFT.',
        ],
    },
    {
        id: 'channel-station-id', sponsor: 'channel', face: 'any',
        lines: [
            'YOU ARE WATCHING THE STICKER CHANNEL.',
            'YOU HAVE BEEN FOR A WHILE.',
            'THE SHOP IS RIGHT THERE.',
            'WE ARE NOT GOING ANYWHERE.',
            'NEITHER, APPARENTLY, ARE YOU.',
        ],
    },
    {
        id: 'channel-again', sponsor: 'channel', face: 'any',
        lines: [
            'DID THAT ONE PLAY ALREADY?',
            'POSSIBLY.',
            'THE ORDER SHUFFLES EVERY TIME YOU COME IN.',
            'SO IT IS FRESHLY UNFAMILIAR.',
            'ENJOY IT AGAIN.',
        ],
    },
    {
        id: 'channel-off-switch', sponsor: 'channel', face: 'any',
        lines: [
            'LOOKING FOR THE OFF SWITCH?',
            'IT IS THE X.',
            'IT HAS ALWAYS BEEN THE X.',
            'WE WILL BE HERE WHEN YOU COME BACK.',
            'PLAYING COMMERCIALS.',
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

/** The bumper that opens a break. It used to promise a show back the other
 *  side of it; the show is off the air (Brendon, 2026-07-28), so it says the
 *  only true thing left. */
export const AD_BUMPER = 'AND NOW, A WORD FROM OUR SPONSOR';
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
