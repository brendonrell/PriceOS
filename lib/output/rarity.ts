/*
 * Per-Project rarity — computed, not stored. Because every Output's artist
 * traits, Fate and palette-colour are DETERMINISTIC from (slug, tokenId), we can
 * tally any range of the edition set and know exactly how common any value is —
 * real trait-floor rarity with no indexer. Distributions are memoised per
 * (project, mintedCount) pair (supplies cap in the hundreds, so the tally is
 * cheap), then `freqOf` answers count / percent / rank / distinct for a
 * single Output's value.
 *
 * LIVE, not sold-out (Brendon, 2026-08-22 — Rarity Labs rebuild): in the real
 * world we never know ahead of time which Outputs are rarest, and plenty of
 * projects never sell out. So every function here takes an optional
 * `mintedCount` — the project's CANONICAL minted count (PD's strict
 * canonical-mints-only number, same one the project hero reads as
 * `mintedCount`) — and tallies only editions 1..mintedCount, not the full
 * max-supply cap. Ranking shifts as new mints land; that's the correct
 * behaviour, not a bug. Callers that omit `mintedCount` fall back to the
 * project's max supply (the pre-2026-08-22 behaviour) — a stopgap for call
 * sites not yet passing a live count, not the intended long-term read.
 */

import { getProject } from '../project/registry';
import { readOutputFate } from '../project/fate';
import { outputColorBucket } from '../art/outputColor';
import { outputIsolation } from './genome';

export interface Freq {
    /** Editions sharing this value. */
    count: number;
    /** Total editions in the project. */
    total: number;
    /** Share of the edition set, 0..1. */
    pct: number;
    /** 1 = rarest value of its axis (fewest editions); ties share a rank. */
    rank: number;
    /** Distinct values this axis takes across the project. */
    distinct: number;
}

interface ProjectRarity {
    total: number;
    traits: Map<string, Map<string, number>>; // trait name → value → count
    fate: Map<string, number>;
    color: Map<string, number>;
}

const cache = new Map<string, ProjectRarity | null>();

/** Resolve the tally's edition ceiling: the live minted count when given
 *  (clamped to the project's max supply, so a stale/over count can't run
 *  past what the registry can resolve traits for), else the max supply
 *  itself (the stopgap for not-yet-migrated callers). */
function tallyCeiling(project: { outputs: number }, mintedCount?: number): number {
    if (mintedCount == null) return project.outputs;
    return Math.max(0, Math.min(mintedCount, project.outputs));
}

function compute(slug: string, mintedCount?: number): ProjectRarity | null {
    const project = getProject(slug);
    if (!project) return null;
    const total = tallyCeiling(project, mintedCount);
    if (!total || total <= 0) return null;

    const traits = new Map<string, Map<string, number>>();
    const fate = new Map<string, number>();
    const color = new Map<string, number>();

    for (let id = 1; id <= total; id++) {
        // Artist-defined traits (Palette etc.).
        const tv = project.traitsOf(id);
        for (const [name, value] of Object.entries(tv)) {
            let m = traits.get(name);
            if (!m) { m = new Map(); traits.set(name, m); }
            m.set(value, (m.get(value) ?? 0) + 1);
        }
        // Fate (platform auto-trait).
        const f = readOutputFate(slug, id).fate;
        fate.set(f, (fate.get(f) ?? 0) + 1);
        // Palette-derived colour bucket (null on engines without palette math).
        const c = outputColorBucket(slug, id);
        if (c) color.set(c, (color.get(c) ?? 0) + 1);
    }

    return { total, traits, fate, color };
}

function getProjectRarity(slug: string, mintedCount?: number): ProjectRarity | null {
    // Keyed by (slug, ceiling) — a live mintedCount changes the tally, so a
    // project mid-mint gets a fresh census as new pieces land instead of
    // reusing yesterday's (or minute-ago's) memoised sold-out-shaped one.
    const project = getProject(slug);
    const ceiling = project ? tallyCeiling(project, mintedCount) : 0;
    const key = `${slug.toLowerCase()}:${ceiling}`;
    if (!cache.has(key)) cache.set(key, compute(slug, mintedCount));
    return cache.get(key) ?? null;
}

