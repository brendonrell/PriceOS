/*
 * GhostFeed — placeholder rows for an empty/loading feed (Brendon, 2026-06-13:
 * "show, don't tell" — no bare "it's empty" line). Keeps the real feed-row
 * layout AND our varying event icons so it reads as ~6 actual events, with
 * ghost rectangles where the time / type / content text would be. The whole
 * block runs dimmer (−33% opacity) via .ghost-feed-row.
 */

import { Fragment } from 'react';

/* The same event glyphs the real feed uses (✦ mint · ✹ list · ✶ sale ·
   ✸ xfer), cycled so the placeholder reads as a mix of real activity. */
const GHOST_FEED_ICONS = ['✦', '✹', '✶', '✸', '✦', '✹'];

export function GhostFeedRows({ count = 6 }: { count?: number }) {
    return (
        <Fragment>
            {Array.from({ length: count }, (_, i) => (
                <div className="feed-row ghost-feed-row" key={`ghost-feed-${i}`} aria-hidden="true">
                    <div className="feed-line" />
                    <div className="f-icon-wrap">
                        {GHOST_FEED_ICONS[i % GHOST_FEED_ICONS.length]}&#xFE0E;
                    </div>
                    <div className="f-time">
                        <span className="ghost-feed-bar ghost-feed-bar-time" />
                    </div>
                    <div className="f-type">
                        <span className="ghost-feed-bar ghost-feed-bar-type" />
                    </div>
                    <div className="f-content">
                        <span className="ghost-feed-bar ghost-feed-bar-content" />
                    </div>
                </div>
            ))}
        </Fragment>
    );
}
