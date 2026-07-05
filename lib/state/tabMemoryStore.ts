'use client';

/*
 * tabMemoryStore — per-user, per-page LAST-VIEWED tab memory.
 *
 * Brendon, 2026-06-16: a user's tab choice on a given project / profile must
 * persist PER PAGE and PER USER, server-backed (not one global localStorage key
 * shared across every project in a browser). The remembered choice is the ONLY
 * thing that overrides each surface's content-aware default landing tab.
 *
 * Storage: rides inside the existing `users.settings` jsonb envelope under
 * `tabMemory` — already whitelisted by PATCH /api/me, already hydrated by
 * GET /api/me, so no schema migration. Same write-through-cache discipline as
 * starStore / wishlistStore: localStorage (`pd_tab_memory`) is the instant-read
 * mirror the page initializers read synchronously at mount; the server row is
 * source of truth and overwrites the cache on every hydrate (userState.ts).
 */

import type { UserSettings } from '@/lib/supabase';
import { STATE_CACHE_KEYS, pushSettings } from './userState';

type TabScope = 'project' | 'profile' | 'home';
type TabMemory = NonNullable<UserSettings['tabMemory']>;

const CACHE_KEY = STATE_CACHE_KEYS.tabMemory;

/** Read the whole memory blob from the write-through cache. */
function read(): TabMemory {
    if (typeof window === 'undefined') return {};
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return {};
        const parsed = JSON.parse(raw) as unknown;
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? (parsed as TabMemory)
            : {};
    } catch {
        return {};
    }
}

/** The viewer's remembered tab for this surface, or undefined if none saved. */
export function getRememberedTab(scope: TabScope, id: string | null | undefined): string | undefined {
    if (!id) return undefined;
    return read()[scope]?.[id.toLowerCase()];
}

/** Persist the viewer's tab choice for this surface — instant local write +
 *  fire-and-forget server sync (the complete settings envelope, so siblings are
 *  preserved). No-op if the value is unchanged. */
export function rememberTab(scope: TabScope, id: string | null | undefined, tab: string): void {
    if (!id) return;
    const key = id.toLowerCase();
    const mem = read();
    if (mem[scope]?.[key] === tab) return;
    const scopeMap = { ...(mem[scope] ?? {}), [key]: tab };
    const next: TabMemory = { ...mem, [scope]: scopeMap };
    try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(next));
    } catch {
        /* private mode / quota — server sync below still carries the change */
    }
    pushSettings({ tabMemory: next });
}
