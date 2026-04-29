'use client';

/*
 * PingsBox
 *
 * The Pings accordion. Pings is the "always there" default — when no
 * other accordion is open, Pings shows its list. Clicking the Pings
 * header while Notes/Todos/Tape are open closes those and brings
 * Pings back to the front.
 *
 * Per the sim's handlePingsHeaderClick: if any other accordion is
 * open, this header click closes them. Otherwise it's a no-op (Pings
 * itself doesn't toggle — it has no closed state of its own).
 */

import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { MOCK_PINGS } from '../../lib/data/mockPings';

export function PingsBox() {
    const { notifs, setAccordion } = usePdNotifs();

    // Pings is shown when no other accordion is open
    const pingsActive = !notifs.notes && !notifs.todos && !notifs.tapeOpen;

    const onHeaderClick = () => {
        // If something else is open, close it (Pings becomes visible).
        // Else, no-op — Pings has no "closed" state in the sim.
        if (!pingsActive) {
            setAccordion('pings', true);
        }
    };

    return (
        <AccordionBox
            boxId="pingsBox"
            listId="notifList"
            alwaysOpen={pingsActive}
            open={pingsActive}
            onHeaderClick={onHeaderClick}
            header={
                <>
                    PINGS
                    <span className="notif-count">({MOCK_PINGS.length})</span>
                </>
            }
        >
            {MOCK_PINGS.map((p) => (
                <div key={p.id} className="notif-item">
                    <span className="n-icon">{p.icon}</span>
                    <span>{p.handle} {p.action}</span>
                </div>
            ))}
        </AccordionBox>
    );
}
