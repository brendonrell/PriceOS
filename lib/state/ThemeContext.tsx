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
    const root = document.documentElement;
    const body = document.body;

    const bg = key === null ? DOT : THEMES[key];
    const text = resolveTextColor(bg);

    root.style.setProperty('--bg-color', bg);
    root.style.setProperty('--text-color', text);
    root.style.setProperty(
        '--border-color',
        text === DOT ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)'
    );
    root.style.setProperty('--accent', text);
    root.style.setProperty(
        '--stat-bg',
        text === DOT ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)'
    );
    root.style.setProperty(
        '--stat-active-bg',
        text === DOT ? '#000000' : MATRIX
    );
    root.style.setProperty(
        '--stat-active-text',
        text === DOT ? MATRIX : '#000000'
    );

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
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && raw in THEMES) {
                setThemeState(raw as ThemeKey);
                applyTheme(raw as ThemeKey);
            } else {
                applyTheme(null);
            }
        } catch {
            applyTheme(null);
        }
    }, []);

    const setTheme = useCallback((key: ThemeKey) => {
        setThemeState(key);
        applyTheme(key);
        try {
            if (key === null) {
                localStorage.removeItem(STORAGE_KEY);
            } else {
                localStorage.setItem(STORAGE_KEY, key);
            }
        } catch {
            // ignore quota / private mode
        }
    }, []);

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
