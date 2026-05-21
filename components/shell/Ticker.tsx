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
 *   - body.tape-framed: filled bar, inverted colours
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

import { useEffect, useRef } from 'react';
import { tapeFeedItems } from '../../lib/data/tapeEvents';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

function RailItem({ item }: { item: TapeFeedItem }) {
    const boldClass = item.type === 'mint' ? ' bold' : '';
    return (
        <span className={`tape-item${boldClass}`}>
            {item.name && (
                <>
                    <b>{item.name}</b>
                    {item.sigil && (
                        <span
                            className="tape-sigil"
                            style={{ marginLeft: 3 }}
                        >
                            {item.sigil}
                        </span>
                    )}
                    {' '}
                </>
            )}
            {item.verb}
            {' '}
            <span className="tape-sep-inner">·</span>
            {' '}
            {item.coll} #{item.id}
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
    const { notifs } = usePdNotifs();
    const railRef = useRef<HTMLDivElement | null>(null);
    const items = tapeFeedItems();

    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, []);

    // React gate — all hooks above, early return below. No DOM rendered
    // when tape is off so there's nothing to flash on load.
    if (notifs.menutape === 0) return null;

    return (
        <div className="tape-wrap" id="tapeWrap" aria-hidden="true">
            <div className="tape-rail" id="tapeRail" ref={railRef}>
                {/* Sim 13317-13318: rail HTML doubled with an outer
                    separator between, so the engine's modulo-halfWidth
                    translate reads as a seamless loop. */}
                {items.map((item, i) => (
                    <RailItem key={`a-${i}`} item={item} />
                ))}
                <span className="tape-sep-outer">··</span>
                {items.map((item, i) => (
                    <RailItem key={`b-${i}`} item={item} />
                ))}
                <span className="tape-sep-outer">··</span>
            </div>
        </div>
    );
}
