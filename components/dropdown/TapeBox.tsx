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
 * Header click toggles the body open/closed (when there are events
 * to show). The body content is empty in step 3 — the tape data
 * source lands when the indexer wires up.
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

export function TapeBox() {
    const { notifs, setAccordion } = usePdNotifs();

    if (notifs.menutape === 0) return null;

    const framed = notifs.menutape === 4;

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
                    {/* Tape rail content is wired when indexer data lands. */}
                </div>
            }
        >
            {/* No items yet — tape rail's body is the same data, scrolled. */}
        </AccordionBox>
    );
}
