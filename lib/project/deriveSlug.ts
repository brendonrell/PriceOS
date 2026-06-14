/**
 * Project slug derivation from display name.
 *
 * Pure function — display name → slug. The Artist picks the display
 * name; the slug (their `@name`) is auto-derived deterministically.
 * No Artist override on the slug per the locked policy: one display
 * name yields exactly one valid slug.
 *
 * Derivation (locked in Platform Nomenclature SoT, page 2kyd6gx6-3274
 * → "Project naming policy"):
 *   1. Lowercase
 *   2. Strip spaces (concatenate — no hyphens, no underscores)
 *
 * Examples:
 *   "Chromie Squiggle" → "chromiesquiggle"
 *   "Project 333"      → "project333"
 *   "0xLandscapes"     → "0xlandscapes"
 *
 * The resulting slug must satisfy `^[a-z0-9]{3,20}$` + has-letter,
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
  return displayName.toLowerCase().replace(/ /g, '');
}
