/*
 * THE STICKER CHANNEL — a 22-second episode a day, 365 a year, on loop
 * (Brendon, 2026-07-24).
 *
 * This is FICTION, not advertising. Brendon's steer, verbatim: "purely a little
 * embedded fiction… something that's good and worth showing up for when the
 * market is down." So nothing in here quotes a price, pushes a sheet, or reads
 * like a pitch. It's a shop that never closes, the regulars who haunt it, and
 * the crate in the back nobody has managed to open. The store is directly below
 * the panel; if the show is worth watching, that does the rest.
 *
 * IT IS A GENERATIVE COLLECTION, which is about as on-brand as PD gets: 365
 * episodes composed deterministically from a cast, a set of places, and eleven
 * plot skeletons. Day 200 is the same episode for everybody, this year and
 * every year — a fixed edition of 365 that happens to live on a shop wall
 * instead of a wall wall.
 *
 * KEYED TO THE CALENDAR DATE, not PriceDay (Brendon's call): PriceDay counts up
 * forever and never comes back around, and this has to LOOP. Day-of-year 1–365
 * maps to episode 1–365 and starts over each January; leap-year day 366 replays
 * the finale rather than restarting the season a day early. The day is read in
 * the VIEWER'S timezone, so "today's episode" turns over when their date does.
 *
 * WRITING MORE: anything in SCRIPTS takes over its day, verbatim. Everything
 * else plays the generated season underneath, so all 365 days work from the
 * moment this ships and every hand-written episode simply claims its slot.
 */

import { TIERS } from '../familiar/bestiary';
import { spriteFaceFor } from './sprites';

/** One beat: who's on screen, what they say, how long it holds. */
export interface Beat {
    face: string;
    line: string;
    ms: number;
}

export interface Episode {
    /** 1–365. */
    day: number;
    /** The title card. */
    title: string;
    beats: Beat[];
}

/** An episode runs 22 seconds (Brendon's number). Six beats to fill it. */
export const EPISODE_MS = 22_000;
const BEATS = 6;
const BEAT_MS = Math.round(EPISODE_MS / BEATS);

const oneLine = (s: string): string => s.replace(/\s*\n\s*/g, ' ').trim();

/* ── THE CAST ─────────────────────────────────────────────────────────────
   The two locked-in PriceSprites are the leads: @brendon owns the place and is
   almost never on screen, @pricediscussion IS the shop — the voice behind the
   counter. The bestiary familiars are the regulars. One-liners only; a
   flattened block-creature is noise on a single row. */
export const LEADS = {
    brendon: oneLine(spriteFaceFor('user:brendon')),
    shop: oneLine(spriteFaceFor('user:pricediscussion')),
};

interface Player { face: string; name: string }
const REGULARS: Player[] = TIERS.flatMap((t) => t.entries)
    .filter((e) => !/\n/.test(e.art) && e.art.trim().length > 0 && e.art.length <= 12)
    .map((e) => ({ face: oneLine(e.art), name: e.name.toUpperCase() }));

