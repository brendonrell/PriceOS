'use client';

/*
 * SocialFeed ☻ — the home social activity feed (Brendon, 2026-07-26).
 * "What your friends are doing, in chronological order."
 *
 * Summoned by the ☻ sort at the end of the Now Minting sort row (glyph-only —
 * the row has no room for a word); dismissed by tapping any other sort. Works
 * exactly like the FEED sort, with a social focus:
 *
 *   - Logged in  → ledger events acted by the viewer's social graph, mutuals
 *                  weighted first when the window overflows (server-side).
 *   - Logged out / empty graph → the top collectors by PriceScore.
 *
 * No user options, by design — one optimized feed for everyone out of the box.
 * The rows compose PD's proven feed pieces (Rule #0, nothing invented):
 * FeedEventRow (market feed row + long-press-to-star), the home activity
 * feed's stacked date/time column, the canonical market glyphs ✶✹✦✸⇌, the
 * full project name in every sentence (a cross-project feed can't say a bare
 * #id), and the §12 relationship marks ⚭ mutual / ⚯ following after each
 * actor the viewer knows.
 */

import { useEffect, useState } from 'react';
import FeedEventRow from '../feed/FeedEventRow';
import { GhostFeedRows } from '../GhostFeed';
import { eventToNamedFeedEvent } from '../../lib/feed/feedRow';
import { useAuth } from '../../lib/state/AuthContext';
import type {
    SocialEventRow,
    SocialFeedResponse,
} from '../../app/api/feed/social/route';

/* "JUL 26 ’26" — same compact viewer-local date stamp as the home activity
   feed's time column (date + time always track the viewer's own zone). */
function fmtFeedDate(ms: number): string {
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = String(d.getDate()).padStart(2, '0');
    return `${mon} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}

export default function SocialFeed({ dir }: { dir: 'asc' | 'desc' }) {
    const { siweAddress } = useAuth();
    const [events, setEvents] = useState<SocialEventRow[] | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = () => {
            const addr = siweAddress?.toLowerCase();
            fetch(`/api/feed/social${addr ? `?viewer=${addr}` : ''}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: SocialFeedResponse | null) => {
                    if (!cancelled && d) setEvents(d.events);
                })
                .catch(() => {
                    /* offline / 5xx — last good rows stay up */
                });
        };
        load();
        /* Same live nudge the rest of home rides — a DB push re-pulls. */
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-refresh', onRefresh);
        };
    }, [siweAddress]);

    /* Loading OR nothing yet → ghost rows, never a text null state. */
    if (!events || events.length === 0) return <GhostFeedRows />;

    const rows = dir === 'asc' ? [...events].reverse() : events;
    return (
        <>
            {rows.map((e) => {
                const fe = eventToNamedFeedEvent(e);
                if (e.relation === 'mutual') {
                    fe.badge = (
                        <span className="follow-badge">
                            <span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span>
                        </span>
                    );
                } else if (e.relation === 'follow') {
                    fe.badge = (
                        <span className="follow-badge">
                            <span className="ico-following" title="Following">⚯&#xFE0E;</span>
                        </span>
                    );
                }
                return <FeedEventRow key={fe.id} fe={fe} dateStamp={fmtFeedDate(fe.timestamp)} />;
            })}
        </>
    );
}
