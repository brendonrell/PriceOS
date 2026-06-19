'use client';

/*
 * SoundtrackStarButton — the project page's SOUNDTRACK button, with the same
 * long-press-to-star behaviour as the trait pills (Brendon, 2026-06-19).
 *
 *   • Tap            → open the YouTube playlist (unchanged).
 *   • Long-press     → star/unstar this Project's soundtrack: a persistent ★
 *                      sits on the button and a star floats up to confirm.
 *
 * The soundtrack link is DB-driven, so the playlist id + display title are
 * captured into the store at star-time (see soundtrackStarStore).
 */

import React from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import {
    isSoundtrackStarred,
    toggleSoundtrackStar,
    subscribeSoundtrackStars,
} from '../../lib/pins/soundtrackStarStore';

export default function SoundtrackStarButton({
    slug,
    playlistId,
    label,
    title,
}: {
    slug: string;
    playlistId: string;
    label: string;
    title: string;
}) {
    const { showToast } = useToast();
    const url = playlistWatchUrl(playlistId);

    const [starred, setStarred] = React.useState(false);
    React.useEffect(() => {
        setStarred(isSoundtrackStarred(slug));
        return subscribeSoundtrackStars(() => setStarred(isSoundtrackStarred(slug)));
    }, [slug]);

    const timerRef = React.useRef<number | null>(null);
    const longFired = React.useRef(false);
    const startPt = React.useRef<{ x: number; y: number } | null>(null);
    const [floatId, setFloatId] = React.useState(0);
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
            setFloatId((n) => n + 1);
            const r = toggleSoundtrackStar(slug, playlistId, title);
            showToast(r === 'starred' ? 'Added to your Starred Soundtracks List (Private)' : 'Removed from your Starred Soundtracks List');
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
        <a
            href={url}
            onClick={(e) => {
                e.preventDefault();
                if (longFired.current) { longFired.current = false; return; }
                window.open(url, '_blank', 'noopener,noreferrer');
            }}
            className={`btn-soundtrack${starred ? ' soundtrack-starred' : ''}`}
            title={label}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endPress}
            onPointerLeave={endPress}
            onPointerCancel={endPress}
            onContextMenu={(e) => e.preventDefault()}
            style={{
                position: 'relative',
                userSelect: 'none',
                WebkitUserSelect: 'none',
                // Stop iOS's long-press link preview / share callout on the <a>,
                // so the press registers as a star instead (Brendon 2026-06-19).
                WebkitTouchCallout: 'none',
                touchAction: 'pan-y',
            }}
        >
            <span className={`btn-icon-play${starred ? ' soundtrack-star-icon' : ''}`}>{starred ? '★︎' : '▶︎'}</span>{' '}SOUNDTRACK
            {floatId > 0 && <span key={floatId} className="soundtrack-star-float" aria-hidden="true">{'★︎'}</span>}
        </a>
    );
}
