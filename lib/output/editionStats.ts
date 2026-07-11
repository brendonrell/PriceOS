'use client';

/*
 * editionStats — the character sheet's EDITION CONTEXT: this piece against its
 * whole edition set, from the real stored rows (`outputs` is anon-readable).
 * One query per project per session (module-cached), powering:
 *   • percentile tags on every Fingerprint band — "34% · top 8%"
 *   • mint order + speed — "3rd mint · 2 min after launch"
 * Fail-soft: no rows / thin coverage → null, and the sheet simply shows what
 * it always showed (tags are gated, never faked).
 */

import { getSupabaseBrowser } from '../supabase';
import { getProject } from '../project/registry';

/** Fingerprint scalar axes that carry a percentile tag. */
export type EditionAxis =
    | 'brightness' | 'saturation' | 'complexity' | 'contrast'
    | 'warmth' | 'texture' | 'air' | 'symmetry';

const AXES: EditionAxis[] = [
    'brightness', 'saturation', 'complexity', 'contrast',
    'warmth', 'texture', 'air', 'symmetry',
];

export interface EditionStats {
    /** Edition size (registry supply). */
    total: number;
    /** axis → every captured value across the edition, sorted ascending.
     *  An axis is present only with real coverage (≥8 rows AND ≥30% of the
     *  edition) — a percentile against three rows would be a lie. */
    scalars: Partial<Record<EditionAxis, number[]>>;
    /** token id → mint moment (ms) for every minted row that has one. */
    mintedAtMs: Map<number, number>;
    /** The edition's first mint moment (ms) — "launch". */
    firstMintMs: number | null;
}

const cache = new Map<string, Promise<EditionStats | null>>();

export function fetchEditionStats(slug: string): Promise<EditionStats | null> {
    const key = slug.toLowerCase();
    let p = cache.get(key);
    if (!p) {
        p = load(key).catch(() => null);
        cache.set(key, p);
    }
    return p;
}

async function load(slug: string): Promise<EditionStats | null> {
    const total = getProject(slug)?.outputs ?? 0;
    if (!total) return null;
    const { data, error } = await getSupabaseBrowser()
        .from('outputs')
        .select('token_id,minted_at,brightness,saturation,complexity,contrast,warmth,texture,air,symmetry')
        .eq('project_id', slug)
        .limit(1000);
    if (error || !data || data.length === 0) return null;

    const scalars: Partial<Record<EditionAxis, number[]>> = {};
    for (const axis of AXES) {
        const vals: number[] = [];
        for (const row of data) {
            const v = (row as Record<string, unknown>)[axis];
            if (typeof v === 'number' && Number.isFinite(v)) vals.push(v);
        }
        if (vals.length >= 8 && vals.length >= total * 0.3) {
            vals.sort((a, b) => a - b);
            scalars[axis] = vals;
        }
    }

    const mintedAtMs = new Map<number, number>();
    let firstMintMs: number | null = null;
    for (const row of data) {
        const id = Number((row as { token_id?: string }).token_id);
        const at = (row as { minted_at?: string | null }).minted_at;
        if (!Number.isFinite(id) || !at) continue;
        const ms = new Date(at).getTime();
        if (!Number.isFinite(ms)) continue;
        mintedAtMs.set(id, ms);
        if (firstMintMs == null || ms < firstMintMs) firstMintMs = ms;
    }

    return { total, scalars, mintedAtMs, firstMintMs };
}

/** "top 8%" / "bottom 12%" — this value's percentile within its axis. Reads
 *  from whichever end is nearer so the tag always says something sharp. */
export function percentileTag(stats: EditionStats, axis: EditionAxis, value: number): string | null {
    const vals = stats.scalars[axis];
    if (!vals || vals.length === 0) return null;
    const n = vals.length;
    let below = 0, atOrBelow = 0;
    for (const v of vals) {
        if (v < value) below += 1;
        if (v <= value) atOrBelow += 1;
    }
    const topPct = Math.max(1, Math.round(((n - below) / n) * 100));
    const bottomPct = Math.max(1, Math.round((atOrBelow / n) * 100));
    return topPct <= bottomPct ? `top ${topPct}%` : `bottom ${bottomPct}%`;
}

/** This piece's mint order + speed, from real mint moments.
 *  Order counts by minted_at (id order and mint order coincide on PD, but the
 *  clock is the truth). Null until the piece's own mint moment is stored. */
export function mintOrderOf(stats: EditionStats, id: number): {
    order: number; sinceLaunchMs: number;
} | null {
    const mine = stats.mintedAtMs.get(id);
    if (mine == null || stats.firstMintMs == null) return null;
    let order = 1;
    for (const [tid, ms] of stats.mintedAtMs) {
        if (ms < mine || (ms === mine && tid < id)) order += 1;
    }
    return { order, sinceLaunchMs: mine - stats.firstMintMs };
}

export function ordinal(n: number): string {
    const rem100 = n % 100;
    if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
    switch (n % 10) {
        case 1: return `${n}st`;
        case 2: return `${n}nd`;
        case 3: return `${n}rd`;
        default: return `${n}th`;
    }
}

/** "2 min" / "40s" / "3 h" / "5 d" — mint-speed wording. */
export function humanizeDelta(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 90) return `${Math.max(1, s)}s`;
    const min = Math.round(s / 60);
    if (min < 90) return `${min} min`;
    const h = Math.round(min / 60);
    if (h < 48) return `${h} h`;
    return `${Math.round(h / 24)} d`;
}
