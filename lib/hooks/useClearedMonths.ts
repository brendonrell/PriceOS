'use client';

/*
 * useClearedMonths — the months a wallet has CLEARED, as `YYYY-MM` keys, for
 * the Completionism tag ("SEP '26 100%").
 *
 * It reads the Completionism warm cache the profile already fills, so a chip
 * costs NO extra request: the door warms that sheet while the profile is idle
 * and this hook just takes the answer out of it. Empty until the sheet has
 * landed — a tag that arrives a beat late is right; a second network read for
 * a chip would not be.
 *
 * Every OTHER surface (leaderboards, collectors, followers, search) gets the
 * same fact resolved server-side in /api/tags instead, because those lists have
 * no completionism sheet to read from.
 */

import { useEffect, useState } from 'react';
import { onCompletionism, readCompletionism, warmCompletionismIdle } from '../completionism/cache';

const EMPTY: string[] = [];

function clearedFor(address: string | null | undefined): string[] {
    if (!address) return EMPTY;
    const data = readCompletionism(address);
    if (!data) return EMPTY;
    const keys = data.months.filter((m) => m.complete).map((m) => m.key);
    return keys.length ? keys : EMPTY;
}

export function useClearedMonths(address: string | null | undefined): string[] {
    const [keys, setKeys] = useState<string[]>(EMPTY);

    useEffect(() => {
        if (!address) { setKeys(EMPTY); return; }
        setKeys(clearedFor(address));
        warmCompletionismIdle(address);
        return onCompletionism(() => setKeys(clearedFor(address)));
    }, [address]);

    return keys;
}
