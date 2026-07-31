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

import { Fragment, memo, useEffect, useRef, useState } from 'react';

/* ⛔ LOCKED — the news banner's scroll speed, approved by Brendon 2026-07-06
   ("I love the speed"). Desktop 45 px/sec · mobile 28 px/sec. Recovery
   values: 45 / 28. The rail is driven by a pure CSS animation (duration =
   half the rail's width ÷ this speed), so the speed lives here and nowhere
   else. */
const NEWS_BANNER_SPEED = { desktop: 45, mobile: 28 } as const;

import SpriteFace from '../SpriteFace';
import { PerMilleMark } from '../shell/PerMilleMark';
import { getSpriteFrame, subscribeSprite, type SpriteFrame } from '../../lib/engines/priceSpriteEngine';
import { useSpriteFace } from '../../lib/hooks/useSpriteFace';

export interface NewsItem {
    /** 'text' (default) = glyph + tag + title + meta; 'sprite' = a live animated
        PriceSprite chip + an @name (a random user moment). */
    kind?: 'text' | 'sprite';
    /** Small lead glyph (VS-15 vocabulary). */
    glyph?: string;
    /** Optional per-glyph class for size/nudge treatments — carries the
        milestone icon classes through from lib/home/milestones. */
    cls?: string;
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
    /** Optional action — for pills that open a modal instead of navigating
        (the Stickers store, the Dépanneur). Ignored when href is set. */
    onClick?: () => void;
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

/* Sprite pill — the PriceSprite of the ACCOUNT NAMED ON THE PILL, beside its
   @name.

   ⛔ IT IS THEIR SPRITE, NEVER THE VIEWER'S (Brendon, 2026-07-30: a pill for
   @price was drawing @brendon's little guy). The animation engine is a single
   global wired to whoever is signed in, so reading a frame off it puts the
   viewer's own sprite on every face pill regardless of the name beside it. The
   named account's own face comes from the same lookup every other cross-user
   sprite on PD uses (the profile ID row, the collected chips) — Rule #0. The
   engine still drives the pill when no name is attached. */
function SpriteNewsPill({ item }: { item: NewsItem }) {
    const [frame, setFrame] = useState<SpriteFrame>(() => getSpriteFrame());
    useEffect(() => {
        setFrame(getSpriteFrame());
        return subscribeSprite(() => setFrame(getSpriteFrame()));
    }, []);
    const theirFace = useSpriteFace(item.name ?? '');
    /* Nothing of the viewer's ever stands in for a named account — the slot
       stays empty for the beat before their face lands. */
    const face = item.name ? theirFace : frame.face;
    const inner = (
        <>
            <span className="news-pill-sprite" aria-hidden="true">
                {face && <SpriteFace face={face} />}
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
            {item.glyph && (
                <span className={`news-pill-glyph${item.cls ? ` ${item.cls}` : ''}`} aria-hidden="true">
                    {/* Per Mille wears the REAL logo mark (SVG), never the ‰
                        character — Brendon's logo law. */}
                    {item.cls === 'af-ic--mille' ? <PerMilleMark className="news-pill-mille-svg" /> : item.glyph}
                </span>
            )}
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
    if (item.onClick) {
        const act = item.onClick;
        return (
            <span
                className="pill news-pill news-pill--action"
                role="button"
                tabIndex={0}
                onClick={act}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); act(); }
                }}
            >
                {inner}
            </span>
        );
    }
    return <span className="pill news-pill">{inner}</span>;
}

