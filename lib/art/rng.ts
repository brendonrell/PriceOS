/*
 * Deterministic RNG primitives shared by the per-Project art engines.
 *
 * Every Output's Artwork is a pure function of its tokenId, so the same
 * Output always renders identically (fxhash model — the seed is frozen at
 * mint). Engines call `seededRng(tokenId)` to get a mulberry32 stream and
 * draw from it in a fixed order; changing draw order changes every Artwork,
 * so order is part of each engine's frozen contract.
 */

/** mulberry32 — small, fast, well-distributed 32-bit PRNG. */
export function mulberry32(a: number): () => number {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Knuth multiplicative hash — decorrelates consecutive tokenIds (1,2,3…)
   so neighbouring Outputs don't share a near-identical first draw. */
export function seedFromToken(tokenId: number): number {
  return (Math.imul(tokenId >>> 0, 2654435761) >>> 0) || 1;
}

/** mulberry32 stream seeded from a tokenId. */
export function seededRng(tokenId: number): () => number {
  return mulberry32(seedFromToken(tokenId));
}

/** Pick one element uniformly from a non-empty array. */
export function pick<T>(arr: readonly T[], r: () => number): T {
  return arr[Math.floor(r() * arr.length)];
}

/* FNV-1a 32-bit string hash → seed. Lets us seed an RNG from a stable string
   key like `${slug}:${tokenId}` (used for platform traits that must be stable
   per Output across the whole platform, independent of any one art engine). */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
