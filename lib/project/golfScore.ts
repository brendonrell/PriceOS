/*
 * golfScore — a project's "Golf Score": the byte size of its generation engine,
 * ranked against every other project (smallest = best, rank #1). Deterministic
 * and free: measured from the engine function's own compiled source. On the
 * deployed build that source is minified, so this reads as the minified
 * gen-script size (Brendon, 2026-06-24).
 *
 * It's a PROJECT-level stat — one engine per project — so it lives on the
 * project attributes sheet, not per-output.
 */

import { allProjects, getProject } from './registry';
import type { ProjectDef } from './types';

export interface GolfScore {
    /** Compiled byte size of the engine source. */
    bytes: number;
    /** 1-based rank by size, smallest first. */
    rank: number;
    /** Total ranked projects. */
    total: number;
}

function scriptBytes(p: ProjectDef): number {
    try {
        return typeof p.render === 'function' ? p.render.toString().length : 0;
    } catch {
        return 0;
    }
}

export function golfScore(slug: string): GolfScore | null {
    const me = getProject(slug);
    if (!me) return null;
    const mine = scriptBytes(me);
    if (!mine) return null;
    const all = allProjects().filter((p) => scriptBytes(p) > 0);
    let rank = 1;
    for (const p of all) {
        if (p.slug === me.slug) continue;
        if (scriptBytes(p) < mine) rank++;
    }
    return { bytes: mine, rank, total: all.length };
}