/** An Output's PRIMARY artist trait — the first axis in the project's schema
    (e.g. Palette), its chosen value, and which subtrait bucket (Main / Special)
    that value belongs to. Null when the project defines no artist traits. */
export function primaryTrait(
    slug: string,
    id: number,
): { name: string; value: string; cls: string | null } | null {
    const project = getProject(slug);
    const def = project?.traitSchema.traits[0];
    if (!project || !def) return null;
    const value = project.traitsOf(id)[def.name];
    if (!value) return null;
    let cls: string | null = null;
    for (const sub of def.subtraits ?? []) {
        if (sub.values.includes(value)) { cls = sub.name; break; }
    }
    return { name: def.name, value, cls };
}

/** count / percent / rank / distinct for a value within a tally. */
function freqOf(map: Map<string, number>, value: string, total: number): Freq | null {
    const count = map.get(value);
    if (count == null) return null;
    let rarer = 0;
    for (const n of map.values()) if (n < count) rarer += 1;
    return { count, total, pct: count / total, rank: rarer + 1, distinct: map.size };
}

/** Rarity of one of an Output's artist-trait values (e.g. Palette = "Aurora"),
 *  tallied against `mintedCount` live editions (falls back to max supply if
 *  omitted — see file header). */
export function traitRarity(slug: string, traitName: string, value: string, mintedCount?: number): Freq | null {
    const r = getProjectRarity(slug, mintedCount);
    const m = r?.traits.get(traitName);
    return m ? freqOf(m, value, r!.total) : null;
}

/** Rarity of an Output's Fate word across its project's LIVE editions. */
export function fateRarity(slug: string, fate: string, mintedCount?: number): Freq | null {
    const r = getProjectRarity(slug, mintedCount);
    return r ? freqOf(r.fate, fate, r.total) : null;
}

/** The PD Rarity headline for an Output — provable art-rarity (primary trait /
 *  Fate / colour) blended with genome Isolation into one 0–100 read. The same
 *  math the character sheet leads with, shared so the Receipt can't disagree. */
export function pdRarity(slug: string, id: number, mintedCount?: number): {
    score: number; classic: number | null; isolation: number | null;
} | null {
    const pt = primaryTrait(slug, id);
    const tf = pt ? traitRarity(slug, pt.name, pt.value, mintedCount) : null;
    const ff = fateRarity(slug, readOutputFate(slug, id).fate, mintedCount);
    const bucket = outputColorBucket(slug, id);
    const cf = bucket ? colorRarity(slug, bucket, mintedCount) : null;
    const overall = overallRarity([tf, ff, cf]);
    const iso = outputIsolation(slug, id);
    if (!overall && !iso) return null;
    const parts: number[] = [];
    if (overall) parts.push(overall.score);
    if (iso) parts.push(iso.score);
    const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    return { score, classic: overall?.score ?? null, isolation: iso?.score ?? null };
}

/** The PD Rarity RANK — where this piece's headline sits across its LIVE
 *  edition set ("#3 of 105 minted so far", not "#3 of 105 planned"). Same
 *  pdRarity math per edition, tallied once per (project, mintedCount) and
 *  memoised; ties share a rank (both are "#3"). Pass `mintedCount` — the
 *  project's canonical minted count — so the denominator is what's actually
 *  been minted, not the max-supply cap; ranking reshuffles as new mints
 *  land, which is correct (a project that never sells out never falsely
 *  reads as if it did). Omitting `mintedCount` falls back to max supply for
 *  call sites not yet migrated. */
const rankCache = new Map<string, Map<number, number> | null>();
export function pdRarityRank(slug: string, id: number, mintedCount?: number): { rank: number; total: number } | null {
    const project = getProject(slug);
    if (!project) return null;
    const ceiling = tallyCeiling(project, mintedCount);
    const key = `${slug.toLowerCase()}:${ceiling}`;
    if (!rankCache.has(key)) {
        if (!ceiling || ceiling <= 0) { rankCache.set(key, null); }
        else {
            const scores = new Map<number, number>();
            for (let i = 1; i <= ceiling; i++) {
                const r = pdRarity(slug, i, mintedCount);
                if (r) scores.set(i, r.score);
            }
            rankCache.set(key, scores.size ? scores : null);
        }
    }
    const scores = rankCache.get(key);
    const mine = scores?.get(id);
    if (!scores || mine == null) return null;
    let rarer = 0;
    for (const s of scores.values()) if (s > mine) rarer += 1;
    return { rank: rarer + 1, total: scores.size };
}

