'use client';

/*
 * ThemeContext
 *
 * Owns the page's theme state. Setting a theme writes hex values into
 * --bg-color / --text-color (and a few related vars) on documentElement
 * and persists the theme key in localStorage.
 *
 * Theme keys + bg colors match the sim verbatim:
 *   artist   #C488FF  (Soft violet — the ARTIST_COLOR slot)
 *   light    #e0e0e0
 *   dark     #1a1a1a
 *   orange   #ff6600
 *   blue     #3D9EFF
 *   red      #FF0033
 *   hashsyn  #7B2FFF
 *
 * Plus a non-pickable default — Dot #111111 — which is what the page
 * boots into when no theme has been picked. This is the React port's
 * starting state per Brendon's brief; it differs from the sim's default
 * (which boots into "artist" / yellow). Sim doesn't govern the default
 * colour, so this is a port-only choice. The picker doesn't include
 * Dot as a pill — it's the baseline you return to by clearing
 * pd_settings_theme in storage.
 *
 * Text color: YIQ luminance check on the bg. Bright bg → dark text
 * (#111111). Dim bg → light text (#e0e0e0). Same algorithm as the sim.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';
import { usePathname } from 'next/navigation';
import { disableHashSyn, enableHashSyn } from '../engines/hashSynEngine';
import {
    enableHazeVariation,
    disableHazeVariation,
    type HazeVariation,
} from '../engines/hazeEngine';

export type ThemeKey =
    | 'artist'
    | 'light'
    | 'dark'
    | 'orange'
    | 'blue'
    | 'red'
    | 'hashsyn'
    | 'haze'
    | null; // null = factory default (Dot)

const THEMES: Record<NonNullable<ThemeKey>, string> = {
    /* THEMES.artist is the fallback fill when the user hasn't picked a
       custom hex yet. Soft Violet (#C488FF) is the canonical default
       for the artist custom colour slot. The static fallback below is
       overridden by the user's saved hex via getArtistBg() on every
       applyTheme pass; this value only paints when no custom hex has
       been saved or the saved value is malformed. The profile-theme
       default (Attention Yellow) is a separate slot that lands with
       Profile Page v0 — these two should not be conflated. */
    artist:  '#C488FF',
    light:   '#e0e0e0',
    dark:    '#1a1a1a',
    orange:  '#ff6600',
    blue:    '#3D9EFF',
    red:     '#FF0033',
    hashsyn: '#7B2FFF',
    /* Haze — user-chosen bg color, same persistence pattern as artist.
       THEMES.haze is the fallback when no custom hex has been saved. */
    haze:    '#888888',
};

/* F64 (BUG-28) — when the active theme is 'artist', the bg hex comes from
   the user's saved pick (lib/hooks/useArtistColor.ts), not the static
   THEMES.artist constant. The hook owns persistence + migration; this
   helper just reads the already-migrated value on every applyTheme pass.
   Falls back to THEMES.artist whenever the saved value is missing or
   malformed. SSR-safe via the `typeof window` guard. */
