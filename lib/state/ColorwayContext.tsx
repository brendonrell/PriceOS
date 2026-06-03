'use client';

/*
 * ColorwayContext
 *
 * Owns the page's colorway state. Setting a colorway writes hex values into
 * --bg-color / --text-color (and a few related vars) on documentElement
 * and persists the colorway key in localStorage.
 *
 * Colorway keys + bg colors match the sim verbatim:
 *   custom   #C488FF  (Soft violet — the CUSTOM_COLOR slot)
 *   light    #e0e0e0
 *   dark     #1a1a1a
 *   orange   #ff6600
 *   blue     #3D9EFF
 *   red      #FF0033
 *   hashsyn  #7B2FFF
 *
 * Plus a non-pickable default — Dot #111111 — which is what the page
 * boots into when no colorway has been picked. This is the React port's
 * starting state per Brendon's brief; it differs from the sim's default
 * (which boots into "custom" / yellow). Sim doesn't govern the default
 * color, so this is a port-only choice. The picker doesn't include
 * Dot as a pill — it's the baseline you return to by clearing
 * pd_settings_colorway in storage.
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

export type ColorwayKey =
    | 'custom'
    | 'light'
    | 'dark'
    | 'orange'
    | 'blue'
    | 'red'
    | 'hashsyn'
    | 'haze'
    | null; // null = factory default (Dot)

const COLORWAYS: Record<NonNullable<ColorwayKey>, string> = {
    /* COLORWAYS.custom is the fallback fill when the user hasn't picked a
       custom hex yet. Soft Violet (#C488FF) is the canonical default
       for the custom color slot. The static fallback below is
       overridden by the user's saved hex via getCustomBg() on every
       applyColorway pass; this value only paints when no custom hex has
       been saved or the saved value is malformed. The profile-colorway
       default (Attention Yellow) is a separate slot that lands with
       Profile Page v0 — these two should not be conflated. */
    custom:  '#C488FF',
    light:   '#e0e0e0',
    dark:    '#1a1a1a',
    orange:  '#ff6600',
    blue:    '#3D9EFF',
    red:     '#FF0033',
    hashsyn: '#7B2FFF',
    /* Haze — user-chosen bg color, same persistence pattern as custom.
       COLORWAYS.haze is the fallback when no custom hex has been saved. */
    haze:    '#25EC00',
};

/* F64 (BUG-28) — when the active colorway is 'custom', the bg hex comes from
   the user's saved pick (lib/hooks/useCustomColor.ts), not the static
   COLORWAYS.custom constant. The hook owns persistence + migration; this
   helper just reads the already-migrated value on every applyColorway pass.
   Falls back to COLORWAYS.custom whenever the saved value is missing or
   malformed. SSR-safe via the `typeof window` guard. */
