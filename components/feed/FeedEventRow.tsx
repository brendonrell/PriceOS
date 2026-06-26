'use client';

/*
 * FeedEventRow — one activity-feed row for an on-chain event, shared by the
 * project activity feed and the profile activity feed (both used to inline this
 * markup; now they render this so the long-press-to-star gesture lives in one
 * place). The row IS the markup the feeds always had — feed-line · icon · time ·
 * type · detail — with the long-press-to-star gesture added on top.
 *
 *   • Long-press the row → star/unstar this event (Starred Tx, the +More →
 *     Starred "Tx" filter). Same gesture as the artist @name / project title /
 *     soundtrack stars: a ★ sits on the row while starred, a star floats up to
 *     confirm (down on unstar).
 */

import React from 'react';
import type { FeedEvent } from '../../lib/feed/feedRow';
import { useToast } from '../../lib/state/ToastContext';
import { isTxStarred, toggleTxStar, subscribeTxStars } from '../../lib/pins/txStarStore';

export default function FeedEventRow({ fe }: { fe: FeedEvent }) {
    const { showToast } = useToast();
    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isTxStarred(fe.id));
        return subscribeTxStars(() => setStarred(isTxStarred(fe.id)));
    }, [fe.id]);

    const timerRef = React.useRef<number | null>(null);
    const longFired = React.useRef(false);
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const [floatId, setFloatId] = React.useState(0);
    const [floatDown, setFloatDown] = React.useState(false);
    const clearTimer = () => {
        if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; }
    };
    const onPointerDown = (e: React.PointerEvent) => {
        longFired.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            longFired.current = true;
            timerRef.current = null;
            const r = toggleTxStar(fe.star);
            setFloatDown(r !== 'starred');
            setFloatId((n) => n + 1);
            showToast(r === 'starred' ? 'Added to your Starred Transactions List (Private)' : 'Removed from your Starred Transactions List');
        }, 460);
    };
    const onPointerMove = (e: React.PointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => clearTimer();

    return (
        <div
            className="feed-row"
            style={{ userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
        >
            <div className="feed-line" />
            <div className="f-icon-wrap">{fe.icon}&#xFE0E;</div>
            <div className="f-time">{fe.time}</div>
            <div className="f-type">{fe.type}</div>
            <div className="f-content" style={{ position: 'relative' }}>
                {fe.detail}
                {starred && <span className="project-name-star" aria-hidden="true">{'★︎'}</span>}
                {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
            </div>
        </div>
    );
}
