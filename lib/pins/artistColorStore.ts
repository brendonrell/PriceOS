'use client';

/*
 * starred-user meta store — each starred USER's official colour bucket, follower
 * count, and PriceSprite, loaded at the LIST level so Starred can group by colour
 * and sort by followers across the whole list (Brendon 2026-06-19).
 *
 * Applies to both Artists and Collectors (any starred user). The official colour
 * is the Profile Colorway (profile_hex), falling back to the generated signature
 * colour (signature_hex), classified into the same buckets the art uses. One
 * cached by-handle fetch per user; a version bump re-runs the grouping/sort memos
 * when data lands. (Named artistColorStore for back-compat with existing imports.)
 */

import { useEffect, useReducer } from 'react';
import { classifyRgb } from '../art/outputColor';

interface UserMeta {
    bucket?: string;       // official-colour bucket
    followers?: number;    // follower count
    sprite?: string | null; // PriceSprite (emoji/key) or null
}

const cache = new Map<string, UserMeta>(); // handle (lower) -> meta
const loaded = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
function bump() { version += 1; listeners.forEach((l) => l()); }

function hexToRgb(hex: string): [number, number, number] | null {
    const h = hex.replace('#', '').trim();
    if (h.length !== 6) return null;
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    if ([r, g, b].some((n) => Number.isNaN(n))) return null;
    return [r, g, b];
}

/** A starred user's official-colour bucket, or null if not loaded yet. */
export function artistBucket(handle: string): string | null {
    return cache.get(handle.toLowerCase())?.bucket ?? null;
}

/** A starred user's follower count, or null if not loaded yet. */
export function artistFollowers(handle: string): number | null {
    return cache.get(handle.toLowerCase())?.followers ?? null;
}

/** A starred user's PriceSprite, or null. */
export function artistSprite(handle: string): string | null {
    return cache.get(handle.toLowerCase())?.sprite ?? null;
}

async function loadMeta(handles: string[]): Promise<void> {
    const fresh = handles.map((h) => h.toLowerCase()).filter((h) => h && !loaded.has(h));
    if (fresh.length === 0) return;
    fresh.forEach((h) => loaded.add(h));
    await Promise.all(
        fresh.map(async (h) => {
            try {
                const res = await fetch(`/api/user/by-handle/${h}`);
                if (!res.ok) return;
                const u = (await res.json()) as {
                    profile_hex?: string | null;
                    signature_hex?: string | null;
                    follower_count?: number;
                    price_sprite_resolved?: string | null;
                    price_sprite?: string | null;
                };
                const meta: UserMeta = {};
                const hex = u.profile_hex || u.signature_hex;
                if (typeof hex === 'string') {
                    const rgb = hexToRgb(hex);
                    if (rgb) meta.bucket = classifyRgb(rgb[0], rgb[1], rgb[2]);
                }
                if (typeof u.follower_count === 'number') meta.followers = u.follower_count;
                meta.sprite = u.price_sprite_resolved ?? u.price_sprite ?? null;
                cache.set(h, meta);
            } catch { /* ignore */ }
        }),
    );
    bump();
}

/** Load official colours + follower counts + sprites for the given handles;
    re-render the caller when they land. Returns a version for memo deps. */
export function useArtistColors(handles: string[]): number {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        return () => { listeners.delete(force); };
    }, []);
    const key = handles.join(',');
    useEffect(() => {
        if (handles.length) void loadMeta(handles);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return version;
}
