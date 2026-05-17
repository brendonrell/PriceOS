'use client';

/*
 * PingsBox
 *
 * The Pings accordion. When menutape > 0 the tape rail runs inside
 * the header alongside the PINGS label — no separate TapeBox needed.
 * The rail occupies the remaining header space and keeps scrolling
 * even when pings is collapsed.
 */

import { useEffect, useRef } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { MOCK_PINGS } from '../../lib/data/mockPings';
import { tapeFeedItems } from '../../lib/data/tapeEvents';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';

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

export function PingsBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const railRef = useRef<HTMLDivElement>(null);

    const pingsActive = !notifs.notes && !notifs.todos && !notifs.tapeOpen;
    const tapeOn = notifs.menutape > 0;
    const items = tapeOn ? tapeFeedItems() : [];

    useEffect(() => {
        const rail = railRef.current;
        if (!rail || !tapeOn) return;
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [tapeOn]);

    const onHeaderClick = () => {
        if (!pingsActive) setAccordion('pings', true);
    };

    return (
        <AccordionBox
            boxId="pingsBox"
            listId="notifList"
            alwaysOpen={pingsActive}
            open={pingsActive}
            onHeaderClick={onHeaderClick}
            scrollStep={60}
            header={
                <div className="pings-header-row">
                    <span className="pings-label">
                        PINGS
                        <span className="notif-count">(8)</span>
                    </span>
                    {tapeOn && (
                        <div
                            className="menu-tape-rail-h pings-tape-inline"
                            ref={railRef}
                            aria-label="Menu Tape"
                        >
                            {items.map((item, i) => (
                                <RailItem key={`a-${i}`} item={item} />
                            ))}
                            <span className="tape-sep-outer">··</span>
                            {items.map((item, i) => (
                                <RailItem key={`b-${i}`} item={item} />
                            ))}
                        </div>
                    )}
                </div>
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
