'use client';

/*
 * useProfileLogo
 *
 * Owns the user's PROFILE LOGO choice — which logo-bubble variant their profile
 * wears. Server source of truth is `users.profile_logo`; mirrored to
 * localStorage `pd_profile_logo` and broadcast on `pd:profile-logo-changed`.
 *
 * Mirrors useProfileHex's shape: read the cache on mount, listen for changes
 * from any other instance, and on setLogo() validate → cache → broadcast →
 * write through to the server (pushState). Returns the current id (or null when
 * unset, which renders the default brand mark) and a setter.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { VALID_PROFILE_LOGO_IDS } from '@/lib/logos/profileLogos';

const STORAGE_KEY = 'pd_profile_logo';
const EVENT_NAME = 'pd:profile-logo-changed';

function readStored(): string | null {
    if (typeof window === 'undefined') return null;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && VALID_PROFILE_LOGO_IDS.has(saved)) return saved;
    } catch {
        /* ignore */
    }
    return null;
}

export function useProfileLogo(serverLogo?: string | null) {
    const seed =
        serverLogo && VALID_PROFILE_LOGO_IDS.has(serverLogo) ? serverLogo : null;
    const [logo, setLogoState] = useState<string | null>(seed);

    useEffect(() => {
        const stored = readStored() ?? seed;
        setLogoState(stored);

        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string | null>).detail;
            setLogoState(detail && VALID_PROFILE_LOGO_IDS.has(detail) ? detail : null);
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setLogo = useCallback((next: string): boolean => {
        if (!VALID_PROFILE_LOGO_IDS.has(next)) return false;
        setLogoState(next);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent<string>(EVENT_NAME, { detail: next }));
        } catch {
            /* ignore */
        }
        pushState({ profile_logo: next });
        return true;
    }, []);

    return { logo, setLogo };
}
