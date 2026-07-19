'use client';

/*
 * useNameFont
 *
 * Owns the profile owner's chosen @name Unicode font (lib/profile/nameFont).
 * Server source of truth is `users.name_font`; mirrored to localStorage
 * `pd_name_font` and broadcast on `pd:name-font-changed`. null = Default (no
 * styling). Mirrors useProfileLogo exactly.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { isValidNameFont } from '@/lib/profile/nameFont';

const STORAGE_KEY = 'pd_name_font';
const EVENT_NAME = 'pd:name-font-changed';

/** 'default' / unknown / null all collapse to null (no styling). */
function normalize(id: string | null | undefined): string | null {
    return id && isValidNameFont(id) ? id : null;
}

function readStored(seed: string | null): string | null {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && isValidNameFont(saved)) return saved;
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverFont Server-known `users.name_font` for the OWNER of the profile
 *   being viewed — pass it ONLY on the viewer's OWN profile so the picker shows
 *   the real selection on first paint.
 */
export function useNameFont(serverFont?: string | null) {
    const seed = normalize(serverFont);
    const [font, setFontState] = useState<string | null>(seed);

    useEffect(() => {
        setFontState(readStored(seed));
        const sync = (e: Event) => {
            setFontState(normalize((e as CustomEvent<string | null>).detail));
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Set (or clear with null / 'default') the @name font. */
    const setFont = useCallback((next: string | null): void => {
        const value = normalize(next);
        setFontState(value);
        try {
            if (value === null) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, value);
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent<string | null>(EVENT_NAME, { detail: value }));
        } catch {
            /* ignore */
        }
        pushState({ name_font: value });
    }, []);

    return { font, setFont };
}
