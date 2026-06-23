'use client';

/*
 * ProjectTitleStar — the Project name at the top of the project page, with
 * long-press-to-star (same gesture as the trait pills + soundtrack button).
 *
 *   • Long-press the name → star/unstar this Project: a large ★ sits beside
 *     the name (before the date) and a star floats up to confirm.
 *
 * Shows as a row in +More → Starred (Projects), CTA "View Project".
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useCartelMutualCount } from '../../lib/social/cartel';
import { useProjectCelestial } from '../../lib/output/celestial';
import {
    isProjectStarred,
    toggleProjectStar,
    subscribeProjectStars,
} from '../../lib/pins/projectStarStore';

export default function ProjectTitleStar({ slug, title }: { slug: string; title: string }) {
    const { showToast } = useToast();
    const { notifs } = usePdNotifs();
    const cartelOn = notifs.spell_cartel;
    const cartelCount = useCartelMutualCount(slug, cartelOn);
    const projFate = useProjectCelestial(slug, notifs.spell_celestial);
    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isProjectStarred(slug));
        return subscribeProjectStars(() => setStarred(isProjectStarred(slug)));
    }, [slug]);

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
            const r = toggleProjectStar(slug);
            setFloatDown(r !== 'starred');
            setFloatId((n) => n + 1);
            showToast(r === 'starred' ? 'Added to your Starred Projects List (Private)' : 'Removed from your Starred Projects List');
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
            <span>{title}</span>
            {starred && <span className="project-name-star" aria-hidden="true">{'★︎'}</span>}
            {/* Cartel badge — when Cartel is on, ⟁ + the count of the user's
                mutuals controlling this project, sitting right after the star
                (or the name, if unstarred). */}
            {cartelOn && (
                <span className="project-cartel" aria-label={`${cartelCount} mutuals in the cartel`}>
                    <span className="pc-ico">{'⟁︎'}</span>
                    <span className="pc-num">{cartelCount}</span>
                </span>
            )}
            {/* Celestial Tracker — the project's I Ching Fate hexagram + a compact
                sky row (sun · moon · rising) in the after-name unicode row, no
                word (Brendon 2026-06-23). The zodiac SIGN glyphs render as colour
                emoji on iOS, so the sky row uses the iOS-safe luminary symbols. */}
            {projFate && (
                <span className="project-celestial" aria-label={`Fate ${projFate.name}`}>
                    <span className="pcel-hex">{projFate.glyph}</span>
                    <span className="pcel-sky" aria-hidden="true">{'☉︎ ☽︎ ↑︎'}</span>
                </span>
            )}
            {floatId > 0 && <span key={floatId} className={`project-name-star-float${floatDown ? ' is-down' : ''}`} aria-hidden="true">{'★︎'}</span>}
        </span>
    );
}
