'use client';

/*
 * ThemeContext
 *
 * Owns the platform theme: bg color, text color, and the chosen mode.
 *
 * Modes:
 *   'custom' — user-picked colour pair (or artist-custom-bg from a collection)
 *   'light'  — flat light
 *   'dark'   — flat dark
 *   'orange' — Brendon's signature platform theme; permanent option
 *   'zen'    — Attention-yellow workspace; per the workspace switcher
 *
 * Default mode = 'custom' with bg = Hothurt red and text = Dot near-black.
 *
 * The CSS vars --bg-color and --text-color drive everything visual; this
 * context updates them on documentElement (the <html> tag) at runtime.
 * The pre-hydration script in layout.tsx primes them synchronously so
 * there's no flash on reload.
 *
 * YIQ resolver: when the user (or a collection) sets an arbitrary bg
 * colour, the text colour is auto-derived using the standard YIQ
 * brightness formula. This is the same logic the sim uses for its
 * artist-custom-bg pass.
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

export type ThemeMode = 'custom' | 'light' | 'dark' | 'orange' | 'zen';

export interface ThemeState {
    mode: ThemeMode;
    bgColor: string;
    textColor: string;
}

const DEFAULTS: ThemeState = {
    mode: 'custom',
    bgColor: '#FF0055',  // Hothurt
    textColor: '#111111', // Dot
};

// Named theme presets. 'custom' isn't here because it's user-driven.
export const THEME_PRESETS: Record<Exclude<ThemeMode, 'custom'>, { bgColor: string; textColor: string }> = {
    light:  { bgColor: '#E0E0E0', textColor: '#111111' }, // Matrix on Dot
    dark:   { bgColor: '#111111', textColor: '#E0E0E0' }, // Dot on Matrix
    orange: { bgColor: '#FF8A3D', textColor: '#111111' }, // Brendon's permanent theme
    zen:    { bgColor: '#FFE600', textColor: '#111111' }, // Attention yellow
};

const STORAGE_KEY = 'pd_settings_theme';

/**
 * YIQ contrast resolver. Given a hex bg colour, returns either
 * '#111111' or '#E0E0E0' for the most legible text overlay.
 *
 * Same threshold the sim uses (~128 / 255). Accepts #RGB, #RRGGBB,
 * or named CSS colours (named falls back to dark-on-light since we
 * can't parse them without a DOM measurement).
 */
export function resolveTextColor(bg: string): string {
    const cleaned = bg.trim().toLowerCase();
    let r = 0, g = 0, b = 0;

    if (cleaned.startsWith('#')) {
        let hex = cleaned.slice(1);
        if (hex.length === 3) {
            hex = hex.split('').map((c) => c + c).join('');
        }
        if (hex.length === 6) {
            r = parseInt(hex.slice(0, 2), 16);
            g = parseInt(hex.slice(2, 4), 16);
            b = parseInt(hex.slice(4, 6), 16);
        } else {
            return '#111111';
        }
    } else if (cleaned.startsWith('rgb')) {
        const m = cleaned.match(/\d+/g);
        if (m && m.length >= 3) {
            r = parseInt(m[0], 10);
            g = parseInt(m[1], 10);
            b = parseInt(m[2], 10);
        }
    } else {
        // Named colour or unrecognised — default to dark text.
        return '#111111';
    }

    // YIQ brightness. Threshold 128 chosen to match the sim.
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#111111' : '#E0E0E0';
}

interface ThemeContextValue {
    theme: ThemeState;
    /** Apply a named preset. Falls through to 'custom' for arbitrary colours. */
    setMode: (mode: ThemeMode) => void;
    /** Apply an arbitrary bg colour. Text colour derives via YIQ unless overridden. */
    setCustomBg: (bgColor: string, textColor?: string) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<ThemeState>(DEFAULTS);

    // Hydrate from localStorage. The pre-hydration script has already
    // applied the saved colours to documentElement; this is just so the
    // React state matches.
    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                setTheme({ ...DEFAULTS, ...parsed });
            }
        } catch {
            // No-op.
        }
    }, []);

    // Apply CSS vars to <html> on every change + persist.
    useEffect(() => {
        const root = document.documentElement;
        root.style.setProperty('--bg-color', theme.bgColor);
        root.style.setProperty('--text-color', theme.textColor);

        // Update the meta theme-color tag too — affects iOS PWA URL bar tint.
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) meta.setAttribute('content', theme.bgColor);

        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
        } catch {
            // No-op.
        }
    }, [theme]);

    const setMode = useCallback((mode: ThemeMode) => {
        if (mode === 'custom') {
            setTheme((prev) => ({ ...prev, mode: 'custom' }));
            return;
        }
        const preset = THEME_PRESETS[mode];
        setTheme({ mode, bgColor: preset.bgColor, textColor: preset.textColor });
    }, []);

    const setCustomBg = useCallback((bgColor: string, textColor?: string) => {
        setTheme({
            mode: 'custom',
            bgColor,
            textColor: textColor ?? resolveTextColor(bgColor),
        });
    }, []);

    const value = useMemo<ThemeContextValue>(
        () => ({ theme, setMode, setCustomBg }),
        [theme, setMode, setCustomBg]
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
