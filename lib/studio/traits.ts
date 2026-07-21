/*
 * Studio trait harvest + subtrait bucketing helpers.
 *
 * The upload flow's Subtrait feature (Trait → Subtrait → Value, lib/project/
 * types.ts). An uploaded script publishes its per-token traits by setting
 * `window.$traits = { TraitName: "Value" }` during its render. The Studio
 * harvests the distinct values across a test run (buildHarvestEnvelope in
 * drafts.ts posts each render's $traits back to the parent), then the artist
 * groups a trait's values into named subtrait buckets. The grouping is schema,
 * not token data — it lives on the draft's traitSchema and can change without
 * re-minting.
 */

import type { TraitSchema, TraitDef } from '../project/types';

/** One render's published traits: trait name → chosen value. */
export type TraitSample = Record<string, string>;

/** The postMessage payload buildHarvestEnvelope sends per render. */
export interface HarvestMsg {
    __pdHarvest: true;
    tokenId: number;
    traits: TraitSample | null;
}

export function isHarvestMsg(d: unknown): d is HarvestMsg {
    return (
        !!d &&
        typeof d === 'object' &&
        (d as Record<string, unknown>).__pdHarvest === true &&
        typeof (d as Record<string, unknown>).tokenId === 'number'
    );
}

/** Deep-copy a schema to plain mutable arrays (schema fields are readonly). */
function cloneTraits(schema: TraitSchema | undefined): TraitDef[] {
    return (schema?.traits ?? []).map((t) => ({
        name: t.name,
        values: [...t.values],
        subtraits: t.subtraits
            ? t.subtraits.map((s) => ({ name: s.name, values: [...s.values] }))
            : undefined,
    }));
}

/**
 * Fold one harvested $traits sample into the schema's value pools. New trait
 * names appear as flat traits; new values are added to their trait, kept
 * sorted for stable display. Existing subtrait buckets are preserved. Values
 * only ever grow — a harvest never drops a value an earlier run surfaced.
 */
export function mergeSample(
    schema: TraitSchema | undefined,
    sample: TraitSample | null,
): TraitSchema {
    const traits = cloneTraits(schema);
    if (sample) {
        for (const [rawName, rawValue] of Object.entries(sample)) {
            const name = String(rawName);
            const value = String(rawValue);
            if (!name || !value) continue;
            let t = traits.find((x) => x.name === name);
            if (!t) {
                t = { name, values: [] };
                traits.push(t);
            }
            if (!(t.values as string[]).includes(value)) (t.values as string[]).push(value);
        }
    }
    for (const t of traits) (t.values as string[]).sort((a, b) => a.localeCompare(b));
    return { traits };
}

/** A trait's current value → bucket-name map, derived from its subtraits. */
export function assignmentOf(trait: TraitDef): Record<string, string> {
    const m: Record<string, string> = {};
    for (const s of trait.subtraits ?? []) for (const v of s.values) m[v] = s.name;
    return m;
}

/** Values of a trait not yet placed in any bucket. */
export function unbucketedValues(trait: TraitDef): string[] {
    const a = assignmentOf(trait);
    return trait.values.filter((v) => !a[v]);
}

/**
 * Rewrite one trait's subtraits from an ordered bucket list + a value→bucket
 * map. Buckets are emitted in `bucketOrder`, each carrying its assigned values
 * in the trait's value order; empty buckets are dropped from the stored schema.
 * A trait with no non-empty buckets is stored flat (subtraits omitted).
 */
export function writeBuckets(
    schema: TraitSchema,
    traitName: string,
    bucketOrder: string[],
    assign: Record<string, string>,
): TraitSchema {
    const traits = schema.traits.map((t) => {
        if (t.name !== traitName) {
            return { name: t.name, values: [...t.values], subtraits: t.subtraits ? t.subtraits.map((s) => ({ name: s.name, values: [...s.values] })) : undefined };
        }
        const buckets = bucketOrder
            .map((bn) => ({ name: bn, values: t.values.filter((v) => assign[v] === bn) }))
            .filter((b) => b.values.length > 0);
        return {
            name: t.name,
            values: [...t.values],
            subtraits: buckets.length ? buckets : undefined,
        };
    });
    return { traits };
}

/** Remove a whole trait from the schema (artist rejected a harvested trait). */
export function dropTrait(schema: TraitSchema, traitName: string): TraitSchema {
    return { traits: schema.traits.filter((t) => t.name !== traitName).map((t) => ({ name: t.name, values: [...t.values], subtraits: t.subtraits ? t.subtraits.map((s) => ({ name: s.name, values: [...s.values] })) : undefined })) };
}

/** Total distinct values across all traits — used for the summary line. */
export function totalValues(schema: TraitSchema | undefined): number {
    return (schema?.traits ?? []).reduce((n, t) => n + t.values.length, 0);
}

/**
 * The subtrait invariant, per trait: a trait that declares any bucket must place
 * EVERY value in exactly one bucket (types.ts). Returns the trait names that
 * declare buckets but still have unplaced values — a soft publish warning, since
 * traits (and therefore subtraits) are always optional.
 */
export function incompleteTraits(schema: TraitSchema | undefined): string[] {
    return (schema?.traits ?? [])
        .filter((t) => (t.subtraits?.length ?? 0) > 0 && unbucketedValues(t).length > 0)
        .map((t) => t.name);
}
