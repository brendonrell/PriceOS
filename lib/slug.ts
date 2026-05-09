/**
 * Slug resolver for the [slug] dynamic route family.
 *
 * The PriceOS root namespace is shared by:
 *   /{number}    → Output (global PD ID, fxhash model)
 *   /{handle}    → Profile
 *   /@{handle}   → Profile (alias; both URLs render the same page)
 *
 * Sub-routes under [slug] (collection, anointed, wishlist, starred,
 * notes, albums, albums/[albumSlug]) only render for profiles —
 * a numeric or invalid slug at any of those returns notFound().
 *
 * Lowercase canonical, case preserved on display: `/Brendon` and
 * `/brendon` both render the same page; canonical link tag and the
 * user record's display name handle the case-preservation side.
 *
 * See: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554
 */

import { isReservedHandle } from './reserved-handles';

export type Resolved =
  | { kind: 'output'; globalId: number }
  | { kind: 'profile'; handle: string }
  | { kind: 'invalid' };

/**
 * Resolve a [slug] path segment. Strips a leading `@` (the
 * `/@brendon` alias). Lowercases the handle. Rejects reserved
 * handles, malformed handles, leading-zero numerics, and
 * non-positive integers.
 */
export function resolveSlug(slug: string): Resolved {
  if (!slug || slug.length === 0) {
    return { kind: 'invalid' };
  }

  // Numeric → Output (global PD ID)
  if (/^\d+$/.test(slug)) {
    const globalId = Number(slug);
    if (!Number.isFinite(globalId) || globalId < 1) {
      return { kind: 'invalid' };
    }
    // Reject leading zeros — `/01` is not canonical `/1`
    if (String(globalId) !== slug) {
      return { kind: 'invalid' };
    }
    return { kind: 'output', globalId };
  }

  // Strip leading @ (alias form: /@brendon)
  const stripped = slug.startsWith('@') ? slug.slice(1) : slug;
  const handle = stripped.toLowerCase();

  // Validate handle shape: ASCII alphanumerics, underscore, hyphen
  if (!/^[a-z0-9_-]+$/.test(handle)) {
    return { kind: 'invalid' };
  }

  // Reserved (T1/T2/T3) handles never resolve to a profile
  if (isReservedHandle(handle)) {
    return { kind: 'invalid' };
  }

  return { kind: 'profile', handle };
}

/**
 * Narrow helper for sub-route pages that only render for profiles.
 * Returns the lowercased handle on success, null otherwise.
 */
export function resolveProfileHandle(slug: string): string | null {
  const r = resolveSlug(slug);
  return r.kind === 'profile' ? r.handle : null;
}
