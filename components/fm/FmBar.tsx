'use client';

/*
 * pd miniplayer (Brendon's name, all lowercase — 2026-07-20; grew out of
 * the PD.fm brief, docs/briefs/pd-fm.md).
 *
 * A persistent bottom mini-player streaming the platform's soundtracks —
 * the projects' PUBLIC YouTube playlists from the registry — through the
 * YouTube IFrame Player. Lives in the shell so it keeps playing across
 * client navigation (never unmounts).
 *
 * PD.fm is the AUTOMATED PROGRAMMING inside it: hit play with no picks
 * and the platform rotation cycles the registry albums; a project page's
 * own soundtrack takes the deck when you start there. The CUSTOMIZATION
 * is the station picker — tap the label and choose your own station:
 * starred soundtracks first, then the full album catalog.
 *
 * While playing, the actual video renders as a small tile in the bar
 * (the visible player is also the album art). Navigation never yanks
 * the audio — on another project's page a TUNE pill offers its station.
 *
 * Chrome: full-strength site tokens (Rule #2) — solid --bg-color fill,
 * --text-color border and text, bold, 12px labels. ▶ is the catalogued
 * soundtrack/play mark.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { allProjects, getProject, projectTrueName } from '../../lib/project/registry';
import { getSoundtrackStarItems } from '../../lib/pins/soundtrackStarStore';
import { registerFmDriver, publishFm, type FmStation } from '../../lib/fm/fmBus';

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

type Station = FmStation;

type FmStatus = 'idle' | 'loading' | 'playing' | 'paused';

export default function FmBar() {
    const pathname = usePathname();
    const { showToast } = useToast();
    /* Launch/close (Brendon, 2026-07-20): the miniplayer flag owns whether
       the bar exists at all — the bar's × key and the MY PD ▶ pill both
       flip it. Closed = bar gone + audio stopped. */
    const { notifs, update: updateNotifs } = usePdNotifs();
    const enabled = notifs.miniplayer;

    const [status, setStatus] = useState<FmStatus>('idle');
    const [onAir, setOnAir] = useState<Station | null>(null);
    const [trackTitle, setTrackTitle] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);

    const playerRef = useRef<YTPlayer | null>(null);
    const videoHostRef = useRef<HTMLDivElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    /* A second tap before the API resolves must not double-create. */
    const startingRef = useRef(false);

    /* PD.fm — the automated rotation: every registry soundtrack. */
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

    /* Context station — a project page's own soundtrack. */
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
            if (!st) { showToast('pd miniplayer: NO SOUNDTRACKS YET'); return; }
            start(st);
            showToast('pd miniplayer: ON AIR');
            return;
        }
        if (status === 'playing') { playerRef.current?.pauseVideo(); return; }
        playerRef.current?.playVideo();
    };

    const onNextTap = () => playerRef.current?.nextVideo();

    /* ── The bus: other surfaces (the Stone's miniplayer mini) drive this
       one player + read its state. And while live, the miniplayer IS the
       bottom of the viewport — body.pd-fm-live lifts the Command Stone
       one band above it (stone.css). */
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; });
    /* Playing from anywhere (the Stone's miniplayer mini) LAUNCHES a closed
       bar: with the flag off there's no video host yet, so the station waits
       here and the relaunch effect below starts it once the bar renders. */
    const pendingRef = useRef<Station | null>(null);
    const enabledRef = useRef(enabled);
    useEffect(() => { enabledRef.current = enabled; });
    useEffect(() => registerFmDriver({
        play: (st) => {
            if (!enabledRef.current) {
                pendingRef.current = st;
                updateNotifs({ miniplayer: true });
                return;
            }
            start(st);
        },
        toggle: () => {
            if (statusRef.current === 'playing') playerRef.current?.pauseVideo();
            else playerRef.current?.playVideo();
        },
        next: () => playerRef.current?.nextVideo(),
    }), [start, updateNotifs]);
    useEffect(() => {
        if (enabled && pendingRef.current) {
            const st = pendingRef.current;
            pendingRef.current = null;
            start(st);
        }
    }, [enabled, start]);
    /* Closing kills the audio, not just the chrome. */
    useEffect(() => {
        if (enabled) return;
        playerRef.current?.destroy();
        playerRef.current = null;
        startingRef.current = false;
        setStatus('idle');
        setOnAir(null);
        setTrackTitle('');
        setPickerOpen(false);
    }, [enabled]);
    useEffect(() => {
        publishFm({ status, station: onAir, trackTitle });
    }, [status, onAir, trackTitle]);
    useEffect(() => {
        document.body.classList.toggle('pd-fm-live', status !== 'idle');
        return () => document.body.classList.remove('pd-fm-live');
    }, [status]);

    const onTuneTap = () => {
        if (context) {
            start(context);
            showToast('pd miniplayer: TUNED');
        }
    };

    /* ── The station picker — the customization (tap the label) ── */
    const pickStation = (st: Station) => {
        setPickerOpen(false);
        start(st);
        showToast(`Station: ${st.label.toUpperCase()}`);
    };

    /* Starred soundtracks lead the picker; the full catalog follows. */
    const starred = useMemo<Station[]>(() => {
        if (!pickerOpen) return [];
        return getSoundtrackStarItems().map((s) => ({
            playlistId: s.playlistId,
            label: s.title,
            slug: s.slug,
        }));
    }, [pickerOpen]);
    const starredIds = new Set(starred.map((s) => s.playlistId));

    /* Close the picker on any outside tap. */
    useEffect(() => {
        if (!pickerOpen) return;
        const onDown = (e: PointerEvent) => {
            if (barRef.current?.contains(e.target as Node)) return;
            setPickerOpen(false);
        };
        document.addEventListener('pointerdown', onDown, true);
        return () => document.removeEventListener('pointerdown', onDown, true);
    }, [pickerOpen]);

    /* Destroy the player only when the whole shell unmounts (full reload). */
    useEffect(() => () => { playerRef.current?.destroy(); playerRef.current = null; }, []);

    if (rotation.length === 0) return null;

    const tuneOffer = onAir && context && context.playlistId !== onAir.playlistId;

    return (
        <div
            ref={barRef}
            className={`fm-bar${status === 'idle' ? ' fm-idle' : ' fm-live'}`}
            title="pd miniplayer — the platform's soundtracks. Tap the readout to pick a station."
        >
            {pickerOpen && (
                <div className="fm-picker" role="listbox" aria-label="Stations">
                    {starred.length > 0 && <div className="fm-picker-head">STARRED</div>}
                    {starred.map((st) => (
                        <button key={`s-${st.playlistId}`} type="button" className="fm-picker-row" onClick={() => pickStation(st)}>
                            <span className="fm-picker-glyph">▶︎</span> {st.label}
                        </button>
                    ))}
                    <div className="fm-picker-head">ALL ALBUMS</div>
                    {rotation.filter((st) => !starredIds.has(st.playlistId)).map((st) => (
                        <button key={st.playlistId} type="button" className="fm-picker-row" onClick={() => pickStation(st)}>
                            <span className="fm-picker-glyph">▶︎</span> {st.label}
                            {st.slug && <span className="fm-picker-proj"> · {projectTrueName(st.slug)}</span>}
                        </button>
                    ))}
                </div>
            )}
            {/* The video host stays mounted from first play on — YT replaces
                it with the iframe; hiding it kills audio, so it only shrinks
                to zero footprint pre-play. */}
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
            <button
                type="button"
                className="fm-label"
                onClick={() => setPickerOpen((v) => !v)}
                title="Pick a station"
            >
                {status === 'idle' ? (
                    <span className="fm-wordmark">pd miniplayer</span>
                ) : (
                    /* the LCD — a minidisc-style scrolling readout */
                    <span className="fm-lcd">
                        <span className="fm-lcd-scroll">
                            {`${trackTitle || onAir?.label || 'pd miniplayer'} · `}
                            {`${trackTitle || onAir?.label || 'pd miniplayer'} · `}
                        </span>
                    </span>
                )}
            </button>
        </div>
    );
}
