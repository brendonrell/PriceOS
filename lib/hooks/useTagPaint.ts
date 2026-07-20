'use client';

/*
 * useTagPaint
 *
 * Owns the profile owner's all-tags paint (lib/tags/catalog TAG_PAINTS —
 * Brendon, 2026-07-20: paint every tag Black / White / Hothurt / Attention /
 * Blue from the end of the tags picker). Server source of truth is
 * `users.tag_paint`; mirrored to localStorage `pd_tag_paint` and broadcast on
 * `pd:tag-paint-changed`. null = each tag wears its own colour. Mirrors
 * useNameFont exactly.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';
import { isValidTagPaint } from '@/lib/tags/catalog';

const STORAGE_KEY = 'pd_tag_paint';
const EVENT_NAME = 'pd:tag-paint-changed';

/** Unknown / null collapse to null (own colours). */
function normalize(id: string | null | undefined): string | null {
    return id && isValidTagPaint(id) ? id : null;
}

function readStored(seed: string | null): string | null {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && isValidTagPaint(saved)) return saved;
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverPaint Server-known `users.tag_paint` for the OWNER of the
 *   profile being viewed — pass it ONLY on the viewer's OWN profile so the
 *   picker shows the real selection on first paint.
 */
export function useTagPaint(serverPaint?: string | null) {
    const [paint, setPaintState] = useState<string | null>(() => readStored(normalize(serverPaint)));

    /* Cross-surface + cross-tab sync — same event grammar as useNameFont. */
    useEffect(() => {
        const onChange = (e: Event) => {
            setPaintState(normalize((e as CustomEvent<string | null>).detail));
        };
        const onStorage = (e: StorageEvent) => {
            if (e.key === STORAGE_KEY) setPaintState(normalize(e.newValue));
        };
        window.addEventListener(EVENT_NAME, onChange);
        window.addEventListener('storage', onStorage);
        return () => {
            window.removeEventListener(EVENT_NAME, onChange);
            window.removeEventListener('storage', onStorage);
        };
    }, []);

    const setPaint = useCallback((next: string | null) => {
        const value = normalize(next);
        setPaintState(value);
        try {
            if (value) localStorage.setItem(STORAGE_KEY, value);
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* device-local nicety */
        }
        window.dispatchEvent(new CustomEvent<string | null>(EVENT_NAME, { detail: value }));
        pushState({ tag_paint: value });
    }, []);

    return { paint, setPaint };
}
