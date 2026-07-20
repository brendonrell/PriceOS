'use client';

/*
 * PD.fm — the session radio (Brendon's name; brief docs/briefs/pd-fm.md).
 *
 * A persistent bottom mini-player streaming the platform's soundtracks —
 * the projects' PUBLIC YouTube playlists from the registry — through the
 * YouTube IFrame Player. Lives in the shell so it keeps playing across
 * client navigation (never unmounts).
 *
 * THE HONEST LIMIT (spec: write it into the UI, never imply otherwise):
 * phones stop YouTube audio the moment the screen locks or the app
 * backgrounds — YouTube does this on purpose and no embed trick beats it.
 * PD.fm plays while PD is open; it is not pocket radio. The bar's tooltip
 * says exactly that.
 *
 * YT ToS wants the embed visibly present — so while playing, the actual
 * video renders as a small tile in the bar (also just right for a radio
 * with album playlists). Auto-tunes to context: on a project page the
 * station is that project's own soundtrack; elsewhere it's the platform
 * rotation. If you're already listening, navigation NEVER yanks the
 * audio — a TUNE pill offers this page's station instead.
 *
 * Chrome: full-strength site tokens (Rule #2) — solid --bg-color fill,
 * --text-color border and text, bold, 12px labels. ▶ is the catalogued
 * soundtrack/play mark.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { allProjects, getProject } from '../../lib/project/registry';

/* ── Minimal YT IFrame API surface (no @types dependency) ── */
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    nextVideo(): void;
    loadPlaylist(opts: { list: string; listType: 'playlist' }): void;
    getVideoData?(): { title?: string } | undefined;
    destroy(): void;
}
interface YTNamespace {
    Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
    PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}
declare global {
    interface Window {
        YT?: YTNamespace;
        onYouTubeIframeAPIReady?: () => void;
    }
}

/* Load the IFrame API once, promise-cached across the app's lifetime. */
let ytReady: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
    if (ytReady) return ytReady;
    ytReady = new Promise((resolve) => {
        if (window.YT?.Player) { resolve(window.YT); return; }
        const prev = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            prev?.();
            if (window.YT) resolve(window.YT);
        };
        const s = document.createElement('script');
        s.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(s);
    });
    return ytReady;
}

interface Station {
    playlistId: string;
    label: string;
    /** Project slug when the station is a project's own soundtrack. */
    slug: string | null;
}

type FmStatus = 'idle' | 'loading' | 'playing' | 'paused';

const HONEST_TITLE =
    'PD.fm — session radio over the projects’ public soundtracks. Plays while PD is open; locking the screen stops it (YouTube’s rule, not ours).';

