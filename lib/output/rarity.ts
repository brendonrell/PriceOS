/*
 * Per-Project rarity — computed, not stored. Because every Output's artist
 * traits, Fate and palette-colour are DETERMINISTIC from (slug, tokenId), we can
 * tally the WHOLE edition set once and know exactly how common any value is —
 * real trait-floor rarity with no indexer. Distributions are memoised per
 * project (supplies cap in the hundreds, so the one-time tally is cheap), then
 * `freqOf` answers count / percent / rank / distinct for a single Output's value.
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

function compute(slug: string): ProjectRarity | null {
    const project = getProject(slug);
    if (!project) return null;
    const total = project.outputs;
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

function getProjectRarity(slug: string): ProjectRarity | null {
    const key = slug.toLowerCase();
    if (!cache.has(key)) cache.set(key, compute(key));
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

/** Rarity of one of an Output's artist-trait values (e.g. Palette = "Aurora"). */
export function traitRarity(slug: string, traitName: string, value: string): Freq | null {
    const r = getProjectRarity(slug);
    const m = r?.traits.get(traitName);
    return m ? freqOf(m, value, r!.total) : null;
}

/** Rarity of an Output's Fate word across its project's editions. */
export function fateRarity(slug: string, fate: string): Freq | null {
    const r = getProjectRarity(slug);
    return r ? freqOf(r.fate, fate, r.total) : null;
}

/** The PD Rarity headline for an Output — provable art-rarity (primary trait /
 *  Fate / colour) blended with genome Isolation into one 0–100 read. The same
 *  math the character sheet leads with, shared so the Receipt can't disagree. */
export function pdRarity(slug: string, id: number): {
    score: number; classic: number | null; isolation: number | null;
} | null {
    const pt = primaryTrait(slug, id);
    const tf = pt ? traitRarity(slug, pt.name, pt.value) : null;
    const ff = fateRarity(slug, readOutputFate(slug, id).fate);
    const bucket = outputColorBucket(slug, id);
    const cf = bucket ? colorRarity(slug, bucket) : null;
    const overall = overallRarity([tf, ff, cf]);
    const iso = outputIsolation(slug, id);
    if (!overall && !iso) return null;
    const parts: number[] = [];
    if (overall) parts.push(overall.score);
    if (iso) parts.push(iso.score);
    const score = Math.round(parts.reduce((a, b) => a + b, 0) / parts.length);
    return { score, classic: overall?.score ?? null, isolation: iso?.score ?? null };
}

/** Rarity of an Output's dominant colour bucket across its project's editions. */
export function colorRarity(slug: string, bucket: string): Freq | null {
    const r = getProjectRarity(slug);
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
