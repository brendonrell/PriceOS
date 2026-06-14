'use client';

/*
 * PingsBox
 *
 * The Pings accordion — the live notification inbox. Renders the signed-in
 * user's real pings (from PingsContext), honours the per-category prefs in
 * notifs.pings, and clears the unread badge when the panel opens.
 *
 * The tape rail is preserved untouched: when menutape > 0 the rail runs inside
 * the header alongside the PINGS label.
 */

import { useEffect, useRef, useState } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { usePings } from '../../lib/state/PingsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { renderPing, passesCategoryPrefs } from '../../lib/pings/render';
import { isFinancial } from '../../lib/pings/tiers';
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
    const { state: pingsState, markAllRead } = usePings();
    const { siweAddress } = useAuth();
    const railRef = useRef<HTMLDivElement>(null);
    // "Money" filter — isolate financial-signal pings from social noise.
    // Control removed from the header (Brendon 2026-06-14, to be re-homed
    // later); the filter scaffolding stays dormant (always shows all).
    const [moneyOnly] = useState(false);

    const pingsActive = !notifs.notes && !notifs.todos && !notifs.tapeOpen;
    const tapeOn = notifs.menutape > 0;
    const items = tapeOn ? tapeFeedItems() : [];

    useEffect(() => {
        const rail = railRef.current;
        if (!rail || !tapeOn) return;
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [tapeOn]);

    // Opening the Pings panel = seeing them → clear the unread badge.
    useEffect(() => {
        if (pingsActive && siweAddress && pingsState.unreadCount > 0) {
            markAllRead();
        }
    }, [pingsActive, siweAddress, pingsState.unreadCount, markAllRead]);

    const onHeaderClick = () => {
        if (!pingsActive) setAccordion('pings', true);
    };

    // Real pings → rendered, category-filtered, and (optionally) money-only.
    const rendered = pingsState.items
        .filter((p) => passesCategoryPrefs(p.kind, notifs.pings))
        .filter((p) => !moneyOnly || isFinancial(p.kind))
        .map((p) => renderPing(p));

    const unread = pingsState.unreadCount;
    const badgeText = unread > 99 ? '99+' : String(unread);

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
                        {unread > 0 && (
                            <span className="pings-count-badge pings-count-badge--inline">
                                {badgeText}
                            </span>
                        )}
                    </span>
                    {tapeOn && (
                        <div className="pings-tape-wrap">
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
                        </div>
                    )}
                </div>
            }
        >
            {rendered.length === 0 ? (
                <div className="pings-empty">
                    {siweAddress ? 'No pings yet' : 'Connect to see your pings'}
                </div>
            ) : (
                rendered.map((p) => (
                    <div key={p.id} className={`notif-item${p.read ? ' read' : ''}`}>
                        <span className={`n-icon ping-ic ping-ic--${p.kind}`}>{p.icon}</span>
                        <span>
                            {p.handle && <strong>{p.handle}</strong>}
                            {p.handle ? ' ' : ''}
                            {p.action}
                        </span>
                    </div>
                ))
            )}
        </AccordionBox>
    );
}