/** POP — the census count of the piece's rarest single axis value (its
 *  smallest club): the minimum count across every resolved artist trait, its
 *  Fate, and its colour bucket. "POP 1" = an axis value nothing else has.
 *  Null only when the project resolves no axes at all. (Rarity Labs, 2026-07-26.) */
export function popCount(slug: string, id: number, mintedCount?: number): number | null {
    const r = getProjectRarity(slug, mintedCount);
    const project = getProject(slug);
    if (!r || !project) return null;
    let min: number | null = null;
    const take = (n: number | undefined | null) => {
        if (n != null) min = min == null ? n : Math.min(min, n);
    };
    for (const [name, value] of Object.entries(project.traitsOf(id))) {
        take(r.traits.get(name)?.get(value));
    }
    take(r.fate.get(readOutputFate(slug, id).fate));
    const bucket = outputColorBucket(slug, id);
    if (bucket) take(r.color.get(bucket));
    return min;
}

/** NONE HIGHER — this piece is rank #1 by PD Rarity across its LIVE edition
 *  set (ties share the top honestly: every #1 wears it). */
export function noneHigher(slug: string, id: number, mintedCount?: number): boolean {
    const rr = pdRarityRank(slug, id, mintedCount);
    return rr != null && rr.rank === 1;
}

/** The full project census for the Pop Table — every axis (artist traits ·
 *  Fate · colour), each value with count + share, sorted rarest-first. */
export interface CensusAxis {
    name: string;
    total: number;
    values: { value: string; count: number; pct: number }[];
}
export function projectCensus(slug: string, mintedCount?: number): CensusAxis[] | null {
    const r = getProjectRarity(slug, mintedCount);
    if (!r) return null;
    const axisOf = (name: string, m: Map<string, number>, total: number): CensusAxis => ({
        name,
        total,
        values: [...m.entries()]
            .map(([value, count]) => ({ value, count, pct: count / total }))
            .sort((a, b) => a.count - b.count || a.value.localeCompare(b.value)),
    });
    const axes: CensusAxis[] = [];
    for (const [name, m] of r.traits) axes.push(axisOf(name, m, r.total));
    if (r.fate.size) axes.push(axisOf('Fate', r.fate, r.total));
    if (r.color.size) {
        let colorTotal = 0;
        for (const n of r.color.values()) colorTotal += n;
        axes.push(axisOf('Colour', r.color, colorTotal));
    }
    return axes.length ? axes : null;
}

/** Rarity of an Output's dominant colour bucket across its project's LIVE editions. */
export function colorRarity(slug: string, bucket: string, mintedCount?: number): Freq | null {
    const r = getProjectRarity(slug, mintedCount);
    if (!r || r.color.size === 0) return null;
    // Colour total = editions that resolved a bucket (palette engines only).
    let colorTotal = 0;
    for (const n of r.color.values()) colorTotal += n;
    return freqOf(r.color, bucket, colorTotal);
}

/**
 * Overall statistical rarity — the summed information content of an Output's
 * independent axes (−Σ log2 p), normalised to a 0–100 score. Higher = the rarer
 * the combination of this piece's trait + fate + colour values. Returns null
 * until at least one axis resolves.
 */
export function overallRarity(
    parts: (Freq | null)[],
): { score: number; bits: number } | null {
    const present = parts.filter((p): p is Freq => p != null && p.pct > 0);
    if (present.length === 0) return null;
    const bits = present.reduce((acc, p) => acc - Math.log2(p.pct), 0);
    // A piece with all-average traits scores low; an all-1/total combo scores
    // high. Map bits onto 0–100 with a soft ceiling (24 bits ≈ very rare).
    const score = Math.max(1, Math.min(100, Math.round((bits / 24) * 100)));
    return { score, bits };
}
