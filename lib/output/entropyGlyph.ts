/*
 * entropyGlyph — a deterministic 16×16 black/white identity barcode for an
 * Output, derived entirely from a hash of (slug, id). Pure + stable: the same
 * piece always yields the same glyph, and every piece gets a distinct one.
 *
 * Note: until the real on-chain generative hash is captured per Output, this
 * seeds from (slug, id) — so it's a stable identity glyph for the piece, not a
 * proof derived from the mint hash. Swap the seed source when that hash lands.
 */

const SIDE = 16;
export const ENTROPY_SIDE = SIDE;
export const ENTROPY_CELLS = SIDE * SIDE; // 256 bits

/* FNV-1a 32-bit — a tiny, fast, well-distributed string hash for the seed. */
function fnv1a(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/* mulberry32 — deterministic PRNG seeded from one 32-bit integer. */
function mulberry32(seed: number): () => number {
    let a = seed >>> 0;
    return () => {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/** A 256-cell boolean grid (row-major, 16×16) for the piece. true = filled. */
export function entropyGrid(slug: string, id: number): boolean[] {
    const rng = mulberry32(fnv1a(`${slug}:${id}`));
    const cells: boolean[] = new Array(ENTROPY_CELLS);
    for (let i = 0; i < ENTROPY_CELLS; i++) cells[i] = rng() < 0.5;
    return cells;
}
