'use client';

/*
 * spiteValidate — gate for what may enter the Spite Book.
 *
 * A name only counts if it's a real @name on Price Discussion: a project (or
 * artist) handle from the registry, or a claimed user handle. Anything else is
 * rejected so the book never fills with junk. Accepts the input with or without
 * a leading "@" (matching is @-insensitive — see spiteStore.normalizeHandle).
 *
 * Projects + artist handles are known client-side (the registry), so they
 * resolve instantly. User handles need the by-handle endpoint.
 */

import { allProjects } from '../project/registry';
import { normalizeHandle } from './spiteStore';

let projectSet: Set<string> | null = null;

/** Project slugs + artist handles — every project/artist @name, lower-cased. */
function getProjectSet(): Set<string> {
    if (projectSet) return projectSet;
    const s = new Set<string>();
    for (const p of allProjects()) {
        if (p.slug) s.add(p.slug.toLowerCase());
        if (p.artistHandle) s.add(p.artistHandle.toLowerCase());
    }
    projectSet = s;
    return s;
}

/**
 * Resolve whether a typed name is a real handle on the site.
 * Returns true for a known project/artist @name or a claimed user handle.
 * Network failure → false (reject rather than admit junk).
 */
export async function validateSpiteHandle(raw: string): Promise<boolean> {
    const n = normalizeHandle(raw);
    if (!n) return false;
    if (getProjectSet().has(n)) return true;
    try {
        const res = await fetch(`/api/user/by-handle/${encodeURIComponent(n)}`);
        return res.ok;
    } catch {
        return false;
    }
}
