'use client';

/*
 * PD miniplayer (Brendon's name; capitalization updated 2026-07-20 — "PD"
 * caps, wordmark renders PD mini*player* with the player part italic; grew
 * out of the PD.fm brief, docs/briefs/pd-fm.md).
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

/* The five faces (Brendon picked all five from the 2026-07-20 mocks). */
const FM_DISPLAYS = ['deck', 'micro', 'disc', 'slab', 'signal'] as const;
type FmDisplay = (typeof FM_DISPLAYS)[number];
const FM_DISPLAY_NAMES: Record<FmDisplay, string> = {
    deck: 'THE DECK', micro: 'MICRO', disc: 'THE DISC', slab: 'THE SLAB', signal: 'THE SIGNAL',
};

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

    /* The display face — device-local, read after mount (SSR-safe). */
    const [display, setDisplay] = useState<FmDisplay>('deck');
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem('pd_fm_display');
            if (raw && (FM_DISPLAYS as readonly string[]).includes(raw)) setDisplay(raw as FmDisplay);
        } catch { /* private mode */ }
    }, []);
    /* Tapping a compact face summons the full deck briefly (auto-collapses). */
    const [deckPeek, setDeckPeek] = useState(false);
    const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const armDeckPeek = useCallback(() => {
        setDeckPeek(true);
        if (peekTimer.current) clearTimeout(peekTimer.current);
        peekTimer.current = setTimeout(() => setDeckPeek(false), 6000);
    }, []);
    useEffect(() => () => { if (peekTimer.current) clearTimeout(peekTimer.current); }, []);
    const cycleDisplay = () => {
        const next = FM_DISPLAYS[(FM_DISPLAYS.indexOf(display) + 1) % FM_DISPLAYS.length];
        setDisplay(next);
        try { window.localStorage.setItem('pd_fm_display', next); } catch { /* fine */ }
        if (next !== 'deck') armDeckPeek(); // keep the deck up so cycling continues
        else setDeckPeek(false);
        showToast(`PD miniplayer: ${FM_DISPLAY_NAMES[next]}`);
    };

    const playerRef = useRef<YTPlayer | null>(null);
    const videoHostRef = useRef<HTMLSpanElement | null>(null);
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
                width: '46',
                height: '30',
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
            if (!st) { showToast('PD miniplayer: NO SOUNDTRACKS YET'); return; }
            start(st);
            showToast('PD miniplayer: ON AIR');
            return;
        }
        if (status === 'playing') { playerRef.current?.pauseVideo(); return; }
        playerRef.current?.playVideo();
    };

    const onNextTap = () => playerRef.current?.nextVideo();

    /* ── The bus: other surfaces (the Stone's miniplayer mini) drive this
       one player + read its state. body.pd-fm-live still flags the live
       deck (toast lift reads it) — but the stacking convention is now THE
       STONE IS ANCHORED, THE DECK YIELDS (fm.css reads pd-stone-peek /
       pd-stone-open; 2026-07-20). */
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
            showToast('PD miniplayer: TUNED');
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

    /* Closed = THE DOT (Brendon, 2026-07-20 — final call): one solid dot on
       the bar's anchor, tap zone far bigger than the speck. Tapping it
       brings the full device back. */
    if (!enabled) {
        return (
            <button
                type="button"
                className="fm-nub"
                onClick={() => updateNotifs({ miniplayer: true })}
                title="PD miniplayer"
                aria-label="Open the PD miniplayer"
            />
        );
    }

    const tuneOffer = onAir && context && context.playlistId !== onAir.playlistId;

    /* Art pinned LEFT — the approved mock's layout, exactly. (The mood-day
       side flip shipped once, read as a bait-and-switch against the approved
       look, and got pulled — 2026-07-20. Don't re-add without Brendon.) */

    /* ── FIVE FACES (Brendon, 2026-07-20 — "ship them all"): DECK · MICRO ·
       THE DISC · THE SLAB · THE SIGNAL. One markup, mode classes only — the
       video host must NEVER remount (a DOM move reloads the iframe and cuts
       the audio), so every face is CSS over the same slots. The video window
       stays visible in every face (YT requires it; smallest in SIGNAL).
       Switching: the deck's MODE key cycles; tapping a compact face brings
       the full deck back for a few seconds. Device-local pref. */
    const effectiveMode = status === 'idle' || deckPeek || display === 'deck' ? 'deck' : display;
    const isDeckFace = effectiveMode === 'deck';

    /* The three LCD rows — Sony minidisc grammar: static, compact, no crawl.
       The wordmark is PD mini*player* (Brendon, 2026-07-20: PD capitalized,
       the "player" part italic to start). */
    const wordmark = <>PD mini<span className="fm-wm-it">player</span></>;
    const rowTrack = status === 'idle' ? wordmark : (trackTitle || onAir?.label || '…');
    const rowStation = status === 'idle' ? 'the platform soundtracks' : (onAir?.label ?? '');
    const rowStatus =
        status === 'playing' ? '▶︎ PLAYING' :
        status === 'paused' ? '‖ PAUSED' :
        status === 'loading' ? '… TUNING' : 'tap ▶︎';

    return (
        <div
            ref={barRef}
            className={`fm-bar fm-mode-${effectiveMode}${status === 'idle' ? ' fm-idle' : ' fm-live'}`}
            title="PD miniplayer — the platform's soundtracks. Tap the screen to pick a station."
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
            {/* ── transport keys — LEFT side, like the deck of a Sony MD.
                Compact faces hide them (CSS); the slots stay so the video
                host below never shifts and remounts. ── */}
            {isDeckFace && (
                <button type="button" className="fm-btn fm-play" onClick={onPlayTap}>
                    {status === 'playing' || status === 'loading' ? '‖' : '▶︎'}
                </button>
            )}
            {isDeckFace && status !== 'idle' && (
                <button type="button" className="fm-btn" onClick={onNextTap} title="Next track">
                    ≫
                </button>
            )}
            {isDeckFace && tuneOffer && (
                <button type="button" className="fm-btn fm-tune" onClick={onTuneTap} title={`Tune to ${context!.label}`}>
                    TUNE
                </button>
            )}
            {isDeckFace && status !== 'idle' && (
                <button type="button" className="fm-btn fm-modekey" onClick={cycleDisplay} title="Change how the player shows">
                    {/* ⎇ ALTERNATE (U+2387) — Brendon's pick 2026-07-20 for
                        the face-cycler; catalogued in GLYPHS.md. */}
                    {'⎇︎'}
                </button>
            )}
            {isDeckFace && (
                <button
                    type="button"
                    className="fm-btn fm-close"
                    onClick={() => {
                        updateNotifs({ miniplayer: false });
                        showToast('PD miniplayer: CLOSED');
                    }}
                    title="Close the miniplayer"
                    aria-label="Close the PD miniplayer"
                >
                    ×
                </button>
            )}
            {/* ── THE screen — one display: the forced-YT art window IS part
                of it (left/right by the day's mood), beside the readout rows.
                Deck tap = station picker; compact-face tap = the deck back. ── */}
            <button
                type="button"
                className="fm-screen"
                onClick={() => {
                    if (isDeckFace) setPickerOpen((v) => !v);
                    else armDeckPeek();
                }}
                title={isDeckFace ? 'Pick a station' : 'PD miniplayer'}
            >
                {/* The video host stays mounted from first play on — YT
                    replaces it with the iframe; hiding kills audio, so it
                    only shrinks to zero footprint pre-play. */}
                <span className={`fm-video${status === 'idle' ? ' fm-video-hidden' : ''}`}>
                    <span ref={videoHostRef} />
                </span>
                <span className="fm-rows">
                    <span className="fm-row fm-row-track">{rowTrack}</span>
                    <span className="fm-row">{rowStation}</span>
                    <span className="fm-row">{rowStatus}</span>
                </span>
                {/* THE SIGNAL's equalizer — present in every face, shown by
                    its mode class only. */}
                <span className="fm-sigbars" aria-hidden="true">
                    <span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" />
                </span>
            </button>
        </div>
    );
}
