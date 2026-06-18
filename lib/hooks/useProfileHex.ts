'use client';

/*
 * useProfileHex
 *
 * Owns the colour value behind a user's PROFILE COLORWAY — the colour the
 * owner of a profile page picked for their own profile. Server source of
 * truth is `users.profile_hex`; mirrored to localStorage `pd_profile_hex`
 * and broadcast on `pd:profile-hex-changed`.
 *
 * ⚠️ NAMING / DECOUPLE GUARD — READ BEFORE "TIDYING". This is the PROFILE
 * COLORWAY's colour. It is a DISTINCT feature from both of these, which it
 * shares NO storage key, NO event, and NO default with:
 *   • "Custom" colorway   → the page-owner's colour. Slot `pd_custom_color`,
 *                           lives in ColorwayContext. NOT this.
 *   • "Haze Mode"         → the viewer's platform-wide colorway. Slot
 *                           `pd_haze_color`. NOT this. ("Haze" is a feature
 *                           name and a possible future Project name — never
 *                           use it as a generic word for "global colour".)
 * All three are hex colours; that resemblance is exactly the trap. Profile
 * Colorway has repeatedly been collapsed into the generic "custom color" and
 * then bled onto every page. Keep them apart. (Brendon, repeatedly.)
 *
 * Storage key: `pd_profile_hex`. On first hydrate the hook reads the saved
 * value and migrates any historical default up to the current default.
 * Calling `setHex(hex)` validates the input, persists the upper-cased value
 * to localStorage, writes `--profile-hex` on documentElement for any consumer
 * that wants the CSS var, broadcasts `pd:profile-hex-changed`, and writes
 * through to the server (`profile_hex`). Returns `false` for invalid hex so
 * the caller (the hex text input) can revert its visible value.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';

const STORAGE_KEY = 'pd_profile_hex';
/* Default Profile Colorway colour = brand matrix white, so an un-themed
   profile reads intentionally BLANK (Brendon 2026-06-13). Only paints when
   nothing is saved or the saved value is malformed. The old violet default
   (#C488FF) is retired — it's reserved for the genesis project and must not
   appear anywhere in the app — so it's migrated away below. */
export const PROFILE_HEX_DEFAULT = '#E0E0E0';
const OLD_DEFAULTS = ['#FF0033', '#FF6B35', '#FFE600', '#C488FF'];
const HEX_RE = /^#[0-9A-F]{6}$/i;
const EVENT_NAME = 'pd:profile-hex-changed';
const CSS_VAR = '--profile-hex';

function readStoredColor(fallback: string = PROFILE_HEX_DEFAULT): string {
    if (typeof window === 'undefined') return fallback;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return fallback;
        if (OLD_DEFAULTS.includes(saved.toUpperCase())) return fallback;
        if (HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return fallback;
}

/**
 * @param serverHex Server-known value (`users.profile_hex`) for the OWNER of the
 *   profile being viewed — pass it ONLY when the viewer is on their OWN profile.
 *   It seeds the initial colour so the page paints the real colour on the first
 *   pass instead of booting to placeholder white and repainting after hydration
 *   (the "flash white → real colour" that only hit your own profile). When the
 *   viewer's own saved colour is in localStorage that still wins; the server
 *   value is only the fallback for an empty/first-load store.
 */
export function useProfileHex(serverHex?: string | null) {
    const seed =
        serverHex && HEX_RE.test(serverHex) ? serverHex.toUpperCase() : PROFILE_HEX_DEFAULT;
    const [hex, setHexState] = useState<string>(seed);

    // Hydrate + listen on mount.
    useEffect(() => {
        const c = readStoredColor(seed);
        setHexState(c);
        try {
            localStorage.setItem(STORAGE_KEY, c);
        } catch {
            /* ignore */
        }
        try {
            document.documentElement.style.setProperty(CSS_VAR, c);
        } catch {
            /* ignore */
        }

        // Sync this hook instance to changes from any other instance.
        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string>).detail;
            if (typeof detail === 'string' && HEX_RE.test(detail)) {
                setHexState(detail.toUpperCase());
            }
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /**
     * Update the Profile Colorway colour. Returns true when the hex was valid
     * and the change was applied; false otherwise (so the caller can revert
     * the field display).
     */
    const setHex = useCallback((next: string): boolean => {
        if (!HEX_RE.test(next)) return false;
        const upper = next.toUpperCase();
        setHexState(upper);
        try {
            localStorage.setItem(STORAGE_KEY, upper);
        } catch {
            /* ignore */
        }
        try {
            document.documentElement.style.setProperty(CSS_VAR, upper);
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
        // Write-through to the server (source of truth). No-op until the
        // server snapshot has hydrated, so this never fires for the
        // boot-time default — only for a real user pick.
        pushState({ profile_hex: upper });
        return true;
    }, []);

    return { hex, setHex };
}

export const __PROFILE_HEX_INTERNALS__ = {
    STORAGE_KEY,
    EVENT_NAME,
    HEX_RE,
};
