/**
 * Slug resolver for the [slug] dynamic route family.
 *
 * The PriceOS root namespace is shared by:
 *   /{number}    → Output (global PD ID, fxhash model)
 *   /{handle}    → Profile (canonical)
 *   /@{handle}   → 301 → /{handle} (alias; @ is the alternative form)
 *   /@{project}  → 301 → /art/{project} (T4 project slug match)
 *
 * Sub-routes under [slug] (collected, anointed, wishlist, starred,
 * notes, albums, albums/[albumSlug]) only render for profiles —
 * a numeric, project, or invalid slug at any of those returns notFound().
 *
 * Lowercase canonical, case preserved on display: `/Brendon` and
 * `/brendon` both render the same page; canonical link tag and the
 * user record's display name handle the case-preservation side.
 *
 * T4 (deployed project slugs) is enforced here. Bare `/prisms` currently
 * 404s — the project-name-at-root 301 is deferred. `/@prisms` 301s to
 * `/art/prisms` per the @-prefix rule. The static PROJECT_SLUGS set is
 * the indexer-stand-in until the live join over the projects table lands.
 *
 * See: ClickUp doc 2kyd6gx6-994, page 2kyd6gx6-2554 (URL Architecture),
 *      page 2kyd6gx6-3274 (Platform Nomenclature SoT).
 */

import { isReservedHandle } from './reserved-handles';

export type Resolved =
  | { kind: 'output'; globalId: number }
  | { kind: 'profile'; handle: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'invalid' };

/* T4 — deployed project slugs. Static stand-in until the indexer
   wires a live join over the projects table (Phase 5+). Every
   project that exists on PD must appear here so the bare-slug
   T4 reservation + the @-prefix → /art/{slug} 301 both fire. */
const PROJECT_SLUGS: ReadonlySet<string> = new Set([
  'prisms',
]);

/* Shared parser. Both resolveSlug and resolveProfileHandle build on
   this so the validation rules stay in one place. */
type Parsed =
  | { kind: 'output'; globalId: number }
  | { kind: 'handle'; handle: string; wasAtPrefixed: boolean; isProject: boolean }
  | { kind: 'invalid' };

function parseSlug(slug: string): Parsed {
  if (!slug || slug.length === 0) {
    return { kind: 'invalid' };
  }

  // Numeric → Output (global PD ID).
  if (/^\d+$/.test(slug)) {
    const globalId = Number(slug);
    if (!Number.isFinite(globalId) || globalId < 1) {
      return { kind: 'invalid' };
    }
    // Reject leading zeros — `/01` is not canonical `/1`.
    if (String(globalId) !== slug) {
      return { kind: 'invalid' };
    }
    return { kind: 'output', globalId };
  }

  // Strip leading @ (alias form: /@brendon, /@prisms).
  const wasAtPrefixed = slug.startsWith('@');
  const stripped = wasAtPrefixed ? slug.slice(1) : slug;
  const handle = stripped.toLowerCase();

  // Validate handle shape: ASCII alphanumerics, underscore, hyphen.
  if (!/^[a-z0-9_-]+$/.test(handle)) {
    return { kind: 'invalid' };
  }

  // Reserved (T1/T2/T3) handles never resolve.
  if (isReservedHandle(handle)) {
    return { kind: 'invalid' };
  }

  const isProject = PROJECT_SLUGS.has(handle);
  return { kind: 'handle', handle, wasAtPrefixed, isProject };
}

/**
 * Resolve a [slug] path segment. Strips a leading `@` and applies
 * the @-prefix 301 rule (always forward to the canonical entity URL).
 * Lowercases the handle. Rejects reserved handles, malformed handles,
 * leading-zero numerics, and non-positive integers.
 */
export function resolveSlug(slug: string): Resolved {
  const p = parseSlug(slug);
  if (p.kind === 'invalid') return { kind: 'invalid' };
  if (p.kind === 'output') return p;

  // @-prefix always 301s to canonical form.
  if (p.wasAtPrefixed) {
    return {
      kind: 'redirect',
      to: p.isProject ? `/art/${p.handle}` : `/${p.handle}`,
    };
  }

  // Bare project slug — Project-at-root 301 is deferred. T4 reservation
  // blocks the slot (no user can claim it), but the URL doesn't paint a
  // profile body. 404 until the deferred 301 ships.
  if (p.isProject) {
    return { kind: 'invalid' };
  }

  return { kind: 'profile', handle: p.handle };
}

/**
 * Narrow helper for sub-route pages that only render for profiles.
 * Returns the lowercased handle on success (including for @-prefixed
 * sub-route URLs like `/@cto/collected`), null otherwise. Sub-routes
 * do not 301 in this pass — they accept the @-prefix form transparently
 * and render the profile body directly.
 */
export function resolveProfileHandle(slug: string): string | null {
  const p = parseSlug(slug);
  if (p.kind === 'handle' && !p.isProject) return p.handle;
  return null;
}
