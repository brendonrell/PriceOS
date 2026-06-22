'use client';

/*
 * Ticker (The Tape)
 *
 * Persistent ambient activity ticker that flex-fills the space between
 * the Petey logo and the user-menu buttons. Visibility and presentation
 * are entirely CSS-driven via body.tape-* classes:
 *   - body.tape-off:    display none
 *   - body.tape-faded:  partially transparent
 *   - body.tape-bold:   weight 700
 *   - body.tape-framed: filled bar, inverted colors
 *   - default:          standard
 *
 * F52 / BUG-17 — populate the rail with mock tape items and subscribe
 * to the shared tape engine for rAF-driven horizontal scroll. Sim
 * 13314-13345 renders + animates the top rail.
 *
 * Rail content is the EVENTS feed from lib/data/tapeEvents (port of
 * sim 13230-13264) rendered twice with an outer separator between, so
 * the engine's modulo-`scrollWidth/2` translate reads as a seamless
 * loop (sim 13317-13318).
 *
 * Mock data note: the same EVENTS list drives both the menu tape
 * (TapeBox) and this top rail. Sim shuffles per render for variety;
 * we render unshuffled for deterministic SSR/CSR alignment. The list
 * is mock and will be replaced by indexer-derived data once that
 * surface lands — shuffling becomes irrelevant at that point.
 */

import { Fragment, useEffect, useRef } from 'react';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { useTapeFeed } from '../../lib/feed/useTapeFeed';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';

/* Null state — when no real activity has accrued yet, the rail still scrolls a
   quiet placeholder so the tape reads as alive instead of an empty bar. */
const NULL_PHRASE = 'nothing happening right now';
const NULL_REPEAT = 8;

/* One event, read as a tight sentence: WHO did WHAT to WHICH piece, for HOW
   MUCH — e.g. "@brendon minted PRISMS #18 · 0.16 ETH". The collection wears
   caps so the eye catches the piece; the price (when present) is the only
   inner "·"-separated field. Events are delimited from each other by the
   diamond in the rail below, so a price never butts against the next name. */
function RailItem({ item }: { item: TapeFeedItem }) {
    const boldClass = item.type === 'mint' ? ' bold' : '';
    if (item.follow) {
        return (
            <span className="tape-item bold">
                <span className="tape-coll">{item.coll.toUpperCase()}</span> started following {item.name}
            </span>
        );
    }
    return (
        <span className={`tape-item${boldClass}`}>
            {item.name && (
                <>
                    <b>{item.name}</b>
                    {item.sigil && (
                        <span className="tape-sigil">{item.sigil}</span>
                    )}
                    {' '}
                </>
            )}
            {item.verb}{' '}
            <span className="tape-coll">{item.coll.toUpperCase()}</span>{' '}#{item.id}
            {item.price && (
                <>
                    {' '}
                    <span className="tape-sep-inner">·</span>
                    {' '}
                    {item.price}
                </>
            )}
        </span>
    );
}

export function Ticker() {
    const railRef = useRef<HTMLDivElement | null>(null);
    const items = useTapeFeed();

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        // Re-bind when the rail content changes so the scroll loop re-measures
        // once our live events land (the rail starts empty, fills async).
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [items]);

    return (
        <div className="tape-wrap" id="tapeWrap" aria-hidden="true">
            <div className="tape-rail" id="tapeRail" ref={railRef}>
                {/* Every event is followed by a diamond delimiter, and the whole
                    run is doubled — so the engine's modulo-halfWidth translate
                    reads as a seamless loop AND no two events ever run together.
                    With no real activity yet, the same doubled structure scrolls
                    a quiet "nothing happening right now" placeholder instead. */}
                {items.length > 0
                    ? (['a', 'b'] as const).map((run) =>
                          items.map((item, i) => (
                              <Fragment key={`${run}-${i}`}>
                                  <RailItem item={item} />
                                  <span className="tape-sep-outer" aria-hidden="true">◆</span>
                              </Fragment>
                          )),
                      )
                    : (['a', 'b'] as const).map((run) =>
                          Array.from({ length: NULL_REPEAT }, (_, i) => (
                              <Fragment key={`null-${run}-${i}`}>
                                  <span className="tape-item tape-item-null">{NULL_PHRASE}</span>
                                  <span className="tape-sep-outer" aria-hidden="true">◆</span>
                              </Fragment>
                          )),
                      )}
            </div>
        </div>
    );
}