/** Deterministic per-day source — same day, same episode, everywhere, forever. */
function rng(seed: number): () => number {
    let a = (seed * 2654435761 + 101) >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
const pickFrom = <T,>(r: () => number, arr: readonly T[]): T => arr[Math.floor(r() * arr.length)]!;

/* ── THE WORLD ───────────────────────────────────────────────────────────── */
const PLACES = [
    'THE BACK ROOM', 'THE TOP SHELF', 'AISLE THREE', 'THE PEEL TABLE',
    'THE LOST DRAWER', 'THE FRONT WINDOW', 'THE STOCKROOM LADDER',
    'BEHIND THE COUNTER', 'THE COLD SHELF', 'THE SPARE ROOM',
] as const;

const THINGS = [
    'A CRATE', 'A LADDER', 'ONE GLOVE', 'A SECOND DOOR', 'A HUMMING NOISE',
    'A CHAIR NOBODY OWNS', 'A LIGHT THAT WONT TURN OFF', 'A VERY SMALL MAP',
    'A LIST IN SOMEONE ELSES HANDWRITING', 'AN EXTRA SHELF',
] as const;

const HOURS = [
    'OPENING TIME', 'CLOSING TIME', 'TUESDAY', 'THE QUIET HOUR',
    'THREE IN THE MORNING', 'STOCKTAKE DAY', 'A WET AFTERNOON',
] as const;

/* ── THE PLOT SKELETONS ───────────────────────────────────────────────────
   Eleven shapes. Each takes the day's cast and props and returns six lines —
   setup, complication, two escalations, a turn, and a button. Lines are kept
   short on purpose: this plays on one row of a handheld screen. */
type Skeleton = {
    title: string;
    lines: (a: Player, b: Player, place: string, thing: string, hour: string) => string[];
};

const SKELETONS: Skeleton[] = [
    {
        title: 'THE CRATE',
        lines: (a, _b, place) => [
            `${a.name} FINDS A CRATE IN ${place}.`,
            'IT IS ADDRESSED TO THE SHOP.',
            'IT HAS NO SENDER.',
            'IT IS WARM.',
            'NOBODY OPENS IT.',
            'IT IS STILL THERE TOMORROW.',
        ],
    },
    {
        title: 'THE SECOND DOOR',
        lines: (a, b, place) => [
            `THERE IS A DOOR IN ${place}.`,
            `${a.name} HAS WORKED HERE FOR YEARS.`,
            'HAS NEVER SEEN IT.',
            `${b.name} SAYS IT WAS ALWAYS THERE.`,
            'THEY BOTH LOOK AGAIN.',
            'NOW THERE ARE TWO.',
        ],
    },
    {
        title: 'INVENTORY',
        lines: (a, _b, _p, thing) => [
            `${a.name} COUNTS THE SHELF.`,
            'COUNTS IT AGAIN.',
            'GETS A DIFFERENT NUMBER.',
            `FINDS ${thing} BEHIND IT.`,
            'DOES NOT COUNT THAT.',
            'GOES HOME.',
        ],
    },
    {
        title: 'THE REGULAR',
        lines: (a, _b, _p, _t, hour) => [
            `${a.name} COMES IN AT ${hour}.`,
            'EVERY DAY. SAME TIME.',
            'BUYS NOTHING.',
            'LOOKS AT ONE SHEET.',
            'NODS.',
            'LEAVES SATISFIED.',
        ],
    },
    {
        title: 'THE ARGUMENT',
        lines: (a, b) => [
            `${a.name} SAYS THE SHOP IS HAUNTED.`,
            `${b.name} SAYS IT IS JUST DRAUGHTY.`,
            'THE LIGHTS AGREE WITH NEITHER.',
            'SOMETHING IN THE BACK AGREES WITH BOTH.',
            'THEY STOP ARGUING.',
            'THE DRAUGHT SAYS SORRY.',
        ],
    },
    {
        title: 'CLOSING UP',
        lines: (a, _b, place) => [
            `${a.name} LOCKS THE FRONT.`,
            `TURNS OFF ${place}.`,
            'THE LIGHT COMES BACK ON.',
            'TURNS IT OFF AGAIN.',
            'IT WAITS UNTIL THE DOOR SHUTS.',
            'THEN IT READS FOR A WHILE.',
        ],
    },
    {
        title: 'THE HANDOVER',
        lines: (a, b, _p, thing) => [
            `${a.name} LEAVES ${thing} FOR ${b.name}.`,
            'NO NOTE.',
            `${b.name} LEAVES IT BACK.`,
            'NO NOTE.',
            'THIS HAS BEEN GOING ON FOR MONTHS.',
            'NEITHER WILL BE FIRST.',
        ],
    },
    {
        title: 'THE NEW HIRE',
        lines: (a, b) => [
            `${a.name} STARTS TODAY.`,
            `${b.name} EXPLAINS THE SHELVES.`,
            'THEN THE LADDER RULE.',
            'THEN THE THING ABOUT THE BACK ROOM.',
            `${a.name} ASKS WHAT THING.`,
            'THE TOUR ENDS THERE.',
        ],
    },
    {
        title: 'STOCKTAKE',
        lines: (a, b, _p, _t, hour) => [
            `IT IS ${hour}.`,
            `${a.name} AND ${b.name} ARE STILL HERE.`,
            'ONE SHELF LEFT.',
            'THE SHELF COUNTS THEM BACK.',
            'THEY AGREE TO CALL IT EVEN.',
            'THE SHELF AGREES TOO.',
        ],
    },
    {
        title: 'THE COMPLAINT',
        lines: (a, b) => [
            `${a.name} WANTS TO SPEAK TO THE OWNER.`,
            'THE OWNER IS NEVER IN.',
            `${b.name} OFFERS TO PASS IT ON.`,
            `${a.name} HAS FORGOTTEN THE COMPLAINT.`,
            'THEY BOTH FEEL BETTER.',
            'THE OWNER IS TOLD ANYWAY.',
        ],
    },
    {
        title: 'AFTER HOURS',
        lines: (a, _b, place, thing) => [
            'THE SHOP IS SHUT.',
            `SOMETHING MOVES IN ${place}.`,
            `IT IS ${thing}.`,
            'IT PUTS ITSELF AWAY.',
            'IT HAS BEEN DOING THIS FOR YEARS.',
            `${a.name} HAS NEVER NOTICED.`,
        ],
    },
];

/* ── THE THREAD ───────────────────────────────────────────────────────────
   Every seventh episode belongs to the running story: the crate in the back.
   That's the reason to come back — a serial you can fall behind on. */
const CRATE_THREAD: string[][] = [
    ['THE CRATE HAS NOT MOVED.', 'IT IS STILL WARM.', 'SOMEONE HAS DUSTED IT.', 'NOBODY ADMITS TO THAT.', 'THE DUST IS BACK BY MORNING.', 'SO IS THE SOMEONE.'],
    ['THE CRATE HAS A LABEL NOW.', 'IT SAYS: NOT YET.', 'THE HANDWRITING IS FAMILIAR.', 'NOBODY WILL SAY WHOSE.', 'IT IS NOT ANYONES.', 'THAT IS THE PROBLEM.'],
    ['THE CRATE IS ONE INCH LEFT.', 'NOBODY MOVED IT.', 'THE FLOOR IS UNMARKED.', 'IT IS ONE INCH LEFT AGAIN.', 'IT IS HEADING SOMEWHERE.', 'SLOWLY.'],
    ['SOMETHING INSIDE THE CRATE KNOCKS.', 'TWICE.', 'THE SHOP KNOCKS BACK.', 'TWICE.', 'THEY DO THIS FOR AN HOUR.', 'IT IS COMPANY.'],
    ['THE CRATE IS OPEN.', 'IT IS EMPTY.', 'IT WAS ALWAYS EMPTY.', 'THAT IS NOT REASSURING.', 'THE LID GOES BACK ON.', 'JUST IN CASE.'],
    ['THERE IS A SECOND CRATE.', 'IT IS ADDRESSED TO THE FIRST ONE.', 'NOBODY IS SURPRISED ANY MORE.', 'THEY MAKE ROOM.', 'THEY PUT THE KETTLE ON.', 'THIS IS FINE NOW.'],
];

/* ── HAND-WRITTEN EPISODES ────────────────────────────────────────────────
   These claim their day outright. Add as many as you like over time. */
const SCRIPTS: Record<number, { title: string; lines: string[]; face?: string }> = {
    1: {
        title: 'EPISODE ONE',
        face: LEADS.shop,
        lines: [
            'THE SHOP OPENS.',
            'IT HAS ALWAYS BEEN OPEN.',
            'TODAY IT IS OPEN ON PURPOSE.',
            'THERE ARE 365 OF THESE.',
            'ONE A DAY. THEN IT STARTS AGAIN.',
            'MISS ONE AND IT IS GONE FOR A YEAR.',
        ],
    },
    365: {
        title: 'THE LAST ONE',
        face: LEADS.brendon,
        lines: [
            'THAT IS THE YEAR.',
            'THE CRATE STAYS.',
            'THE DOOR STAYS.',
            'THE LIGHT STAYS ON.',
            'WE OPEN AGAIN TOMORROW.',
            'WE NEVER ACTUALLY CLOSED.',
        ],
    },
};

/** Day of year 1–366 in the VIEWER's own timezone. */
export function dayOfYear(now: Date = new Date()): number {
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86_400_000);
}

