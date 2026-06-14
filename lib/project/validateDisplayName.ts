/**
 * Project display name validator.
 *
 * Project naming follows a two-field model: the Artist picks a display
 * name and the slug (their `@name`) is auto-derived. This file owns
 * the display name rules; deriveSlug.ts owns the derivation.
 *
 * Display name rules (locked in Platform Nomenclature SoT, page
 * 2kyd6gx6-3274 → "Project naming policy"):
 *   - ASCII letters + digits + single internal spaces only
 *   - Must contain at least one letter (pure-numeric names collide
 *     with the Output URL namespace `/{globalId}`)
 *   - No leading, trailing, or consecutive spaces
 *   - 3–20 chars total (including spaces). The 3-char floor matches the
 *     shared /@name pool minimum: a 2-char display name could derive a
 *     sub-3 slug, which the project @name pool rejects (see
 *     lib/project/projectHandle.ts PROJECT_HANDLE_MIN_LENGTH).
 *
 * Used by the future Upload UI to reject bad names at the form
 * stage. Slug derivation (lowercase + strip spaces) is in
 * lib/project/deriveSlug.ts.
 *
 * No UI integration this sweep — Upload page doesn't exist yet.
 * Utility is planted so the Upload workstream consumes it directly
 * when it lands.
 */

export type DisplayNameReason =
  | 'too_short'
  | 'too_long'
  | 'invalid_chars'
  | 'leading_space'
  | 'trailing_space'
  | 'consecutive_spaces'
  | 'no_letter';

export type DisplayNameValidation =
  | { valid: true }
  | { valid: false; reason: DisplayNameReason };

const MIN_LENGTH = 3;
const MAX_LENGTH = 20;

/* ASCII letters + digits + spaces only. The single-internal-space
   rule is enforced separately so the failure surfaces with a clearer
   reason than a generic regex miss. */
const ALLOWED_CHARS = /^[A-Za-z0-9 ]+$/;
const HAS_LETTER = /[A-Za-z]/;

/**
 * Validate a project display name against the locked rules. Returns
 * a discriminated union so the caller can map reasons to UI copy.
 */
export function validateDisplayName(name: string): DisplayNameValidation {
  if (name.length < MIN_LENGTH) {
    return { valid: false, reason: 'too_short' };
  }
  if (name.length > MAX_LENGTH) {
    return { valid: false, reason: 'too_long' };
  }
  if (!ALLOWED_CHARS.test(name)) {
    return { valid: false, reason: 'invalid_chars' };
  }
  if (name.startsWith(' ')) {
    return { valid: false, reason: 'leading_space' };
  }
  if (name.endsWith(' ')) {
    return { valid: false, reason: 'trailing_space' };
  }
  if (name.includes('  ')) {
    return { valid: false, reason: 'consecutive_spaces' };
  }
  if (!HAS_LETTER.test(name)) {
    return { valid: false, reason: 'no_letter' };
  }
  return { valid: true };
}
