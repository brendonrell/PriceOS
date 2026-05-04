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

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { tapeFeedItems, tapeBodyIcon } from '../../lib/data/tapeEvents';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';

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

function BodyItem({ item }: { item: TapeFeedItem }) {
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

    if (notifs.menutape === 0) return null;

    const framed = notifs.menutape === 4;
    const items = tapeFeedItems();

    return (
        <AccordionBox
            boxId="tapeBox"
            listId="tapeList"
            open={notifs.tapeOpen}
            onHeaderClick={() => setAccordion('tape', !notifs.tapeOpen)}
            className={framed ? 'menu-tape-framed' : 'menu-tape-bold'}
            header={
                <div
                    className="menu-tape-rail-h"
                    id="menuTapeRailH"
                    aria-label="Menu Tape"
                >
                    {/* Sim 6020: rail HTML concatenated with itself + a
                        separator so the marquee reads as a seamless
                        loop. Animation hooks come from the existing
                        menu-tape-rail-h CSS in globals.css. */}
                    {items.map((item, i) => (
                        <RailItem key={`a-${i}`} item={item} />
                    ))}
                    <span className="tape-sep-outer">··</span>
                    {items.map((item, i) => (
                        <RailItem key={`b-${i}`} item={item} />
                    ))}
                </div>
            }
        >
            {items.map((item, i) => (
                <BodyItem key={i} item={item} />
            ))}
        </AccordionBox>
    );
}
