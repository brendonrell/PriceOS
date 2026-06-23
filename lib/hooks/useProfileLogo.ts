'use client';

/*
 * useProfileLogo
 *
 * Owns the value behind a user's PROFILE LOGO — the Profile Logo id the owner
 * picked to decorate the corner logo on their own profile. Server source of
 * truth is `users.profile_logo`; mirrored to localStorage `pd_profile_logo` and
 * broadcast on `pd:profile-logo-changed`. null = off (the default logo).
 *
 * Mirrors useProfileHex exactly (own slot + own event, write-through to the
 * server). It is a DISTINCT feature from the Profile Colorway (`profile_hex` /
 * `pd_profile_hex`) — same shape, different slot; never alias them.
 *
 * `setLogo(id | null)` validates against the known Profile Logo ids, persists
 * the pick to localStorage, broadcasts the change, and writes through to the
 * server. Returns false for an unknown id so the caller can ignore it.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { isValidProfileLogo } from '@/lib/profile/profileLogos';

const STORAGE_KEY = 'pd_profile_logo';
const EVENT_NAME = 'pd:profile-logo-changed';

function readStored(seed: string | null): string | null {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && isValidProfileLogo(saved)) return saved;
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverLogo Server-known value (`users.profile_logo`) for the OWNER of
 *   the profile being viewed — pass it ONLY when the viewer is on their OWN
 *   profile. It seeds the initial pick so the carousel shows the real selection
 *   on first paint instead of flashing "off" and correcting after hydration.
 */
export function useProfileLogo(serverLogo?: string | null) {
    const seed = serverLogo && isValidProfileLogo(serverLogo) ? serverLogo : null;
    const [logo, setLogoState] = useState<string | null>(seed);

    // Hydrate + listen on mount.
    useEffect(() => {
        setLogoState(readStored(seed));

        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string | null>).detail;
            if (detail === null || isValidProfileLogo(detail)) {
                setLogoState(detail ?? null);
            }
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Set (or clear with null) the Profile Logo. Returns false for an unknown
     *  id (caller can ignore). */
    const setLogo = useCallback((next: string | null): boolean => {
        if (!isValidProfileLogo(next)) return false;
        setLogoState(next);
        try {
            if (next === null) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent<string | null>(EVENT_NAME, { detail: next }));
        } catch {
            /* ignore */
        }
        // Write-through to the server (source of truth). No-op until the server
        // snapshot has hydrated, so this never fires for the boot-time default.
        pushState({ profile_logo: next });
        return true;
    }, []);

    return { logo, setLogo };
}
