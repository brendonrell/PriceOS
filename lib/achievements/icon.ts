/*
 * The canonical Achievements icon — the striped/barred circle ◍ (U+25CD) that
 * reads on every achievement tile. This is the SINGLE source of truth for the
 * "achievements" mark across the app (the overall icon, not just the tile
 * fallback). Anything that wants to wear the achievements icon imports this so
 * it stays in lock-step — e.g. the PriceRank Network filter pill inherits it,
 * and the achievement-unlock Ping falls back to it.
 *
 * Carries the VS-15 text-presentation selector (U+FE0E) so it renders as a
 * monochrome Courier glyph, never an emoji.
 */
export const ACHIEVEMENTS_ICON = '◍︎';
