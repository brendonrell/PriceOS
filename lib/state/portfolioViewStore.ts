'use client';

/*
 * portfolioViewStore — the Portfolio's own view state, account-backed.
 *
 * Three switches the user sets once and expects to find where they left them:
 * the $ value mode, the artist/project grouping, and whether the book is
 * hidden. They were the last three device-only keys in the Portfolio (Brendon,
 * 2026-08-01: "almost no device stuff… db everything is one of our
 * signatures").
 *
 * Shape follows groupMemoryStore: localStorage is the instant read (each switch
 * keeps its own existing cache key, so nothing else that reads them changes),
 * and all three ride ONE settings-envelope entry (`portfolioView`) because they
 * are one preference in the user's head. The server row wins on hydrate.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from './userState';

const KEYS = {
    priceMode: STATE_CACHE_KEYS.portfolioPriceMode,
    groupMode: STATE_CACHE_KEYS.portfolioGroupMode,
    hidden: STATE_CACHE_KEYS.portfolioHidden,
} as const;

type Field = keyof typeof KEYS;

function readRaw<T>(field: Field, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(KEYS[field]);
        return raw === null ? fallback : (JSON.parse(raw) as T);
    } catch {
        return fallback;
    }
}

/** Push all three up together — the envelope entry is one object. */
function pushAll(): void {
    pushSettings({
        portfolioView: {
            priceMode: readRaw<string>('priceMode', 'floor'),
            groupMode: readRaw<string>('groupMode', 'artist'),
            hidden: readRaw<boolean>('hidden', false),
        },
    });
}

/**
 * One of the three switches: same contract as useLocalStorage (value + setter,
 * updater fn supported), plus the account write-through and a re-read when a
 * sign-in lands the account's copy.
 */
export function usePortfolioView<T>(field: Field, initial: T): [T, (v: T | ((p: T) => T)) => void] {
    const [value, setValue] = useState<T>(initial);

    // Hydrate after mount so SSR and the first client render agree.
    useEffect(() => { setValue(readRaw<T>(field, initial)); }, [field, initial]);

    // A sign-in on any device just wrote the account's copy into the cache.
    useEffect(() => {
        const onHydrated = () => setValue(readRaw<T>(field, initial));
        window.addEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
        return () => window.removeEventListener(USERSTATE_HYDRATED_EVENT, onHydrated);
    }, [field, initial]);

    const set = useCallback((next: T | ((p: T) => T)) => {
        setValue((prev) => {
            const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
            try {
                window.localStorage.setItem(KEYS[field], JSON.stringify(v));
            } catch {
                /* private mode / quota — the account write below still carries it */
            }
            pushAll();
            return v;
        });
    }, [field]);

    return [value, set];
}
