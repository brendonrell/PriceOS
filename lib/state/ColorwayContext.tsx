'use client';

/*
 * ColorwayContext
 *
 * Owns the page's colorway state. Setting a colorway writes hex values into
 * --bg-color / --text-color (and a few related vars) on documentElement
 * and persists the colorway key in localStorage.
 *
 * Colorway keys + bg colors:
 *   custom   (DERIVED per page — home → Mood Ring, project → its colorway,
 *             profile → owner hex; no hardcoded hue. See resolveCustomBg.)
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
import { getProject, projectColorway } from '../project/registry';
import { moodHexToday } from '../mood/mood';
import { disableHashSyn, enableHashSyn } from '../engines/hashSynEngine';
import {
    enableHazeVariation,
    disableHazeVariation,
    type HazeVariation,
} from '../engines/hazeEngine';
import {
    pushSettings,
    USERSTATE_HYDRATED_EVENT,
} from './userState';

export type ColorwayKey =
    | 'custom'
    | 'light'
    | 'dark'
    | 'orange'
    | 'blue'
    | 'red'
    | 'hashsyn'
    | 'haze'
    /* PRIMARY+SECONDARY (Brendon, 2026-07-20) — the hidden long-press menu
       on DEFAULT COLORWAY: the brand primaries + the Kiki secondaries. */
    | 'hothurt'
    | 'attention'
    | 'bblue'
    | 'kiki'
    | null; // null = factory default (Dot)

const COLORWAYS: Record<NonNullable<ColorwayKey>, string> = {
    /* The Custom colorway has NO color of its own — it is ALWAYS derived from
       the page it's on (home → today's Mood Ring, project → that project's
       colorway, profile → the owner's hex); see resolveCustomBg(). This entry
       exists only to complete the type and as an absolute last-resort fallback,
       which is Dot (#111111) — never a baked-in hue. (A prior build hardcoded
       Soft Violet #C488FF here and it bled onto Home; removed — Brendon
       2026-06-13.) */
    custom:  '#111111',
    light:   '#e0e0e0',
    dark:    '#1a1a1a',
    orange:  '#ff6600',
    blue:    '#3D9EFF',
    red:     '#FF0033',
    hashsyn: '#7B2FFF',
    /* Haze — user-chosen bg color, same persistence pattern as custom.
       COLORWAYS.haze is the fallback when no custom hex has been saved. */
    haze:    '#25EC00',
    /* PRIMARY+SECONDARY — fixed brand hues (Brendon, 2026-07-20). */
    hothurt:   '#FF0055',
    attention: '#FFE600',
    bblue:     '#0109FF',
    kiki:      '#C488FF',
};

/* The "Custom" colorway's bg slot. Custom = the PAGE OWNER's colour
   (project page → the project's colorway; home → platform default), read here
   on every applyColorway pass with COLORWAYS.custom as the fallback.
   DECOUPLE GUARD: `pd_custom_color` is the Custom colorway ONLY. It is NOT the
   user's Profile Colorway (`pd_profile_hex` / server `profile_hex`) and NOT
   Haze Mode (`pd_haze_color`). Those are separate features with their own
   slots; never read/write one through another. SSR-safe via `typeof window`. */
