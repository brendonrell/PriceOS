'use client';

/*
 * useLedgerFeed — a FEED-sort activity list off the events ledger. One
 * implementation for both feed surfaces (profile: /api/feed?address=…,
 * project: /api/project/[slug]/feed) — same fetch-on-active + re-pull on
 * 'pd:project-refresh' + time/price sort off SortContext both pages had
 * as separate copies until the 2026-07-06 tech-debt split.
 */

import { useEffect, useMemo, useState } from 'react';
import { useSort } from '../state/SortContext';
import { eventToFeedEvent, eventToProjectNamedFeedEvent, type FeedEvent } from './feedRow';
import type { EventRow } from '../supabase';

/** `nameProject` — the profile feed spans every project, so its rows name the
 *  project ("collected Prisms #7"); a project page already names it, so its
 *  own feed keeps the bare "#7" (Brendon, 2026-07-26). */
export function useLedgerFeed(feedActive: boolean, url: string, nameProject = false) {
    const { dir, feedKind } = useSort();
    const [feedRows, setFeedRows] = useState<FeedEvent[]>([]);
    useEffect(() => {
        if (!feedActive) return;
        let cancelled = false;
        const load = () => {
            fetch(url, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[] } | null) => {
                    if (!cancelled && Array.isArray(d?.events)) {
                        setFeedRows(d!.events.map(nameProject ? eventToProjectNamedFeedEvent : eventToFeedEvent));
                    }
                })
                .catch(() => { /* keep last good rows */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [feedActive, url, nameProject]);
    const sortedFeedEvents = useMemo(() => {
        const events = [...feedRows];
        const dirMult = dir === 'asc' ? 1 : -1;
        if (feedKind === 'price') events.sort((a, b) => (a.price - b.price) * dirMult);
        else events.sort((a, b) => (a.timestamp - b.timestamp) * dirMult);
        return events;
    }, [feedRows, feedKind, dir]);
    return sortedFeedEvents;
}
