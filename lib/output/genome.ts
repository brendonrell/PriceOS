/*
 * The Genome — an Output's position in its Project's real PARAMETER SPACE, and
 * the Isolation Score derived from it. Every Output's artist traits, Fate and
 * (on palette engines) dominant colour are DETERMINISTIC from (slug, tokenId),
 * so the whole edition set has a true, provable coordinate — no indexer, no
 * render, no fabricated numbers.
 *
 * HONEST BY CONSTRUCTION
 *   • The feature vector is a one-hot of a token's ACTUAL trait/Fate/colour
 *     values (lib/project/registry traitsOf + lib/project/fate + palette math).
 *     Two Outputs are "near" iff they genuinely share values; "far" iff their
 *     real combinations differ. Nothing here is hashed noise dressed as a read.
 *   • ISOLATION is the mean distance to a token's nearest neighbours in that
 *     true high-dimensional space — a real measure of how unusual its actual
 *     combination is across the edition set. The score you see is computed on
 *     the true vectors, never on the 2-D picture.
 *   • The 2-D coordinate is a fixed deterministic random projection of the same
 *     real vector (Johnson–Lindenstrauss): a faithful flattening for the eye,
 *     seeded per-project so it's identical for everyone. It positions; it never
 *     scores.
 *
 * Cost: one O(n²) neighbour pass over the edition set (supplies cap in the
 * hundreds→low thousands), memoised per project. Calc-only, never a canvas.
 */

import { getProject } from '../project/registry';
import { readOutputFate } from '../project/fate';
import { FATE_VALUES } from '../project/fate';
import { outputColorBucket, COLOR_BUCKET_ORDER } from '../art/outputColor';

export interface GenomePoint {
    /** Token id. */
    id: number;
    /** Plot coordinate, 0..1 across the edition set (a projection, not a score). */
    x: number;
    y: number;
    /** Spatial isolation, 0..1 — 1 = the loneliest piece in the edition set. */
    isolation: number;
    /** 1 = most isolated of all editions; ties share a rank. */
    isolationRank: number;
    /** Editions sharing this token's EXACT full combination (incl. itself). */
    twins: number;
}

export interface Genome {
    slug: string;
    /** Editions plotted (the whole set, 1..supply). */
    total: number;
    /** Feature dimensions (Σ value-pool sizes across the real axes). */
    dims: number;
    /** Named axes that built the space, for honest UI labelling. */
    axes: string[];
    points: GenomePoint[];
    byId: Map<number, GenomePoint>;
    /** Per-token active-column vectors (id−1 indexed) — the real one-hot the
     *  distances run on. Retained so Kin queries need no recompute. */
    vectors: Int32Array[];
    /** Axis count (columns compared per distance). */
    axesCount: number;
}

/* ── deterministic PRNG (shared shape with entropyGlyph) ─────────────────── */