const CUSTOM_COLOR_KEY = 'pd_custom_color';
const HEX_RE = /^#[0-9A-F]{6}$/i;
function getCustomBg(fallback: string = COLORWAYS.custom): string {
    if (typeof window === 'undefined') return fallback;
    try {
        const saved = localStorage.getItem(CUSTOM_COLOR_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return fallback;
}

/* PROFILE COLORWAY paint source. A profile page is painted with ITS OWNER's
   colour (their `profile_hex`) when the viewer is on the Custom / default
   colorway — "Custom = the page owner's colour", and Custom is the platform
   default. The owner hex is per-profile SERVER data, so (unlike a project's
   colorway, which paintForPath derives from the URL slug) ColorwayContext
   can't derive it from the path. The profile page registers it via
   setActiveProfileHex(); paintForPath reads it here.
   DECOUPLE GUARD: this is the profile OWNER's colour. It is NOT the viewer's
   "Custom" slot (`pd_custom_color`) and NOT "Haze Mode" (`pd_haze_color`). */
let activeProfileHex: string | null = null;
/* Default profile theme = brand matrix white — an un-themed profile reads
   blank (Brendon 2026-06-13). */
const PROFILE_DEFAULT = '#E0E0E0';
function getProfileBg(fallback: string = PROFILE_DEFAULT): string {
    return activeProfileHex && HEX_RE.test(activeProfileHex)
        ? activeProfileHex.toUpperCase()
        : fallback;
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
   useProfileHex uses for the profile hex). MyPdSection's pure_light /
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

/** Read the viewer's saved colorway pick from localStorage. null = no pick
 *  (the platform default, which resolves to the Custom / page-owner colour).
 *  hashsyn never persists (sim 12617-12618) — treat any stored value as unset. */
function readSavedColorway(): ColorwayKey {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw && raw in COLORWAYS && raw !== 'hashsyn') return raw as ColorwayKey;
    } catch {
        /* ignore */
    }
    return null;
}

