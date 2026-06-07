/**
 * Slug resolver for the [slug] dynamic route family.
 *
 * The PriceOS root namespace is shared by:
 *   /{number}    → Output (global PD ID, fxhash model)
 *   /{handle}    → Profile (canonical)
 *   /0x{40-hex}  → Profile by wallet address → 301 → /{handle} (canonical)
 *   /@0x{40-hex} → same (address, @-prefixed) → 301 → /{handle}
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
  | { kind: 'profileByAddress'; address: string }
  | { kind: 'redirect'; to: string }
  | { kind: 'invalid' };

/* T4 — deployed project slugs. Static stand-in until the indexer
   wires a live join over the projects table (Phase 5+). Every
   project that exists on PD must appear here so the bare-slug
   T4 reservation + the @-prefix → /art/{slug} 301 both fire. */
const PROJECT_SLUGS: ReadonlySet<string> = new Set([
  'prisms',
  'oracle',
]);

/* Shared parser. Both resolveSlug and resolveProfileHandle build on
   this so the validation rules stay in one place. */
type Parsed =
  | { kind: 'output'; globalId: number }
  | { kind: 'address'; address: string }
  | { kind: 'handle'; handle: string; wasAtPrefixed: boolean; isProject: boolean }
  | { kind: 'invalid' };

/* A 40-hex EVM wallet address, e.g. /0x6b…f3. NOTE: an address also passes the
   handle regex below (it's all [0-9a-f]), so it MUST be matched first or it
   gets looked up as a handle and 404s. Addresses resolve to their owner's
   profile (the page 301s to the canonical /{handle}). */
const ADDRESS_RE = /^0x[0-9a-f]{40}$/i;

function parseSlug(slug: string): Parsed {
  if (!slug || slug.length === 0) {
    return { kind: 'invalid' };
  }

  /* Next.js delivers dynamic route params in their URL-encoded form
     (e.g. `/@cto` arrives as `%40cto`). Decode once at the entry so
     downstream checks see canonical text. Malformed encoding throws —
     guard with try/catch and treat as invalid. */
  let decoded: string;
  try {
    decoded = decodeURIComponent(slug);
  } catch {
    return { kind: 'invalid' };
  }

  // Numeric → Output (global PD ID).
  if (/^\d+$/.test(decoded)) {
    const globalId = Number(decoded);
    if (!Number.isFinite(globalId) || globalId < 1) {
      return { kind: 'invalid' };
    }
    // Reject leading zeros — `/01` is not canonical `/1`.
    if (String(globalId) !== decoded) {
      return { kind: 'invalid' };
    }
    return { kind: 'output', globalId };
  }

  // Strip leading @ (alias form: /@brendon, /@prisms, /@0x…).
  const wasAtPrefixed = decoded.startsWith('@');
  const stripped = wasAtPrefixed ? decoded.slice(1) : decoded;

  // Wallet address (bare or @-prefixed) → owner's profile. Matched before the
  // handle check because a 0x-address satisfies the handle regex too. Both
  // /0x… and /@0x… land here; the page 301s to the canonical /{handle}.
  if (ADDRESS_RE.test(stripped)) {
    return { kind: 'address', address: stripped.toLowerCase() };
  }

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
  // Petey is PD's mascot, not a real profile — `/petey` and `/@petey` always
  // forward to home. (Surfaced as the fake "Collected by" on null projects.)
  try {
    if (decodeURIComponent(slug).replace(/^@/, '').toLowerCase() === 'petey') {
      return { kind: 'redirect', to: '/' };
    }
  } catch {
    /* malformed encoding — fall through to the normal parser */
  }

  const p = parseSlug(slug);
  if (p.kind === 'invalid') return { kind: 'invalid' };
  if (p.kind === 'output') return p;

  // Wallet address → resolve to the owner's profile (page canonicalises to
  // /{handle}). Parallels the @-prefix → canonical-URL behaviour.
  if (p.kind === 'address') return { kind: 'profileByAddress', address: p.address };

  // @-prefix always 301s to canonical form.
  if (p.wasAtPrefixed) {
    return {
      kind: 'redirect',
      to: p.isProject ? `/art/${p.handle}` : `/${p.handle}`,
    };
  }

  // Bare project slug → 301 to canonical /art/{slug}. (Now live: there is
  // ≥1 deployed Project, so the friction-reduction redirect is safe.)
  if (p.isProject) {
    return { kind: 'redirect', to: `/art/${p.handle}` };
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
