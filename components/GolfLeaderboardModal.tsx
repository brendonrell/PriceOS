'use client';

/*
 * GolfLeaderboardModal — the Clubhouse. Opened by tapping the Golf Score tile
 * on a project's Attributes tab. Ranks every project's engine by size (smallest
 * wins, rank #1), but the LEADER is the ARTIST — so each row leads with the
 * artist and shows their project alongside (Brendon, 2026-07-08).
 *
 * Rides the SAME shell as LeaderboardModal (sticker-mgr-backdrop + ambient-pop +
 * fm-row) so it reads as one family. Data is computed client-side from the
 * registry (golfLeaderboard) — deterministic, no fetch.
 */

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../lib/state/ModalContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import { golfLeaderboard } from '../lib/project/golfScore';

const VS15 = '︎';

export default function GolfLeaderboardModal() {
    const { openModal, currentModalSlug, close } = useModal();
    const isOpen = openModal?.name === 'golf-leaderboard';

    const rows = useMemo(() => (isOpen ? golfLeaderboard() : []), [isOpen]);

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

    if (!isOpen || typeof document === 'undefined') return null;

    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Clubhouse" onClick={close}>
            <div className="ambient-pop followers-pop" role="dialog" aria-label="Clubhouse" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    <span className="ambient-pop-title-text">
                        <span className="smgr-title-ic">{`⛳${VS15}`}</span>{' '}
                        <span className="smgr-title-words">CLUBHOUSE · GOLF SCORE</span>
                    </span>
                </div>
                <div className="followers-pop-body">
                    {rows.length > 0 && (
                        <div className="golf-leader-note">{`⛳${VS15}`} Fewest bytes takes the course — low score wins</div>
                    )}
                    <div className="fm-list">
                        {rows.length === 0 ? (
                            <div className="fm-empty">No ranked engines yet.</div>
                        ) : (
                            rows.map((r) => (
                                <div className={`fm-row lb-row golf-row${r.slug === currentModalSlug ? ' lb-me' : ''}`} key={r.slug}>
                                    <span className="lb-pos">{r.rank === 1 ? `⛳${VS15}` : r.rank}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id golf-id">
                                            <span className="golf-artist">@{r.artistHandle}{r.rank === 1 && <span className="golf-flag" title="Clubhouse leader">{` ⛳${VS15}`}</span>}</span>
                                            <span className="golf-project">{r.project}</span>
                                        </div>
                                        <div className="fm-row-stats">
                                            <span className="fm-stat" title="Engine size — smaller wins">
                                                <span className="fm-stat-ic">{`◴${VS15}`}</span>
                                                <b>{r.bytes.toLocaleString()} B</b>
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
