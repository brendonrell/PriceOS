'use client';

/*
 * useProfileTags
 *
 * Owns the PERSONA tags the profile owner picked for themselves (the
 * pick-your-owns). Server source of truth is `users.profile_tags`; mirrored to
 * localStorage `pd_profile_tags` and broadcast on `pd:profile-tags-changed`.
 *
 * Mirrors useProfileLogo (own slot + own event, write-through to the server),
 * but holds an ARRAY. Only valid persona ids are ever kept — earned / granted /
 * id tags are derived or assigned elsewhere and can never be self-applied here.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { isPersonaId } from '@/lib/tags/catalog';

const STORAGE_KEY = 'pd_profile_tags';
const EVENT_NAME = 'pd:profile-tags-changed';

/** Keep only valid persona ids, de-duplicated. */
function clean(list: unknown): string[] {
    if (!Array.isArray(list)) return [];
    return [...new Set(list.filter(isPersonaId))];
}

function readStored(seed: string[]): string[] {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return clean(JSON.parse(saved));
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverTags Server-known `users.profile_tags` for the OWNER of the
 *   profile being viewed — pass it ONLY on the viewer's OWN profile so the picker
 *   shows the real selection on first paint.
 */
export function useProfileTags(serverTags?: string[] | null) {
    const seed = clean(serverTags);
    const [tags, setTagsState] = useState<string[]>(seed);

    useEffect(() => {
        setTagsState(readStored(seed));
        const sync = (e: Event) => {
            setTagsState(clean((e as CustomEvent<string[]>).detail));
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Set the whole list (cleaned), persist locally + to the server, broadcast. */
    const setTags = useCallback((next: string[]) => {
        const value = clean(next);
        setTagsState(value);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent<string[]>(EVENT_NAME, { detail: value }));
        } catch {
            /* ignore */
        }
        pushState({ profile_tags: value });
    }, []);

    /** Flip one persona on/off. Returns false for a non-persona id. */
    const toggle = useCallback((id: string): boolean => {
        if (!isPersonaId(id)) return false;
        setTags(tags.includes(id) ? tags.filter((t) => t !== id) : [...tags, id]);
        return true;
    }, [tags, setTags]);

    return { tags, toggle, setTags };
}