const ARTIST_COLOR_KEY = 'pd_artist_color';
const ARTIST_HEX_RE = /^#[0-9A-F]{6}$/i;
function getArtistBg(): string {
    if (typeof window === 'undefined') return THEMES.artist;
    try {
        const saved = localStorage.getItem(ARTIST_COLOR_KEY);
        if (saved && ARTIST_HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return THEMES.artist;
}

/* Haze — same pattern as artist. Storage key: `pd_haze_color`. Falls
   back to THEMES.haze (#888888) when no custom hex has been saved. */
const HAZE_COLOR_KEY = 'pd_haze_color';
function getHazeBg(): string {
    if (typeof window === 'undefined') return THEMES.haze;
    try {
        const saved = localStorage.getItem(HAZE_COLOR_KEY);
        if (saved && ARTIST_HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return THEMES.haze;
}

/* Haze variation — persists like any other theme preference.
   Valid values: 'tint' | 'drift' | 'pulse' | 'chromatic'. Absent or
   unrecognised means no variation (plain solid colour). */
const HAZE_VARIATION_KEY = 'pd_haze_variation';
const VALID_VARIATIONS: HazeVariation[] = ['tint', 'drift', 'pulse', 'chromatic'];
export function getHazeVariation(): HazeVariation | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(HAZE_VARIATION_KEY);
        if (saved && (VALID_VARIATIONS as string[]).includes(saved)) {
            return saved as HazeVariation;
        }
    } catch { /* ignore */ }
    return null;
}
export function setHazeVariation(v: HazeVariation | null): void {
    try {
        if (v === null) {
            localStorage.removeItem(HAZE_VARIATION_KEY);
        } else {
            localStorage.setItem(HAZE_VARIATION_KEY, v);
        }
    } catch { /* ignore */ }
}


/* Brendon list item 7 — Pure Light / Pure Dark mode parity (sim 6798-6803).
   When the active theme is 'light' AND pdNotifs.pure_light is true, the bg
   hex is forced to #ffffff (instead of the standard #e0e0e0 light bg).
   Same for 'dark' AND pdNotifs.pure_dark forcing #000000. The pure flags
   live in pdNotifs (read from localStorage here so applyTheme can be
   invoked from contexts upstream of PdNotifsProvider — same pattern
   useArtistColor uses for the artist hex). MyPdSection's pure_light /
   pure_dark pills dispatch a `pd:pure-mode-changed` event after writing
   the flag; ThemeProvider listens for it and re-runs applyTheme on the
   active key so the bg flips live. */
const NOTIFS_KEY = 'pd_settings_notifs';
function readPureFlags(): { pure_light: boolean; pure_dark: boolean } {
    if (typeof window === 'undefined') return { pure_light: false, pure_dark: false };
    try {
        const raw = localStorage.getItem(NOTIFS_KEY);
        if (!raw) return { pure_light: false, pure_dark: false };
        const parsed = JSON.parse(raw) as { pure_light?: boolean; pure_dark?: boolean };
        return {
            pure_light: !!parsed?.pure_light,
            pure_dark: !!parsed?.pure_dark,
        };
    } catch {
        return { pure_light: false, pure_dark: false };
    }
}

const DOT    = '#111111';
const MATRIX = '#e0e0e0';

const STORAGE_KEY = 'pd_settings_theme';

interface ThemeContextValue {
    /** Currently active theme key. null = no pick (Dot default). */
    theme: ThemeKey;
    /** Apply a theme. Pass null to revert to the Dot default. */
    setTheme: (key: ThemeKey) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

/** Compute text color from a bg hex via the YIQ luminance heuristic. */
function resolveTextColor(bgHex: string): string {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? DOT : MATRIX;
}

/** Detect a "red-ish" bg (used for the to-do markers' contrast safety). */
function isRedBg(bgHex: string): boolean {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return r > g + 40 && r > b + 40 && r > 100;
}

/** Apply a theme to the documentElement and body classes. */
function applyTheme(key: ThemeKey) {
    let bg = key === null ? DOT : (key === 'artist' ? getArtistBg() : key === 'haze' ? getHazeBg() : THEMES[key]);
    /* Brendon list item 7 — sim 6798-6803. Override standard light/dark
       bg with the pure variant when the corresponding flag is set. */
    if (key === 'light' || key === 'dark') {
        const { pure_light, pure_dark } = readPureFlags();
        if (key === 'light' && pure_light) bg = '#ffffff';
        if (key === 'dark'  && pure_dark)  bg = '#000000';
    }
    applyBgHex(bg, key);
}

/* F53 (BUG-18) — extracted from applyTheme so the HashSyn engine can
   apply a sampled hex without going through the THEMES dict. Sim's
   setTheme accepts BOTH a key and a raw hex (sim 6796:
   `let bgHex = THEMES[themeKey] || themeKey`); the React port does the
   same split — applyTheme(key) resolves the bg, then this helper does
   the var/class write with the resolved hex. The body-class flags
   still need the key (so theme-hashsyn / theme-dark / etc. light up
   correctly) — when the engine calls in, it passes 'hashsyn' so the
   theme-hashsyn class stays attached even as the bg cycles. */
export function applyBgHex(bgHex: string, key: ThemeKey) {
    const root = document.documentElement;
    const body = document.body;

    const bg = bgHex;
    const text = resolveTextColor(bg);

    /* RGB triplet for modal-bg rgba string (sim 6816). */
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const isLight = text === DOT;

    root.style.setProperty('--bg-color', bg);
    root.style.setProperty('--text-color', text);
    root.style.setProperty(
        '--border-color',
        isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
    );
    root.style.setProperty('--accent', text);
    root.style.setProperty(
        '--stat-bg',
        isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'
    );
    root.style.setProperty(
        '--stat-active-bg',
        isLight ? '#000000' : MATRIX
    );
    root.style.setProperty(
        '--stat-active-text',
        isLight ? MATRIX : '#000000'
    );

    /* Build 25 D1+D2+D3: sim 6820-6850 — pill-l1 + mint + modal-bg + btn-user-hover
       must be re-derived per theme. Without these writes, the static globals.css
       fallback (`--pill-l1-text: var(--hothurt)` = #FF0055) keeps the Showcase /
       Artworks / +More tabs and trait L1 pills stuck on red. Modal-bg likewise
       falls back to a green default. Dark theme gets the diagonal repeating-
       linear-gradient bg-img per sim 6826-6827. */
    const modalBg = `rgba(${r},${g},${b},0.98)`;
    const btnUserHover = isLight ? '#ffffff' : '#888888';

    let mintBg = '#111111';
    let mintText = MATRIX;
    let mintBorder = '#111111';
    const mintBgImg = 'none';
    let pillL1Bg = text;
    let pillL1BgImg = 'none';
    let pillL1Text = bg;
    let pillL1Border = text;
    let pillL1ActiveBgImg = 'none';

    if (key === 'dark') {
        mintBg = MATRIX;
        mintText = '#111111';
        mintBorder = MATRIX;
        pillL1Bg = '#111111';
        pillL1Text = MATRIX;
        pillL1Border = MATRIX;
        pillL1BgImg =
            'repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(224,224,224,0.15) 2px, rgba(224,224,224,0.15) 4px)';
        pillL1ActiveBgImg =
            'repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(224,224,224,0.55) 1px, rgba(224,224,224,0.55) 2px)';
    }

    root.style.setProperty('--modal-bg', modalBg);
    root.style.setProperty('--mint-bg', mintBg);
    root.style.setProperty('--mint-bg-img', mintBgImg);
    root.style.setProperty('--mint-text', mintText);
    root.style.setProperty('--mint-border', mintBorder);
    root.style.setProperty('--pill-l1-bg', pillL1Bg);
    root.style.setProperty('--pill-l1-bg-img', pillL1BgImg);
    root.style.setProperty('--pill-l1-text', pillL1Text);
    root.style.setProperty('--pill-l1-border', pillL1Border);
    root.style.setProperty('--pill-l1-active-bg-img', pillL1ActiveBgImg);
    root.style.setProperty('--btn-user-hover', btnUserHover);

    /* Brendon-list-2 chat I item 17 — sim 6860 belt-and-suspenders.
       Sim sets body.style.backgroundColor INLINE in addition to the
       --bg-color CSS var write. The React port previously relied on
       `body { background-color: var(--bg-color); }` alone; on hashsyn
       activation the bg appeared not to flip on some surfaces (likely
       a paint-cycle / specificity edge case where the var update didn't
       propagate before the engine's first sample lapped it). Inline
       writes always win the cascade for the bg-color rule on body, so
       both the seed (#6a1fc2) and engine-sampled hexes apply
       deterministically. Sim does this verbatim — keep parity. */
    body.style.backgroundColor = bg;

    // Update PWA theme-color meta so iOS chrome reflects artist/hashsyn
    // colour changes (applyTheme handles named themes; applyBgHex handles
    // custom-colour and hashsyn paths that bypass applyTheme).
    const tcMeta = document.querySelector('meta[name="theme-color"]');
    if (tcMeta) tcMeta.setAttribute('content', bg);

    // Body class flags read by various theme-conditional CSS rules.
    body.classList.toggle('theme-dark',    key === 'dark');
    body.classList.toggle('theme-light',   key === 'light');
    body.classList.toggle('theme-orange',  key === 'orange');
    body.classList.toggle('theme-blue',    key === 'blue');
    body.classList.toggle('theme-red',     key === 'red');
    body.classList.toggle('theme-hashsyn', key === 'hashsyn');
    body.classList.toggle('theme-artist',  key === 'artist');
    body.classList.toggle('theme-haze',    key === 'haze');
    body.classList.toggle('bg-is-red',     isRedBg(bg));

    // Update PWA theme-color meta if present.
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', bg);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeKey>(null);
    const pathname = usePathname();

    // Per-page theme override. Project pages (/art/*) always paint the
    // artist's custom colour when no theme is saved. Profile pages
    // (/{handle}/*) boot to Attention Yellow (#FFE600) when no theme
    // is saved — own slot, NOT linked to the artist custom colour.
    // User picks still apply on every page; this is the boot default
    // only. Re-runs on every route change so navigating in/out of
    // these surfaces swaps themes cleanly.
    //
    // We always hydrate `theme` state from localStorage so the rest of
    // the app (ThemePicker pill highlight, etc.) reads the user's saved
    // preference correctly, even when the page visually overrides.
    //
    // F53 (BUG-18) — hashsyn never persists (sim 12617-12618: it needs
    // live canvases per session). If somehow it appears in storage,
    // treat it as unset and boot Dot — re-picking hashsyn from the
    // picker gives a clean engine start.
    useEffect(() => {
        let savedTheme: ThemeKey = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && raw in THEMES && raw !== 'hashsyn') {
                savedTheme = raw as ThemeKey;
            }
        } catch {
            /* ignore */
        }
        setThemeState(savedTheme);

        const isProjectPage = pathname?.startsWith('/art/') ?? false;
        /* Profile Page v0 — pathname is a profile page when the first
           segment isn't 'art' or 'api', isn't all-digits (that's the
           output / global-id namespace), and matches the handle shape.
           `/` (root home) has empty first segment and falls through. */
        const firstSeg = (pathname?.split('/')[1] ?? '').toLowerCase();
        const isProfilePage =
            firstSeg.length > 0 &&
            firstSeg !== 'art' &&
            firstSeg !== 'api' &&
            !/^\d+$/.test(firstSeg) &&
            /^[@a-z0-9_-]+$/i.test(firstSeg);

        if (isProjectPage && savedTheme === null) {
            // Project pages with NO user theme pick boot to the artist's
            // custom colour. Users who've picked a theme see their pick
            // here too — the earlier "always artist on /art/*" rule was
            // a CEO miscommunication; the picker has to work everywhere.
            applyBgHex(getArtistBg(), 'artist');
        } else if (isProfilePage && savedTheme === null) {
            // Profile pages with NO user theme pick boot to Attention
            // Yellow. The synthetic `null` key keeps the body class
            // flags off (no theme-* class added) — this is the boot
            // default, not a picker selection. Per-user profile theme
            // override (MY PD settings native picker) lands later as a
            // separate slot from the artist custom colour.
            applyBgHex('#FFE600', null);
        } else {
            applyTheme(savedTheme);
            // Boot haze variation engine if haze is the saved theme
            // and a variation is stored — same as any other persistent
            // theme preference.
            if (savedTheme === 'haze') {
                const variation = getHazeVariation();
                if (variation) {
                    enableHazeVariation(variation, getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
                }
            }
        }
    }, [pathname]);

    /* F53 (BUG-18) — sim's hashsyn seed colour is `#6a1fc2` (sim 12620),
       NOT THEMES.hashsyn (`#7B2FFF`). The THEMES entry exists so the
       picker pill carries a sensible static swatch + so applyTheme has
       a fallback when the engine hasn't sampled yet, but the runtime
       seed-on-activate matches sim verbatim. */
    const HASHSYN_SEED = '#6a1fc2';

    const setTheme = useCallback((key: ThemeKey) => {
        const prev = theme;
        setThemeState(key);

        // F53 (BUG-18) — leaving hashsyn: tear down the engine before
        // applying the new theme so the new bg isn't immediately
        // overwritten by a pending retry/scroll resample.
        if (prev === 'hashsyn' && key !== 'hashsyn') {
            disableHashSyn();
        }

        // Leaving haze — tear down any running variation engine.
        if (prev === 'haze' && key !== 'haze') {
            disableHazeVariation(getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
        }

        if (key === 'hashsyn') {
            applyBgHex(HASHSYN_SEED, 'hashsyn');
            enableHashSyn((hex) => applyBgHex(hex, 'hashsyn'));
        } else if (key === 'haze') {
            // Apply base colour first, then start variation if one is saved.
            applyTheme(key);
            const variation = getHazeVariation();
            if (variation) {
                enableHazeVariation(variation, getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
            }
        } else {
            // Apply on every page including /art/*. The prior suppression
            // branch (project pages ignore picks) made the picker a no-op
            // and is gone — see useEffect above for the boot-default rule.
            applyTheme(key);
        }

        try {
            // F53 — sim 12618: hashsyn never persists. Removing the
            // key is the right call here too so a returning user
            // boots Dot rather than a stale bg.
            if (key === null || key === 'hashsyn') {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, key);
            }
        } catch {
            // ignore quota / private mode
        }
    }, [theme]);

    /* F64 (BUG-28) — when the user picks a new artist color via
       useArtistColor.setColor, the hook dispatches `pd:artist-color-changed`.
       Re-paint only when the active bg IS the artist colour — either
       theme === 'artist' (explicit pick) or savedTheme === null on a
       project page (boot default). Picking Dark on /art/prisms means
       the painted bg is dark, not artist, so an artist-colour change
       must NOT repaint there. */
    useEffect(() => {
        const handler = () => {
            const isProjectPage = pathname?.startsWith('/art/') ?? false;
            const paintingArtist =
                theme === 'artist' || (theme === null && isProjectPage);
            if (paintingArtist) {
                applyBgHex(getArtistBg(), 'artist');
            }
        };
        window.addEventListener('pd:artist-color-changed', handler);
        return () => window.removeEventListener('pd:artist-color-changed', handler);
    }, [theme, pathname]);

    /* Brendon list item 7 — Pure Light / Pure Dark live re-apply.
       MyPdSection's pure_light / pure_dark pills dispatch this event
       after flipping the corresponding pdNotifs flag and before
       (or after) calling setTheme. applyTheme honours the pure-flag
       overrides only when key is 'light' or 'dark', so the handler
       gates on those keys; no need to check pathname now that picks
       apply uniformly across pages. */
    useEffect(() => {
        const handler = () => {
            if (theme === 'light' || theme === 'dark') applyTheme(theme);
        };
        window.addEventListener('pd:pure-mode-changed', handler);
        return () => window.removeEventListener('pd:pure-mode-changed', handler);
    }, [theme]);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, setTheme }),
        [theme, setTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) {
        throw new Error('useTheme must be used inside <ThemeProvider>');
    }
    return ctx;
}
