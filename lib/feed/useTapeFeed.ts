'use client';

// useTapeFeed — the live Tape data. Pulls our own pre-chain activity from the
// global events ledger (/api/feed) and maps it into the rail's render shape.
// Shared by the top ticker (Ticker) and the menu tape (TapeBox) so both show
// the same real stream. Re-pulls on any market action ('pd:project-refresh')
// and on a slow poll; empty until activity accrues (Brendon, 2026-06-13).

import { useEffect, useState } from 'react';
import type { EventRow } from '../supabase';
import { eventToTapeItem, type TapeFeedItem } from '../data/tapeEvents';

const TAPE_POLL_MS = 30_000;

export function useTapeFeed(): TapeFeedItem[] {
    const [items, setItems] = useState<TapeFeedItem[]>([]);
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch('/api/feed?limit=40', { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[] } | null) => {
                    if (!cancelled && Array.isArray(d?.events)) {
                        setItems(d!.events.map(eventToTapeItem));
                    }
                })
                .catch(() => { /* keep last good */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        const poll = window.setInterval(load, TAPE_POLL_MS);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-refresh', onR);
            window.clearInterval(poll);
        };
    }, []);
    return items;
}
