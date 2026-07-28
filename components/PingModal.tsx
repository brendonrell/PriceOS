'use client';

/*
 * PingModal — a ping that goes somewhere (Brendon, 2026-07-27).
 *
 * Most pings deep-link to a piece. The rest — your to-do falling due, an
 * achievement, a streak, the system speaking — used to be dead rows: you tapped
 * them and nothing happened. They now open THIS popup: the ping in full, when it
 * landed in YOUR time, and the one door that ping actually has (a to-do opens
 * your To-Dos; a ping with a person on it opens them).
 *
 * A POPUP, not a nav (his words): the pings list stays exactly where it was
 * underneath, so reading one never costs you your place.
 *
 * It wears the DELETE-CONFIRM's shape (Brendon, 2026-07-28) — the same dimmed
 * overlay and centered inverted card the platform already uses to confirm a
 * delete, instead of a full-screen sheet. A ping is a small thing to read; it
 * gets a small card.
 */

import { useCallback, useMemo, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { usePings } from '../lib/state/PingsContext';
import { usePdNotifs } from '../lib/state/PdNotifsContext';
import { useDropdown } from '../lib/state/DropdownContext';
import { renderPing } from '../lib/pings/render';

const VS15 = '︎';

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
    if (kind === 'ACHIEVEMENT') return 'ACHIEVEMENT';
    if (kind === 'STREAK') return 'STREAK';
    if (kind === 'FOLLOW' || kind === 'PROJECT_FOLLOW' || kind === 'OUTPUT_FOLLOW') return 'FOLLOW';
    return kind.replace(/_/g, ' ');
}

export default function PingModal() {
    const { stack, close } = useModal();
    const { state } = usePings();
    const { setAccordion } = usePdNotifs();
    const { openMenu } = useDropdown();
    const { isOpen, isTopStacked } = useModalLayer('ping');

    const entry = [...stack].reverse().find((m) => m.name === 'ping');
    const pingId = typeof entry?.payload === 'string' ? entry.payload : '';
    const item = useMemo(() => state.items.find((p) => p.id === pingId) ?? null, [state.items, pingId]);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); },
        [close],
    );

    const r = item ? renderPing(item) : null;
    const reminder = typeof item?.data?.reminder === 'string' ? (item.data.reminder as string) : null;
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
                <div className="ping-card-kind">{r ? titleOf(r.kind, reminder) : 'PING'}</div>
                {r ? (
                    <>
                        <div className="ms-confirm-question ping-card-line">
                            <span className={`ping-card-ic ping-ic ping-ic--${r.kind}`}>{r.icon}</span>
                            <span>
                                {r.handle && <strong>{r.handle}</strong>}
                                {r.handle ? ' ' : ''}
                                {r.action}
                            </span>
                        </div>
                        <div className="ping-card-when">{when}</div>
                        <div className="ms-confirm-btns ping-card-btns">
                            <button type="button" className="ms-confirm-btn ms-confirm-btn--cancel" onClick={close}>
                                Close
                            </button>
                            {(reminder === 'todo' || reminder === 'sentinel') && (
                                <button type="button" className="ms-confirm-btn ms-confirm-btn--ok" onClick={openTodos}>
                                    {`❍${VS15}`} OPEN TO-DOS
                                </button>
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
