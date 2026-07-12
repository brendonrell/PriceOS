'use client';

/*
 * groupMemoryStore — per-user, per-page LAST-USED grouping memory (Brendon,
 * 2026-07-12: "they find it like they left it" — a grouping chosen inside a
 * project stays with THAT project and never carries into the next one).
 *
 * Mirrors tabMemoryStore exactly: rides the `users.settings` jsonb envelope
 * under `groupMemory` (settings passes PATCH /api/me whole, no route change),
 * with localStorage (`pd_group_memory`) as the instant-read write-through
 * cache and the server row as source of truth (userState.ts hydrate wins).
 *
 * Scopes: 'project' (keyed by slug) for the project gallery; 'profile'
 * (keyed by profile address) for that profile's Collected grid.
 */

import type { UserSettings } from '@/lib/supabase';
import { STATE_CACHE_KEYS, pushSettings } from './userState';

type GroupScope = 'project' | 'profile';
type GroupMemory = NonNullable<UserSettings['groupMemory']>;

const CACHE_KEY = STATE_CACHE_KEYS.groupMemory;

/** Read the whole memory blob from the write-through cache. */
function read(): GroupMemory {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as GroupMemory)
            : {};
    } catch {
        return {};
    }
}

/** The viewer's remembered grouping for this surface, or undefined if none saved. */
export function getRememberedGroup(scope: GroupScope, id: string | null | undefined): string | undefined {
    if (!id) return undefined;
    return read()[scope]?.[id.toLowerCase()];
}

/** Persist the viewer's grouping for this surface — instant local write +
 *  fire-and-forget server sync (the complete settings envelope, so siblings
 *  are preserved). No-op if the value is unchanged. */
export function rememberGroup(scope: GroupScope, id: string | null | undefined, group: string): void {
    if (!id) return;
    const key = id.toLowerCase();
    const mem = read();
    if (mem[scope]?.[key] === group) return;
    const scopeMap = { ...(mem[scope] ?? {}), [key]: group };
    const next: GroupMemory = { ...mem, [scope]: scopeMap };
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
        /* private mode / quota — server sync below still carries the change */
    }
    pushSettings({ groupMemory: next });
}
