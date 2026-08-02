'use client';

/*
 * NewUsersModal ☻ — the NEW USERS feed (Brendon, 2026-08-02).
 *
 * A live feed of the last 200 signups, newest first. Every row is the FULL
 * ASCII-ID rectangle (AsciiId — sprite · PriceRank · @name · Sigil, the one
 * identity unit) with the signup moment beside it, viewer-local.
 *
 * Door: long-press the ☻ social pill in the home sort row. Rides the SAME
 * Followers-Manager COMPACT shell (sticker-mgr-backdrop + ambient-pop +
 * followers-pop) and the exact fm-row anatomy as the leaderboards — no new
 * chrome. Closes only on ×, an outside tap, or Esc (Rule #-0.55); the list
 * scrolls inside itself.
 *
 * Live = fresh on open + a re-pull once a minute while open and the tab is
 * visible; rows mount in screenfuls as the list scrolls (bounded by the
 * viewport, never by how many rows the answer holds).
 */

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import AsciiId from './hero/AsciiId';
import type { RecentUserRow } from '../app/api/users/recent/route';

const VS15 = '︎';
/* Screenfuls — the list grows as the viewer scrolls, so 200 rows never build
   (or fetch their identities) in one go. */
const WINDOW_STEP = 40;
const REFRESH_MS = 60_000;

/* "JUL 26" + "14:05" — viewer-local, the social feed's exact stamp grammar. */
function fmtDate(ms: number): string {
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${String(d.getDate()).padStart(2, '0')}`;
}
function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function NewUsersModal() {
    const { close } = useModal();
    const { isOpen, isTopStacked } = useModalLayer('newUsers');

    const [rows, setRows] = useState<RecentUserRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [shown, setShown] = useState(WINDOW_STEP);
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    /* Freeze the page underneath while open (matches the Followers Manager). */
    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, close]);

    /* Fresh on open, then once a minute while open — skipped while the tab is
       hidden so a backgrounded phone does no work. */
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setShown(WINDOW_STEP);
        const load = (first: boolean) => {
            if (first) setLoading(true);
            fetch('/api/users/recent', { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { rows?: RecentUserRow[] } | null) => {
                    if (!alive) return;
                    if (d && Array.isArray(d.rows)) setRows(d.rows);
                })
                .catch(() => { /* last good rows stay up */ })
                .finally(() => { if (alive && first) setLoading(false); });
        };
        load(true);
        const t = window.setInterval(() => {
            if (!document.hidden) load(false);
        }, REFRESH_MS);
        return () => { alive = false; window.clearInterval(t); };
    }, [isOpen]);

    /* Grow the mounted window a screenful at a time as the sentinel nears. */
    useEffect(() => {
        if (!isOpen) return;
        const el = sentinelRef.current;
        if (!el || shown >= rows.length) return;
        const io = new IntersectionObserver((entries) => {
            if (entries.some((e) => e.isIntersecting)) {
                setShown((n) => Math.min(n + WINDOW_STEP, rows.length));
            }
        }, { rootMargin: '400px' });
        io.observe(el);
        return () => io.disconnect();
    }, [isOpen, shown, rows.length]);

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="New Users" data-stack-top={isTopStacked || undefined} onClick={close}>
            <div className="ambient-pop followers-pop" role="dialog" aria-label="New Users" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`☻${VS15}`}</span>{' '}
                        <span className="smgr-title-words">NEW USERS</span>
                    </span>
                </div>
                <div className="followers-pop-body">
                    <div className="fm-list">
                        {loading && rows.length === 0 ? (
                            <div className="fm-empty fm-loading">Loading…</div>
                        ) : rows.length === 0 ? (
                            <div className="fm-empty">No signups yet — the door just opened.</div>
                        ) : (
                            <>
                                {rows.slice(0, shown).map((r) => {
                                    const ms = Date.parse(r.created_at);
                                    return (
                                        <div className="fm-row" key={r.address}>
                                            <div className="fm-row-main">
                                                <div className="fm-row-id">
                                                    <AsciiId handle={r.handle} />
                                                </div>
                                                <div className="fm-row-stats">
                                                    <span className="fm-stat" title="Signed up">
                                                        <b>{Number.isFinite(ms) ? `${fmtDate(ms)} · ${fmtTime(ms)}` : '—'}</b>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {shown < rows.length && <div ref={sentinelRef} aria-hidden="true" />}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
