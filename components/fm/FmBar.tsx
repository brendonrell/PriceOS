'use client';

/*
 * PD miniplayer (Brendon's name; capitalization updated 2026-07-20 — "PD"
 * caps, wordmark renders PD mini*player* with the player part italic; grew
 * out of the PD.fm brief, docs/briefs/pd-fm.md).
 *
 * THE DOOR (Brendon, 2026-07-20 — his revision, supersedes THE DOT):
 * the player exists ONLY while a soundtrack session is live. Playing a
 * soundtrack anywhere (the Command Stone's soundtrack cards, the Mint
 * Room, the TUNE key) summons it; the × key stops the audio and the
 * device fully disappears — no dot, no resting chrome, nothing.
 *
 * The streaming rail is unchanged: the projects' PUBLIC YouTube playlists
 * through the YT IFrame Player, mounted in the shell so client navigation
 * never yanks the audio. While playing, the actual video renders as a
 * small tile in the chassis (the visible player is also the album art).
 * The station picker (tap the screen) is the customization: starred
 * soundtracks first, then the full catalog.
 *
 * THREE FACES, one markup (DECK · TAB · DISC — Micro + Slab retired
 * 2026-07-22): the ⎇ MODE key is VISIBLE ON EVERY FACE and switches
 * INSTANTLY (Brendon, 2026-07-20 — the old deck-peek dance made the key
 * look dead and is gone). × rides every face too, so the door out is
 * never more than one tap. The video host never remounts — a DOM move
 * reloads the iframe and cuts the audio — so faces are CSS over the same
 * slots. The chassis is CENTERED on the screen's bottom band.
 *
 * Chrome: full-strength site tokens (Rule #2) — solid --bg-color fill,
 * --text-color border and text, bold, 12px labels (the 10px LCD rows are
 * the flagged deliberate exception).
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '../../lib/state/ToastContext';

import { allProjects, projectTrueName } from '../../lib/project/registry';
import { playlistWatchUrl, normalizePlaylistId } from '../../lib/project/soundtrack';
import {
    getTracks, addTrack, removeTrack, subscribeTracks, MAX_TRACKS,
    type FmTrack,
} from '../../lib/fm/tracksStore';
import { useLongPress } from '../../lib/hooks/useLongPress';
import FmLcd from './FmLcd';
import { getSoundtrackStarItems } from '../../lib/pins/soundtrackStarStore';
import { registerFmDriver, publishFm, type FmStation } from '../../lib/fm/fmBus';
import { pushSettings, pushSettingsDebounced } from '../../lib/state/userState';

/* ── Minimal YT IFrame API surface (no @types dependency) ── */
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    nextVideo(): void;
    setShuffle(opts: { shufflePlaylist: boolean }): void;
    loadPlaylist(opts: { list: string; listType: 'playlist' }): void;
    loadVideoById(id: string): void;
    cuePlaylist(opts: { list: string; listType: 'playlist'; index?: number; startSeconds?: number }): void;
    cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
    getCurrentTime?(): number | undefined;
    getPlaylistIndex?(): number | undefined;
    getPlaylist?(): string[] | undefined;
    getVideoData?(): { title?: string } | undefined;
    destroy(): void;
}
interface YTNamespace {
    Player: new (el: HTMLElement, opts: unknown) => YTPlayer;
    /* CUED (5) is the state iOS parks a blocked-autoplay station in — it means
       LOADED AND WAITING, not broken (Brendon, 2026-07-28 dead-link fix). */
    PlayerState: { PLAYING: number; PAUSED: number; ENDED: number; CUED: number };
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

/* A station id is either a YouTube PLAYLIST (PL…/OLAK…/UU… etc.) or a single
   full-album VIDEO (a bare 11-char id). The player loads each differently. */
const isPlaylistId = (id: string) => /^(PL|OLAK|RD|UU|FL|LL)/.test(id);
const stationWatchUrl = (id: string) =>
    isPlaylistId(id)
        ? playlistWatchUrl(id)
        : `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/* The four faces, cycled in this order (Brendon, 2026-07-22 — Micro + Slab
   retired; 2026-07-27 — USB added; 2026-07-28 — USB moved to LAST). The
   internal `signal` key stays (it drives the .fm-mode-signal equalizer face
   and every saved value); its user-facing name is now "Tab". */
const FM_DISPLAYS = ['deck', 'signal', 'disc', 'usb'] as const;
type FmDisplay = (typeof FM_DISPLAYS)[number];
const FM_DISPLAY_NAMES: Record<FmDisplay, string> = {
    deck: 'Deck', usb: 'USB', signal: 'Tab', disc: 'Disc',
};

/* The saved live session (station + entry + seconds) — mirror of the
   account envelope's `fmSession` (Brendon, 2026-07-27: closing the app and
   returning restores the player right where it was paused). */
/* THE HEADPHONE CABLE (Brendon, 2026-07-30, drawn to his screenshot) — one
   curve, stroked three times (shadow · white core · sheen) so the lead reads as
   round white rubber. It leaves the stick's right end low on the body, hangs
   with real slack under it, then heads down-left toward the phone's own jack at
   the bottom centre. Every bend is a smooth cubic — a cable never has corners. */
const FM_CABLE_D =
    'M 116 20 C 146 17, 177 28, 170 48 C 162 66, 120 68, 80 62 C 52 58, 30 70, 15 100';

const FM_SESSION_KEY = 'pd_fm_session';
interface FmSavedSession {
    playlistId: string;
    label: string;
    slug: string | null;
    index: number;
    t: number;
}
function readSavedSession(): FmSavedSession | null {
    try {
        const raw = window.localStorage.getItem(FM_SESSION_KEY);
        if (!raw) return null;
        const s = JSON.parse(raw) as FmSavedSession;
        if (!s || typeof s.playlistId !== 'string' || !s.playlistId) return null;
        return {
            playlistId: s.playlistId,
            label: typeof s.label === 'string' ? s.label : s.playlistId,
            slug: typeof s.slug === 'string' ? s.slug : null,
            index: Number.isFinite(s.index) ? Math.max(0, Math.floor(s.index)) : 0,
            t: Number.isFinite(s.t) ? Math.max(0, s.t) : 0,
        };
    } catch { return null; }
}

export default function FmBar() {
    const { showToast } = useToast();

    const [status, setStatus] = useState<FmStatus>('idle');
    const [onAir, setOnAir] = useState<Station | null>(null);
    const [trackTitle, setTrackTitle] = useState('');
    const [pickerOpen, setPickerOpen] = useState(false);
    /* The picker has TWO shelves and is the ONE pop-out menu (Brendon,
       2026-07-28: "the UI for the playlists needs to be the same menu that pops
       out when you tap the screen"). Tapping the screen opens STATIONS; the USB
       plug opens YOUR TRACKS. Same panel, same rows, same outside-tap close. */
    const [pickerView, setPickerView] = useState<'stations' | 'tracks'>('stations');
    const [tracks, setTracks] = useState<ReadonlyArray<FmTrack>>([]);
    const [trackDraft, setTrackDraft] = useState('');
    const [trackCheck, setTrackCheck] = useState<'idle' | 'checking' | 'ok' | 'bad'>('idle');
    const [trackReason, setTrackReason] = useState('');
    const [trackTitleFound, setTrackTitleFound] = useState('');
    /* USB face: the stick's end cap — tap pops it off, tap again seats it
       (Brendon, 2026-07-27; reserved for a later use). */
    const [usbCapOff, setUsbCapOff] = useState(false);
    /* A station that never reaches PLAYING — or errors repeatedly — is a
       dead link; the LCD says so instead of tuning forever (Brendon,
       2026-07-20: switching must be snappy and honest). */
    const [deadLink, setDeadLink] = useState(false);

    /* The display face — account-backed (Brendon, 2026-07-21), read after mount
       (SSR-safe). Also re-reads when the account snapshot hydrates the face so
       the chosen face follows the viewer across devices without a reload. */
    const [display, setDisplay] = useState<FmDisplay>('deck');
    /* Tapping the album art leaves the app for YouTube on the DECK face only;
       on TAB and DISC it opens the station picker instead (Brendon, 2026-07-26). */
    const artOpensYouTube = display === 'deck';
    useEffect(() => {
        const read = () => {
            try {
                const raw = window.localStorage.getItem('pd_fm_display');
                if (raw && (FM_DISPLAYS as readonly string[]).includes(raw)) setDisplay(raw as FmDisplay);
            } catch { /* private mode */ }
        };
        read();
        window.addEventListener('pd:fm-display-changed', read);
        return () => window.removeEventListener('pd:fm-display-changed', read);
    }, []);
    /* MODE — cycles the face IMMEDIATELY, from any face (Brendon,
       2026-07-20: "when I press this button IT SHOULD DO SOMETHING"). */
    const cycleDisplay = () => {
        const next = FM_DISPLAYS[(FM_DISPLAYS.indexOf(display) + 1) % FM_DISPLAYS.length];
        setDisplay(next);
        try { window.localStorage.setItem('pd_fm_display', next); } catch { /* fine */ }
        pushSettings({ fmDisplay: next }); // account-backed
        /* the ™ is a toast-only flourish (Brendon, 2026-07-22 — "for fun") and
           it KEEPS this spot, on the face name (Brendon, 2026-07-28). The
           wordmark's own ™ stands down whenever a toast already carries one —
           one ™ per toast, never two. */
        showToast(`Miniplayer ${FM_DISPLAY_NAMES[next]}™`);
    };

    const playerRef = useRef<YTPlayer | null>(null);
    const videoHostRef = useRef<HTMLSpanElement | null>(null);
    const barRef = useRef<HTMLDivElement | null>(null);
    /* One create at a time; the latest asked-for station wins the boot. */
    const startingRef = useRef(false);
    const wantRef = useRef<Station | null>(null);
    /* Dead-link armor: consecutive player errors + a tune watchdog. */
    const errCountRef = useRef(0);
    const watchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    /* A session being RESTORED (not freshly tuned): the boot effect cues the
       saved spot paused instead of autoplaying — iOS only lets ▶ (a real tap)
       start the sound anyway, and "right where I paused it" means paused. */
    const resumeRef = useRef<{ index: number; t: number } | null>(null);

    /* Every registry soundtrack — the station picker's ALL ALBUMS shelf. */
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

    /* Begin (or retune) a session. The chassis renders off `onAir`, so a
       play from anywhere summons the device; the boot effect below creates
       the YT player once the video host is really in the DOM. */
    const clearWatchdog = useCallback(() => {
        if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
    }, []);

    /* ⛔ THE FALSE DEAD LINK (Brendon, 2026-07-28: "it says DEAD LINK every
       single time even though it's not dead and it fixes itself eventually").
       The watchdog used to flag any station that hadn't reached PLAYING inside
       12s — but a station that has LOADED FINE and is merely waiting for a tap
       is the normal case on iOS, where Safari refuses to start sound without a
       real gesture and our tune happens well outside the gesture window. So the
       player sat CUED, the watchdog cried dead, and the moment ▶ was pressed
       (or a slow start finally landed) it played perfectly — "it fixes itself".
       The watchdog now measures the ONLY thing that means dead: the station
       never reported back AT ALL. Any signal from the player — ready, cued,
       buffering, playing, paused — clears it. A genuinely broken link still
       flags, through the error handler below, which is what actually knows. */
    const armWatchdog = useCallback(() => {
        clearWatchdog();
        watchdogRef.current = setTimeout(() => {
            if (statusRef.current === 'loading') {
                setDeadLink(true);
                setStatus('paused');
                showToast('Station: DEAD LINK');
            }
        }, 12000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [clearWatchdog]);

    /* ── THE RUN (Brendon, 2026-07-28) — a saved List of nothing but
       soundtracks, played straight through as one playlist. `queueRef` holds
       what's still WAITING; each station rolls on when the one on air reaches
       the end of its own last track. Tuning anywhere else clears it (see
       `start`), because choosing a station by hand means abandoning the run. ── */
    const queueRef = useRef<Station[]>([]);

    const start = useCallback((station: Station) => {
        queueRef.current = []; // a hand-picked station abandons any run
        resumeRef.current = null; // a fresh tune plays now — never the saved spot
        wantRef.current = station;
        setOnAir(station);
        setTrackTitle('');
        setStatus('loading');
        setDeadLink(false);
        errCountRef.current = 0;
        armWatchdog();
        if (playerRef.current) {
            if (isPlaylistId(station.playlistId))
                playerRef.current.loadPlaylist({ list: station.playlistId, listType: 'playlist' });
            else
                playerRef.current.loadVideoById(station.playlistId);
        }
    }, [armWatchdog]);

    /* Put a run on air: the first station now, the rest waiting. The queue is
       set AFTER the tune because `start` deliberately wipes it. */
    const startRun = useCallback((stations: ReadonlyArray<Station>) => {
        if (stations.length === 0) return;
        start(stations[0]);
        queueRef.current = stations.slice(1);
    }, [start]);

    /* The station on air has nothing left of its own: the last track of its
       playlist just ended, or it's a single-video station. Only then does the
       run roll on — a playlist mid-way through must never be cut short. */
    const stationFinished = useCallback((p: YTPlayer) => {
        const list = p.getPlaylist?.();
        if (!list || list.length === 0) return true;
        return (p.getPlaylistIndex?.() ?? 0) >= list.length - 1;
    }, []);

    /* ── The saved session (Brendon, 2026-07-27): the device survives closing
       the app. Save the exact spot on every pause + steadily while playing;
       on return the chassis is back, PAUSED, cued right where it was — ▶ is
       the (iOS-required) tap that resumes the sound. × wipes the save. ── */
    const saveSession = useCallback((immediate: boolean) => {
        const st = wantRef.current;
        const p = playerRef.current;
        if (!st || !p) return;
        const session: FmSavedSession = {
            playlistId: st.playlistId,
            label: st.label,
            slug: st.slug,
            index: Math.max(0, p.getPlaylistIndex?.() ?? 0),
            t: Math.max(0, p.getCurrentTime?.() ?? 0),
        };
        try { window.localStorage.setItem(FM_SESSION_KEY, JSON.stringify(session)); } catch { /* private mode */ }
        if (immediate) pushSettings({ fmSession: session });
        else pushSettingsDebounced({ fmSession: session });
    }, []);

    const restoreSession = useCallback(() => {
        if (wantRef.current) return; // never fight a live session
        const saved = readSavedSession();
        if (!saved) return;
        const station: Station = { playlistId: saved.playlistId, label: saved.label, slug: saved.slug };
        resumeRef.current = { index: saved.index, t: saved.t };
        wantRef.current = station;
        setOnAir(station);
        setTrackTitle('');
        setStatus('paused');
        setDeadLink(false);
    }, []);

    /* Boot — after the chassis (and the host span) exists. */
    useEffect(() => {
        if (!onAir || playerRef.current || startingRef.current) return;
        startingRef.current = true;
        void loadYT().then((YT) => {
            const host = videoHostRef.current;
            startingRef.current = false;
            const station = wantRef.current;
            if (!host || playerRef.current || !station) return;
            const asPlaylist = isPlaylistId(station.playlistId);
            /* Restoring a saved session cues the exact saved spot, paused —
               a fresh tune boots hot exactly as before. */
            const resume = resumeRef.current;
            playerRef.current = new YT.Player(host, {
                width: '46',
                height: '30',
                ...(asPlaylist || resume ? {} : { videoId: station.playlistId }),
                playerVars: {
                    ...(asPlaylist && !resume ? { listType: 'playlist', list: station.playlistId } : {}),
                    autoplay: resume ? 0 : 1,
                    playsinline: 1,
                },
                events: {
                    onReady: (e: { target: YTPlayer }) => {
                        /* The station answered — it is not a dead link, whatever
                           it does about autoplay from here. */
                        clearWatchdog();
                        const r = resumeRef.current;
                        if (r) {
                            if (asPlaylist) e.target.cuePlaylist({ list: station.playlistId, listType: 'playlist', index: r.index, startSeconds: r.t });
                            else e.target.cueVideoById({ videoId: station.playlistId, startSeconds: r.t });
                            return; // stays cued; ▶ (a real tap) starts the sound
                        }
                        e.target.playVideo();
                    },
                    onStateChange: (e: { data: number; target: YTPlayer }) => {
                        /* ANY word from the player means the station is alive —
                           kill the dead-link timer before anything else. A
                           retune on a player that is ALREADY ready never fires
                           onReady again, so this is the clear that covers
                           switching stations. */
                        clearWatchdog();
                        /* CUED = loaded and sitting there, which is exactly what
                           iOS gives us when it blocks autoplay. That is READY,
                           not dying: say PAUSED and let ▶ do its job. */
                        if (e.data === YT.PlayerState.CUED && statusRef.current === 'loading') {
                            setStatus('paused');
                            setDeadLink(false);
                        }
                        /* Only trust the title on PLAYING — the freshly-started
                           video. Reading it on the old video's PAUSED/ENDED
                           events (which fire mid-switch) is what left the
                           previous track's name stuck on the readout after a
                           channel change (Brendon, 2026-07-22). */
                        if (e.data === YT.PlayerState.PLAYING) {
                            const title = e.target.getVideoData?.()?.title ?? '';
                            if (title) setTrackTitle(title);
                            resumeRef.current = null; // sound is live — the cue spot is spent
                            setStatus('playing');
                            setDeadLink(false);
                            errCountRef.current = 0;
                            if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
                            saveSession(false);
                        }
                        else if (e.data === YT.PlayerState.PAUSED) { setStatus('paused'); saveSession(true); }
                        else if (e.data === YT.PlayerState.ENDED) {
                            /* A run rolls on here and ONLY here: the station on
                               air has genuinely reached its end and something
                               is still waiting. Everything else parks, exactly
                               as it always has. */
                            const waiting = queueRef.current;
                            if (waiting.length > 0 && stationFinished(e.target)) {
                                const [next, ...rest] = waiting;
                                start(next);
                                queueRef.current = rest;
                                return;
                            }
                            setStatus('paused');
                            saveSession(true);
                        }
                    },
                    /* Dead-video armor: a broken/private/pulled video SKIPS
                       to the next track; three strikes in a row (or a bad
                       playlist id) = the station is a dead link. */
                    onError: (e: { data: number }) => {
                        if (e.data === 2) {
                            setDeadLink(true);
                            setStatus('paused');
                            showToast('Station: DEAD LINK');
                            return;
                        }
                        errCountRef.current += 1;
                        if (errCountRef.current >= 3) {
                            setDeadLink(true);
                            setStatus('paused');
                            showToast('Station: DEAD LINK');
                            return;
                        }
                        playerRef.current?.nextVideo();
                    },
                },
            });
        });
    }, [onAir, saveSession, clearWatchdog, start, stationFinished]);

    /* Restore on arrival — the device comes back paused, right where it was
       (Brendon, 2026-07-27). Mount covers the same-device reopen (the cache);
       the hydrate event covers the account snapshot landing (cross-device),
       which also CLEARS a session the owner closed elsewhere. */
    useEffect(() => {
        restoreSession();
        const onHydrate = () => restoreSession();
        window.addEventListener('pd:fm-session-changed', onHydrate);
        return () => window.removeEventListener('pd:fm-session-changed', onHydrate);
    }, [restoreSession]);

    /* Steady save while the sound is live (every 15s, debounced upstream) +
       a last save the moment the app is backgrounded/closed, so "where I
       paused it" is where it actually was. */
    useEffect(() => {
        if (status !== 'playing') return;
        const iv = setInterval(() => saveSession(false), 15000);
        return () => clearInterval(iv);
    }, [status, saveSession]);
    useEffect(() => {
        const onHide = () => { if (wantRef.current && playerRef.current) saveSession(true); };
        window.addEventListener('pagehide', onHide);
        const onVis = () => { if (document.visibilityState === 'hidden') onHide(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.removeEventListener('pagehide', onHide);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [saveSession]);

    /* × — the whole device goes away: audio dead, chrome gone, nothing
       left behind (Brendon, 2026-07-20 — supersedes THE DOT). The saved
       session dies WITH it — off must stay off (the stale-state lesson). */
    const closePlayer = () => {
        playerRef.current?.destroy();
        playerRef.current = null;
        startingRef.current = false;
        wantRef.current = null;
        resumeRef.current = null;
        queueRef.current = []; // the run dies with the device — off stays off
        if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
        errCountRef.current = 0;
        setDeadLink(false);
        setStatus('idle');
        setOnAir(null);
        setTrackTitle('');
        setPickerOpen(false);
        try { window.localStorage.removeItem(FM_SESSION_KEY); } catch { /* fine */ }
        pushSettings({ fmSession: null });
        showToast('Miniplayer: CLOSED');
    };

    const onPlayTap = () => {
        if (status === 'playing') { playerRef.current?.pauseVideo(); return; }
        playerRef.current?.playVideo();
    };

    const onNextTap = () => playerRef.current?.nextVideo();
    /* ⟳ SHUFFLE — the USB pad's left key, the fourth of the cluster (Brendon,
       2026-07-28: "can we not add a 4th button too?" → "maybe shuffle
       instead?"). The MP330's pad is a five-key cross; ours had top, centre,
       right and bottom and an empty left. ⟳ is PD's own shuffle mark, the one
       the home Shuffle tab already wears — never a new glyph. */
    const [shuffleOn, setShuffleOn] = useState(false);
    const onShuffleTap = () => {
        const next = !shuffleOn;
        setShuffleOn(next);
        playerRef.current?.setShuffle?.({ shufflePlaylist: next });
        showToast(`Shuffle: ${next ? 'ON' : 'OFF'}`);
    };

    /* ── The bus: other surfaces (the Stone's miniplayer mini, the Mint
       Room) drive this one player + read its state. Playing from anywhere
       IS the door — the device appears with the session. body.pd-fm-live
       flags the live deck (toast lift + stone stacking read it). */
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; });
    useEffect(() => registerFmDriver({
        play: (st) => start(st),
        playQueue: (sts) => startRun(sts),
        toggle: () => {
            if (statusRef.current === 'playing') playerRef.current?.pauseVideo();
            else playerRef.current?.playVideo();
        },
        next: () => playerRef.current?.nextVideo(),
    }), [start, startRun]);
    useEffect(() => {
        publishFm({ status, station: onAir, trackTitle });
    }, [status, onAir, trackTitle]);
    useEffect(() => {
        document.body.classList.toggle('pd-fm-live', onAir !== null);
        return () => document.body.classList.remove('pd-fm-live');
    }, [onAir]);

    /* THE TICKER (Brendon, 2026-07-22) — measure every LCD row after paint;
       a row whose text overflows the glass gets the sideways crawl (shift +
       speed sized to how much is hidden), a row that fits stays perfectly
       still. Re-runs whenever the readout text or the face changes. */
    useEffect(() => {
        const root = barRef.current;
        if (!root) return;
        const raf = requestAnimationFrame(() => {
            root.querySelectorAll<HTMLElement>('.fm-lcd-row').forEach((row) => {
                const inner = row.firstElementChild as HTMLElement | null;
                row.classList.remove('fm-lcd-row--scroll');
                row.style.removeProperty('--fm-shift');
                row.style.removeProperty('--fm-dur');
                if (!inner || row.clientWidth === 0) return;
                const overflow = inner.scrollWidth - row.clientWidth;
                if (overflow > 2) {
                    const shift = overflow + 6;
                    row.classList.add('fm-lcd-row--scroll');
                    row.style.setProperty('--fm-shift', `-${shift}px`);
                    /* Slow, old-MP3 crawl (Brendon, 2026-07-22 — the first pass
                       raced). ~half the speed; longer names take proportionally
                       longer, with a clear pause held at each end (keyframes). */
                    row.style.setProperty('--fm-dur', `${Math.max(7, shift / 11 + 4).toFixed(1)}s`);
                }
            });
        });
        return () => cancelAnimationFrame(raf);
    }, [trackTitle, onAir, deadLink, status, display]);

    /* ── The station picker — the customization (tap the screen) ── */
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

    /* YOUR TRACKS — live from the private store. */
    useEffect(() => {
        const read = () => setTracks(getTracks());
        read();
        return subscribeTracks(read);
    }, []);

    /* SAME CRITERIA AS THE ARTIST'S: the pasted link goes through the very
       route the Studio soundtrack manager uses, so a link PD would refuse an
       artist is refused here too. */
    const draftId = normalizePlaylistId(trackDraft);
    useEffect(() => {
        if (!draftId) { setTrackCheck('idle'); setTrackReason(''); setTrackTitleFound(''); return; }
        let cancel = false;
        setTrackCheck('checking');
        setTrackReason('');
        const t = window.setTimeout(() => {
            fetch(`/api/studio/playlist?list=${encodeURIComponent(draftId)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancel) return;
                    setTrackCheck(d?.public === true ? 'ok' : d?.public === false ? 'bad' : 'idle');
                    setTrackReason(typeof d?.reason === 'string' ? d.reason : '');
                    setTrackTitleFound(typeof d?.title === 'string' ? d.title : '');
                })
                .catch(() => { if (!cancel) setTrackCheck('idle'); });
        }, 600);
        return () => { cancel = true; window.clearTimeout(t); };
    }, [draftId]);

    const saveTrack = () => {
        if (!draftId || trackCheck === 'bad') return;
        const res = addTrack(draftId, trackTitleFound || draftId);
        if (res === 'full') { showToast(`Your Tracks: FULL (${MAX_TRACKS})`); return; }
        if (res === 'duplicate') { showToast('Your Tracks: ALREADY IN'); return; }
        setTrackDraft('');
        setTrackCheck('idle');
        setTrackTitleFound('');
        showToast('Your Tracks: ADDED');
    };

    /* ── THE USB DOOR (Brendon, 2026-07-28) — the cap, then the tip.
       Cap ON  · tap        → the cap pops off, the plug is exposed.
       Cap OFF · tap        → the cap goes back on.
       Cap OFF · hold / ×3  → YOUR TRACKS opens in the pop-out menu.
       This is the ONLY way in; nothing else on PD mentions it. ── */
    const tapsRef = useRef(0);
    const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const openTracks = useCallback(() => {
        if (tapTimerRef.current) { clearTimeout(tapTimerRef.current); tapTimerRef.current = null; }
        tapsRef.current = 0;
        setPickerView('tracks');
        setPickerOpen(true);
    }, []);

    const capHold = useLongPress(() => { if (usbCapOff) openTracks(); });

    /* ⛔ THE CAP TOGGLES INSTANTLY (Brendon, 2026-07-28: "it flashes for a second
       goes away then comes back normal. Needs to just work normal on/off").
       The seat used to WAIT OUT the triple-tap window before re-capping, and
       that third-of-a-second hold is exactly the stutter he saw. On/off is now
       immediate, every tap; the triple-tap still counts in the background and
       opens the tracks on the third, leaving the cap off. */
    const onCapTap = () => {
        setUsbCapOff((v) => !v);
        tapsRef.current += 1;
        if (tapsRef.current >= 3) { setUsbCapOff(true); openTracks(); return; }
        if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
        tapTimerRef.current = setTimeout(() => {
            tapTimerRef.current = null;
            tapsRef.current = 0;
        }, 320);
    };
    useEffect(() => () => { if (tapTimerRef.current) clearTimeout(tapTimerRef.current); }, []);

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
    useEffect(() => () => {
        playerRef.current?.destroy();
        playerRef.current = null;
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
    }, []);

    /* No session, no device — playing a soundtrack is the only door in. */
    if (rotation.length === 0 || !onAir) return null;

    const isDeckFace = display === 'deck';

    /* The three LCD rows — Sony minidisc grammar: static, compact, no crawl.
       Row 1 = the SONG now playing AND the playlist it's from, joined with
       " - "; the marquee crawls the whole line (Brendon, 2026-07-22). Falls
       back to whichever half exists if the other hasn't reported yet.
       Row 2 = WHOSE OST it is, the project handle (@name OST). */
    const rowTrack =
        trackTitle && trackTitle !== onAir.label
            ? `${trackTitle} - ${onAir.label}`
            : (trackTitle || onAir.label);
    const rowStation = onAir.slug ? `@${onAir.slug} OST` : onAir.label;
    const rowStatus =
        deadLink ? '✕︎ DEAD LINK' :
        status === 'playing' ? '▶︎ PLAYING' :
        status === 'paused' ? '‖ PAUSED' : '… TUNING';

    return (
        <>
        {/* USB face only: the headphone lead (Brendon, 2026-07-30) — out of the
            stick's right end, hanging with slack, then down toward the phone's
            own jack at the bottom centre. It sits OUTSIDE the chassis so it can
            paint BEHIND the shell (his call: bottom layer), and it is scenery
            only — aria-hidden, pointer-events off, so it never takes a tap. */}
        {display === 'usb' && (
            <svg className="fm-usbcable" viewBox="0 0 180 100" aria-hidden="true" focusable="false">
                <defs>
                    {/* the tube, built from light instead of a contour: the barrel
                        turning away, the lit core, the specular — each dimming as
                        the lead runs away from the player */}
                    <linearGradient id="fmCableBarrel" x1="0" y1="0" x2="0.35" y2="1">
                        <stop offset="0%" stopColor="#d9dcde" />
                        <stop offset="55%" stopColor="#b6babd" />
                        <stop offset="100%" stopColor="#93989c" />
                    </linearGradient>
                    <linearGradient id="fmCableCore" x1="0" y1="0" x2="0.35" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="60%" stopColor="#f0f2f2" />
                        <stop offset="100%" stopColor="#d6d9da" />
                    </linearGradient>
                    <linearGradient id="fmCableLit" x1="0" y1="0" x2="0.35" y2="1">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
                        <stop offset="70%" stopColor="#ffffff" stopOpacity="0.55" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0.25" />
                    </linearGradient>
                    {/* the plug body — same white rubber as the lead, lit from the
                        same side, so it reads as one moulded piece */}
                    <linearGradient id="fmCableJack" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ffffff" />
                        <stop offset="45%" stopColor="#eef0f0" />
                        <stop offset="100%" stopColor="#9ea3a7" />
                    </linearGradient>
                </defs>
                <path className="fm-cable-barrel" d={FM_CABLE_D} />
                <path className="fm-cable-core" d={FM_CABLE_D} />
                <path className="fm-cable-lit" d={FM_CABLE_D} transform="translate(0,-0.85)" />
                {/* THE PLUG (Brendon, 2026-07-30) — the little jack body where the
                    lead meets the shell. Its inboard end runs under the plastic, so
                    what you see is the part standing proud of the case, tilted with
                    the cable's own run. */}
                <rect
                    className="fm-cable-jack"
                    x="124"
                    y="14.1"
                    width="24"
                    height="9.6"
                    rx="3"
                    transform="rotate(-6 124 18.9)"
                />
            </svg>
        )}
        <div
            ref={barRef}
            className={`fm-bar fm-mode-${display} fm-live${status === 'playing' ? ' fm-playing' : ''}`}
            title="miniplayer — the platform's soundtracks. Tap the screen to pick a station."
        >
            {pickerOpen && pickerView === 'tracks' && (
                <div className="fm-picker fm-picker-tracks" role="listbox" aria-label="Your tracks">
                    <div className="fm-picker-head">YOUR TRACKS · {tracks.length}/{MAX_TRACKS}</div>
                    <div className="fm-track-add">
                        <input
                            className="fm-track-input"
                            placeholder="youtube.com/playlist?list=…"
                            inputMode="url"
                            value={trackDraft}
                            onChange={(e) => setTrackDraft(e.target.value)}
                        />
                        <button
                            type="button"
                            className="fm-track-save"
                            disabled={!draftId || trackCheck === 'bad' || tracks.length >= MAX_TRACKS}
                            onClick={saveTrack}
                        >
                            ADD
                        </button>
                    </div>
                    {trackCheck !== 'idle' && (
                        <div className="fm-track-note" role="status">
                            {trackCheck === 'checking' && 'CHECKING…'}
                            {trackCheck === 'ok' && `PLAYS ✓${trackTitleFound ? ` · ${trackTitleFound}` : ''}`}
                            {trackCheck === 'bad' && `WON'T PLAY${trackReason ? ` — ${trackReason}` : ''}`}
                        </div>
                    )}
                    {tracks.length === 0 && (
                        <div className="fm-track-note">Nothing yet — paste a YouTube playlist above.</div>
                    )}
                    {tracks.map((t) => (
                        <div key={t.playlistId} className="fm-picker-row fm-track-row">
                            <button
                                type="button"
                                className="fm-track-play"
                                onClick={() => pickStation({ playlistId: t.playlistId, label: t.label, slug: null })}
                            >
                                <span className="fm-picker-glyph">▶︎</span> {t.label}
                            </button>
                            <span
                                className="fm-track-del"
                                role="button"
                                tabIndex={0}
                                title="Remove"
                                onClick={(e) => { e.stopPropagation(); removeTrack(t.playlistId); showToast('Your Tracks: REMOVED'); }}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); removeTrack(t.playlistId); showToast('Your Tracks: REMOVED'); } }}
                            >
                                ×
                            </span>
                        </div>
                    ))}
                </div>
            )}
            {pickerOpen && pickerView === 'stations' && (
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
            {/* USB face only: the end cap over the plug — tap off / tap on.
                Rendered after nothing that matters: the video host slot below
                never moves. */}
            {display === 'usb' && (
                <button
                    type="button"
                    className={`fm-usbcap${usbCapOff ? ' fm-usbcap--off' : ''}`}
                    onClick={onCapTap}
                    {...capHold}
                    title={usbCapOff ? 'Tap to cap · hold for your tracks' : 'USB cap'}
                    aria-label={usbCapOff ? 'USB plug — hold for your tracks' : 'USB cap'}
                />
            )}
            {/* ── transport keys — LEFT side, like the deck of a Sony MD.
                ▶/≫/TUNE are the deck's; ⎇ MODE and × ride EVERY face
                (Brendon, 2026-07-20). Static slots — the video host below
                must never shift and remount. ── */}
            {/* play/pause rides EVERY face (Brendon, 2026-07-22); ≫ next stays
                deck-only. */}
            <button
                type="button"
                className="fm-btn fm-play"
                onClick={onPlayTap}
                title={status === 'playing' ? 'Pause' : 'Play'}
            >
                {status === 'playing' || status === 'loading' ? '‖' : '▶︎'}
            </button>
            {display === 'usb' && (
                <button
                    type="button"
                    className={`fm-btn fm-shuffle${shuffleOn ? ' on' : ''}`}
                    onClick={onShuffleTap}
                    title={shuffleOn ? 'Shuffle on' : 'Shuffle off'}
                >
                    {'⟳︎'}
                </button>
            )}
            {(isDeckFace || display === 'usb') && (
                <button type="button" className="fm-btn" onClick={onNextTap} title="Next track">
                    ≫
                </button>
            )}
            <button type="button" className="fm-btn fm-modekey" onClick={cycleDisplay} title="Change how the player shows">
                {/* ⎇ ALTERNATE (U+2387) — Brendon's pick 2026-07-20 for
                    the face-cycler; catalogued in GLYPHS.md. */}
                {'⎇︎'}
            </button>
            <button
                type="button"
                className="fm-btn fm-close"
                onClick={closePlayer}
                title="Close the miniplayer"
                aria-label="Close the miniplayer"
            >
                ×
            </button>
            {/* ── THE screen — one display: the forced-YT art window IS part
                of it, beside the readout rows. Tap = station picker. ── */}
            {/* Only the DECK face sends the album art out to YouTube; on TAB and
                DISC it opens the picker instead (Brendon, 2026-07-26). */}
            <button
                type="button"
                className="fm-screen"
                onClick={() => (setPickerView('stations'), setPickerOpen((v) => !v))}
                title="Pick a station"
            >
                {/* The video host stays mounted for the session — YT replaces
                    it with the iframe; a remount kills the audio. The overlay
                    carries the tap so the iframe never swallows it.

                    WHERE THE TAP GOES depends on the face (Brendon, 2026-07-26):
                    DECK still opens the full playlist on YouTube in a new tab
                    (2026-07-20), while TAB and DISC open the station picker —
                    the same thing tapping the rest of the screen does. */}
                <span
                    className="fm-video"
                    role="button"
                    tabIndex={0}
                    title={artOpensYouTube ? 'Open the full playlist on YouTube' : 'Pick a station'}
                    aria-label={artOpensYouTube ? 'Open the full playlist on YouTube' : 'Pick a station'}
                    onClick={(e) => {
                        e.stopPropagation();
                        if (artOpensYouTube) {
                            window.open(stationWatchUrl(onAir.playlistId), '_blank', 'noopener,noreferrer');
                        } else {
                            (setPickerView('stations'), setPickerOpen((v) => !v));
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (artOpensYouTube) {
                                window.open(stationWatchUrl(onAir.playlistId), '_blank', 'noopener,noreferrer');
                            } else {
                                (setPickerView('stations'), setPickerOpen((v) => !v));
                            }
                        }
                    }}
                >
                    <span ref={videoHostRef} />
                    <span className="fm-video-tap" aria-hidden="true" />
                </span>
                {/* The USB face draws a REAL dot-matrix LCD instead of styled
                    text — the shop's own pixel font, black glass, lit segments
                    (Brendon, 2026-07-28). The DECK reads on the same glass
                    (Brendon, 2026-07-30) — same deck in every other respect,
                    only the readout style changes. TAB and DISC keep rows. */}
                {display === 'usb' || isDeckFace ? (
                    <FmLcd
                        rows={[rowTrack, rowStation, rowStatus]}
                        playing={status === 'playing'}
                        getElapsed={() => playerRef.current?.getCurrentTime?.() ?? 0}
                    />
                ) : (
                    <span className="fm-rows">
                        <span className="fm-lcd-row fm-lcd-track"><span className="fm-lcd-inner">{rowTrack}</span></span>
                        <span className="fm-lcd-row"><span className="fm-lcd-inner">{rowStation}</span></span>
                        <span className="fm-lcd-row"><span className="fm-lcd-inner">{rowStatus}</span></span>
                    </span>
                )}
                {/* TAB's equalizer — present in every face, shown by its mode
                    class only. */}
                <span className="fm-sigbars" aria-hidden="true">
                    <span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" />
                </span>
            </button>
        </div>
        </>
    );
}
