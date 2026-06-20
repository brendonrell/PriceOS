'use client';

/*
 * Cartel — the count behind the ⟁ badge.
 *
 * "How many of the signed-in user's mutuals also control (hold a piece of)
 * this project." A real number needs the social graph crossed with per-project
 * holdings — that lives in the indexer, which isn't running yet, so every
 * project reads 0 today. The Cartel spec accounts for this: the badge still
 * shows, reading ⟁0, on projects no mutual collects (or when you have no
 * mutuals). Wire the real count here once holder data is live.
 */

export function useCartelMutualCount(_slug: string): number {
    return 0;
}