export default function FmBar() {
    const pathname = usePathname();
    const { siweAddress, needsSignup } = useAuth();
    const { showToast } = useToast();

    const [status, setStatus] = useState<FmStatus>('idle');
    const [onAir, setOnAir] = useState<Station | null>(null);
    const [trackTitle, setTrackTitle] = useState('');

    const playerRef = useRef<YTPlayer | null>(null);
    const videoHostRef = useRef<HTMLDivElement | null>(null);
    /* The station a mid-flight start() belongs to — a second tap before the
       API resolves must not double-create the player. */
    const startingRef = useRef(false);

    /* Platform rotation — every registry project carrying a soundtrack. */
    const rotation = useMemo<Station[]>(
        () =>
            allProjects()
                .filter((p) => p.soundtrack)
                .map((p) => ({
                    playlistId: p.soundtrack!.playlistId,
                    label: p.soundtrack!.label,
                    slug: p.slug,
                })),
        [],
    );
    const rotationIdx = useRef(0);

    /* Context station — a project page's own soundtrack, else the rotation. */
    const context = useMemo<Station | null>(() => {
        const m = pathname?.match(/^\/art\/([^/]+)/);
        if (m) {
            const st = getProject(m[1])?.soundtrack;
            if (st) return { playlistId: st.playlistId, label: st.label, slug: m[1] };
        }
        return null;
    }, [pathname]);

    const nextFromRotation = useCallback((): Station | null => {
        if (rotation.length === 0) return null;
        const st = rotation[rotationIdx.current % rotation.length];
        rotationIdx.current += 1;
        return st;
    }, [rotation]);

    /* What the ▶ starts: this page's station, else the platform rotation. */
    const upNext = context ?? rotation[rotationIdx.current % Math.max(1, rotation.length)] ?? null;

    const start = useCallback((station: Station) => {
        if (startingRef.current) return;
        setOnAir(station);
        setTrackTitle('');
        setStatus('loading');
        if (playerRef.current) {
            playerRef.current.loadPlaylist({ list: station.playlistId, listType: 'playlist' });
            return;
        }
        startingRef.current = true;
        void loadYT().then((YT) => {
            const host = videoHostRef.current;
            startingRef.current = false;
            if (!host) return;
            playerRef.current = new YT.Player(host, {
                width: '57',
                height: '32',
                playerVars: {
                    listType: 'playlist',
                    list: station.playlistId,
                    autoplay: 1,
                    playsinline: 1,
                },
                events: {
                    onReady: (e: { target: YTPlayer }) => e.target.playVideo(),
                    onStateChange: (e: { data: number; target: YTPlayer }) => {
                        const title = e.target.getVideoData?.()?.title ?? '';
                        if (title) setTrackTitle(title);
                        if (e.data === YT.PlayerState.PLAYING) setStatus('playing');
                        else if (e.data === YT.PlayerState.PAUSED) setStatus('paused');
                        else if (e.data === YT.PlayerState.ENDED) setStatus('paused');
                    },
                },
            });
        });
    }, []);

    const onPlayTap = () => {
        if (status === 'idle') {
            const st = context ?? nextFromRotation();
            if (!st) { showToast('PD.fm: NO SOUNDTRACKS YET'); return; }
            start(st);
            showToast('PD.fm: ON AIR');
            return;
        }
        if (status === 'playing') { playerRef.current?.pauseVideo(); return; }
        playerRef.current?.playVideo();
    };

    const onNextTap = () => playerRef.current?.nextVideo();

    const onTuneTap = () => {
        if (context) {
            start(context);
            showToast('PD.fm: TUNED');
        }
    };

    /* Destroy the player only when the whole shell unmounts (full reload). */
    useEffect(() => () => { playerRef.current?.destroy(); playerRef.current = null; }, []);

    if (rotation.length === 0) return null;

    const tuneOffer = onAir && context && context.playlistId !== onAir.playlistId;
    /* The Command Stone's resting bar owns the bottom line when logged in —
       PD.fm lifts one row above it. */
    const stonePresent = !!siweAddress && !needsSignup;

    return (
        <div
            className={`fm-bar${status === 'idle' ? ' fm-idle' : ''}${stonePresent ? ' fm-above-stone' : ''}`}
            title={HONEST_TITLE}
        >
            {/* The video host stays mounted from first play on — YT replaces
                it with the iframe; hiding it kills audio, so it only shrinks
                (ToS: keep the player visible; it's our album art anyway). */}
            <div className={`fm-video${status === 'idle' ? ' fm-video-hidden' : ''}`}>
                <div ref={videoHostRef} />
            </div>
            <button type="button" className="fm-btn fm-play" onClick={onPlayTap}>
                {status === 'playing' || status === 'loading' ? 'PAUSE' : '▶︎ PLAY'}
            </button>
            {status !== 'idle' && (
                <button type="button" className="fm-btn" onClick={onNextTap} title="Next track">
                    NEXT
                </button>
            )}
            {tuneOffer && (
                <button type="button" className="fm-btn fm-tune" onClick={onTuneTap} title={`Tune to ${context!.label}`}>
                    TUNE
                </button>
            )}
            <span className="fm-label">
                <span className="fm-wordmark">PD.fm</span>
                {status === 'idle'
                    ? (upNext ? ` — ${upNext.label}` : '')
                    : ` — ${trackTitle || onAir?.label || ''}`}
            </span>
        </div>
    );
}
