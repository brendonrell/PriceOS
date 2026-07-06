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

import { Fragment, useEffect, useRef, useState } from 'react';

/* ⛔ LOCKED — the news banner's scroll speed, approved by Brendon 2026-07-06
   ("I love the speed"). Desktop 45 px/sec · mobile 28 px/sec. Recovery
   values: 45 / 28. The rail is driven by a pure CSS animation (duration =
   half the rail's width ÷ this speed), so the speed lives here and nowhere
   else. */
const NEWS_BANNER_SPEED = { desktop: 45, mobile: 28 } as const;

import SpriteFace from '../SpriteFace';
import { getSpriteFrame, subscribeSprite, type SpriteFrame } from '../../lib/engines/priceSpriteEngine';

export interface NewsItem {
    /** 'text' (default) = glyph + tag + title + meta; 'sprite' = a live animated
        PriceSprite chip + an @name (a random user moment). */
    kind?: 'text' | 'sprite';
    /** Small lead glyph (VS-15 vocabulary). */
    glyph?: string;
    /** Short category/tag shown above or beside the headline (ALLCAPS reads best). */
    tag?: string;
    /** The headline — the part the eye lands on (text pills). */
    title?: string;
    /** Optional secondary line (a detail / value / timestamp). */
    meta?: string;
    /** @name for a sprite pill (rendered without the leading @). */
    name?: string;
    /** Optional link — the whole pill navigates here when tapped. */
    href?: string;
}

/* Placeholder feature pills — stand-ins to nail the look; replaced by the
   real curated + auto-event sources next. Widths vary with content on purpose
   (a wide news line beside a little sprite chip). */
const PLACEHOLDER_ITEMS: NewsItem[] = [
    { glyph: '✦︎', tag: 'NEW PROJECT', title: 'A fresh drop just landed', meta: 'Now minting' },
    { kind: 'sprite', name: 'someone' },
    { glyph: '◈︎', tag: 'MILESTONE', title: 'First collection sold out', meta: '250 / 250' },
    { glyph: '❖︎', tag: 'FEATURED', title: 'Artist of the week', meta: '@brendon' },
    { kind: 'sprite', name: 'newhere' },
    { glyph: '⟠︎', tag: 'VOLUME', title: 'Platform crossed a new high', meta: '100 ETH' },
];

/* Sprite pill — the live PriceSprite (same engine + face renderer the menu
   uses), animated, beside the user's @name. */
function SpriteNewsPill({ item }: { item: NewsItem }) {
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    useEffect(() => {
        setFrame(getSpriteFrame());
        return subscribeSprite(() => setFrame(getSpriteFrame()));
    }, []);
    const inner = (
        <>
            <span className="news-pill-sprite" aria-hidden="true">
                <SpriteFace face={frame.face} />
            </span>
            {item.name && <span className="news-pill-name">@{item.name}</span>}
        </>
    );
    return item.href
        ? <a className="pill news-pill news-pill--sprite" href={item.href}>{inner}</a>
        : <span className="pill news-pill news-pill--sprite">{inner}</span>;
}

function NewsPill({ item }: { item: NewsItem }) {
    if (item.kind === 'sprite') return <SpriteNewsPill item={item} />;
    const inner = (
        <>
            {item.glyph && <span className="news-pill-glyph" aria-hidden="true">{item.glyph}</span>}
            <span className="news-pill-body">
                {item.tag && <span className="news-pill-tag">{item.tag}</span>}
                {item.title && <span className="news-pill-title">{item.title}</span>}
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

    // Content signature — the animation re-binds ONLY when the actual content
    // changes, not on parent re-renders (the featuring row re-rolls on a timer
    // and hands us a fresh `items` array each time).
    const sig = items
        .map((i) => (i.kind === 'sprite' ? `@${i.name ?? ''}` : `${i.tag ?? ''}|${i.title ?? ''}`))
        .join('~');

    /* Scroll = a pure CSS animation, NOT the shared JS tape loop (Brendon,
       2026-07-06 — "constantly stutters, address it once and for all"). The
       JS loop advances the rail once per script frame, so ANY main-thread
       work (feed updates, art decoding, taps) drops its frames and the rail
       visibly hitches. A CSS transform animation runs on the compositor
       thread — the banner glides regardless of what the page is doing.

       The doubled run means translating by -50% of the rail's width is
       exactly one seamless loop; duration = (scrollWidth / 2) ÷ the LOCKED
       px/sec, so the speed is identical to the engine's. Re-measured when
       the content changes, when webfonts settle (widths shift), and on
       resize — skipped when the width didn't actually change so the
       animation isn't needlessly restarted. */
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        let cancelled = false;
        let lastHalf = 0;
        const apply = () => {
            if (cancelled || !rail.isConnected) return;
            const half = rail.scrollWidth / 2;
            if (!half || Math.abs(half - lastHalf) < 1) return;
            lastHalf = half;
            const mobile = window.matchMedia('(max-width: 600px)').matches;
            const speed = mobile ? NEWS_BANNER_SPEED.mobile : NEWS_BANNER_SPEED.desktop;
            rail.style.setProperty('--news-loop-s', `${(half / speed).toFixed(2)}s`);
            rail.classList.add('news-rail-anim');
        };
        apply();
        // Webfonts landing after first paint change the rail's width.
        try {
            document.fonts?.ready?.then(() => apply());
        } catch { /* FontFaceSet unsupported — first measure stands */ }
        window.addEventListener('resize', apply);
        return () => {
            cancelled = true;
            window.removeEventListener('resize', apply);
            rail.classList.remove('news-rail-anim');
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig]);

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