function fnv1a(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
/** Standard-normal sample (Box–Muller) from a uniform PRNG — for the projection
 *  matrix, so distances are preserved in expectation. */
function gauss(rng: () => number): number {
    let u = 0, v = 0;
    while (u === 0) u = rng();
    while (v === 0) v = rng();
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/* ── the real axes of a Project's parameter space ────────────────────────── */

interface Axis {
    name: string;
    /** value → slot index within this axis's one-hot block. */
    slot: Map<string, number>;
    /** slot count (value-pool size). */
    size: number;
    /** the token's value for this axis, by id (filled during the build). */
}

/** Assemble the axes: every artist trait (its full value pool), the platform
 *  Fate, and — on palette engines only — the dominant-colour bucket. Value
 *  pools come from the schema so every possible value has a stable slot even if
 *  no minted token uses it (keeps the space honest across the whole set). */
function buildAxes(slug: string): Axis[] {
    const project = getProject(slug);
    if (!project) return [];
    const axes: Axis[] = [];

    for (const t of project.traitSchema.traits) {
        const slot = new Map<string, number>();
        t.values.forEach((v, i) => slot.set(v, i));
        axes.push({ name: t.name, slot, size: t.values.length });
    }

    // Platform Fate — present on every Output of every Project.
    {
        const slot = new Map<string, number>();
        FATE_VALUES.forEach((v, i) => slot.set(v, i));
        axes.push({ name: 'Fate', slot, size: FATE_VALUES.length });
    }

    // Dominant colour — only where the engine derives it from palette math
    // (Prisms today). Probed on token #1; skipped when the engine has none, so
    // we never invent a colour axis we can't fill accurately.
    if (outputColorBucket(slug, 1) != null) {
        const slot = new Map<string, number>();
        COLOR_BUCKET_ORDER.forEach((v, i) => slot.set(v, i));
        axes.push({ name: 'Colour', slot, size: COLOR_BUCKET_ORDER.length });
    }

    return axes;
}

/* ── the build ───────────────────────────────────────────────────────────── */

const cache = new Map<string, Genome | null>();

function compute(slug: string): Genome | null {
    const project = getProject(slug);
    if (!project) return null;
    const total = project.outputs;
    if (!total || total <= 0) return null;

    const axes = buildAxes(slug);
    if (axes.length === 0) return null;

    // Column offsets so each axis owns a contiguous one-hot block. Each block
    // reserves ONE extra slot past its values — the "absent value" sentinel —
    // so a null read lands on its own column and can't collide with the next
    // axis's real columns.
    const offset: number[] = [];
    let dims = 0;
    for (const a of axes) { offset.push(dims); dims += a.size + 1; }

    // Build every edition's one-hot vector from its REAL values. We store the
    // active column per axis (sparse) — the vectors are one-hot so a token is
    // fully described by which slot is lit in each block.
    const cols: Int32Array[] = new Array(total); // per token: active global col per axis
    const key: string[] = new Array(total);      // exact-combination key (for twins)
    for (let id = 1; id <= total; id++) {
        const tv = project.traitsOf(id);
        const active = new Int32Array(axes.length);
        const parts: string[] = [];
        for (let ai = 0; ai < axes.length; ai++) {
            const a = axes[ai];
            let value: string | null;
            if (a.name === 'Fate') value = readOutputFate(slug, id).fate;
            else if (a.name === 'Colour') value = outputColorBucket(slug, id);
            else value = tv[a.name] ?? null;
            const s = value != null ? a.slot.get(value) : undefined;
            // Unknown/absent value → a sentinel column past the block, so two
            // tokens that both lack a value still match on it (both sentinel).
            const col = s != null ? offset[ai] + s : offset[ai] + a.size;
            active[ai] = col;
            parts.push(value ?? '∅');
        }
        cols[id - 1] = active;
        key[id - 1] = parts.join('|');
    }

    // Exact-combination twins (editions that share the entire real combination).
    const twinCount = new Map<string, number>();
    for (const k of key) twinCount.set(k, (twinCount.get(k) ?? 0) + 1);

    // Squared distance between two one-hot vectors = 2 × (axes that differ),
    // since each axis contributes 0 (same lit column) or 2 (two distinct lit
    // columns). We compare active columns directly — O(axes), no dense vectors.
    const A = axes.length;
    const diffCount = (i: number, j: number): number => {
        const ci = cols[i], cj = cols[j];
        let d = 0;
        for (let a = 0; a < A; a++) if (ci[a] !== cj[a]) d++;
        return d;
    };

    // Isolation = mean distance to the K nearest neighbours in the true space.
    // K scales gently with supply so it's stable on both small and large sets.
    const K = Math.max(1, Math.min(8, Math.floor(Math.sqrt(total) / 2)));
    const raw = new Float64Array(total);
    for (let i = 0; i < total; i++) {
        // Track the K smallest distances to other editions.
        const best: number[] = [];
        for (let j = 0; j < total; j++) {
            if (j === i) continue;
            const d = diffCount(i, j);
            if (best.length < K) {
                best.push(d);
                if (best.length === K) best.sort((p, q) => p - q);
            } else if (d < best[K - 1]) {
                // insert d into the sorted K-list
                let p = K - 1;
                while (p > 0 && best[p - 1] > d) { best[p] = best[p - 1]; p--; }
                best[p] = d;
            }
        }
        let sum = 0;
        for (const d of best) sum += d;
        raw[i] = best.length ? sum / best.length : 0;
    }

    // Normalise isolation to 0..1 across the set, and rank (1 = most isolated).
    let lo = Infinity, hi = -Infinity;
    for (const v of raw) { if (v < lo) lo = v; if (v > hi) hi = v; }
    const span = hi - lo || 1;

    // Fixed deterministic projection of the one-hot vectors → 2-D. Seeded per
    // project so the map is identical for everyone. Two Gaussian projection
    // vectors, one per plot axis; the token's projection is the sum of the two
    // matrix rows at its lit columns.
    const rng = mulberry32(fnv1a(`genome:${slug}`));
    const px = new Float64Array(dims); // sentinel slots already included in dims
    const py = new Float64Array(dims);
    for (let c = 0; c < dims; c++) { px[c] = gauss(rng); py[c] = gauss(rng); }

    const rx = new Float64Array(total);
    const ry = new Float64Array(total);
    for (let i = 0; i < total; i++) {
        const ci = cols[i];
        let sx = 0, sy = 0;
        for (let a = 0; a < A; a++) { sx += px[ci[a]]; sy += py[ci[a]]; }
        rx[i] = sx; ry[i] = sy;
    }
    // Normalise plot coords to 0..1.
    const norm = (arr: Float64Array): Float64Array => {
        let mn = Infinity, mx = -Infinity;
        for (const v of arr) { if (v < mn) mn = v; if (v > mx) mx = v; }
        const s = mx - mn || 1;
        const out = new Float64Array(arr.length);
        for (let i = 0; i < arr.length; i++) out[i] = (arr[i] - mn) / s;
        return out;
    };
    const nx = norm(rx), ny = norm(ry);

    // Rank by isolation, descending (1 = most isolated). Ties share a rank.
    const order = Array.from({ length: total }, (_, i) => i)
        .sort((a, b) => raw[b] - raw[a]);
    const rank = new Int32Array(total);
    for (let r = 0; r < order.length; r++) {
        const i = order[r];
        rank[i] = r > 0 && raw[order[r - 1]] === raw[i] ? rank[order[r - 1]] : r + 1;
    }

    const points: GenomePoint[] = new Array(total);
    const byId = new Map<number, GenomePoint>();
    for (let i = 0; i < total; i++) {
        const p: GenomePoint = {
            id: i + 1,
            x: nx[i],
            y: ny[i],
            isolation: (raw[i] - lo) / span,
            isolationRank: rank[i],
            twins: twinCount.get(key[i]) ?? 1,
        };
        points[i] = p;
        byId.set(p.id, p);
    }

    // Report the count of real value-slots (sentinels excluded) for honest UI.
    const realDims = axes.reduce((s, a) => s + a.size, 0);
    return {
        slug, total, dims: realDims, axes: axes.map((a) => a.name), points, byId,
        vectors: cols, axesCount: A,
    };
}

/** The memoised Genome for a project, or null when it has no derivable space. */
export function getGenome(slug: string): Genome | null {
    const key = slug.toLowerCase();
    if (!cache.has(key)) cache.set(key, compute(key));
    return cache.get(key) ?? null;
}

export interface OutputIsolation {
    /** 0..100 — how spatially alone this piece is across its edition set. */
    score: number;
    /** 1 = most isolated of all editions. */
    rank: number;
    /** Editions total. */
    total: number;
    /** Editions sharing this piece's EXACT full combination (incl. itself). */
    twins: number;
    /** True when no other edition shares its exact combination. */
    oneOfOne: boolean;
}

export interface KinResult {
    /** The k most-similar OTHER editions, nearest first. */
    kin: { id: number; distance: number; shared: number }[];
    /** The single most-DISSIMILAR edition — the polar opposite. */
    opposite: { id: number; distance: number } | null;
    /** Axis count = the max possible distance (for a "shares X of N" read). */
    axes: number;
}

/**
 * An Output's KIN — its nearest neighbours in the real parameter space (the
 * pieces most like it) plus its polar opposite. Distance = axes on which the
 * two differ; `shared` = axes they agree on. `withinMax` restricts candidates
 * to real (minted) editions so every kin is an openable piece.
 */
export function nearestKin(slug: string, id: number, k = 4, withinMax?: number): KinResult | null {
    const g = getGenome(slug);
    const self = g?.vectors[id - 1];
    if (!g || !self) return null;
    const A = g.axesCount;
    const max = withinMax != null ? Math.min(withinMax, g.total) : g.total;
    const all: { id: number; d: number }[] = [];
    for (let j = 1; j <= max; j++) {
        if (j === id) continue;
        const v = g.vectors[j - 1];
        if (!v) continue;
        let d = 0;
        for (let a = 0; a < A; a++) if (self[a] !== v[a]) d++;
        all.push({ id: j, d });
    }
    if (all.length === 0) return null;
    all.sort((p, q) => (p.d - q.d) || (p.id - q.id));
    const kin = all.slice(0, k).map((e) => ({ id: e.id, distance: e.d, shared: A - e.d }));
    let opp = all[all.length - 1];
    for (const e of all) if (e.d > opp.d || (e.d === opp.d && e.id < opp.id)) opp = e;
    return { kin, opposite: { id: opp.id, distance: opp.d }, axes: A };
}

/** One Output's Isolation read, or null when the project has no genome. */
export function outputIsolation(slug: string, id: number): OutputIsolation | null {
    const g = getGenome(slug);
    const p = g?.byId.get(id);
    if (!g || !p) return null;
    return {
        score: Math.max(1, Math.round(p.isolation * 100)),
        rank: p.isolationRank,
        total: g.total,
        twins: p.twins,
        oneOfOne: p.twins === 1,
    };
}
