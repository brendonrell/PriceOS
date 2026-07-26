'use client';

/*
 * useShownTags — the profile tags the owner has switched ON (Brendon, 2026-07-26).
 *
 * ⛔ TAGS ARE OFF BY DEFAULT, PLATFORM-WIDE. A brand-new profile shows NO tags
 * at all. Every automatic tag a user has — Team (CEO/Deployer/WTBS/Petey),
 * Earned (User #N / PriceDay #N / Artist / $PRICE…), Granted (OG…) — exists on
 * the account but stays dark until its owner finds the picker and turns it on.
 * That discovery IS the feature: you notice someone else's chip, ask how they
 * got it, and go looking (Brendon's call — "bit of fun").
 *
 * This REPLACES the old opt-OUT list (`hiddenTags`, 2026-07-22), which had the
 * opposite default. The key is new rather than reinterpreted: an old saved
 * hidden-list must never be read as a shown-list, which would switch on exactly
 * the tags its owner had turned off.
 *
 * Personas are not here — picking one is already the act of turning it on
 * (useProfileTags).
 *
 * Account-backed (settings envelope, `shownTags`), mirrored to localStorage.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushSettings } from '@/lib/state/userState';

const STORAGE_KEY = 'pd_shown_tags';
const EVENT_NAME = 'pd:shown-tags-changed';

function clean(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter((x): x is string => typeof x === 'string'))];
}

function readStored(seed: string[]): string[] {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return clean(JSON.parse(saved));
    } catch { /* ignore */ }
    return seed;
}

/**
 * @param serverShown Server-known `settings.shownTags` for the profile OWNER —
 *   pass only on the viewer's OWN profile so the picker paints right immediately.
 */
export function useShownTags(serverShown?: string[] | null) {
    const seed = clean(serverShown);
    const [shown, setShownState] = useState<string[]>(seed);

    useEffect(() => {
        setShownState(readStored(seed));
        const sync = (e: Event) => setShownState(clean((e as CustomEvent<string[]>).detail));
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const commit = (value: string[]) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
        try { window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: value })); } catch { /* ignore */ }
        pushSettings({ shownTags: value });
    };

    const setShown = useCallback((next: string[]) => {
        const value = clean(next);
        setShownState(value);
        commit(value);
    }, []);

    /** Flip a tag's visibility. Present = ON; absent = OFF (the default). */
    const toggleShown = useCallback((id: string) => {
        setShownState((cur) => {
            const value = cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id];
            commit(value);
            return value;
        });
    }, []);

    return { shown, setShown, toggleShown };
}
