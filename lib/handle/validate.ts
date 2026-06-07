import { isReservedHandle } from '@/lib/reserved-handles';

/**
 * Handle format spec (locked):
 *   - 3–20 chars
 *   - lowercase a-z, 0-9, '_' and '-'
 *   - must start with a letter or digit (no leading '_' or '-')
 *   - case-insensitive uniqueness enforced at the DB by the citext
 *     UNIQUE constraint on public.users.handle
 *
 * Reserved list (T1/T2/T3) and the all-digit '/{globalId}' namespace
 * carve-out are handled by isReservedHandle() in lib/reserved-handles.ts.
 * We re-check the all-digit case here so the validation reason can be
 * specific ('all_digits' rather than the more generic 'reserved').
 */

export const HANDLE_MIN_LENGTH = 3;
export const HANDLE_MAX_LENGTH = 20;

/* Anchored regex enforcing format. Length window is baked in so a
   single .test() covers the structural rules; the start-character
   constraint is checked separately above so its error reason is
   distinct from the omnibus 'invalid_chars' case. */
const HANDLE_FORMAT_RE = /^[a-z0-9][a-z0-9_-]{2,19}$/;

export type HandleValidationReason =
    | 'too_short'
    | 'too_long'
    | 'invalid_start'
    | 'invalid_chars'
    | 'all_digits'
    | 'reserved';

export interface HandleValidationResult {
    valid: boolean;
    reason: HandleValidationReason | null;
}

/**
 * Validate handle FORMAT only. Does not check uniqueness — that's a
 * DB lookup the caller performs separately.
 *
 * Caller is expected to have already normalised the input via
 * normaliseHandle(); this function does not normalise.
 */
export function validateHandleFormat(handle: string): HandleValidationResult {
    if (handle.length < HANDLE_MIN_LENGTH) {
        return { valid: false, reason: 'too_short' };
    }
    if (handle.length > HANDLE_MAX_LENGTH) {
        return { valid: false, reason: 'too_long' };
    }

    /* Start-character constraint checked first so 'invalid_start'
       beats 'invalid_chars' when both would fire. */
    if (!/^[a-z0-9]/.test(handle)) {
        return { valid: false, reason: 'invalid_start' };
    }

    if (!HANDLE_FORMAT_RE.test(handle)) {
        return { valid: false, reason: 'invalid_chars' };
    }

    /* All-digit handles collide with the /{globalId} token namespace.
       isReservedHandle() catches this too, but we surface a distinct
       reason so the UI can explain the conflict accurately. */
    if (/^\d+$/.test(handle)) {
        return { valid: false, reason: 'all_digits' };
    }

    if (isReservedHandle(handle)) {
        return { valid: false, reason: 'reserved' };
    }

    return { valid: true, reason: null };
}

/**
 * Normalise a handle for storage and comparison. citext is
 * case-insensitive at the DB level, but we lowercase the stored value
 * for human consistency and predictability of non-citext joins / logs.
 */
export function normaliseHandle(raw: string): string {
    return raw.trim().toLowerCase();
}
