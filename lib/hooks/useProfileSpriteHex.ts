'use client';

/*
 * useProfileSpriteHex
 *
 * Owns the colour a user picked for their PriceSprite — the still face beside
 * their @name. Server source of truth is `users.profile_sprite_hex`; mirrored to
 * localStorage `pd_profile_sprite_hex` and broadcast on
 * `pd:profile-sprite-hex-changed`. null = inherit the colorway text colour (the
 * default, exactly as the sprite renders today).
 *
 * A DISTINCT feature from the Profile Colorway (`profile_hex` / `pd_profile_hex`)
 * and the Profile Logo (`profile_logo`): same rails, its own slot + event +
 * column. Never alias them — the sprite colour must NEVER write the page colour.
 *
 * `setHex(hex | null)` validates the hex, persists it (or clears on null),
 * broadcasts the change, and writes through to the server. Returns false for a
 * malformed hex so the caller can ignore it.
 */

import { useCallback, useEffect, useState } from 'react';
import { pushState } from '@/lib/state/userState';

const STORAGE_KEY = 'pd_profile_sprite_hex';
const EVENT_NAME = 'pd:profile-sprite-hex-changed';
const HEX_RE = /^#[0-9A-F]{6}$/i;

function readStored(seed: string | null): string | null {
    if (typeof window === 'undefined') return seed;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved && HEX_RE.test(saved)) return saved.toUpperCase();
    } catch {
        /* ignore */
    }
    return seed;
}

/**
 * @param serverHex Server-known value (`users.profile_sprite_hex`) for the OWNER
 *   of the profile being viewed — pass it ONLY when the viewer is on their OWN
 *   profile. Seeds the initial colour so the sprite paints the real colour on
 *   first pass instead of flashing the default and correcting after hydration.
 */
export function useProfileSpriteHex(serverHex?: string | null) {
    const seed = serverHex && HEX_RE.test(serverHex) ? serverHex.toUpperCase() : null;
    const [hex, setHexState] = useState<string | null>(seed);

    // Hydrate + listen on mount.
    useEffect(() => {
        setHexState(readStored(seed));

        const sync = (e: Event) => {
            const detail = (e as CustomEvent<string | null>).detail;
            if (detail === null || HEX_RE.test(detail)) {
                setHexState(detail ? detail.toUpperCase() : null);
            }
        };
        window.addEventListener(EVENT_NAME, sync);
        return () => window.removeEventListener(EVENT_NAME, sync);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    /** Set (or clear with null) the PriceSprite colour. Returns false for a
     *  malformed hex (caller can ignore). */
    const setHex = useCallback((next: string | null): boolean => {
        if (next !== null && !HEX_RE.test(next)) return false;
        const val = next === null ? null : next.toUpperCase();
        setHexState(val);
        try {
            if (val === null) localStorage.removeItem(STORAGE_KEY);
            else localStorage.setItem(STORAGE_KEY, val);
        } catch {
            /* ignore */
        }
        try {
            window.dispatchEvent(new CustomEvent<string | null>(EVENT_NAME, { detail: val }));
        } catch {
            /* ignore */
        }
        // Write-through to the server (source of truth). No-op until the server
        // snapshot has hydrated, so this never fires for the boot-time default.
        pushState({ profile_sprite_hex: val });
        return true;
    }, []);

    return { hex, setHex };
}
