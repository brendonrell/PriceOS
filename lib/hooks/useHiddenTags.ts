'use client';

/*
 * useHiddenTags — the profile tags the owner switched OFF (Brendon, 2026-07-22).
 *
 * Every tag a user has — Manual (CEO/WTBS…), Earned (User #N/PriceDay #N/
 * artist…), and Chosen (personas) — shows in their own carousel as a toggle.
 * Flipping one off hides it from the profile (for every viewer); tapping it
 * again brings it back. The off-set is account-backed (settings envelope,
 * `hiddenTags`) and mirrored to localStorage `pd_hidden_tags`.
 *
 * Personas keep their own opt-in store (useProfileTags); this is for the tags
 * that are otherwise always-on.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushSettings } from '@/lib/state/userState';

const STORAGE_KEY = 'pd_hidden_tags';
const EVENT_NAME = 'pd:hidden-tags-changed';

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
 * @param serverHidden Server-known `settings.hiddenTags` for the profile OWNER —
 *   pass only on the viewer's OWN profile so the picker paints right immediately.
 */
export function useHiddenTags(serverHidden?: string[] | null) {
    const seed = clean(serverHidden);
    const [hidden, setHiddenState] = useState<string[]>(seed);

    useEffect(() => {
        setHiddenState(readStored(seed));
        const sync = (e: Event) => setHiddenState(clean((e as CustomEvent<string[]>).detail));
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setHidden = useCallback((next: string[]) => {
        const value = clean(next);
        setHiddenState(value);
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
        try { window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: value })); } catch { /* ignore */ }
        pushSettings({ hiddenTags: value });
    }, []);

    /** Flip a tag's visibility. hidden = OFF; absent = ON. */
    const toggleHidden = useCallback((id: string) => {
        setHiddenState((cur) => {
            const value = cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id];
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
            try { window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: value })); } catch { /* ignore */ }
            pushSettings({ hiddenTags: value });
            return value;
        });
    }, []);

    return { hidden, setHidden, toggleHidden };
}
