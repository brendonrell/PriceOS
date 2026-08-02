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

import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { AccordionBox } from './AccordionBox';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useDropdown } from '../../lib/state/DropdownContext';
import { usePings } from '../../lib/state/PingsContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { renderPing, passesCategoryPrefs, pingHref, PRIORITY_RANK } from '../../lib/pings/render';
import { isFinancial } from '../../lib/pings/tiers';
import { useOfferShield } from '../../lib/pings/useOfferShield';
import { useToast } from '../../lib/state/ToastContext';
import { removeProjectStar } from '../../lib/pins/projectStarStore';
import { removeArtistStar } from '../../lib/pins/artistStarStore';
import type { FeedItem } from '../../lib/pings/render';
import { useTapeFeed } from '../../lib/feed/useTapeFeed';
import type { TapeFeedItem } from '../../lib/data/tapeEvents';
import { subscribeTapeRail } from '../../lib/engines/tapeEngine';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { allProjects } from '../../lib/project/registry';

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

export function PingsBox({ projectPings = false }: { projectPings?: boolean } = {}) {
    const { notifs, setAccordion } = usePdNotifs();
    const { menuOpen } = useDropdown();
    const { state: pingsState, markSeen, refresh } = usePings();
    const { siweAddress, handle } = useAuth();
    const { showToast } = useToast();
    const { open: openModal } = useModal();
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

    // Anchor on open: snap to the top of the unread stack (the list DOM
    // persists across close/reopen, so yesterday's scroll position would
    // otherwise open you mid-history). Programmatic — the guard below keeps
    // it from counting as the user's read-proving scroll.
    const ignoreScrollUntil = useRef(0);
    useEffect(() => {
        if (!pingsActive) return;
        const list = document.getElementById('notifList');
        if (!list || list.scrollTop === 0) return;
        ignoreScrollUntil.current = Date.now() + 500;
        list.scrollTo({ top: 0 });
    }, [pingsActive]);

    const onHeaderClick = () => {
        if (!pingsActive) setAccordion('pings', true);
    };

    /* ── Long-press a ping → quiet its source ─────────────────────────────
       Same hold gesture as the title stars (500ms, cancels on 10px drift).
       What "quiet" means per ping:
         • starred-artist ping  → remove that artist star
         • starred-project ping → remove that project star
         • any actor ping (mutual activity, follows, market, Artist Push)
           → toggle a people-mute on the actor (server-enforced everywhere)
       Trait/rarity/reminder rows have no single quietable source — no-op. */
    const lpTimer = useRef<number | null>(null);
    const lpStart = useRef<{ x: number; y: number } | null>(null);
    const lpFired = useRef(false);
    const quiet = async (src: FeedItem) => {
        const watch = typeof src.data?.watch === 'string' ? (src.data.watch as string) : null;
        if (watch === 'artist' && src.actor_name) {
            removeArtistStar(src.actor_name);
            showToast('Artist star: REMOVED');
            return;
        }
        if (watch === 'project' && src.project_id) {
            removeProjectStar(src.project_id);
            showToast('Project star: REMOVED');
            return;
        }
        if (watch === 'trait' || watch === 'rarity') return;
        if (!src.actor_name) return;
        try {
            const r = await fetch('/api/social/mute', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ handle: src.actor_name }),
            });
            if (!r.ok) { showToast('Mute: FAILED'); return; }
            const j = (await r.json()) as { muted: boolean };
            showToast(`@${src.actor_name}: ${j.muted ? 'MUTED' : 'UNMUTED'}`);
        } catch {
            showToast('Mute: FAILED');
        }
    };
    const lpClear = () => {
        if (lpTimer.current != null) { window.clearTimeout(lpTimer.current); lpTimer.current = null; }
    };
    const longPress = (src: FeedItem) => ({
        onPointerDown: (e: PointerEvent) => {
            lpFired.current = false;
            lpStart.current = { x: e.clientX, y: e.clientY };
            lpClear();
            lpTimer.current = window.setTimeout(() => {
                lpFired.current = true;
                void quiet(src);
            }, 500);
        },
        onPointerMove: (e: PointerEvent) => {
            const s0 = lpStart.current;
            if (s0 && Math.hypot(e.clientX - s0.x, e.clientY - s0.y) > 10) lpClear();
        },
        onPointerUp: lpClear,
        onPointerCancel: lpClear,
        onClick: (e: MouseEvent) => {
            // A hold that fired must not also navigate.
            if (lpFired.current) { e.preventDefault(); e.stopPropagation(); }
        },
        onContextMenu: (e: MouseEvent) => {
            // iOS long-press raises a context menu on links — the hold owns it.
            if (lpFired.current) e.preventDefault();
        },
    });

    // Real pings → rendered, category-filtered, and (optionally) money-only.
    // UNREAD stack on top (full-strength), seen history sinks below (struck
    // through). Within each block: attention tier (HIGH → LOW), recency
    // preserved inside a tier (the API hands items newest-first; sort is
    // stable).
    /* Studio "Project Pings" — restrict to pings about the artist's OWN
       released (live in the registry) projects (Brendon, 2026-07-14). */
    const releasedSlugs = useMemo(
        () => (projectPings && handle
            ? new Set(allProjects().filter((p) => p.artistHandle === handle).map((p) => p.slug))
            : null),
        [projectPings, handle]
    );

    /* Offer Shield (Spell Book) — when on, hide incoming offers under 50% of
       their collection floor. Fail-open: only offers PROVEN low are hidden, so
       it can never swallow a real ping. */
    const shielded = useOfferShield(pingsState.items, notifs.spell_offershield);

    const rendered = useMemo(
        () =>
            pingsState.items
                .filter((p) => passesCategoryPrefs(p, notifs.pings))
                .filter((p) => !moneyOnly || isFinancial(p.kind))
                .filter((p) => !releasedSlugs || (p.project_id != null && releasedSlugs.has(p.project_id)))
                .filter((p) => !shielded.has(p.id))
                .map((p) => ({ ...renderPing(p), href: pingHref(p), src: p }))
                .sort(
                    (a, b) =>
                        (a.read ? 1 : 0) - (b.read ? 1 : 0) ||
                        PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
                ),
        [pingsState.items, notifs.pings, moneyOnly, releasedSlugs, shielded]
    );
    const unreadShown = rendered.filter((r) => !r.read).length;

    /* ⛔ THE WHOLE INBOX IS NOT BUILT ON EVERY PAGE (Brendon, 2026-08-01: "could
       it be all my pings"). The menu's stack is only hidden, never unmounted —
       so up to a hundred ping rows sat live in the page on EVERY screen, and
       opening the menu had to raise all of them at once. The list starts at a
       screenful; the rest fill in once the menu is open and the slide has
       finished, so the open is cheap and nothing is lost — scrolling still
       reaches every ping, and the rows stay put across close → reopen. */
    const FIRST_PAGE = 25;
    const [cap, setCap] = useState(FIRST_PAGE);
    useEffect(() => {
        if (!menuOpen || cap >= rendered.length) return;
        const t = window.setTimeout(() => setCap(Number.MAX_SAFE_INTEGER), 450);
        return () => window.clearTimeout(t);
    }, [menuOpen, cap, rendered.length]);
    const shown = useMemo(() => rendered.slice(0, cap), [rendered, cap]);

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
    const renderedIdsKey = shown.map((r) => r.id + (r.read ? '' : '*')).join(',');
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
            if (Date.now() < ignoreScrollUntil.current) return; // anchor snap, not the user
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
                        {projectPings ? 'PROJECT PINGS' : 'PINGS'}
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
            {shown.length === 0 ? (
                <div className="pings-empty">
                    {siweAddress ? 'No pings yet' : 'Connect to see your pings'}
                </div>
            ) : (
                shown.map((p, i) => {
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
                    /* The SEEN divider — the hairline between the fresh stack
                       and struck-through history (only when both exist). */
                    const divider =
                        i > 0 && p.read && !shown[i - 1].read ? (
                            <div className="pings-seen-divider" aria-hidden="true">SEEN</div>
                        ) : null;
                    const lp = longPress(p.src);
                    /* Market pings deep-link to the piece (offer family lands
                       with the offers panel open) — a real <a>, so the global
                       client-side interceptor routes it like every other link.
                       Long-press (500ms hold) quiets the ping's source. */
                    return (
                        <Fragment key={p.id}>
                            {divider}
                            {p.href ? (
                                <a href={p.href} className={`${cls} notif-item--link`} data-ping-id={p.id} data-ping-read={p.read ? '1' : '0'} {...lp}>{body}</a>
                            ) : (
                                /* No deep link (to-dos, achievements, streaks,
                                   the system speaking) — the ping opens its own
                                   popup instead of dead-ending (Brendon,
                                   2026-07-27). A hold still owns the gesture. */
                                <div
                                    className={`${cls} notif-item--link`}
                                    data-ping-id={p.id}
                                    data-ping-read={p.read ? '1' : '0'}
                                    role="button"
                                    tabIndex={0}
                                    {...lp}
                                    onClick={(e) => { lp.onClick(e); if (!lpFired.current) openModal('ping', p.id); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openModal('ping', p.id); } }}
                                >{body}</div>
                            )}
                        </Fragment>
                    );
                })
            )}
        </AccordionBox>
    );
}
