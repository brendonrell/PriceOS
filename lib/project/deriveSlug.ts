/**
 * Project slug derivation from display name.
 *
 * Pure function — display name → slug. The Artist picks the display
 * name; the slug (their `@name`) is auto-derived deterministically.
 * No Artist override on the slug per the locked policy: one display
 * name yields exactly one valid slug.
 *
 * Derivation (locked in Platform Nomenclature SoT, page 2kyd6gx6-3274
 * → "Project naming policy"; ampersand + punctuation rules added
 * 2026-06-16):
 *   1. Lowercase
 *   2. "&" → "and"  (e.g. "Warp & Weft" → "warpandweft")
 *   3. Drop every other non-alphanumeric char (spaces, apostrophes,
 *      commas, hyphens, periods)
 *
 * The Upload form gates what the artist may type (allowlist: letters,
 * numbers, spaces, and & ' , - . — everything else is REJECTED, never
 * silently dropped) and shows a live @name preview of this output so a
 * too-long or surprising handle is caught before submit.
 *
 * Examples:
 *   "Chromie Squiggle"  → "chromiesquiggle"
 *   "Warp & Weft"       → "warpandweft"
 *   "Nobody's Swimming" → "nobodysswimming"
 *   "Project 333"       → "project333"
 *
 * The resulting slug must satisfy `^[a-z0-9]{3,50}$` + has-letter,
 * which is guaranteed by validateDisplayName.ts (lib/project/
 * validateDisplayName.ts) accepting the same shape (3-char floor =
 * the shared /@name pool minimum). The final format gate is
 * validateProjectHandleFormat() in lib/project/projectHandle.ts.
 *
 * No UI integration this sweep — Upload page doesn't exist yet.
 * Utility is planted so the Upload workstream consumes it directly
 * when it lands.
 */

/**
 * Derive a project slug from a validated display name. Caller is
 * responsible for running validateDisplayName() first — this
 * function is pure and does not validate the input.
 */
export function deriveSlug(displayName: string): string {
  return displayName
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '');
}