const CUSTOM_COLOR_KEY = 'pd_custom_color';
const HEX_RE = /^#[0-9A-F]{6}$/i;
function getCustomBg(): string {
    if (typeof window === 'undefined') return COLORWAYS.custom;
    try {
        const saved = localStorage.getItem(CUSTOM_COLOR_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return COLORWAYS.custom;
}

/* Haze — same pattern as custom. Storage key: `pd_haze_color`. Falls
   back to COLORWAYS.haze (#25EC00) when no custom hex has been saved. */
const HAZE_COLOR_KEY = 'pd_haze_color';
function getHazeBg(): string {
    if (typeof window === 'undefined') return COLORWAYS.haze;
    try {
        const saved = localStorage.getItem(HAZE_COLOR_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return COLORWAYS.haze;
}

/* Haze variation — persists like any other colorway preference.
   Valid values: 'tint' | 'drift' | 'pulse' | 'chromatic'. Absent or
   unrecognised means no variation (plain solid color). */
const HAZE_VARIATION_KEY = 'pd_haze_variation';
const VALID_VARIATIONS: HazeVariation[] = ['pure', 'tint', 'drift', 'pulse', 'chromatic'];
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
   When the active colorway is 'light' AND pdNotifs.pure_light is true, the bg
   hex is forced to #ffffff (instead of the standard #e0e0e0 light bg).
   Same for 'dark' AND pdNotifs.pure_dark forcing #000000. The pure flags
   live in pdNotifs (read from localStorage here so applyColorway can be
   invoked from contexts upstream of PdNotifsProvider — same pattern
   useCustomColor uses for the custom hex). MyPdSection's pure_light /
   pure_dark pills dispatch a `pd:pure-mode-changed` event after writing
   the flag; ColorwayProvider listens for it and re-runs applyColorway on the
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

const STORAGE_KEY = 'pd_settings_colorway';

interface ColorwayContextValue {
    /** Currently active colorway key. null = no pick (Dot default). */
    colorway: ColorwayKey;
    /** Apply a colorway. Pass null to revert to the Dot default. */
    setColorway: (key: ColorwayKey) => void;
}

const ColorwayContext = createContext<ColorwayContextValue | null>(null);

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

/** Apply a colorway to the documentElement and body classes. */
function applyColorway(key: ColorwayKey) {
    let bg = key === null ? DOT : (key === 'custom' ? getCustomBg() : key === 'haze' ? getHazeBg() : COLORWAYS[key]);
    /* Brendon list item 7 — sim 6798-6803. Override standard light/dark
       bg with the pure variant when the corresponding flag is set. */
    if (key === 'light' || key === 'dark') {
        const { pure_light, pure_dark } = readPureFlags();
        if (key === 'light' && pure_light) bg = '#ffffff';
        if (key === 'dark'  && pure_dark)  bg = '#000000';
    }
    applyBgHex(bg, key);
}

/* F53 (BUG-18) — extracted from applyColorway so the HashSyn engine can
   apply a sampled hex without going through the COLORWAYS dict. Sim's
   setColorway accepts BOTH a key and a raw hex (sim 6796:
   `let bgHex = COLORWAYS[colorwayKey] || colorwayKey`); the React port does the
   same split — applyColorway(key) resolves the bg, then this helper does
   the var/class write with the resolved hex. The body-class flags
   still need the key (so colorway-hashsyn / colorway-dark / etc. light up
   correctly) — when the engine calls in, it passes 'hashsyn' so the
   colorway-hashsyn class stays attached even as the bg cycles. */
export function applyBgHex(bgHex: string, key: ColorwayKey) {
    const root = document.documentElement;
    const body = document.body;

    const bg = bgHex;
    // When a haze variation is running, hazeEngine snapshots the initial
    // --text-color into data-haze-text so buttons/text stay the same
    // polarity throughout animation (no black↔white flicker as the bg
    // sweeps mid-luminance hues). Read it here; fall back to normal YIQ.
    const lockedText = key === 'haze' ? (root.dataset.hazeText ?? null) : null;
    const text = lockedText ?? resolveTextColor(bg);

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
       must be re-derived per colorway. Without these writes, the static globals.css
       fallback (`--pill-l1-text: var(--hothurt)` = #FF0055) keeps the Showcase /
       Artworks / +More tabs and trait L1 pills stuck on red. Modal-bg likewise
       falls back to a green default. Dark colorway gets the diagonal repeating-
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

    // Update PWA theme-color meta so iOS chrome reflects custom/hashsyn
    // color changes (applyColorway handles named colorways; applyBgHex handles
    // custom-color and hashsyn paths that bypass applyColorway).
    const tcMeta = document.querySelector('meta[name="theme-color"]');
    if (tcMeta) tcMeta.setAttribute('content', bg);

    // Body class flags read by various colorway-conditional CSS rules.
    body.classList.toggle('colorway-dark',    key === 'dark');
    body.classList.toggle('colorway-light',   key === 'light');
    body.classList.toggle('colorway-orange',  key === 'orange');
    body.classList.toggle('colorway-blue',    key === 'blue');
    body.classList.toggle('colorway-red',     key === 'red');
    body.classList.toggle('colorway-hashsyn', key === 'hashsyn');
    body.classList.toggle('colorway-custom',  key === 'custom');
    body.classList.toggle('colorway-haze',    key === 'haze');
    body.classList.toggle('bg-is-red',        isRedBg(bg));
}

export function ColorwayProvider({ children }: { children: ReactNode }) {
    const [colorway, setColorwayState] = useState<ColorwayKey>(null);
    const pathname = usePathname();

    // Per-page colorway override. Project pages (/art/*) always paint the
    // custom color when no colorway is saved. Profile pages
    // (/{handle}/*) boot to Attention Yellow (#FFE600) when no colorway
    // is saved — own slot, NOT linked to the custom color.
    // User picks still apply on every page; this is the boot default
    // only. Re-runs on every route change so navigating in/out of
    // these surfaces swaps colorways cleanly.
    //
    // We always hydrate `colorway` state from localStorage so the rest of
    // the app (ColorwayPicker pill highlight, etc.) reads the user's saved
    // preference correctly, even when the page visually overrides.
    //
    // F53 (BUG-18) — hashsyn never persists (sim 12617-12618: it needs
    // live canvases per session). If somehow it appears in storage,
    // treat it as unset and boot Dot — re-picking hashsyn from the
    // picker gives a clean engine start.
    useEffect(() => {
        let savedColorway: ColorwayKey = null;
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (raw && raw in COLORWAYS && raw !== 'hashsyn') {
                savedColorway = raw as ColorwayKey;
            }
        } catch {
            /* ignore */
        }
        setColorwayState(savedColorway);

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

        if (isProjectPage && savedColorway === null) {
            // Project pages with NO user colorway pick boot to the
            // custom color. Users who've picked a colorway see their pick
            // here too — the earlier "always custom on /art/*" rule was
            // a CEO miscommunication; the picker has to work everywhere.
            applyBgHex(getCustomBg(), 'custom');
        } else if (isProfilePage && savedColorway === null) {
            // Profile pages with NO user colorway pick boot to Attention
            // Yellow. The synthetic `null` key keeps the body class
            // flags off (no colorway-* class added) — this is the boot
            // default, not a picker selection. Per-user profile colorway
            // override (MY PD settings native picker) lands later as a
            // separate slot from the custom color.
            applyBgHex('#FFE600', null);
        } else {
            applyColorway(savedColorway);
            // Boot haze variation engine and texture overlay if haze
            // is the saved colorway — same as any other persistent pref.
            if (savedColorway === 'haze') {
                const variation = getHazeVariation();
                if (variation) {
                    enableHazeVariation(variation, getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
                }
            }
        }
    }, [pathname]);

    /* F53 (BUG-18) — sim's hashsyn seed color is `#6a1fc2` (sim 12620),
       NOT COLORWAYS.hashsyn (`#7B2FFF`). The COLORWAYS entry exists so the
       picker pill carries a sensible static swatch + so applyColorway has
       a fallback when the engine hasn't sampled yet, but the runtime
       seed-on-activate matches sim verbatim. */
    const HASHSYN_SEED = '#6a1fc2';

    const setColorway = useCallback((key: ColorwayKey) => {
        const prev = colorway;
        setColorwayState(key);

        // F53 (BUG-18) — leaving hashsyn: tear down the engine before
        // applying the new colorway so the new bg isn't immediately
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
            // Apply base color first, then start variation if one is saved.
            applyColorway(key);
            const variation = getHazeVariation();
            if (variation) {
                enableHazeVariation(variation, getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
            }
        } else {
            // Apply on every page including /art/*. The prior suppression
            // branch (project pages ignore picks) made the picker a no-op
            // and is gone — see useEffect above for the boot-default rule.
            applyColorway(key);
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
    }, [colorway]);

    /* F64 (BUG-28) — when the user picks a new custom color via
       useCustomColor.setColor, the hook dispatches `pd:custom-color-changed`.
       Re-paint only when the active bg IS the custom color — either
       colorway === 'custom' (explicit pick) or savedColorway === null on a
       project page (boot default). Picking Dark on /art/prisms means
       the painted bg is dark, not custom, so a custom-color change
       must NOT repaint there. */
    useEffect(() => {
        const handler = () => {
            const isProjectPage = pathname?.startsWith('/art/') ?? false;
            const paintingCustom =
                colorway === 'custom' || (colorway === null && isProjectPage);
            if (paintingCustom) {
                applyBgHex(getCustomBg(), 'custom');
            }
        };
        window.addEventListener('pd:custom-color-changed', handler);
        return () => window.removeEventListener('pd:custom-color-changed', handler);
    }, [colorway, pathname]);

    /* Brendon list item 7 — Pure Light / Pure Dark live re-apply.
       MyPdSection's pure_light / pure_dark pills dispatch this event
       after flipping the corresponding pdNotifs flag and before
       (or after) calling setColorway. applyColorway honours the pure-flag
       overrides only when key is 'light' or 'dark', so the handler
       gates on those keys; no need to check pathname now that picks
       apply uniformly across pages. */
    useEffect(() => {
        const handler = () => {
            if (colorway === 'light' || colorway === 'dark') applyColorway(colorway);
        };
        window.addEventListener('pd:pure-mode-changed', handler);
        return () => window.removeEventListener('pd:pure-mode-changed', handler);
    }, [colorway]);

    const value = useMemo<ColorwayContextValue>(
        () => ({ colorway, setColorway }),
        [colorway, setColorway]
    );

    return <ColorwayContext.Provider value={value}>{children}</ColorwayContext.Provider>;
}

export function useColorway(): ColorwayContextValue {
    const ctx = useContext(ColorwayContext);
    if (!ctx) {
        throw new Error('useColorway must be used inside <ColorwayProvider>');
    }
    return ctx;
}
