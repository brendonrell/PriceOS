'use client';

/*
 * artistColorStore — each starred ARTIST's OFFICIAL colour bucket, loaded at the
 * list level so Starred › Artists can group by colour (Brendon 2026-06-19, "just
 * for fun").
 *
 * The official colour is the user's Profile Colorway (profile_hex), falling back
 * to their generated signature colour (signature_hex). We classify the hex into
 * the same colour buckets the art uses (classifyRgb), one cached fetch per
 * handle, and bump a version so the grouping memo recomputes when colours land.
 */

import { useEffect, useReducer } from 'react';
import { classifyRgb } from '../art/outputColor';

const cache = new Map<string, string>(); // handle (lower) -> colour bucket
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

/** A starred artist's official-colour bucket, or null if not loaded yet. */
export function artistBucket(handle: string): string | null {
    return cache.get(handle.toLowerCase()) ?? null;
}

async function loadColors(handles: string[]): Promise<void> {
    const fresh = handles.map((h) => h.toLowerCase()).filter((h) => h && !loaded.has(h));
    if (fresh.length === 0) return;
    fresh.forEach((h) => loaded.add(h));
    await Promise.all(
        fresh.map(async (h) => {
            try {
                const res = await fetch(`/api/user/by-handle/${h}`);
                if (!res.ok) return;
                const u = (await res.json()) as { profile_hex?: string | null; signature_hex?: string | null };
                const hex = u.profile_hex || u.signature_hex;
                if (typeof hex === 'string') {
                    const rgb = hexToRgb(hex);
                    if (rgb) cache.set(h, classifyRgb(rgb[0], rgb[1], rgb[2]));
                }
            } catch { /* ignore */ }
        }),
    );
    bump();
}

/** Load official colours for the given artist handles; re-render the caller when
    they land. Returns a version to drop into a grouping memo's deps. */
export function useArtistColors(handles: string[]): number {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        return () => { listeners.delete(force); };
    }, []);
    const key = handles.join(',');
    useEffect(() => {
        if (handles.length) void loadColors(handles);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key]);
    return version;
}
