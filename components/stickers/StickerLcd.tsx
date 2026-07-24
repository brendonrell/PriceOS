'use client';

/*
 * StickerLcd — the marketplace line as a handheld LCD panel, and the screen
 * THE STICKER CHANNEL plays on (Brendon, 2026-07-24: "make the top one an LCD
 * panel sort of game boy style… go nuts with classic transitions", then "a
 * little tv series with 22 second episodes and do 365 of them").
 *
 * It replaces the single crawling sentence that kept shearing off top and
 * bottom. Same job as before — the whole panel is still the button that crosses
 * store ⇄ market — but now it PLAYS.
 *
 * What runs, in order, forever:
 *   1. THE SLATE — "EP.142/365 · THE CRATE", so it's obviously a show and
 *      obviously not yesterday's. That's the hook: miss a day, miss an episode,
 *      and it does not come back for a year.
 *   2. TODAY'S EPISODE — 22 seconds, keyed to the calendar date so it loops
 *      every year (lib/stickers/episodes).
 *   3. THE SIGN-OFF — "new episode tomorrow", then it plays round again.
 *
 * It is PURE FICTION — no prices, no pitch (Brendon: "purely a little embedded
 * fiction… worth showing up for when the market is down"). The shop's own copy
 * still runs on the ticker directly below. The shelf is under both of them; if
 * the show is worth watching, that does the selling.
 *
 * THE CAST is entirely PD's own (Rule #0): the two locked-in PriceSprites,
 * @brendon and @pricediscussion, plus the bestiary familiars — the same reps
 * the sticker crawl already uses.
 *
 * Motion honours prefers-reduced-motion: the show still plays, it just cuts
 * between beats instead of animating.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { adBreak, AD_BUMPER, AD_RETURN } from '../../lib/stickers/ads';
import { todaysEpisode, type Beat } from '../../lib/stickers/episodes';

/** Title / bumper cards hold a beat longer than a line of dialogue. */
const CARD_MS = 2400;
/** How long one line of an ad holds. */
const AD_MS = 3200;
/** Spots per break. Three is a break; four is an ordeal. */
const SPOTS_PER_BREAK = 3;

/* The 22 transitions (Brendon's count, 2026-07-24). Every one is transform /
   opacity / clip-path only — the three things a phone can animate on the
   compositor — so a panel that never stops moving still costs nothing on iOS.
   Cycled by beat index, so a run never repeats the same move twice running. */
const MOVES = [
    'wipe', 'blink', 'slide', 'hop', 'curtain', 'shutter', 'typeout', 'dropin',
    'flip', 'squash', 'zoom', 'iris', 'pixel', 'scan', 'rollup', 'glitch',
    'bars', 'sweep', 'bounce', 'spin', 'shrink', 'stagger',
] as const;

type Frame = Beat & { slate?: boolean; ad?: boolean };

export default function StickerLcd({ mode }: { mode: 'store' | 'market' | 'binder' }) {
    /* THE DAY'S CAROUSEL. The episode is one segment of it, not the whole
       thing — 22 seconds on its own would loop far too tightly (Brendon,
       2026-07-24). One full run:
         title card → today's episode (fiction, no selling) → sign-off →
         the shop's segments for this face → round again.
       Built once per face so a beat change is a pure index bump, with no work
       happening in the middle of an animation. */
    const frames: Frame[] = useMemo(() => {
        const ep = todaysEpisode();
        const card = (face: string, line: string): Frame => ({ face, line, ms: CARD_MS, slate: true });
        /* The ad faces are the channel's own marks, never a character — an ad
           is the channel talking, not somebody in the shop. */
        const ads: Frame[] = adBreak(mode, SPOTS_PER_BREAK).flatMap((spot) => [
            ...spot.lines.map((line, n) => ({
                face: n === 0 ? '◈︎' : '·',
                line,
                ms: AD_MS,
                ad: true,
            })),
        ]);
        return [
            card('▶︎', `EP.${ep.day}/365 · ${ep.title}`),
            ...ep.beats,
            card('▪︎', AD_BUMPER),
            ...ads,
            card('▪︎', AD_RETURN),
        ];
    }, [mode]);

    const [i, setI] = useState(0);
    /* Bumped every beat so the entrance animation re-triggers even when the
       next move happens to be the same one. */
    const [beat, setBeat] = useState(0);
    const [reduced, setReduced] = useState(false);

    useEffect(() => {
        setReduced(
            typeof window !== 'undefined'
            && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true,
        );
    }, []);

    useEffect(() => { setI(0); setBeat((b) => b + 1); }, [mode]);

    /* Each beat sets its OWN timer — the title cards hold longer than a line of
       dialogue, so one fixed interval would clip the show or drag the slate. */
    const iRef = useRef(0);
    iRef.current = i;
    useEffect(() => {
        if (frames.length < 2) return;
        const hold = frames[iRef.current]?.ms ?? AD_MS;
        const t = window.setTimeout(() => {
            setI((n) => (n + 1) % frames.length);
            setBeat((b) => b + 1);
        }, hold);
        return () => window.clearTimeout(t);
    }, [i, frames]);

    const frame = frames[i];
    if (!frame) return null;
    const move = MOVES[i % MOVES.length];

    return (
        <div className="ss-lcd" aria-hidden="true">
            {/* The dot-matrix wash — the panel's pixel grid, painted over the
                content so the whole thing reads as one screen. */}
            <span className="ss-lcd-grid" />
            <span
                key={beat}
                className={`ss-lcd-scene ss-lcd--${move}${reduced ? ' is-still' : ''}${frame.slate ? ' is-slate' : ''}${frame.ad ? ' is-ad' : ''}`}
            >
                <span className="ss-lcd-face">{frame.face}</span>
                <span className="ss-lcd-say">{frame.line}</span>
            </span>
        </div>
    );
}