/** Today's episode number, 1–365 (leap day 366 replays the finale). */
export function episodeNumber(now: Date = new Date()): number {
    return Math.min(365, Math.max(1, dayOfYear(now)));
}

/**
 * The episode for a day. Hand-written scripts win; every seventh day belongs to
 * the crate thread; everything else is composed from the cast, the places and
 * the eleven skeletons — deterministically, so the season is a fixed edition of
 * 365 rather than a shuffle.
 */
export function episodeFor(day: number): Episode {
    const n = Math.min(365, Math.max(1, Math.floor(day) || 1));

    const scripted = SCRIPTS[n];
    if (scripted) {
        const face = scripted.face ?? LEADS.shop;
        return { day: n, title: scripted.title, beats: scripted.lines.map((line) => ({ face, line, ms: BEAT_MS })) };
    }

    const r = rng(n);
    const cast = REGULARS.length >= 2 ? REGULARS : [{ face: LEADS.shop, name: 'THE SHOP' }, { face: LEADS.brendon, name: 'THE OWNER' }];
    const a = pickFrom(r, cast);
    let b = pickFrom(r, cast);
    if (b.name === a.name) b = cast[(cast.indexOf(a) + 1) % cast.length]!;

    /* Every seventh episode is the serial. */
    if (n % 7 === 0) {
        const part = CRATE_THREAD[Math.floor(n / 7) % CRATE_THREAD.length]!;
        return {
            day: n,
            title: `THE CRATE · PART ${(Math.floor(n / 7) % CRATE_THREAD.length) + 1}`,
            beats: part.map((line, i) => ({ face: i % 2 === 0 ? LEADS.shop : a.face, line, ms: BEAT_MS })),
        };
    }

    const sk = pickFrom(r, SKELETONS);
    const lines = sk.lines(a, b, pickFrom(r, PLACES), pickFrom(r, THINGS), pickFrom(r, HOURS));
    /* Who is on screen moves through the scene, so it plays like a scene and
       not one head talking for 22 seconds. */
    return {
        day: n,
        title: sk.title,
        beats: lines.map((line, i) => ({
            face: i === 0 ? a.face : i === lines.length - 1 ? LEADS.shop : (i % 2 ? b.face : a.face),
            line,
            ms: BEAT_MS,
        })),
    };
}

/** Today's episode, viewer-local. */
export function todaysEpisode(now: Date = new Date()): Episode {
    return episodeFor(episodeNumber(now));
}
