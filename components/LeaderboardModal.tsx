'use client';

/*
 * LeaderboardModal — the Top 100 by PriceScore (Brendon, 2026-07-02).
 *
 * Opened by tapping the PriceRank medallion in the PriceSprite modal.
 * Rides the Followers Manager COMPACT shell verbatim (sticker-mgr-backdrop +
 * ambient-pop) and its fm-row row treatment, so a leaderboard row reads
 * exactly like a circle row: PriceSprite + @name (CollectedPair), with the
 * position on the left and the PriceScore on the right. Your own row is
 * highlighted. Stats columns come later (Brendon: "maybe we eventually show
 * stats too") — this ships position · sprite · @name · score, nothing extra.
 *
 * Title icon = ❂, the PriceRank sun (GLYPHS.md §4 — rank surfaces wear ❂).
 * Score icon = ◍, the achievements mark (PriceScore IS achievement points;
 * same pairing as the PriceRank Network pill).
 */

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import CollectedPair from './hero/CollectedPair';
import type { LeaderboardRow } from '../app/api/leaderboard/route';

const VS15 = '︎';

export default function LeaderboardModal() {
    const { openModal, close } = useModal();
    const { siweAddress } = useAuth();
    const isOpen = openModal?.name === 'leaderboard';

    const [rows, setRows] = useState<LeaderboardRow[]>([]);
    const [loading, setLoading] = useState(false);

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

    /* Top 100 — fetched fresh on every open (scores move). */
    useEffect(() => {
        if (!isOpen) return;
        let alive = true;
        setLoading(true);
        fetch('/api/leaderboard', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { rows?: LeaderboardRow[] } | null) => {
                if (!alive) return;
                setRows(Array.isArray(d?.rows) ? d.rows : []);
            })
            .catch(() => { if (alive) setRows([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, [isOpen]);

    if (!isOpen || typeof document === 'undefined') return null;

    const me = siweAddress?.toLowerCase() ?? null;

    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Leaderboard" onClick={close}>
            <div className="ambient-pop followers-pop" role="dialog" aria-label="Leaderboard" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`❂${VS15}`}</span>{' '}
                        <span className="smgr-title-words">LEADERBOARD · TOP 100</span>
                    </span>
                </div>
                <div className="followers-pop-body">
                    <div className="fm-list">
                        {loading && rows.length === 0 ? (
                            <div className="fm-empty fm-loading">Loading…</div>
                        ) : rows.length === 0 ? (
                            <div className="fm-empty">No ranked collectors yet — the board is wide open.</div>
                        ) : (
                            rows.map((r, i) => (
                                <div className={`fm-row lb-row${me === r.address ? ' lb-me' : ''}`} key={r.address}>
                                    <span className="lb-pos">{i + 1}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id">
                                            <CollectedPair handle={r.handle} />
                                        </div>
                                        <div className="fm-row-stats">
                                            <span className="fm-stat" title="PriceScore">
                                                <span className="fm-stat-ic">{`◍${VS15}`}</span>
                                                <b>{r.priceScore.toLocaleString()}</b>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    );
}
