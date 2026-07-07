'use client';

/*
 * useAnoint — the client surface for the Anointment system (spec:
 * docs/anointment-egregore-spec.md; API: app/api/anoint/route.ts).
 *
 * The backend is SIWE-cookie-gated exactly like project-follows, so placing /
 * moving / withdrawing is a plain fetch — the session cookie carries auth, no
 * per-action signature dance.
 *
 *   useMyAnoint()            → the caller's single pledge (or null) + refresh
 *   useProjectAnoint(id)     → a project's standing (count/level/Prime Relic…)
 *   placeAnoint(ref, output) → place or move the pledge onto `ref` via `output`
 *   withdrawAnoint()         → remove the pledge (lock-gated)
 *
 * Both hooks re-read on the `pd:anoint-changed` window event, which the actions
 * dispatch, so every anoint surface (modal socket, project tab, profile tab)
 * stays in sync after any change.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../state/AuthContext';

const CHANGED_EVENT = 'pd:anoint-changed';

/** The caller's current pledge, mirrored from GET /api/anoint?me=. */
export interface MyPledge {
    project_id: string;
    output_token_id: string;
    placed_at: string;
    locked: boolean;
    unlocksAt: string;
}

/** A project's anointment standing, from GET /api/anoint?project=. */
export interface ProjectStanding {
    project_id: string;
    handle: string | null;
    count: number;
    level: number;
    levelName: string;
    nextThreshold: number | null;
    progress: number;
    primeRelic: {
        output_token_id: string;
        owner_address: string | null;
        owner_handle: string | null;
        votes: number;
    } | null;
    anointers: string[];
}

/** Fire-and-forget signal so sibling anoint surfaces re-read. */
function announceChange(): void {
    try {
        window.dispatchEvent(new Event(CHANGED_EVENT));
    } catch {
        /* SSR / no window — no-op */
    }
}

/** Result of a place/move/withdraw attempt. `lockedUntil` is set on a 409 so the
 *  caller can tell the user when the 60-day lock lifts. */
export interface AnointActionResult {
    ok: boolean;
    moved?: boolean;
    error?: string;
    lockedUntil?: string;
}

/** Place or move the caller's single Anointment onto `projectRef` (id or
 *  @handle) through `outputTokenId`. Same-project conduit changes are free; a
 *  cross-project move is blocked until the 60-day lock lifts (server-enforced). */
export async function placeAnoint(
    projectRef: string,
    outputTokenId: string,
): Promise<AnointActionResult> {
    try {
        const r = await fetch('/api/anoint', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ project: projectRef, output_token_id: outputTokenId }),
        });
        if (r.status === 201) {
            const d = (await r.json().catch(() => ({}))) as { moved?: boolean };
            announceChange();
            return { ok: true, moved: !!d.moved };
        }
        const j = (await r.json().catch(() => ({}))) as { error?: string; unlocksAt?: string };
        return { ok: false, error: j.error, lockedUntil: j.unlocksAt };
    } catch {
        return { ok: false, error: 'Network error' };
    }
}

/** Withdraw the caller's Anointment (lock-gated, server-enforced). */
export async function withdrawAnoint(): Promise<AnointActionResult> {
    try {
        const r = await fetch('/api/anoint', { method: 'DELETE' });
        if (r.ok) {
            announceChange();
            return { ok: true };
        }
        const j = (await r.json().catch(() => ({}))) as { error?: string; unlocksAt?: string };
        return { ok: false, error: j.error, lockedUntil: j.unlocksAt };
    } catch {
        return { ok: false, error: 'Network error' };
    }
}

/** The signed-in caller's single pledge (or null when unplaced / logged out). */
export function useMyAnoint(): { pledge: MyPledge | null; loading: boolean; refresh: () => void } {
    const { siweAddress } = useAuth();
    const [pledge, setPledge] = useState<MyPledge | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        const addr = siweAddress?.toLowerCase();
        if (!addr) { setPledge(null); return; }
        setLoading(true);
        fetch(`/api/anoint?me=${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { anointment?: MyPledge | null } | null) => {
                setPledge(d?.anointment ?? null);
            })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [siweAddress]);

    useEffect(() => {
        load();
        const onCh = () => load();
        window.addEventListener(CHANGED_EVENT, onCh);
        return () => window.removeEventListener(CHANGED_EVENT, onCh);
    }, [load]);

    return { pledge, loading, refresh: load };
}

/** A project's live anointment standing. `projectRef` is the id or @handle the
 *  page already has (the project slug works). */
export function useProjectAnoint(
    projectRef: string | null | undefined,
): { standing: ProjectStanding | null; loading: boolean; refresh: () => void } {
    const [standing, setStanding] = useState<ProjectStanding | null>(null);
    const [loading, setLoading] = useState(false);

    const load = useCallback(() => {
        if (!projectRef) { setStanding(null); return; }
        setLoading(true);
        fetch(`/api/anoint?project=${encodeURIComponent(projectRef)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: ProjectStanding | null) => { setStanding(d); })
            .catch(() => {})
            .finally(() => setLoading(false));
    }, [projectRef]);

    useEffect(() => {
        load();
        const onCh = () => load();
        window.addEventListener(CHANGED_EVENT, onCh);
        return () => window.removeEventListener(CHANGED_EVENT, onCh);
    }, [load]);

    return { standing, loading, refresh: load };
}
