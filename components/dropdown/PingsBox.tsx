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

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { usePings } from '../../lib/state/PingsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { renderPing, passesCategoryPrefs, pingHref, PRIORITY_RANK } from '../../lib/pings/render';
import { isFinancial } from '../../lib/pings/tiers';
import { useTapeFeed } from '../../lib/feed/useTapeFeed';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
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

export function PingsBox() {
    const { notifs, setAccordion } = usePdNotifs();
    const { state: pingsState, markSeen, refresh } = usePings();
    const { siweAddress } = useAuth();
    const isSpited = useSpiteMatcher();
    const railRef = useRef<HTMLDivElement>(null);
    // "Money" filter — isolate financial-signal pings from social noise.
    // Control removed from the header (Brendon 2026-06-14, to be re-homed
    // later); the filter scaffolding stays dormant (always shows all).
    const [moneyOnly] = useState(false);

    const pingsActive = !notifs.notes && !notifs.todos && !notifs.tapeOpen;
    const tapeOn = notifs.menutape > 0;
    /* Same live feed The Tape uses (was stale mock data) — Brendon, 2026-06-22. */
    const realItems = useTapeFeed();
    const items = tapeOn ? realItems : [];

    useEffect(() => {
        const rail = railRef.current;
        if (!rail || !tapeOn) return;
        const unsubscribe = subscribeTapeRail(rail);
        return unsubscribe;
    }, [tapeOn]);

    // Opening the Pings panel → pull the latest list so it's never stale.
    // Opening marks NOTHING read — scrolling the list is what proves viewing
    // (Brendon, 2026-07-12). See the scroll-seen effect below.
    useEffect(() => {
        if (pingsActive && siweAddress) refresh();
    }, [pingsActive, siweAddress, refresh]);

    const onHeaderClick = () => {
        if (!pingsActive) setAccordion('pings', true);
    };

    // Real pings → rendered, category-filtered, and (optionally) money-only.
    // UNREAD stack on top (full-strength), seen history sinks below (struck
    // through). Within each block: attention tier (HIGH → LOW), recency
    // preserved inside a tier (the API hands items newest-first; sort is
    // stable).
    const rendered = useMemo(
        () =>
            pingsState.items
                .filter((p) => passesCategoryPrefs(p, notifs.pings))
                .filter((p) => !moneyOnly || isFinancial(p.kind))
                .map((p) => ({ ...renderPing(p), href: pingHref(p) }))
                .sort(
                    (a, b) =>
                        (a.read ? 1 : 0) - (b.read ? 1 : 0) ||
                        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
                ),
        [pingsState.items, notifs.pings, moneyOnly]
    );
    const unreadShown = rendered.filter((r) => !r.read).length;

    /* ── Read-by-scroll ──────────────────────────────────────────────────
       The contract: a ping is SEEN only when the user has actually scrolled
       the pings list and the row has passed through view. Opening the menu
       alone marks nothing. Mechanics: an IntersectionObserver tracks which
       rows are in the list viewport; the first real scroll gesture flips the
       session live, everything in view at (or after) that moment queues as
       seen, and the queue commits in debounced batches. Re-opening the panel
       requires a fresh scroll gesture. */
    const seenQueue = useRef<Set<string>>(new Set());
    const committed = useRef<Set<string>>(new Set());
    const renderedIdsKey = rendered.map((r) => r.id + (r.read ? '' : '*')).join(',');
    useEffect(() => {
        if (!pingsActive || !siweAddress) return;
        const list = document.getElementById('notifList');
        if (!list) return;
        let scrolled = false;
        let timer = 0;
        const inView = new Set<string>();

        const commit = () => {
            const ids = Array.from(seenQueue.current).filter((id) => !committed.current.has(id));
            seenQueue.current.clear();
            if (ids.length === 0) return;
            ids.forEach((id) => committed.current.add(id));
            markSeen(ids);
        };
        const scheduleCommit = () => {
            window.clearTimeout(timer);
            timer = window.setTimeout(commit, 900);
        };
        const queue = (id: string) => {
            if (committed.current.has(id)) return;
            seenQueue.current.add(id);
            scheduleCommit();
        };

        const io = new IntersectionObserver(
            (entries) => {
                for (const e of entries) {
                    const id = (e.target as HTMLElement).dataset.pingId;
                    if (!id) continue;
                    if (e.isIntersecting) {
                        inView.add(id);
                        if (scrolled) queue(id);
                    } else {
                        inView.delete(id);
                    }
                }
            },
            { root: list, threshold: 0.6 }
        );
        list.querySelectorAll<HTMLElement>('[data-ping-id]').forEach((el) => {
            if (el.dataset.pingRead !== '1') io.observe(el);
        });

        const onScroll = () => {
            scrolled = true;
            inView.forEach(queue);
        };
        list.addEventListener('scroll', onScroll, { passive: true });

        return () => {
            window.clearTimeout(timer);
            list.removeEventListener('scroll', onScroll);
            io.disconnect();
        };
        // renderedIdsKey re-arms observation when rows change (fresh pings land).
    }, [pingsActive, siweAddress, markSeen, renderedIdsKey]);

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
                        {/* Honest count: UNREAD only. Zero unread = no number —
                            never the old perpetual "(100)" window size. */}
                        {unreadShown > 0 && <span className="notif-count">({unreadShown})</span>}
                    </span>
                    {tapeOn && (
                        <div className="pings-tape-wrap">
                            <div
                                className="menu-tape-rail-h pings-tape-inline"
                                ref={railRef}
                                aria-label="Menu Tape"
                            >
                                {/* Each event is followed by a diamond delimiter,
                                    doubled into a seamless loop — identical to The
                                    Tape, so no two events ever run together and the
                                    wrap seam carries the same gap (Brendon, 2026-06-22). */}
                                {(['a', 'b'] as const).map((run) =>
                                    items.map((item, i) => (
                                        <Fragment key={`${run}-${i}`}>
                                            <RailItem item={item} />
                                            <span className="tape-sep-outer" aria-hidden="true">◆</span>
                                        </Fragment>
                                    )),
                                )}
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
                rendered.map((p) => {
                    const cls = `notif-item${p.read ? ' read' : ''}${p.priority === 'high' ? ' notif-item--high' : ''}${p.priority === 'low' ? ' notif-item--low' : ''}`;
                    const body = (
                        <>
                            <span className={`n-icon ping-ic ping-ic--${p.kind}`}>{p.icon}</span>
                            <span>
                                {p.handle && <strong className={isSpited(p.handle) ? 'spited' : undefined}>{p.handle}</strong>}
                                {p.handle ? ' ' : ''}
                                {p.action}
                            </span>
                        </>
                    );
                    /* Market pings deep-link to the piece (offer family lands
                       with the offers panel open) — a real <a>, so the global
                       client-side interceptor routes it like every other link. */
                    return p.href ? (
                        <a key={p.id} href={p.href} className={`${cls} notif-item--link`} data-ping-id={p.id} data-ping-read={p.read ? '1' : '0'}>{body}</a>
                    ) : (
                        <div key={p.id} className={cls} data-ping-id={p.id} data-ping-read={p.read ? '1' : '0'}>{body}</div>
                    );
                })
            )}
        </AccordionBox>
    );
}
