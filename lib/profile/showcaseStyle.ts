import type { ShowcaseStyle } from '../supabase';

/**
 * Resolve a stored `users.showcase_style` value into the effective style a
 * profile renders with.
 *
 * 'grid' is the legacy default that every row was created with (and still the
 * column default), so it — like null/unknown — means "the user never chose."
 * An explicit 'static' / 'generative' / 'artist' choice always wins.
 *
 * Every UNSET whitelisted artist now defaults to the Artist showcase (the
 * Created carousels, like @opus4-8) — the old 50/50 debug split that left only
 * half the roster on Created is gone (Brendon 2026-06-19). Non-artists → static.
 */
export function effectiveShowcaseStyle(
  stored: string | null | undefined,
  isArtist: boolean,
  _seed?: string,
): ShowcaseStyle {
  if (stored === 'generative') return 'generative';
  if (stored === 'artist') return 'artist';
  if (stored === 'static') return 'static';
  // 'grid' (legacy default) / null / unknown → unset.
  if (!isArtist) return 'static';
  // Unset whitelisted artist → the Artist (Created) showcase.
  return 'artist';
}
