'use client';

/*
 * useLocalStorage
 *
 * A small typed wrapper for ad-hoc localStorage use. The big settings
 * blobs (pdNotifs, colorway) are managed inside their own context providers
 * so they can sync body classes and CSS vars on change; this hook is for
 * isolated key/value pairs like 'pd_token_notes' or 'pd_day_notes'.
 *
 * Behavior:
 *   - Lazy-initialises from storage; returns initialValue if storage is
 *     empty or unavailable.
 *   - Setter accepts a value or an updater fn (matches React's setState API).
 *   - Failures (private mode, quota exceeded, SSR) are silently swallowed —
 *     the in-memory state still works.
 */

import { useCallback, useEffect, useState } from 'react';

export function useLocalStorage<T>(
    key: string,
    initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
    const [stored, setStored] = useState<T>(initialValue);

    // Hydrate after mount to keep SSR/CSR matching.
    useEffect(() => {
        try {
            const raw = window.localStorage.getItem(key);
            if (raw !== null) {
                setStored(JSON.parse(raw));
            }
        } catch {
            // No-op — fall back to initialValue.
        }
    }, [key]);

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            setStored((prev) => {
                const next =
                    typeof value === 'function'
                        ? (value as (prev: T) => T)(prev)
                        : value;
                try {
                    window.localStorage.setItem(key, JSON.stringify(next));
                } catch {
                    // No-op.
                }
                return next;
            });
        },
        [key]
    );

    return [stored, setValue];
}
