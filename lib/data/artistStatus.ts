/*
 * artistStatus
 *
 * F60 (BUG-31) — Artist active/cooldown indicator helper.
 *
 * Sim 7404-7407 renders one of two glyphs next to a known artist's
 * handle:
 *
 *   ☽  in cooldown   (60-day post-mint cooldown — core PD spec)
 *   ☼  active        (mintable now)
 *
 * Sim seeds these statically per handle (snowfro=SUN, XCOPY=MOON,
 * siggi=SUN, CCDDBB=MOON, etc.). The repo had no cooldown source of
 * truth and rendered ✺ at every call site as a placeholder. v0 keeps
 * the same static seed as the sim mock — the on-chain cooldown read
 * lands when the indexer wires up.
 *
 * Fallback: any unknown handle returns ✺ so unseeded mock data still
 * renders something visible (rather than empty).
 */

const VS15 = '\uFE0E';

/* Sim 7407: "XCOPY, CCDDBB — in cooldown".
   Sim 7406 + 7408: snowfro + siggi → SUN (active).
   Hero artist on the strata page (@claude) → SUN (whitelisted, active). */
const COOLDOWN: ReadonlySet<string> = new Set([
    '@XCOPY',
    '@CCDDBB',
]);

const ACTIVE: ReadonlySet<string> = new Set([
    '@snowfro',
    '@siggi',
    '@claude',
]);

export type ArtistGlyph = '☽' | '☼' | '✺';

/**
 * Returns the indicator glyph for a given artist handle.
 *
 *   ☽  if the artist is in their post-mint cooldown
 *   ☼  if the artist is mintable now
 *   ✺  fallback (unknown handle / no signal)
 *
 * Caller should render with VS15 selector for cross-platform text glyph
 * presentation — see `artistGlyphVS15` for the pre-suffixed string.
 */
export function artistGlyph(handle: string | undefined | null): ArtistGlyph {
    if (!handle) return '✺';
    if (COOLDOWN.has(handle)) return '☽';
    if (ACTIVE.has(handle))   return '☼';
    return '✺';
}

/**
 * Same as `artistGlyph` but with the VS-15 selector appended so the
 * glyph renders as text on iOS / Android (not coloured emoji).
 */
export function artistGlyphVS15(handle: string | undefined | null): string {
    return artistGlyph(handle) + VS15;
}

/**
 * Title attribute for the indicator span. Mirrors sim 7404-7405:
 * "In cooldown" / "Active" / "Artist".
 */
export function artistGlyphTitle(handle: string | undefined | null): string {
    const g = artistGlyph(handle);
    if (g === '☽') return 'In cooldown';
    if (g === '☼') return 'Active';
    return 'Artist';
}
