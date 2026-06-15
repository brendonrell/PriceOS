import type { ShowcaseStyle } from '../supabase';

/* Stable 50/50 split for unwritten artists — FNV-1a over the seed, then the
   parity of its set bits (popcount % 2). Plain low-bit parity skews on hex
   wallet strings; popcount-parity lands an even split (12/11 over the current
   roster). Deterministic, so each artist always falls the same side. */
function splitParity(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  let c = 0;
  while (h) { c += h & 1; h >>>= 1; }
  return c % 2;
}

/**
 * Resolve a stored `users.showcase_style` value into the effective style a
 * profile renders with.
 *
 * 'grid' is the legacy default that every row was created with (and still the
 * column default), so it — like null/unknown — means "the user never chose."
 * An explicit 'static' / 'generative' / 'artist' choice always wins.
 *
 * For an UNSET whitelisted artist the default would be the Artist showcase, but
 * during debugging we split unwritten artists 50/50 between Artist and
 * Generative (deterministic per `seed`, e.g. wallet address) so both modes are
 * reachable across the roster (Brendon 2026-06-15). Non-artists → static.
 */
export function effectiveShowcaseStyle(
  stored: string | null | undefined,
  isArtist: boolean,
  seed?: string,
): ShowcaseStyle {
  if (stored === 'generative') return 'generative';
  if (stored === 'artist') return 'artist';
  if (stored === 'static') return 'static';
  // 'grid' (legacy default) / null / unknown → unset.
  if (!isArtist) return 'static';
  // 50/50 artist vs generative, stable per wallet (falls back to artist).
  return seed ? (splitParity(seed) === 0 ? 'artist' : 'generative') : 'artist';
}
