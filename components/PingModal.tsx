'use client';

/*
 * PingModal — a ping that goes somewhere (Brendon, 2026-07-27).
 *
 * EVERY ping opens THIS popup first (2026-09-13, Brendon — "tapping some
 * pings immediately takes you to a different page, we want the user to
 * expect the modal"). The popup itself carries the ping's one real door as
 * an action button: a to-do opens your To-Dos, an achievement/streak opens
 * your achievements tab, a market ping (mint/sale/offer/trade/etc.) opens
 * the piece/project/Exchange it points to, and a ping with a person on it
 * opens them. No ping ever navigates straight off the row anymore.
 *
 * A POPUP, not a nav (his words): the pings list stays exactly where it was
 * underneath, so reading one never costs you your place.
 *
 * It wears the DELETE-CONFIRM's shape (Brendon, 2026-07-28) — the same dimmed
 * overlay and centered inverted card the platform already uses to confirm a
 * delete, instead of a full-screen sheet. A ping is a small thing to read; it
 * gets a small card.
 */

import { useCallback, useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { usePings } from '../lib/state/PingsContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useDropdown } from '../lib/state/DropdownContext';
import { useToast } from '../lib/state/ToastContext';
import { useAuth } from '../lib/state/AuthContext';
import { renderPing, pingHref } from '../lib/pings/render';
import { ACHIEVEMENTS_ICON } from '../lib/achievements/icon';
import { useSpriteFace } from '../lib/hooks/useSpriteFace';
import SpriteFace from './SpriteFace';
import { getTodos, subscribeTodos, toggleTodo, type TodoItem } from '../lib/todos/todoStore';
import { PriceDayWidget, TokenWidget } from './stone/StoneDeck';

const VS15 = '︎';

/* ── SYNTHETIC CARDS (Brendon, 2026-09-16) — the home marquee's non-nav
   pills open THIS SAME modal, same overlay, same card, instead of growing a
   second popup. `synthetic` payloads never touch the pings store; when one
   names a `widget`, the card drops in the Command Stone's OWN widget
   component verbatim (copy/pasted import, not re-implemented) — the exact
   live card the Stone would show, sitting inside the ping-shaped popup. */
export interface SyntheticPingPayload {
    synthetic: true;
    tag?: string;
    glyph?: string;
    title?: string;
    meta?: string;
    /** A widget straight off the Stone's own deck (StoneDeck.tsx) — no
        navigation, no re-drawing: the real component, rendered here. */
    widget?: { kind: 'token'; symbol: string } | { kind: 'priceday' };
}

/* The card's top row when a PERSON is involved — their PriceSprite (Brendon,
   2026-08-02), at the ID-row's designated size. The kind title stands in while
   the face loads, and under ASCII-ID mode (which hides every face site-wide). */
function ActorTopRow({ handle, title }: { handle: string; title: string }) {
    const face = useSpriteFace(handle);
    if (!face) return <>{title}</>;
    return (
        <>
            <SpriteFace className="id-row-sprite" face={face} />
            <span className="ping-card-kind-ascii">{title}</span>
        </>
    );
}

/** The ping's own name for itself — the popup's title. */
function titleOf(kind: string, reminder: string | null): string {
    if (kind === 'PING') {
        if (reminder === 'todo' || reminder === 'sentinel') return 'TO-DO';
        if (reminder === 'calendar') return 'CALENDAR';
        if (reminder === 'streak') return 'STREAK';
        if (reminder === 'workflow') return 'WORKFLOW';
        if (reminder === 'pingart') return 'PINGART';
        return 'PING';
    }
    if (kind === 'ACHIEVEMENT') return 'ACHIEVEMENTS';
    if (kind === 'STREAK') return 'STREAK';
    if (kind === 'FOLLOW' || kind === 'PROJECT_FOLLOW' || kind === 'OUTPUT_FOLLOW') return 'FOLLOW';
    return kind.replace(/_/g, ' ');
}

/** One unlock as the rolled achievements ping carries it (pingAchievements). */
interface ListedUnlock { id: string; name: string; points: number; icon?: string }

export default function PingModal() {
    const { stack, close } = useModal();
    const { state } = usePings();
    const { setAccordion } = usePdNotifs();
    const { openMenu } = useDropdown();
    const { handle: myHandle, siweAddress } = useAuth();
    const { isOpen, isTopStacked } = useModalLayer('ping');

    const entry = [...stack].reverse().find((m) => m.name === 'ping');
    const rawPayload = typeof entry?.payload === 'string' ? entry.payload : '';
    /* A synthetic card never collides with a real ping id — real ids are
       never valid JSON, so a successful parse with the marker is proof. */
    const synthetic = useMemo<SyntheticPingPayload | null>(() => {
        if (!rawPayload) return null;
        try {
            const obj = JSON.parse(rawPayload);
            return obj && obj.synthetic === true ? (obj as SyntheticPingPayload) : null;
        } catch { return null; }
    }, [rawPayload]);
    const pingId = synthetic ? '' : rawPayload;
    const item = useMemo(() => state.items.find((p) => p.id === pingId) ?? null, [state.items, pingId]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); },
        [close],
    );

    const { showToast } = useToast();

    const r = item ? renderPing(item) : null;
    const reminder = typeof item?.data?.reminder === 'string' ? (item.data.reminder as string) : null;

    /* ── Complete the to-do RIGHT HERE (Brendon, 2026-08-02: the modal only
       sent you to the To-Dos menu). The reminder ping carries the to-do's
       text; match it against the real store — open first, then done, so the
       button is a live toggle. The card STAYS OPEN and updates under your
       finger (Rule #-0.55); the To-Dos door stays beside it. */
    const isTodoPing = reminder === 'todo' || reminder === 'sentinel';
    const pingText = typeof item?.data?.text === 'string' ? (item.data.text as string).trim() : '';
    const [todoMatch, setTodoMatch] = useState<TodoItem | null>(null);
    useEffect(() => {
        if (!isOpen || !isTodoPing || !pingText) { setTodoMatch(null); return; }
        const read = () => {
            const all = getTodos();
            setTodoMatch(
                all.find((t) => !t.done && t.text.trim() === pingText)
                ?? all.find((t) => t.done && t.text.trim() === pingText)
                ?? null,
            );
        };
        read();
        return subscribeTodos(read);
    }, [isOpen, isTodoPing, pingText]);
    const onToggleTodo = () => {
        if (!todoMatch) return;
        const res = toggleTodo(todoMatch.id);
        showToast(res === 'recurred' ? 'To-Do: RESCHEDULED' : res === 'reopened' ? 'To-Do: REOPENED' : 'To-Do: DONE');
    };
    /* CLOCK TIMES ARE VIEWER-LOCAL, always — date and time from the same
       instant, in the reader's own zone. */
    const when = item
        ? new Date(item.created_at).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
        }).toUpperCase()
        : '';

    const openTodos = () => {
        openMenu();
        setAccordion('todos', true);
        close();
    };

    /* ── The rolled achievements ping (Brendon, 2026-08-03) — the card lists
       the batch; tapping any entry (or the door) lands on the achievements
       tab of YOUR profile. Achievements pings are self-pings, so the door is
       always the viewer's own profile. */
    const isAchPing = item?.kind === 'ACHIEVEMENT';
    /* STREAK rides the same achievements-tab door as ACHIEVEMENT (PriceStreak
       is an achievements category) — it just skips the unlocks list below,
       which is ACHIEVEMENT's own batch-of-unlocks shape. */
    const hasAchDoor = isAchPing || item?.kind === 'STREAK';
    const achUnlocks: ListedUnlock[] =
        isAchPing && Array.isArray(item?.data?.unlocks)
            ? (item.data.unlocks as ListedUnlock[]).filter((u) => u && typeof u.name === 'string')
            : [];
    const achHref = myHandle ? `/${myHandle}?tab=more&sub=achievements` : null;

    /* ── Every other ping's real door (Brendon, 2026-09-13) — mint / sale /
       offer / trade / list / transfer / wishlist / watch / follow-of-yours
       all point somewhere; the row no longer takes you there directly, this
       button does. pingHref already carries the ?offers=1 / ?trade= shaping. */
    const marketHref = item ? pingHref(item) : null;
    const isTradeDoor = item?.kind === 'TRADE' || item?.kind === 'TRADE_ACCEPTED' || item?.kind === 'TRADE_DECLINED';
    const isOfferDoor = item?.kind === 'OFFER' || item?.kind === 'COUNTER';
    const marketLabel = isTradeDoor ? 'OPEN EXCHANGE' : isOfferDoor ? 'VIEW OFFER' : (item?.token_id ? 'VIEW PIECE' : 'VIEW PROJECT');

    if (!isOpen) return null;

    return (
        <div
            id="pingModal"
            className="starred-confirm-overlay ping-confirm-overlay"
            role="dialog"
            aria-modal="true"
            data-stack-top={isTopStacked || undefined}
            onClick={onBackdropClick}
        >
            <div className="ms-confirm-card is-centered ping-card" onClick={(e) => e.stopPropagation()}>
                <div className="ping-card-kind">
                    {synthetic ? (synthetic.tag ?? 'PD')
                        : item?.actor_name ? (
                            <ActorTopRow handle={item.actor_name} title={r ? titleOf(r.kind, reminder) : 'PING'} />
                        ) : (
                            r ? titleOf(r.kind, reminder) : 'PING'
                        )}
                </div>
                {synthetic ? (
                    <>
                        {(synthetic.glyph || synthetic.title || synthetic.meta) && (
                            <div className="ms-confirm-question ping-card-line">
                                {synthetic.glyph && <span className="ping-card-ic">{synthetic.glyph}</span>}
                                <span>
                                    {synthetic.title}
                                    {synthetic.meta ? ` — ${synthetic.meta}` : ''}
                                </span>
                            </div>
                        )}
                        {/* THE WIDGET, VERBATIM — the exact component the Command
                            Stone renders for this same summon, dropped straight
                            into the popup (no re-implementation, no navigating
                            away to see it). */}
                        {synthetic.widget?.kind === 'token' && (
                            <TokenWidget symbol={synthetic.widget.symbol} address={siweAddress ?? ''} />
                        )}
                        {synthetic.widget?.kind === 'priceday' && <PriceDayWidget />}
                        <div className="ms-confirm-btns ping-card-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={close}>
                                Close
                            </button>
                        </div>
                    </>
                ) : r ? (
                    <>
                        <div className="ms-confirm-question ping-card-line">
                            <span className={`ping-card-ic ping-ic ping-ic--${r.kind}`}>{r.icon}</span>
                            <span>
                                {r.handle && <strong>{r.handle}</strong>}
                                {r.handle ? ' ' : ''}
                                {r.action}
                            </span>
                        </div>
                        {isAchPing && achUnlocks.length > 0 && (
                            /* The batch, one row per unlock — scrolls inside
                               itself when it outgrows the card (Rule #-0.55). */
                            <div className="ping-ach-list">
                                {achUnlocks.map((u) =>
                                    achHref ? (
                                        <a key={u.id} className="ping-ach-row" href={achHref} onClick={() => close()}>
                                            <span className="ping-ach-ic">{u.icon || ACHIEVEMENTS_ICON}</span>
                                            <span className="ping-ach-name">{u.name}</span>
                                            <span className="ping-ach-pts">+{u.points}</span>
                                        </a>
                                    ) : (
                                        <div key={u.id} className="ping-ach-row">
                                            <span className="ping-ach-ic">{u.icon || ACHIEVEMENTS_ICON}</span>
                                            <span className="ping-ach-name">{u.name}</span>
                                            <span className="ping-ach-pts">+{u.points}</span>
                                        </div>
                                    ),
                                )}
                            </div>
                        )}
                        <div className="ping-card-when">{when}</div>
                        <div className="ms-confirm-btns ping-card-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={close}>
                                Close
                            </button>
                            {isTodoPing && todoMatch && (
                                <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={onToggleTodo}>
                                    {todoMatch.done ? `✓${VS15} DONE` : `❍${VS15} MARK DONE`}
                                </button>
                            )}
                            {isTodoPing && (
                                <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={openTodos}>
                                    {`❍${VS15}`} OPEN TO-DOS
                                </button>
                            )}
                            {hasAchDoor && achHref && (
                                <a className="ms-confirm-btn ms-confirm-btn--ok" href={achHref} onClick={() => close()}>
                                    {ACHIEVEMENTS_ICON} ACHIEVEMENTS
                                </a>
                            )}
                            {marketHref && (
                                <a className="ms-confirm-btn ms-confirm-btn--ok" href={marketHref} onClick={() => close()}>
                                    {r.icon} {marketLabel}
                                </a>
                            )}
                            {item?.actor_name && (
                                <a className="ms-confirm-btn ms-confirm-btn--ok" href={`/${item.actor_name}`} onClick={() => close()}>
                                    {`☻${VS15}`} @{item.actor_name}
                                </a>
                            )}
                        </div>
                    </>
                ) : (
                    <>
                        <div className="ms-confirm-question">This ping has moved on.</div>
                        <div className="ms-confirm-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={close}>
                                Close
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
