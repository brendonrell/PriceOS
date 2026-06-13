/*
 * PriceDay — global PD daily almanac.  ⚠ TEST-PHASE IMPLEMENTATION ⚠
 * ───────────────────────────────────────────────────────────────────
 * PriceDay #1 is anchored to PRICEDAY_EPOCH. The number = how many days the
 * platform has been running (1-indexed), counted on the MONTREAL calendar —
 * all PD timing lives in Brendon's timezone (personality over rigid UTC), in
 * lockstep with the Mood Ring's Montreal midnight flip. First real PriceDay =
 * 2026-06-12 (Brendon, 2026-06-13): 2026-06-12 = #1, the 5th day = #5.
 *
 * The contents (minted / uploaded / biggest sale "this day") are SEEDED
 * placeholders so the popover looks real during the test phase. They are
 * NOT chain/indexer data.
 *
 * WIPE FOR MAINNET: everything test-phase lives in this one file. To go
 * live, swap priceDayContents() to read the real indexer feed (and reset
 * PRICEDAY_EPOCH to the true launch day). Date + number math stay as-is.
 */

/* PriceDay #1. Tweak in one line. First real PriceDay = 2026-06-12. */
export const PRICEDAY_EPOCH = Date.UTC(2026, 5, 12);

const DAY_MS = 86_400_000;

/* The Montreal calendar day for an instant, as a UTC-midnight index so day
   subtraction is clean. PriceDay flips at MIDNIGHT IN MONTREAL — same day
   boundary the Mood Ring + layout boot-paint use, so the number, the daily
   colour and the boot fill all agree. */
function montrealDayIndex(d: Date): number {
    const ymd = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Montreal',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).format(d);
    const [y, m, day] = ymd.split('-').map(Number);
    return Date.UTC(y, m - 1, day);
}

/** 1-indexed PriceDay number for a given instant (defaults to now), counted
    on the Montreal calendar. */
export function priceDayNumber(d: Date = new Date()): number {
    return Math.max(1, Math.floor((montrealDayIndex(d) - PRICEDAY_EPOCH) / DAY_MS) + 1);
}

/** "JUN 12 2026" — same format the hero date slot uses elsewhere, on the
    Montreal calendar so the stamp flips with the number. */
export function formatPriceDate(d: Date = new Date()): string {
    return d
        .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'America/Montreal',
        })
        .replace(',', '')
        .toUpperCase();
}

export interface PriceDayRow {
    label: string;
    value: string;
}

export interface PriceDayContents {
    number: number;
    minted: PriceDayRow[];
    uploaded: PriceDayRow[];
    biggestSale: PriceDayRow | null;
}

/* Seed pools — test-phase only. */
const ARTISTS = ['@opus4-6', '@snowfro', '@claude', '@rudxane', '@matty', '@atlasforge', '@gmoney'];
const PROJECTS = ['Prisms', 'Meridian', 'Chromatic Drift', 'Signal Loss', 'Understory', 'Strata'];

/* Deterministic per-day LCG so the popover is stable across reloads. */
function lcg(seed: number): () => number {
    let s = seed >>> 0;
    return () => {
        s = (s * 1664525 + 1013904223) >>> 0;
        return s / 0xffffffff;
    };
}

/** Seeded daily almanac contents for a given day (defaults to today). */
export function priceDayContents(d: Date = new Date()): PriceDayContents {
    const number = priceDayNumber(d);
    const rand = lcg(number * 2654435761);
    const pick = <T,>(arr: T[]): T => arr[Math.floor(rand() * arr.length)];
    const tok = () => 1 + Math.floor(rand() * 500);

    const mintCount = 2 + Math.floor(rand() * 2); // 2–3 rows
    const minted: PriceDayRow[] = Array.from({ length: mintCount }, () => ({
        label: `${pick(PROJECTS)} #${tok()}`,
        value: pick(ARTISTS),
    }));

    const uploaded: PriceDayRow[] = [
        { label: pick(PROJECTS), value: pick(ARTISTS) },
    ];

    const biggestSale: PriceDayRow = {
        label: `${pick(PROJECTS)} #${tok()}`,
        value: `${(0.1 + rand() * 4).toFixed(2)} ETH`,
    };

    return { number, minted, uploaded, biggestSale };
}