interface ColorwayContextValue {
    /** Currently active colorway key. null = no pick (Dot default). */
    colorway: ColorwayKey;
    /** Apply a colorway. Pass null to revert to the Dot default. */
    setColorway: (key: ColorwayKey) => void;
    /** Register the owner colour of the profile page being viewed (its
     *  `profile_hex`), so the profile renders in its OWNER's colour under the
     *  Custom / default colorway. Pass null when leaving a profile page. */
    setActiveProfileHex: (hex: string | null) => void;
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

/** Detect a "yellow-ish" bg (both red + green channels high, blue low). Mirror
   of isRedBg — used so Attention-Yellow chrome (the currency picker) can flip
   to a contrasting colour when the colorway itself is yellow, the same way the
   Hothurt to-do markers flip on a red bg. */
function isYellowBg(bgHex: string): boolean {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    return r > b + 40 && g > b + 40 && r > 120 && g > 120;
}

/* Detect a near-black NEUTRAL bg — a colorway dark enough AND grey enough to
   read as "black", so it should inherit the named Dark colorway's full button
   treatment (inverted mint, hatched L1 pills) instead of leaving them looking
   like a light theme on a black field. Both guards matter: the darkness guard
   (`max` channel low) keeps mid-tones out, the neutrality guard (`max-min`
   small) keeps dark-but-COLORED colorways (deep green/navy/wine) out — those
   stay on their own treatment. Purely luminance + neutrality — NOT keyed to any
   one project, so any future artist colorway that reads as black inherits the
   dark treatment automatically. (Of today's 50 sample colorways only Ode to
   Rudxane's #1c1a17 happens to qualify.) Brendon, 2026-06-16. */
function isNearBlackNeutral(bgHex: string): boolean {
    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    return max <= 48 && max - min <= 26;
}

/** Apply a colorway to the documentElement and body classes. */
/* The Custom colorway resolves PER PAGE — never a hardcoded color. Mirrors
   paintForPath's custom branches so an explicit "Custom" pick paints the same
   thing the route boot does: home → today's Mood Ring, a project → that
   project's colorway, a profile → the owner's hex. Dot is the only last-resort
   fallback (Brendon 2026-06-13: there is deliberately no built-in custom hue). */
function resolveCustomBg(): string {
    if (typeof window === 'undefined') return DOT;
    const path = window.location.pathname || '/';
    if (path === '/') return moodHexToday();
    if (path.startsWith('/art/')) {
        const slug = (path.split('/')[2] ?? '').toLowerCase();
        return projectColorway(slug) ?? DOT;
    }
    const firstSeg = (path.match(/^\/([^/]+)/)?.[1] ?? '').toLowerCase();
    if (firstSeg === 'docs') return COLORWAYS.dark; // docs' own colour = Dark Mode
    const isProfile =
        firstSeg.length > 0 &&
        firstSeg !== 'art' &&
        firstSeg !== 'api' &&
        !/^\d+$/.test(firstSeg);
    if (isProfile) return getProfileBg();
    return DOT;
}

function applyColorway(key: ColorwayKey) {
    let bg = key === null ? DOT : (key === 'custom' ? resolveCustomBg() : key === 'haze' ? getHazeBg() : COLORWAYS[key]);
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

    /* Theme lightness flag for INVERTED ("knockout") UI elements — a pure
       black/white block that sits opposite the theme's ink regardless of the
       colorway hue. bright bg (dark ink) → .theme-bright. CSS `.ui-knockout`
       reads this to flip. */
    body.classList.toggle('theme-bright', isLight);

    /* When the page's big colour is itself a RED, the $PRICE logo's red plate
       would sink into the background — so flag it and let CSS swap the logo's
       red/yellow fills. Cheap inline hue/sat check (no extra imports); covers
       pure red through the brand hot-pink-red (Brendon, 2026-06-16). */
    {
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        let hue = 0;
        if (d !== 0) {
            if (mx === r) hue = ((g - b) / d) % 6;
            else if (mx === g) hue = (b - r) / d + 2;
            else hue = (r - g) / d + 4;
            hue = (hue * 60 + 360) % 360;
        }
        const sat = mx === 0 ? 0 : d / mx;
        body.classList.toggle('price-logo-swap', sat > 0.35 && (hue >= 335 || hue < 18));
    }
    /* Keep the PWA chrome tint in lockstep for named colorways too, so leaving
       stargazing restores the exact prior theme-color (Brendon, 2026-06-13).
       While Ambient Light is dimming, the chrome stays dark instead of the bright
       colorway — so this writer must not stomp the dim tint back to the bg. */
    const tcMetaCw = document.querySelector('meta[name="theme-color"]');
    if (tcMetaCw) {
        // Dark chrome tint is browser-only; the installed PWA keeps the colorway
        // (darkening it there produced black bars — Brendon, 2026-06-17).
        const dimDark = document.body.classList.contains('ambient-dim-on') && !document.body.classList.contains('is-pwa');
        tcMetaCw.setAttribute('content', dimDark ? '#03020a' : bg);
    }
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

    /* Named Dark colorway OR any static near-black NEUTRAL bg (e.g. the Ode to
       Rudxane #1c1a17 project colorway) gets the full dark treatment: inverted
       mint button + hatched L1 pills. Excludes the animated engines (haze /
       hashsyn) whose bg sweeps through hues — they manage their own polarity and
       must not flicker into this when a frame lands on black. */
    const darkTreatment =
        key === 'dark' ||
        (key !== 'haze' && key !== 'hashsyn' && isNearBlackNeutral(bg));

    if (darkTreatment) {
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
    if (tcMeta) {
        const dimDark = document.body.classList.contains('ambient-dim-on') && !document.body.classList.contains('is-pwa');
        tcMeta.setAttribute('content', dimDark ? '#03020a' : bg);
    }

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
    body.classList.toggle('bg-is-yellow',     isYellowBg(bg));
}

/* Hash Synesthesia rework (Brendon, 2026-07-10): now that cards are stored
   images, engine samples land constantly as tiles load — and each one used to
   run the FULL applyBgHex, re-deriving text polarity, buttons, pills, stat
   chips and knockouts. That's the "misbehaving": black/white ink flickering
   and buttons morphing as the page painted. A hashsyn SAMPLE may change ONLY
   the colorway colour itself — the background family — so this narrow writer
   updates the bg, the modal tint (the bg at 0.98), the browser-chrome tint,
   and the red-bg logo guards, and touches NOTHING else. The black/white parts
   and every button keep whatever the full writer set when hashsyn was picked
   (the seed) — they are not the engine's to move. */
export function applyHashSynSample(bgHex: string) {
    const root = document.documentElement;
    const body = document.body;

    const hex = bgHex.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;

    root.style.setProperty('--bg-color', bgHex);
    root.style.setProperty('--modal-bg', `rgba(${r},${g},${b},0.98)`);
    body.style.backgroundColor = bgHex;

    /* Chrome tint follows the page colour (same ambient-dim rule as the full
       writer). */
    const tcMeta = document.querySelector('meta[name="theme-color"]');
    if (tcMeta) {
        const dimDark = body.classList.contains('ambient-dim-on') && !body.classList.contains('is-pwa');
        tcMeta.setAttribute('content', dimDark ? '#03020a' : bgHex);
    }

    /* Visibility guards only — the $PRICE logo fill swap on red bgs and the
       red-bg flag. These keep things readable; they are not styling. */
    {
        const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
        let hue = 0;
        if (d !== 0) {
            if (mx === r) hue = ((g - b) / d) % 6;
            else if (mx === g) hue = (b - r) / d + 2;
            else hue = (r - g) / d + 4;
            hue = (hue * 60 + 360) % 360;
        }
        const sat = mx === 0 ? 0 : d / mx;
        body.classList.toggle('price-logo-swap', sat > 0.35 && (hue >= 335 || hue < 18));
    }
    body.classList.toggle('bg-is-red', isRedBg(bgHex));
    body.classList.toggle('bg-is-yellow', isYellowBg(bgHex));
}

/* Single source of truth for "what does THIS path paint?" — used by BOTH the
   initial boot effect AND the server-hydration handler, so the two can never
   diverge. (That divergence WAS the home-stays-orange bug: boot painted
   Attention Yellow, then hydration repainted the Custom slot with the user's
   profile hex on every load. That bleed is now structurally impossible —
   profile_hex hydrates into its own `pd_profile_hex` slot, never the Custom
   colorway slot. See userState.hydrateFromRow.)
   Performs the paint and returns the colorway key to store in state. */
function paintForPath(saved: ColorwayKey, pathname: string | null): ColorwayKey {
    const isProjectPage = pathname?.startsWith('/art/') ?? false;
    const isDocsPage = pathname === '/docs' || (pathname?.startsWith('/docs/') ?? false);
    /* Profile page: first segment isn't 'art'/'api'/'docs', isn't all-digits,
       matches the handle shape. '/' (home) has an empty first segment. */
    const firstSeg = (pathname?.split('/')[1] ?? '').toLowerCase();
    const isProfilePage =
        firstSeg.length > 0 &&
        firstSeg !== 'art' &&
        firstSeg !== 'api' &&
        firstSeg !== 'docs' &&
        !/^\d+$/.test(firstSeg) &&
        /^[@a-z0-9_-]+$/i.test(firstSeg);
    const isHomePage = pathname === '/';

    if (isDocsPage && (saved === null || saved === 'custom')) {
        // Docs pages: the docs' own colour IS Dark Mode (Brendon, 2026-07-10)
        // — the reading surface defaults dark instead of the Custom slot. Any
        // explicit colorway pick still wins via the fall-through below, so the
        // picker mounted on the docs works exactly like it does everywhere.
        applyColorway('dark');
        return saved;
    }
    if (isProjectPage && (saved === null || saved === 'custom')) {
        // Project page → the PROJECT's own colorway (e.g. Prisms #5A2EA6,
        // Oracle #C4902A), never the user's profile hex. An explicit non-custom
        // pick (dark/light/blue/…) still wins via the fall-through below.
        const projSlug = (pathname?.split('/')[2] ?? '').toLowerCase();
        applyBgHex(projectColorway(projSlug) ?? getCustomBg(), 'custom');
        return saved;
    }
    if (isProfilePage && (saved === null || saved === 'custom')) {
        // Profile page → the profile OWNER's colour (their profile_hex), painted
        // as the Custom (page-owner) colour. A visitor on the default/Custom
        // colorway sees the owner's pick; any explicit colorway (dark/light/
        // orange/haze/…) still wins via the fall-through below. Falls back to
        // the Custom default when the owner hasn't chosen a colour.
        applyBgHex(getProfileBg(), 'custom');
        return saved;
    }
    if (isHomePage && (saved === null || saved === 'custom')) {
        // Home's Custom colour = the MOOD RING — a new generative colour every
        // PriceDay (lib/mood, Brendon 2026-06-12; replaced the fixed Attention
        // Yellow). The home page is the platform's own profile, and its colour
        // is the daily vibe. Covers cold-start AND an explicit 'custom' pick.
        // (Profile Colorway never reaches here; it lives in `pd_profile_hex`,
        // not the Custom slot.)
        applyBgHex(moodHexToday(), 'custom');
        return saved;
    }
    // Everything else: an explicit colorway pick applies on every page.
    applyColorway(saved);
    if (saved === 'haze') {
        const variation = getHazeVariation();
        if (variation) {
            enableHazeVariation(variation, getHazeBg(), (hex) => applyBgHex(hex, 'haze'));
        }
    }
    return saved;
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
        // Resolve + paint via the one shared helper (see paintForPath above),
        // and store whatever colorway it settled on.
        setColorwayState(paintForPath(readSavedColorway(), pathname));
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
            /* Full treatment ONCE at pick (seed sets polarity, buttons, the
               colorway-hashsyn class); every engine sample after runs the
               NARROW writer — bg family only, buttons + black/white locked
               (Brendon, 2026-07-10). */
            applyBgHex(HASHSYN_SEED, 'hashsyn');
            enableHashSyn(applyHashSynSample);
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

        // Write-through to the server (source of truth). hashsyn is session-
        // only, so it persists as null (boot default) just like the cache.
        pushSettings({ colorway: key === 'hashsyn' ? null : key });
    }, [colorway]);

