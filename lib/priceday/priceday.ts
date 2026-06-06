/*
 * PriceDay — global PD daily almanac.  ⚠ TEST-PHASE IMPLEMENTATION ⚠
 * ───────────────────────────────────────────────────────────────────
 * PriceDay #1 is anchored to PRICEDAY_EPOCH. Today's number = days since
 * the epoch (1-indexed). With the epoch below, 2026-06-06 resolves to
 * PriceDay #47 — matching the value the project/profile hero stamps used
 * while they were hardcoded, so nothing visually regresses.
 *
 * The contents (minted / uploaded / biggest sale "this day") are SEEDED
 * placeholders so the popover looks real during the test phase. They are
 * NOT chain/indexer data.
 *
 * WIPE FOR MAINNET: everything test-phase lives in this one file. To go
 * live, swap priceDayContents() to read the real indexer feed (and reset
 * PRICEDAY_EPOCH to the true launch day). Date + number math stay as-is.
 */

/* PriceDay #1. Tweak in one line. 2026-04-21 makes 2026-06-06 = #47. */
export const PRICEDAY_EPOCH = Date.UTC(2026, 3, 21);

const DAY_MS = 86_400_000;

function utcMidnight(d: Date): number {
    return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/** 1-indexed PriceDay number for a given day (defaults to today). */
export function priceDayNumber(d: Date = new Date()): number {
    return Math.max(1, Math.floor((utcMidnight(d) - PRICEDAY_EPOCH) / DAY_MS) + 1);
}

/** "JUN 06 2026" — same format the hero date slot uses elsewhere. */
export function formatPriceDate(d: Date = new Date()): string {
    return d
        .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
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
