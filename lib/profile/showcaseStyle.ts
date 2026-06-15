import type { ShowcaseStyle } from '../supabase';

/**
 * Resolve a stored `users.showcase_style` value into the effective style a
 * profile renders with.
 *
 * 'grid' is the legacy default that every row was created with (and still the
 * column default), so it — like null/unknown — means "the user never chose."
 * For that unset case a whitelisted artist defaults to the Artist showcase (the
 * now-minting view of their own projects); everyone else defaults to static.
 * An explicit 'static' / 'generative' / 'artist' choice always wins, so an
 * artist who picks the traditional Top-6 keeps it.
 */
export function effectiveShowcaseStyle(
  stored: string | null | undefined,
  isArtist: boolean,
): ShowcaseStyle {
  if (stored === 'generative') return 'generative';
  if (stored === 'artist') return 'artist';
  if (stored === 'static') return 'static';
  // 'grid' (legacy default) / null / unknown → unset.
  return isArtist ? 'artist' : 'static';
}
