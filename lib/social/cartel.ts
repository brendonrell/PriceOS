'use client';

/*
 * Cartel — the count behind the ⟁ badge.
 *
 * "How many of the signed-in user's mutuals also control (hold ≥1 Output of)
 * this project." Real query: the server crosses the social graph (two-way
 * follows) with the project's holders. Today it reads 0 for an account whose
 * mutuals don't hold the project (or who has no mutuals) — and lights up the
 * instant a real mutual collects. No simulation; the live number.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';

export function useCartelMutualCount(slug: string, enabled: boolean): number {
    const { siweAddress } = useAuth();
    const [count, setCount] = useState(0);

    useEffect(() => {
        if (!enabled || !siweAddress || !slug) {
            setCount(0);
            return;
        }
        let cancelled = false;
        fetch(`/api/project/${encodeURIComponent(slug)}/cartel?me=${siweAddress}`)
            .then((r) => (r.ok ? r.json() : { count: 0 }))
            .then((d) => {
                if (!cancelled) setCount(typeof d?.count === 'number' ? d.count : 0);
            })
            .catch(() => {
                if (!cancelled) setCount(0);
            });
        return () => {
            cancelled = true;
        };
    }, [slug, siweAddress, enabled]);

    return count;
}
