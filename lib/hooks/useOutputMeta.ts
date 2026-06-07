'use client';

/*
 * useOutputMeta
 *
 * Thin id → OutputMeta lookup over ProjectContext. Mirrors sim's
 * `metaCache[id]` access pattern (sim.html 8751, 11599, 11785, 12345)
 * — every consumer treats id as the key and accepts that the row may
 * not exist yet (returns null). No memoization needed: Map.get is O(1)
 * and the id reference is stable across renders.
 *
 * Returns null when id is null (closed modal, unrouted page) so callers
 * can keep their existing `if (id != null && meta)` render gates.
 */

import { useProject, type OutputMeta } from '../state/ProjectContext';

export function useOutputMeta(id: number | null): OutputMeta | null {
    const { outputs } = useProject();
    if (id == null) return null;
    return outputs.get(id) ?? null;
}