function NewsCarousel({ items = PLACEHOLDER_ITEMS }: { items?: NewsItem[] }) {
    const railRef = useRef<HTMLDivElement | null>(null);
    /* The measured loop distance and the rail's travelled offset survive across
       re-measures, so a content change that doesn't move the rail leaves the
       animation completely alone (see the effect below). */
    const lastHalfRef = useRef(0);
    const travelledRef = useRef<number | null>(null);

    // Content signature — the animation re-binds ONLY when the actual content
    // changes, not on parent re-renders (the featuring row re-rolls on a timer
    // and hands us a fresh `items` array each time).
    const signature = (list: NewsItem[]) => list
        .map((i) => (i.kind === 'sprite' ? `@${i.name ?? ''}` : `${i.tag ?? ''}|${i.title ?? ''}`))
        .join('~');
    const incoming = signature(items);

    /* ⛔ THE RAIL LOADS OFF SCREEN AND IS NEVER SEEN RE-BUILDING (Brendon,
       2026-07-31 — "the marquee reloads twice, it keeps reloading after the
       page loads"). Its content arrives in waves — the day's pills after
       mount, the live market, your own signals, the feed — and every wave
       re-dealt the rail in front of him, which reads as the banner reloading
       over and over.

       So the rail holds ONE settled set of pills:
         · Before it is shown, waves land freely — it is invisible, already
           gliding, and nobody sees it fill up.
         · Once the content goes quiet it is revealed, mid-glide, complete.
         · Every later wave WAITS off screen and is taken on at the loop's
           wrap — the one moment the rail is back at its start — so nothing
           ever changes under the eye. */
    const SETTLE_MS = 600;   // quiet time that means "the content has landed"
    const SETTLE_CAP_MS = 2500; // never hold the rail back longer than this
    const [shown, setShown] = useState<NewsItem[]>(items);
    const [ready, setReady] = useState(false);
    const readyRef = useRef(false);
    const pendingRef = useRef<NewsItem[] | null>(null);
    const sig = signature(shown);

    // Fill-up phase: take every wave immediately, and reveal once quiet.
    useEffect(() => {
        if (readyRef.current) { pendingRef.current = items; return; }
        setShown(items);
        const t = setTimeout(() => { readyRef.current = true; setReady(true); }, SETTLE_MS);
        return () => clearTimeout(t);
    }, [incoming]);

    // Hard cap — a rail whose content never fully settles still gets shown.
    useEffect(() => {
        const t = setTimeout(() => { readyRef.current = true; setReady(true); }, SETTLE_CAP_MS);
        return () => clearTimeout(t);
    }, []);

    /* Adopt whatever is waiting at the loop's wrap. With motion turned off
       there is no wrap to wait for, so changes are taken as they come. */
    useEffect(() => {
        if (!ready) return;
        const rail = railRef.current;
        if (!rail) return;
        const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const adopt = () => {
            const next = pendingRef.current;
            if (!next) return;
            pendingRef.current = null;
            if (signature(next) !== signature(shown)) setShown(next);
        };
        if (still) { adopt(); return; }
        rail.addEventListener('animationiteration', adopt);
        return () => rail.removeEventListener('animationiteration', adopt);
    }, [ready, sig]);

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

        /* How far the rail has travelled RIGHT NOW, in pixels, read straight
           off the running animation. This is what keeps a re-measure invisible:
           the loop resumes from the exact position the eye is looking at
           instead of being re-thrown somewhere else. */
        const readTravelled = (): number | null => {
            if (!rail.classList.contains('news-rail-anim')) return null;
            const m = getComputedStyle(rail).transform;
            if (!m || m === 'none') return null;
            const nums = m.slice(m.indexOf('(') + 1, -1).split(',').map(Number);
            const tx = nums.length === 16 ? nums[12] : nums[4];
            return Number.isFinite(tx) ? -tx : null;
        };

        const apply = () => {
            if (cancelled || !rail.isConnected) return;
            /* Measured off the real box, not scrollWidth: the rail is
               max-content wide, so its own width is exactly the doubled run
               including every pill's trailing gap — and half of that is the
               exact seam. scrollWidth rounds and drops the last margin, which
               is what left the loop landing a hair off and clipping a card. */
            const half = rail.getBoundingClientRect().width / 2;
            if (!half) return;
            const settled = Math.abs(half - lastHalfRef.current) < 1;
            /* Nothing moved AND the animation is still running → leave it
               completely alone. Live pills re-render constantly (prices, your
               signals, new faces); re-binding on each one is what made the
               marquee stutter and jump. */
            if (settled && rail.classList.contains('news-rail-anim')) return;

            const mobile = window.matchMedia('(max-width: 600px)').matches;
            const speed = mobile ? NEWS_BANNER_SPEED.mobile : NEWS_BANNER_SPEED.desktop;
            const dur = half / speed;

            /* ⛔ THE RAIL IS ANCHORED TO THE WALL CLOCK, NOT TO THIS VISIT
               (Brendon, 2026-07-30: "it restarts every refresh or return which
               means I only ever see the first few"). The loop used to begin
               wherever the last mount left off — which, on a fresh load, is the
               very start, so every arrival replayed the same opening pills and
               the tail of the rail was effectively unreachable.

               The phase is a pure function of the time of day: the loop is
               treated as always having been running, and the negative delay
               drops us in at the point the world is already at. A refresh, a
               return from another page, and a second device all land on the
               same spot — one marquee, running continuously, that nobody
               restarts.

               That anchor is for ARRIVING. Once the rail is moving, a
               re-measure resumes from where it actually is — re-anchoring a
               live marquee to the clock is a teleport, and that is exactly the
               jumping Brendon sees. */
            const travelled = readTravelled() ?? travelledRef.current;
            const phase = travelled === null
                ? (Date.now() / 1000) % dur
                : (((travelled % half) + half) % half) / speed;

            lastHalfRef.current = half;
            rail.style.setProperty('--news-loop-x', `${(-half).toFixed(2)}px`);
            rail.style.setProperty('--news-loop-s', `${dur.toFixed(2)}s`);
            rail.style.setProperty('--news-loop-delay', `${(-phase).toFixed(2)}s`);
            /* Re-bind so the new distance + delay take effect from the
               preserved phase (a running CSS animation ignores var changes
               mid-flight in Safari). */
            rail.classList.remove('news-rail-anim');
            void rail.offsetWidth;
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
            // Hand the live position to the next run so it picks up mid-stride.
            travelledRef.current = readTravelled();
            rail.classList.remove('news-rail-anim');
        };

    }, [sig]);

    if (shown.length === 0) return null;

    return (
        <div
            className={`news-wrap${ready ? '' : ' news-wrap--holding'}`}
            aria-label="Featured news"
        >
            <div className="news-rail" ref={railRef}>
                {/* Doubled run so the engine's modulo-halfWidth translate loops
                    seamlessly (same structure as the Tape rail). */}
                {(['a', 'b'] as const).map((run) =>
                    shown.map((item, i) => (
                        <Fragment key={`${run}-${i}`}>
                            <NewsPill item={item} />
                        </Fragment>
                    )),
                )}
            </div>
        </div>
    );
}

/* The home page re-renders on a timer (the featuring row re-rolls). Without
   this the whole rail — every pill, every sprite, every mark — is reconciled
   on each of those ticks for no reason, and that main-thread churn is felt as
   stutter in the scroll. The rail now re-renders only when its content
   actually changes. */
export default memo(NewsCarousel);
