'use client';

/*
 * useProfileFeed — the profile activity feed (Brendon 2026-06-15): this
 * wallet's own pre-chain events (mint / list / sale / transfer) from the
 * shared ledger, filtered to this user. Reached via the Collected tab's
 * FEED sort, mirroring the project page's feed. When empty it shows ghost
 * rows — never hidden. Split out of ProfilePageBody 2026-07-06 — pure
 * move, no behavior change.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSort } from '../../lib/state/SortContext';
import { eventToFeedEvent, type FeedEvent } from '../../lib/feed/feedRow';
import type { EventRow } from '../../lib/supabase';

export function useProfileFeed(feedActive: boolean, address: string) {
    const { dir, feedKind } = useSort();
    const [feedRows, setFeedRows] = useState<FeedEvent[]>([]);
    useEffect(() => {
        if (!feedActive) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/feed?address=${address.toLowerCase()}&limit=100`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[] } | null) => {
                    if (!cancelled && Array.isArray(d?.events)) {
                        setFeedRows(d!.events.map(eventToFeedEvent));
                    }
                })
                .catch(() => { /* keep last good rows */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [feedActive, address]);
    const sortedFeedEvents = useMemo(() => {
        const events = [...feedRows];
        const dirMult = dir === 'asc' ? 1 : -1;
        if (feedKind === 'price') events.sort((a, b) => (a.price - b.price) * dirMult);
        else events.sort((a, b) => (a.timestamp - b.timestamp) * dirMult);
        return events;
    }, [feedRows, feedKind, dir]);
    return sortedFeedEvents;
}
