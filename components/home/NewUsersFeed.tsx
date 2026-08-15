'use client';

/*
 * NewUsersFeed ☻ — the NEW USERS signup feed (Brendon, 2026-08-02).
 *
 * A FEED, not a card: long-press the ☻ social pill in the home sort row and
 * the Now Minting section swaps to this, exactly the way FEED and SOCIAL
 * swap. The last 200 signups, newest first, in the house feed-row grammar —
 * line · ☻ icon · stacked viewer-local date/time — with the FULL ASCII-ID
 * rectangle (sprite · PriceRank · @name · Sigil, the one identity unit) as
 * the row's content. No type column — this feed only ever means "signup",
 * so the column was a redundant word with a redundant gap (Brendon,
 * 2026-08-15).
 *
 * Live = fresh on mount + a re-pull once a minute while the tab is visible;
 * rows mount in screenfuls as the list scrolls (bounded by the viewport,
 * never by how many rows the answer holds).
 */

import { useEffect, useRef, useState } from 'react';
import AsciiId from '../hero/AsciiId';
import { GhostFeedRows } from '../GhostFeed';
import type { RecentUserRow } from '../../app/api/users/recent/route';

/* Screenfuls — the list grows as the viewer scrolls, so 200 rows never build
   (or fetch their identities) in one go. */
const WINDOW_STEP = 40;
const REFRESH_MS = 60_000;

/* "JUL 26" + "14:05" — viewer-local, the social feed's exact stamp grammar. */
function fmtDate(ms: number): string {
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function NewUsersFeed({ dir }: { dir: 'asc' | 'desc' }) {
    const [rows, setRows] = useState<RecentUserRow[] | null>(null);
    const [shown, setShown] = useState(WINDOW_STEP);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let alive = true;
        const load = () => {
            fetch('/api/users/recent', { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { rows?: RecentUserRow[] } | null) => {
                    if (alive && d && Array.isArray(d.rows)) setRows(d.rows);
                })
                .catch(() => { /* last good rows stay up */ });
        };
        load();
        const t = window.setInterval(() => {
            if (!document.hidden) load();
        }, REFRESH_MS);
        return () => { alive = false; window.clearInterval(t); };
    }, []);

    /* Grow the mounted window a screenful at a time as the sentinel nears. */
    const total = rows?.length ?? 0;
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || shown >= total) return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setShown((n) => Math.min(n + WINDOW_STEP, total));
            }
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [shown, total]);

    /* Loading OR nothing yet → ghost rows, never a text null state. */
    if (!rows || rows.length === 0) return <GhostFeedRows />;

    const view = dir === 'asc' ? [...rows].reverse() : rows;

    return (
        <>
            {view.slice(0, shown).map((r) => {
                const ms = Date.parse(r.created_at);
                return (
                    <div className="feed-row" key={r.address}>
                        <div className="feed-line" />
                        <div className="f-icon-wrap af-ic">☻&#xFE0E;</div>
                        <div className="f-time">
                            <span>{Number.isFinite(ms) ? fmtDate(ms) : '—'}</span>
                            <span>{Number.isFinite(ms) ? fmtTime(ms) : ''}</span>
                        </div>
                        <div className="f-content">
                            <AsciiId handle={r.handle} />
                        </div>
                    </div>
                );
            })}
            {shown < view.length && <div ref={sentinelRef} aria-hidden="true" />}
        </>
    );
}
