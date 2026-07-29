'use client';

/*
 * useTagsOff — the profile tags the owner has switched OFF (Brendon, 2026-07-29).
 *
 * The mirror image of useShownTags, and it exists for one reason: PROJECT tags
 * are ON the moment they are earned. Every other automatic tag is off until its
 * owner finds the picker and lights it, so absence from `shownTags` means "not
 * switched on yet" — which must NEVER be read as "turned off". A default-on tag
 * therefore needs its own record of having been dismissed, or the next page load
 * would switch it straight back on.
 *
 * A project tag is otherwise an ordinary tag: one tap in the picker turns it
 * off, another turns it back on.
 *
 * Account-backed (settings envelope, `tagsOff`), mirrored to localStorage.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushSettings } from '@/lib/state/userState';

const STORAGE_KEY = 'pd_tags_off';
const EVENT_NAME = 'pd:tags-off-changed';

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
 * @param serverOff Server-known `settings.tagsOff` for the profile OWNER — pass
 *   only on the viewer's OWN profile so the picker paints right immediately.
 */
export function useTagsOff(serverOff?: string[] | null) {
    const seed = clean(serverOff);
    const [off, setOffState] = useState<string[]>(seed);

    useEffect(() => {
        setOffState(readStored(seed));
        const sync = (e: Event) => setOffState(clean((e as CustomEvent<string[]>).detail));
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const commit = (value: string[]) => {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(value)); } catch { /* ignore */ }
        try { window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: value })); } catch { /* ignore */ }
        pushSettings({ tagsOff: value });
    };

    const setOff = useCallback((next: string[]) => {
        const value = clean(next);
        setOffState(value);
        commit(value);
    }, []);

    /** Flip a default-on tag. Present = OFF; absent = ON (its default). */
    const toggleOff = useCallback((id: string) => {
        setOffState((cur) => {
            const value = cur.includes(id) ? cur.filter((t) => t !== id) : [...cur, id];
            commit(value);
            return value;
        });
    }, []);

    return { off, setOff, toggleOff };
}
