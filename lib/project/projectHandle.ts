import { isReservedHandle } from '@/lib/reserved-handles';

/**
 * Project @name format spec (locked — Platform Nomenclature SoT, page
 * 2kyd6gx6-3274 → "Project naming policy"; cap raised 20 → 50 on
 * 2026-06-16 so creative titles aren't squeezed — the @name is the
 * derived handle, NOT the creative display title):
 *   - 3–50 chars
 *   - lowercase a-z, 0-9 ONLY (no '_' or '-' — projects are the stricter
 *     subset of the shared /@name pool; user handles allow '_'/'-', projects
 *     do not)
 *   - must contain at least one letter (pure-numeric names collide with the
 *     Output URL namespace `/{globalId}`)
 *   - not a reserved word (isReservedHandle, lib/reserved-handles.ts)
 *
 * Uniqueness is NOT checked here — projects share ONE /@name pool with
 * users.handle, so the claim path must verify the derived slug is free across
 * BOTH public.users.handle AND public.projects.handle (see
 * app/api/project-handle/check/route.ts). This function is format-only.
 *
 * The all-digit case is caught by isReservedHandle() too, but we re-check it
 * here so the validation reason is specific ('all_digits' rather than the
 * generic 'reserved'), matching lib/handle/validate.ts.
 */

export const PROJECT_HANDLE_MIN_LENGTH = 3;
export const PROJECT_HANDLE_MAX_LENGTH = 50;

/* Anchored regex enforcing the full format. Length window is baked in so a
   single .test() covers the structural rules. lowercase [a-z0-9] only — no
   '_'/'-', the deliberate divergence from the user-handle set. */
const PROJECT_HANDLE_FORMAT_RE = /^[a-z0-9]{3,50}$/;

export type ProjectHandleValidationReason =
    | 'too_short'
    | 'too_long'
    | 'invalid_chars'
    | 'all_digits'
    | 'no_letter'
    | 'reserved';

export interface ProjectHandleValidationResult {
    valid: boolean;
    reason: ProjectHandleValidationReason | null;
}

/**
 * Validate a project @name FORMAT only. Does not check uniqueness — that's a
 * DB lookup across the shared pool the caller performs separately.
 *
 * Caller is expected to have already normalised the input via
 * normaliseProjectHandle(); this function does not normalise.
 */
export function validateProjectHandleFormat(
    handle: string
): ProjectHandleValidationResult {
    if (handle.length < PROJECT_HANDLE_MIN_LENGTH) {
        return { valid: false, reason: 'too_short' };
    }
    if (handle.length > PROJECT_HANDLE_MAX_LENGTH) {
        return { valid: false, reason: 'too_long' };
    }

    if (!PROJECT_HANDLE_FORMAT_RE.test(handle)) {
        return { valid: false, reason: 'invalid_chars' };
    }

    /* All-digit handles collide with the /{globalId} token namespace.
       isReservedHandle() catches this too, but we surface a distinct reason
       so the UI can explain the conflict accurately. Checked before the
       has-letter rule so the more specific reason wins. */
    if (/^\d+$/.test(handle)) {
        return { valid: false, reason: 'all_digits' };
    }

    if (!/[a-z]/.test(handle)) {
        return { valid: false, reason: 'no_letter' };
    }

    if (isReservedHandle(handle)) {
        return { valid: false, reason: 'reserved' };
    }

    return { valid: true, reason: null };
}

/**
 * Normalise a project @name for storage and comparison. citext is
 * case-insensitive at the DB level, but we lowercase the stored value for
 * human consistency and predictability of non-citext joins / logs. Mirrors
 * normaliseHandle() in lib/handle/validate.ts.
 */
export function normaliseProjectHandle(raw: string): string {
    return raw.trim().toLowerCase();
}
