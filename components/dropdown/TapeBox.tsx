'use client';

/*
 * TapeBox
 *
 * The Menu Tape — a clone of the notification box structure where the
 * header SLOT contains the scrolling tape rail instead of a label.
 *
 * Visibility: gated by pdNotifs.menutape mode. Mode 0 = OFF (don't
 * render). Modes 3 (Bold) and 4 (Framed) render the box.
 *
 * Header click toggles the body open/closed. Items come from
 * lib/data/tapeEvents.ts (Build 25 D10 — was empty prior).
 *
 * The horizontal rail content is doubled (sim 6020) so the CSS
 * marquee animation reads as a seamless loop. The expanded body
 * uses the same data with the .notif-item visual grammar.
 */

import { useEffect, useRef } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { tapeBodyIcon } from '../../lib/data/tapeEvents';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { useTapeFeed } from '../../lib/feed/useTapeFeed';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';

function RailItem({ item }: { item: TapeFeedItem }) {
    const isSpited = useSpiteMatcher();
    const boldClass = item.type === 'mint' ? ' bold' : '';
    if (item.follow || item.unfollow) {
        return (
            <span className="tape-item bold">
                <b>{item.coll.toUpperCase()}</b> {item.follow ? 'started following' : 'unfollowed'}{' '}
                <b className={item.name && isSpited(item.name) ? 'spited' : undefined}>{item.name}</b>
            </span>
        );
    }
    return (
        <span className={`tape-item${boldClass}`}>
            {item.name && (
                <>
                    <b className={isSpited(item.name) ? 'spited' : undefined}>{item.name}</b>
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

function BodyItem({ item }: { item: TapeFeedItem }) {
    const isSpited = useSpiteMatcher();
    return (
        <div className="notif-item">
            <span className="n-icon">
                {tapeBodyIcon(item.type)}
                {'\uFE0E'}
            </span>
            {' '}
            <span>
                {item.name && (
                    <>
                        <b className={isSpited(item.name) ? 'spited' : undefined}>{item.name}</b>
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
                {item.verb} {item.coll} #{item.id}
                {item.price && (
                    <span style={{ opacity: 0.7 }}> · {item.price}</span>
                )}
            </span>
        </div>
    );
}

export function TapeBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const railRef = useRef<HTMLDivElement | null>(null);
    const items = useTapeFeed();

    /* F52 / BUG-16 — subscribe the menu-tape rail to the shared tape
       engine for rAF-driven horizontal scroll. Sim 6045-6067 +
       6082-6084: sim animates whenever menutape mode > 0 (regardless
       of accordion-body-open state — the rail lives in the header
       and is visible whenever TapeBox is rendered).

       Effect depends on notifs.menutape because the early-return
       below means the rail JSX is gated on that flag. When mode
       flips 0 → 3/4 the rail mounts, this effect re-runs, and the
       new ref attaches. When mode flips back to 0 the rail unmounts,
       cleanup runs, the engine drops the subscription, and the
       transform is reset. */
    useEffect(() => {
        const rail = railRef.current;
        if (!rail) return;
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [notifs.menutape, items]);

    if (notifs.menutape === 0) return null;

    const framed = notifs.menutape === 4;

    return (
        <AccordionBox
            boxId="tapeBox"
            listId="tapeList"
            open={notifs.tapeOpen}
            onHeaderClick={() => setAccordion('tape', !notifs.tapeOpen)}
            className={framed ? 'menu-tape-framed' : 'menu-tape-bold'}
            headerClassName="menu-tape-header"
            header={
                <div
                    className="menu-tape-rail-h"
                    id="menuTapeRailH"
                    aria-label="Menu Tape"
                    ref={railRef}
                >
                    {/* Rail content doubled with a separator so the engine's
                        modulo-halfWidth translate reads as a seamless loop.
                        Empty until our own pre-chain activity accrues. */}
                    {items.length > 0 && (
                        <>
                            {items.map((item, i) => (
                                <RailItem key={`a-${i}`} item={item} />
                            ))}
                            <span className="tape-sep-outer">··</span>
                            {items.map((item, i) => (
                                <RailItem key={`b-${i}`} item={item} />
                            ))}
                            {/* Trailing boundary marker so the loop seam carries
                                the same gap as the mid-point and the two halves are
                                an even double (Brendon, 2026-06-16). */}
                            <span className="tape-sep-outer">··</span>
                        </>
                    )}
                </div>
            }
        >
            {items.length === 0 ? (
                Array.from({ length: 6 }, (_, i) => (
                    <div className="notif-item ghost-feed-row" key={`g-${i}`} aria-hidden="true">
                        <span className="n-icon">{['✦', '✹', '✶', '✸', '✦', '✹'][i % 6]}&#xFE0E;</span>{' '}
                        <span className="ghost-feed-bar ghost-feed-bar-content" />
                    </div>
                ))
            ) : (
                items.map((item, i) => <BodyItem key={i} item={item} />)
            )}
        </AccordionBox>
    );
}