    /* Custom colorway live re-paint. Listens for `pd:custom-color-changed`
       (the Custom colorway's OWN event — the page-owner colour slot
       `pd_custom_color`) and re-paints only when the active bg IS the Custom
       colour: colorway === 'custom' (explicit pick) or savedColorway === null
       on a project page (boot default). Picking Dark on /art/prisms paints
       dark, not custom, so a Custom change must NOT repaint there.
       DECOUPLE GUARD: this is NOT the Profile Colorway listener. Changing a
       user's profile colour fires `pd:profile-hex-changed` and must NOT
       repaint other pages — that was the bleed. Do not point this at the
       profile event. */
    useEffect(() => {
        const handler = () => {
            const isProjectPage = pathname?.startsWith('/art/') ?? false;
            const paintingCustom =
                colorway === 'custom' || (colorway === null && isProjectPage);
            if (paintingCustom) {
                applyBgHex(resolveCustomBg(), 'custom');
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

    /* User-state hydration — when a server snapshot lands (login on any
       device), re-read the saved colorway from the cache (userState has just
       written it) and re-apply it live so the page restores without a reload.
       Routes through the SAME paintForPath resolver as boot, so home stays
       Attention Yellow instead of being repainted with the shared custom slot.
       hashsyn is never persisted; haze re-boots its variation engine. */
    useEffect(() => {
        const handler = () => {
            setColorwayState(paintForPath(readSavedColorway(), pathname));
        };
        window.addEventListener(USERSTATE_HYDRATED_EVENT, handler);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, handler);
    }, [pathname]);

    /* Register the owner colour of the profile page currently being viewed.
       Stores it for paintForPath and repaints immediately when the active
       colorway is the default/Custom on a profile page (so the owner's colour
       shows, or updates live when the owner edits their own profile). A visitor
       with an explicit colorway pick is unaffected — paintForPath's
       fall-through keeps their choice. See ProfilePageBody. */
    const setActiveProfileHex = useCallback((hex: string | null) => {
        activeProfileHex = hex && HEX_RE.test(hex) ? hex.toUpperCase() : null;
        setColorwayState(paintForPath(readSavedColorway(), pathname));
    }, [pathname]);

    const value = useMemo<ColorwayContextValue>(
        () => ({ colorway, setColorway, setActiveProfileHex }),
        [colorway, setColorway, setActiveProfileHex]
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
