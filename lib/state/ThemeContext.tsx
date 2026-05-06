'use client';

/*
 * ThemeContext
 *
 * Owns the page's theme state. Setting a theme writes hex values into
 * --bg-color / --text-color (and a few related vars) on documentElement
 * and persists the theme key in localStorage.
 *
 * Theme keys + bg colors match the sim verbatim:
 *   artist   #FFE600  (Attention yellow — the ARTIST_COLOR slot)
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
import { disableHashSyn, enableHashSyn } from '../engines/hashSynEngine';

export type ThemeKey =
    | 'artist'
    | 'light'
    | 'dark'
    | 'orange'
    | 'blue'
    | 'red'
    | 'hashsyn'
    | null; // null = factory default (Dot)

const THEMES: Record<NonNullable<ThemeKey>, string> = {
    artist:  '#FFE600',
    light:   '#e0e0e0',
    dark:    '#1a1a1a',
    orange:  '#ff6600',
    blue:    '#3D9EFF',
    red:     '#FF0033',
    hashsyn: '#7B2FFF',
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
    const bg = key === null ? DOT : (key === 'artist' ? getArtistBg() : THEMES[key]);
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

    // Body class flags read by various theme-conditional CSS rules.
    body.classList.toggle('theme-dark',    key === 'dark');
    body.classList.toggle('theme-light',   key === 'light');
    body.classList.toggle('theme-orange',  key === 'orange');
    body.classList.toggle('theme-blue',    key === 'blue');
    body.classList.toggle('theme-red',     key === 'red');
    body.classList.toggle('theme-hashsyn', key === 'hashsyn');
    body.classList.toggle('theme-artist',  key === 'artist');
    body.classList.toggle('bg-is-red',     isRedBg(bg));

    // Update PWA theme-color meta if present.
    const themeMeta = document.querySelector('meta[name="theme-color"]');
    if (themeMeta) themeMeta.setAttribute('content', bg);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setThemeState] = useState<ThemeKey>(null);

    // Hydrate from localStorage on mount. The pre-hydration script in
    // layout.tsx applied the saved bg/text vars synchronously; here we
    // bring the React state in line so the picker shows the right
    // active pill.
    //
    // F53 (BUG-18) — hashsyn never persists (sim 12617-12618: it needs
    // live canvases per session), so it shouldn't appear in storage.
    // If somehow it does (manual write, older build), treat it as
    // unset and boot Dot — re-picking hashsyn from the picker gives a
    // clean engine start.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && raw in THEMES && raw !== 'hashsyn') {
                setThemeState(raw as ThemeKey);
                applyTheme(raw as ThemeKey);
            } else {
                applyTheme(null);
            }
        } catch {
            applyTheme(null);
        }
    }, []);

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

        if (key === 'hashsyn') {
            // Seed with sim's vivid purple so the surface flashes a
            // sensible colour while the canvases settle. The engine
            // resample cascade (200/600/1200/2500ms) overwrites the bg
            // with the sampled blend as soon as canvases are paintable.
            applyBgHex(HASHSYN_SEED, 'hashsyn');
            enableHashSyn((hex) => applyBgHex(hex, 'hashsyn'));
        } else {
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
       If the active theme is 'artist', re-run applyTheme so --bg-color /
       --text-color / etc. pick up the new value live. If a different theme
       is active, the new value silently persists (via the hook's
       localStorage write) and lights up next time the user picks Artist. */
    useEffect(() => {
        const handler = () => {
            if (theme === 'artist') applyTheme('artist');
        };
        window.addEventListener('pd:artist-color-changed', handler);
        return () => window.removeEventListener('pd:artist-color-changed', handler);
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
