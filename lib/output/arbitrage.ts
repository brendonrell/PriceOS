/*
 * Arbitrage Map ⇄ — trait-bucket listing averages (the Spell Book spell).
 *
 * A listed Output is "under the map" when its ask sits BELOW the average
 * listing price of its trait bucket. The bucket is the piece's PRIMARY
 * artist trait value (Palette = "Aurora" etc. — the same axis the rarity
 * engine leads with); engines that define no artist traits bucket by the
 * platform Fate word instead, so every project resolves a bucket.
 *
 * Everything is computed from the REAL listings already in ProjectContext
 * (DB list_price_eth via the /outputs reconcile) — no mock values. The
 * tally is cached per outputs-Map reference (WeakMap), so it runs once per
 * reconcile, not once per card.
 */

import type { OutputMeta } from '../state/ProjectContext';
import { primaryTrait } from './rarity';
import { readOutputFate } from '../project/fate';

export interface ArbRead {
    /** Percent below the bucket's average ask, > 0 (e.g. 38.2). */
    pctBelow: number;
    /** The bucket's average listing price, ETH. */
    avgEth: number;
    /** Listings in the bucket (including this one). */
    listings: number;
}

/** The piece's trait bucket — primary artist trait value, Fate fallback. */
function bucketOf(slug: string, id: number): string {
    const pt = primaryTrait(slug, id);
    if (pt) return `${pt.name}:${pt.value}`;
    return `fate:${readOutputFate(slug, id).fate}`;
}

interface BucketStat {
    sum: number;
    n: number;
}

/* One tally per outputs snapshot. The reconcile builds a NEW Map on every
   refresh, so keying the cache on the Map reference is exactly "recompute
   when listings change". */
const cache = new WeakMap<ReadonlyMap<number, OutputMeta>, Map<string, BucketStat>>();

function tally(
    outputs: ReadonlyMap<number, OutputMeta>,
    slug: string,
): Map<string, BucketStat> {
    const hit = cache.get(outputs);
    if (hit) return hit;
    const stats = new Map<string, BucketStat>();
    for (const [id, meta] of outputs) {
        if (meta.price == null) continue;
        const eth = parseFloat(meta.price);
        if (!Number.isFinite(eth) || eth <= 0) continue;
        const bucket = bucketOf(slug, id);
        const s = stats.get(bucket);
        if (s) {
            s.sum += eth;
            s.n += 1;
        } else {
            stats.set(bucket, { sum: eth, n: 1 });
        }
    }
    cache.set(outputs, stats);
    return stats;
}

/**
 * The Arbitrage Map read for one listed Output — null when the piece is
 * unlisted, is its bucket's only listing, or sits at/above the average.
 */
export function arbitrageRead(
    outputs: ReadonlyMap<number, OutputMeta>,
    slug: string,
    id: number,
): ArbRead | null {
    const meta = outputs.get(id);
    if (!meta || meta.price == null) return null;
    const eth = parseFloat(meta.price);
    if (!Number.isFinite(eth) || eth <= 0) return null;
    const s = tally(outputs, slug).get(bucketOf(slug, id));
    /* A lone listing IS its own average — never a spread. */
    if (!s || s.n < 2) return null;
    const avg = s.sum / s.n;
    if (eth >= avg) return null;
    return {
        pctBelow: (1 - eth / avg) * 100,
        avgEth: avg,
        listings: s.n,
    };
}
