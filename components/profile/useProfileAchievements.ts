'use client';

/*
 * useProfileAchievements — the profile owner's PUBLIC achievements wall data.
 * Fetched once per profile address from /api/achievements/{owner}; re-seeds
 * on client-nav between profiles (the address-keyed effect re-runs).
 * `unlocked` is the earned-id set, the rest is the owner's live score/rank/
 * tally for the section header. One fetch per address, guarded by the dep
 * array — no refetch on every render. Split out of ProfilePageBody
 * 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useState } from 'react';
import { ACHIEVEMENTS } from '../../lib/achievements/catalog';

export function useProfileAchievements(address: string) {
    const [achData, setAchData] = useState<{
        unlocked: ReadonlySet<string>;
        priceScore: number;
        priceRank: number;
        unlockedCount: number;
    }>({ unlocked: new Set(), priceScore: 0, priceRank: 0, unlockedCount: 0 });
    useEffect(() => {
        let cancelled = false;
        setAchData({ unlocked: new Set(), priceScore: 0, priceRank: 0, unlockedCount: 0 });
        fetch(`/api/achievements/${address.toLowerCase()}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { unlocked?: string[]; priceScore?: number; priceRank?: number } | null) => {
                if (cancelled || !d) return;
                const set = new Set(d.unlocked ?? []);
                const visibleUnlocked = ACHIEVEMENTS.reduce(
                    (n, a) => (!a.secret && set.has(a.id) ? n + 1 : n),
                    0,
                );
                setAchData({
                    unlocked: set,
                    priceScore: d.priceScore ?? 0,
                    priceRank: d.priceRank ?? 0,
                    unlockedCount: visibleUnlocked,
                });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [address]);
    return achData;
}
