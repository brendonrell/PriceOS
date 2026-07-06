'use client';

/*
 * ArtistTitleStar — an artist's @name at the top of THEIR profile, with
 * long-press-to-star (same gesture as the project name / soundtrack button).
 *
 *   • Long-press the @name → star/unstar this artist: a ★ sits beside the name
 *     while starred, a star floats up to confirm (down on unstar).
 *
 * Shows as a row in your +More → Starred (Artists). Own profile never uses this
 * (you can't star yourself; the owner's name carries the colourway easter egg).
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import {
    isArtistStarred,
    toggleArtistStar,
    subscribeArtistStars,
} from '../../lib/pins/artistStarStore';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';

export default function ArtistTitleStar({ handle }: { handle: string }) {
    const name = `@${handle}`;
    const { showToast } = useToast();
    /* Spite Book — a spited user's own profile title renders redacted. */
    const isSpited = useSpiteMatcher();
    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isArtistStarred(name));
        return subscribeArtistStars(() => setStarred(isArtistStarred(name)));
    }, [name]);

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
            const r = toggleArtistStar(name);
            setFloatDown(r !== 'starred');
            setFloatId((n) => n + 1);
            showToast(r === 'starred' ? 'Added to your Starred Artists List (Private)' : 'Removed from your Starred Artists List');
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
            <span className={isSpited(name) ? 'spited' : undefined}>{name}</span>
            {starred && <span className="project-name-star" aria-hidden="true">{'★︎'}</span>}
            {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
        </span>
    );
}
