'use client';

/*
 * NewsCarousel — the home "featured news" strip that sits just above the
 * Join The Chat action row and is ALWAYS visible (unlike the Tape's on/off
 * modes). Where the Tape is the firehose of one-line activity, this is the
 * FEATURE rail: a few rich pills for the big moments (a new project added,
 * a milestone, an announcement) — curated by Brendon and/or auto-added by
 * the site.
 *
 * Reuse, not reinvent:
 *   - Scroll: the SAME engine the Tape runs on (subscribeTapeRail) — content
 *     doubled so the modulo-halfWidth translate reads as a seamless loop.
 *   - Pills: the trait value pill look (.pill / .pill-l3 — a half-opacity
 *     themed fill with full-strength readable text), sized up into .news-pill.
 *
 * This first pass renders PLACEHOLDER items so the look + motion can be
 * nailed in the UI before the real content sources are wired.
 */

import { Fragment, useEffect, useRef } from 'react';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';

export interface NewsItem {
    /** Small lead glyph (VS-15 vocabulary). */
    glyph?: string;
    /** Short category/tag shown above or beside the headline (ALLCAPS reads best). */
    tag?: string;
    /** The headline — the part the eye lands on. */
    title: string;
    /** Optional secondary line (a detail / value / timestamp). */
    meta?: string;
    /** Optional link — the whole pill navigates here when tapped. */
    href?: string;
}

/* Placeholder feature pills — stand-ins to nail the look; replaced by the
   real curated + auto-event sources next. */
const PLACEHOLDER_ITEMS: NewsItem[] = [
    { glyph: '✦︎', tag: 'NEW PROJECT', title: 'A fresh drop just landed', meta: 'Now minting' },
    { glyph: '◈︎', tag: 'MILESTONE', title: 'First collection sold out', meta: '250 / 250' },
    { glyph: '❖︎', tag: 'FEATURED', title: 'Artist of the week', meta: '@someone' },
    { glyph: '⟠︎', tag: 'VOLUME', title: 'Platform crossed a new high', meta: '100 ETH' },
    { glyph: '✧︎', tag: 'ANNOUNCEMENT', title: 'Something big is coming', meta: 'Stay tuned' },
];

function NewsPill({ item }: { item: NewsItem }) {
    const inner = (
        <>
            {item.glyph && <span className="news-pill-glyph" aria-hidden="true">{item.glyph}</span>}
            <span className="news-pill-body">
                {item.tag && <span className="news-pill-tag">{item.tag}</span>}
                <span className="news-pill-title">{item.title}</span>
                {item.meta && <span className="news-pill-meta">{item.meta}</span>}
            </span>
        </>
    );
    if (item.href) {
        return (
            <a className="pill news-pill" href={item.href}>
                {inner}
            </a>
        );
    }
    return <span className="pill news-pill">{inner}</span>;
}

export default function NewsCarousel({ items = PLACEHOLDER_ITEMS }: { items?: NewsItem[] }) {
    const railRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        // Re-bind when the item set changes so the scroll loop re-measures.
        return subscribeTapeRail(rail);
    }, [items]);

    if (items.length === 0) return null;

    return (
        <div className="news-wrap" aria-label="Featured news">
            <div className="news-rail" ref={railRef}>
                {/* Doubled run so the engine's modulo-halfWidth translate loops
                    seamlessly (same structure as the Tape rail). */}
                {(['a', 'b'] as const).map((run) =>
                    items.map((item, i) => (
                        <Fragment key={`${run}-${i}`}>
                            <NewsPill item={item} />
                        </Fragment>
                    )),
                )}
            </div>
        </div>
    );
}
