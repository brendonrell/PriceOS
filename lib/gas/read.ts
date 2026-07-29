/*
 * THE READ — the one-word verdict on the current gas price (Brendon,
 * 2026-07-29: "so we know if it's good or not just by glancing").
 *
 * The gas tracker already gives the number; this gives the ANSWER. Bands are
 * tuned to post-merge mainnet, where single-digit gwei is the ordinary day and
 * anything past ~50 is a bad time to transact.
 *
 * Pure + client-safe — the rail, the tracker, and anything else that wants the
 * verdict all read the same bands, so they can never disagree.
 */

export type GasTier = 'dirt' | 'cheap' | 'normal' | 'pricey' | 'brutal';

export interface GasRead {
    tier: GasTier;
    /** The word shown to the user — ALLCAPS, it IS the changed state. */
    word: string;
    /** True when it's a good moment to transact — the glance answer. */
    good: boolean;
}

const BANDS: { max: number; tier: GasTier; word: string; good: boolean }[] = [
    { max: 3, tier: 'dirt', word: 'DIRT CHEAP', good: true },
    { max: 8, tier: 'cheap', word: 'CHEAP', good: true },
    { max: 20, tier: 'normal', word: 'NORMAL', good: true },
    { max: 50, tier: 'pricey', word: 'PRICEY', good: false },
    { max: Infinity, tier: 'brutal', word: 'BRUTAL', good: false },
];

/** The read for a gwei figure. */
export function gasRead(gwei: number): GasRead {
    const b = BANDS.find((x) => gwei < x.max) ?? BANDS[BANDS.length - 1];
    return { tier: b.tier, word: b.word, good: b.good };
}
