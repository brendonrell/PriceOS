'use client';

/*
 * OutputTitleStar — the artwork title ("{Project} #{n}") at the top of the
 * output page, with long-press-to-star (same gesture as the project name).
 *
 *   • Tap the project name → still navigates to the project page (the <a>).
 *   • Long-press anywhere on the title → star/unstar this Output: a ★ sits
 *     beside the #id while starred, a star floats up to confirm (down on unstar).
 *
 * Shows as a row in your +More → Starred (Outputs).
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { isStarred, toggleStar, subscribeStarred } from '../../lib/pins/starStore';

export default function OutputTitleStar({
    slug,
    id,
    projectName,
    projectHref,
}: {
    slug: string;
    id: number;
    projectName: string;
    projectHref: string;
}) {
    const { showToast } = useToast();
    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isStarred(slug, id));
        return subscribeStarred(() => setStarred(isStarred(slug, id)));
    }, [slug, id]);

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
            const r = toggleStar(slug, id);
            setFloatDown(r !== 'starred');
            setFloatId((n) => n + 1);
            showToast(r === 'starred' ? 'Added to your Starred Outputs List (Private)' : 'Removed from your Starred Outputs List');
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
        <span
            className="project-title-star-wrap"
            style={{ position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', touchAction: 'pan-y' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
        >
            <a
                className="artwork-title-link"
                href={projectHref}
                onClick={(e) => { if (longFired.current) { e.preventDefault(); longFired.current = false; } }}
            >
                {projectName}
            </a>{' '}#{id}
            {starred && <span className="project-name-star" aria-hidden="true">{'★︎'}</span>}
            {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
        </span>
    );
}
