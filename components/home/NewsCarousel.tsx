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
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';

/* ⛔ LOCKED — the news banner's scroll speed, approved by Brendon 2026-07-06
   ("I love the speed"). Desktop 45 px/sec · mobile 28 px/sec. Pinned here so
   a Tape retune can never drift the banner. Recovery values: 45 / 28. */
const NEWS_BANNER_SPEED = { desktop: 45, mobile: 28 } as const;
import SpriteFace from '../SpriteFace';
import { getSpriteFrame, subscribeSprite, type SpriteFrame } from '../../lib/engines/priceSpriteEngine';
import {
    PETEY_BUBBLE_PATH, PETEY_GLYPH_PATH,
    PETEY_DOT_RIGHT_PATH, PETEY_DOT_LEFT_PATH, PETEY_DOT_TOP_PATH,
} from '../../lib/stickers/logoPaths';

export interface NewsItem {
    /** 'text' (default) = glyph + tag + title + meta; 'sprite' = a live animated
        PriceSprite chip + an @name; 'art' = a lone artwork circle, no words;
        'six' = a showcase six-pack (six outputs back to back, no name — tap to
        find out); 'price' = the rare yellow-bubble PRICE logo circle. */
    kind?: 'text' | 'sprite' | 'art' | 'six' | 'price' | 'logo';
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
    /** Stored-preview URL — the art chip on a text pill, or the whole face of
        an 'art' circle. */
    art?: string;
    /** Where the art chip itself points (the specific output's page). */
    artHref?: string;
    /** Intentional colour — launch pills wear the project's colorway, faded. */
    tint?: string;
    /** Wide treatment — roomier pill with a bigger art chip. Visual variance
        is the point: uniform pills bore the eye (Brendon, 2026-07-06). */
    wide?: boolean;
    /** Six-pack faces (kind 'six'). */
    outputs?: { src: string; href: string }[];
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

/* Lone artwork circle — the piece, nothing else. Tap to learn more. */
function ArtCirclePill({ item }: { item: NewsItem }) {
    return (
        <a className="pill news-pill news-pill--circle" href={item.href}>
            <img className="news-pill-circle-art" src={item.art} alt="" loading="lazy" decoding="async" draggable={false} />
        </a>
    );
}

/* Showcase six-pack — six outputs back to back, no name, no explanation. */
function SixPackPill({ item }: { item: NewsItem }) {
    return (
        <a className="pill news-pill news-pill--six" href={item.href} aria-label="A project showcase">
            {(item.outputs ?? []).map((o, i) => (
                <img key={i} className="news-pill-six-art" src={o.src} alt="" loading="lazy" decoding="async" draggable={false} />
            ))}
        </a>
    );
}

/* The rare one — the yellow-bubble PRICE logo in a circle, because it looks
   cool. Links out to the $PRICE token (Etherscan for now). Same bubble+glyph
   paths as the corner logo/stickers, resting rotated like Petey. */
function PriceCirclePill({ item }: { item: NewsItem }) {
    return (
        <a
            className="pill news-pill news-pill--circle news-pill--price"
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="$PRICE"
        >
            <svg
                viewBox="0 0 761 655"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
                style={{ transform: 'rotate(-90deg)' }}
            >
                <path d={PETEY_BUBBLE_PATH} fill="#FFE600" />
                <path d={PETEY_GLYPH_PATH} fill="#111111" />
                <path d={PETEY_DOT_RIGHT_PATH} fill="#FFE600" />
                <path d={PETEY_DOT_LEFT_PATH} fill="#FFE600" />
                <path d={PETEY_DOT_TOP_PATH} fill="#FFE600" />
            </svg>
        </a>
    );
}

/* The PD logo circle — spins to show the Petey version and back, forever.
   Same paths as the corner logo; two-tone in the live theme colours. */
function LogoSpinPill() {
    return (
        <span className="pill news-pill news-pill--circle news-pill--logo" aria-label="PriceOS">
            <svg viewBox="0 0 761 655" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" className="news-logo-spin">
                <path d={PETEY_BUBBLE_PATH} fill="currentColor" />
                <path d={PETEY_GLYPH_PATH} fill="var(--bg-color, #111)" />
                <path d={PETEY_DOT_RIGHT_PATH} fill="currentColor" />
                <path d={PETEY_DOT_LEFT_PATH} fill="currentColor" />
                <path d={PETEY_DOT_TOP_PATH} fill="currentColor" />
            </svg>
        </span>
    );
}

function NewsPill({ item }: { item: NewsItem }) {
    if (item.kind === 'sprite') return <SpriteNewsPill item={item} />;
    if (item.kind === 'logo') return <LogoSpinPill />;
    if (item.kind === 'art') return <ArtCirclePill item={item} />;
    if (item.kind === 'six') return <SixPackPill item={item} />;
    if (item.kind === 'price') return <PriceCirclePill item={item} />;
    /* Intentional colour — a launch pill wears its project's colorway, still
       faded (the tint mixes over the standard half-opacity fill). */
    const tintStyle = item.tint
        ? {
            background: `color-mix(in srgb, ${item.tint} 26%, var(--stat-bg))`,
            borderColor: `color-mix(in srgb, ${item.tint} 55%, var(--border-color))`,
        }
        : undefined;
    const inner = (
        <>
            {item.art && (
                <img className="news-pill-art" src={item.art} alt="" loading="lazy" decoding="async" draggable={false} />
            )}
            {item.glyph && <span className="news-pill-glyph" aria-hidden="true">{item.glyph}</span>}
            <span className="news-pill-body">
                {item.tag && <span className="news-pill-tag">{item.tag}</span>}
                {item.title && <span className="news-pill-title">{item.title}</span>}
                {item.meta && <span className="news-pill-meta">{item.meta}</span>}
            </span>
        </>
    );
    const cls = `pill news-pill${item.wide ? ' news-pill--wide' : ''}`;
    if (item.href) {
        return (
            <a className={cls} href={item.href} style={tintStyle}>
                {inner}
            </a>
        );
    }
    return <span className={cls} style={tintStyle}>{inner}</span>;
}

export default function NewsCarousel({ items = PLACEHOLDER_ITEMS }: { items?: NewsItem[] }) {
    const railRef = useRef<HTMLDivElement | null>(null);

    // Bind the scroll loop to the rail, re-measuring ONLY when the actual
    // content changes — keyed on a content signature, not the array identity.
    // The parent re-renders often (the featuring row re-rolls on a timer), which
    // hands us a fresh `items` array each time; depending on that reference reset
    // the scroll to the start every few seconds. The signature stays stable
    // across those re-renders, so the loop runs uninterrupted.
    const sig = items
        .map((i) =>
            i.kind === 'sprite' ? `@${i.name ?? ''}`
            : i.kind === 'art' ? `a|${i.art ?? ''}`
            : i.kind === 'six' ? `6|${i.href ?? ''}`
            : i.kind === 'price' ? 'price'
            : i.kind === 'logo' ? 'logo'
            : `${i.tag ?? ''}|${i.title ?? ''}|${i.art ?? ''}|${i.tint ?? ''}|${i.wide ? 'w' : ''}`)
        .join('~');
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        return subscribeTapeRail(rail, NEWS_BANNER_SPEED);
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
