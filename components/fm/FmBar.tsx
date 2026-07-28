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
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import { getSoundtrackStarItems } from '../../lib/pins/soundtrackStarStore';
import { registerFmDriver, publishFm, type FmStation } from '../../lib/fm/fmBus';
import { pushSettings, pushSettingsDebounced } from '../../lib/state/userState';

/* ── Minimal YT IFrame API surface (no @types dependency) ── */
interface YTPlayer {
    playVideo(): void;
    pauseVideo(): void;
    nextVideo(): void;
    loadPlaylist(opts: { list: string; listType: 'playlist' }): void;
    loadVideoById(id: string): void;
    cuePlaylist(opts: { list: string; listType: 'playlist'; index?: number; startSeconds?: number }): void;
    cueVideoById(opts: { videoId: string; startSeconds?: number }): void;
    getCurrentTime?(): number | undefined;
    getPlaylistIndex?(): number | undefined;
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

/* A station id is either a YouTube PLAYLIST (PL…/OLAK…/UU… etc.) or a single
   full-album VIDEO (a bare 11-char id). The player loads each differently. */
const isPlaylistId = (id: string) => /^(PL|OLAK|RD|UU|FL|LL)/.test(id);
const stationWatchUrl = (id: string) =>
    isPlaylistId(id)
        ? playlistWatchUrl(id)
        : `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;

/* The four faces, cycled in this order (Brendon, 2026-07-22 — Micro + Slab
   retired; 2026-07-27 — USB added, right after Deck). The internal `signal`
   key stays (it drives the .fm-mode-signal equalizer face and every saved
   value); its user-facing name is now "Tab". */
const FM_DISPLAYS = ['deck', 'usb', 'signal', 'disc'] as const;
type FmDisplay = (typeof FM_DISPLAYS)[number];
const FM_DISPLAY_NAMES: Record<FmDisplay, string> = {
    deck: 'Deck', usb: 'USB', signal: 'Tab', disc: 'Disc',
};

/* The saved live session (station + entry + seconds) — mirror of the
   account envelope's `fmSession` (Brendon, 2026-07-27: closing the app and
   returning restores the player right where it was paused). */
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
        /* the ™ is a toast-only flourish (Brendon, 2026-07-22 — "for fun"); it
           rides the wordmark itself now, so never a second one on the face name
           (Brendon, 2026-07-28 — "only one tm not two"). */
        showToast(`miniplayer ${FM_DISPLAY_NAMES[next]}`);
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
    const armWatchdog = useCallback(() => {
        if (watchdogRef.current) clearTimeout(watchdogRef.current);
        /* 12s of silence after a tune = the link is dead (private, deleted,
           or unreachable playlist). Only a stuck TUNING flags — a user pause
           never does. */
        watchdogRef.current = setTimeout(() => {
            if (statusRef.current === 'loading') {
                setDeadLink(true);
                setStatus('paused');
                showToast('Station: DEAD LINK');
            }
        }, 12000);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const start = useCallback((station: Station) => {
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
                        const r = resumeRef.current;
                        if (r) {
                            if (asPlaylist) e.target.cuePlaylist({ list: station.playlistId, listType: 'playlist', index: r.index, startSeconds: r.t });
                            else e.target.cueVideoById({ videoId: station.playlistId, startSeconds: r.t });
                            return; // stays cued; ▶ (a real tap) starts the sound
                        }
                        e.target.playVideo();
                    },
                    onStateChange: (e: { data: number; target: YTPlayer }) => {
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
                        else if (e.data === YT.PlayerState.ENDED) { setStatus('paused'); saveSession(true); }
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
    }, [onAir, saveSession]);

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
        if (watchdogRef.current) { clearTimeout(watchdogRef.current); watchdogRef.current = null; }
        errCountRef.current = 0;
        setDeadLink(false);
        setStatus('idle');
        setOnAir(null);
        setTrackTitle('');
        setPickerOpen(false);
        try { window.localStorage.removeItem(FM_SESSION_KEY); } catch { /* fine */ }
        pushSettings({ fmSession: null });
        showToast('miniplayer: CLOSED');
    };

    const onPlayTap = () => {
        if (status === 'playing') { playerRef.current?.pauseVideo(); return; }
        playerRef.current?.playVideo();
    };

    const onNextTap = () => playerRef.current?.nextVideo();

    /* ── The bus: other surfaces (the Stone's miniplayer mini, the Mint
       Room) drive this one player + read its state. Playing from anywhere
       IS the door — the device appears with the session. body.pd-fm-live
       flags the live deck (toast lift + stone stacking read it). */
    const statusRef = useRef(status);
    useEffect(() => { statusRef.current = status; });
    useEffect(() => registerFmDriver({
        play: (st) => start(st),
        toggle: () => {
            if (statusRef.current === 'playing') playerRef.current?.pauseVideo();
            else playerRef.current?.playVideo();
        },
        next: () => playerRef.current?.nextVideo(),
    }), [start]);
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
        <div
            ref={barRef}
            className={`fm-bar fm-mode-${display} fm-live${status === 'playing' ? ' fm-playing' : ''}`}
            title="miniplayer — the platform's soundtracks. Tap the screen to pick a station."
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
            {/* USB face only: the end cap over the plug — tap off / tap on.
                Rendered after nothing that matters: the video host slot below
                never moves. */}
            {display === 'usb' && (
                <button
                    type="button"
                    className={`fm-usbcap${usbCapOff ? ' fm-usbcap--off' : ''}`}
                    onClick={() => setUsbCapOff((v) => !v)}
                    title="USB cap"
                    aria-label="USB cap"
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
                onClick={() => setPickerOpen((v) => !v)}
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
                            setPickerOpen((v) => !v);
                        }
                    }}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            if (artOpensYouTube) {
                                window.open(stationWatchUrl(onAir.playlistId), '_blank', 'noopener,noreferrer');
                            } else {
                                setPickerOpen((v) => !v);
                            }
                        }
                    }}
                >
                    <span ref={videoHostRef} />
                    <span className="fm-video-tap" aria-hidden="true" />
                </span>
                <span className="fm-rows">
                    <span className="fm-lcd-row fm-lcd-track"><span className="fm-lcd-inner">{rowTrack}</span></span>
                    <span className="fm-lcd-row"><span className="fm-lcd-inner">{rowStation}</span></span>
                    <span className="fm-lcd-row"><span className="fm-lcd-inner">{rowStatus}</span></span>
                </span>
                {/* TAB's equalizer — present in every face, shown by its mode
                    class only. */}
                <span className="fm-sigbars" aria-hidden="true">
                    <span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" /><span className="fm-sb" />
                </span>
            </button>
        </div>
    );
}
