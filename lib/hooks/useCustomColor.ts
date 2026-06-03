'use client';

/*
 * useCustomColor
 *
 * Owns the user's custom colorway color. Sim refs:
 *   sim 4612-4614 — color input + hex text input markup
 *   sim 9603-9620 — syncProfileColor / syncProfileHex handlers
 *   sim 9631-9675 — _initCustomColor migration on DOMContentLoaded
 *   sim 7607      — localStorage key + migration story
 *
 * F64 (BUG-28). Storage key: `pd_custom_color`. On first hydrate the
 * hook reads the saved value and migrates any historical default
 * (#FF0033 / #FF6B35 / #FFE600) up to the current default (#C488FF).
 * Anything else that matches the hex regex is treated as a deliberate
 * custom pick and respected. Calling `setColor(hex)` validates the
 * input, persists the upper-cased value to localStorage, writes
 * `--custom-accent` on documentElement for any consumer that wants to
 * read it as a CSS var, and broadcasts a `pd:custom-color-changed`
 * window event so other hook instances + ColorwayContext can react. The
 * hook returns `false` from `setColor` for invalid hex so the caller
 * (the hex text input) can revert its visible value.
 *
 * ColorwayContext listens for the same event and re-applies the custom
 * colorway when it's currently active, which is the path that makes the
 * picker actually drive --bg-color / --text-color.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'pd_custom_color';
/* Default custom color is Soft Violet (#C488FF). The earlier
   "Attention Yellow only ever lives as a custom color or the default
   profile colorway color" framing conflated two slots that should never
   have been linked — the user-profile colorway (default Attention Yellow,
   lands in Profile Page v0) is its own thing, and the custom color
   is its own thing. Reverted to violet per Brendon's call.
   #FFE600 added to OLD_DEFAULTS so users who saved Attention Yellow
   during the brief misconflated window migrate forward to violet on
   next load. Custom picks (anything other than these defaults) stay
   untouched. */
export const CUSTOM_COLOR_DEFAULT = '#C488FF';
const OLD_DEFAULTS = ['#FF0033', '#FF6B35', '#FFE600'];
const HEX_RE = /^#[0-9A-F]{6}$/i;
const EVENT_NAME = 'pd:custom-color-changed';

function readStoredColor(): string {
    if (typeof window === 'undefined') return CUSTOM_COLOR_DEFAULT;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return CUSTOM_COLOR_DEFAULT;
        if (OLD_DEFAULTS.includes(saved.toUpperCase())) return CUSTOM_COLOR_DEFAULT;
        if (HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return CUSTOM_COLOR_DEFAULT;
}

export function useCustomColor() {
    const [color, setColorState] = useState<string>(CUSTOM_COLOR_DEFAULT);

    // Hydrate + listen on mount.
    useEffect(() => {
        const c = readStoredColor();
        setColorState(c);
        try {
            localStorage.setItem(STORAGE_KEY, c);
        } catch {
            /* ignore */
        }
        try {
            document.documentElement.style.setProperty('--custom-accent', c);
        } catch {
            /* ignore */
        }

        // Sync this hook instance to changes from any other instance.
        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string>).detail;
            if (typeof detail === 'string' && HEX_RE.test(detail)) {
                setColorState(detail.toUpperCase());
            }
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
    }, []);

    /**
     * Update the custom color. Returns true when the hex was valid and
     * the change was applied; false otherwise (so the caller can revert
     * the field display).
     */
    const setColor = useCallback((next: string): boolean => {
        if (!HEX_RE.test(next)) return false;
        const upper = next.toUpperCase();
        setColorState(upper);
        try {
            localStorage.setItem(STORAGE_KEY, upper);
        } catch {
            /* ignore */
        }
        try {
            document.documentElement.style.setProperty('--custom-accent', upper);
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(
                new CustomEvent<string>(EVENT_NAME, { detail: upper })
            );
        } catch {
            /* ignore */
        }
        return true;
    }, []);

    return { color, setColor };
}

export const __CUSTOM_COLOR_INTERNALS__ = {
    STORAGE_KEY,
    EVENT_NAME,
    HEX_RE,
};
