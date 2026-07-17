'use client';

/*
 * factionStore — per-project owner→faction map for the FACTION grouping
 * (Brendon, 2026-07-16 group expansion). Same self-populating client-cache
 * shape as lib/art/colorStore: one GET per project per session, a version
 * bump re-renders any grouping memo that depends on it.
 *
 * Lazy by design: the fetch fires only when a surface actually lands on the
 * FACTION dimension (the hook's `enabled` flag), so cycling past it costs
 * nothing and civilians who never group by faction never make the call.
 */

import { useEffect, useReducer } from 'react';

const bySlug = new Map<string, Map<string, string>>(); // slug -> addrLower -> faction
const loading = new Set<string>();
let version = 0;
const listeners = new Set<() => void>();
function bump() { version += 1; listeners.forEach((l) => l()); }

/** The faction the owner flies in this project's holder set, or null. */
export function factionOf(slug: string, ownerAddress: string | null | undefined): string | null {
    if (!ownerAddress) return null;
    return bySlug.get(slug)?.get(ownerAddress.toLowerCase()) ?? null;
}

async function load(slug: string): Promise<void> {
    if (bySlug.has(slug) || loading.has(slug)) return;
    loading.add(slug);
    try {
        const res = await fetch(`/api/project/${encodeURIComponent(slug)}/factions`);
        if (!res.ok) return;
        const j = (await res.json()) as { owners?: Record<string, string> };
        const map = new Map<string, string>();
        for (const [addr, faction] of Object.entries(j.owners ?? {})) {
            if (typeof faction === 'string' && faction) map.set(addr.toLowerCase(), faction);
        }
        bySlug.set(slug, map);
        bump();
    } catch { /* fail-soft — everyone reads Neutral until a later retry */ }
}

/** Load the project's oath map when `enabled`; returns a version number for
 *  the grouping memo's deps (recomputes once the factions land). */
export function useProjectFactions(slug: string, enabled: boolean): number {
    const [, force] = useReducer((x: number) => x + 1, 0);
    useEffect(() => {
        listeners.add(force);
        return () => { listeners.delete(force); };
    }, []);
    useEffect(() => {
        if (enabled && slug) void load(slug);
    }, [slug, enabled]);
    return version;
}
