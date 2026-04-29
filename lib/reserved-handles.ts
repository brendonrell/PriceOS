/**
 * Reserved handle list for PriceOS.
 *
 * Mirrors the locked URL Architecture spec
 * (PD Master Brief → Front End → URL Architecture & Slug Routing).
 * A user cannot claim a handle matching any reserved word. Enforced
 * at signup. Four tiers for maintenance:
 *
 *   T1 — System / framework (hard reserved, never claimable)
 *   T2 — PD brand + AI team (Brendon owns; nobody can ever claim)
 *   T3 — Functional routes (current and future)
 *   T4 — Auto-derived (every deployed collection slug, dynamic)
 *
 * T4 is computed at runtime by joining T1-T3 with the live collection
 * slug list from the indexer (Phase 5+). Until that wiring exists,
 * `RESERVED_HANDLES_STATIC` is the full enforceable set.
 *
 * Decision log: 2026-04-29 — `claude` and `gemini` added to T2 by
 * Brendon, `opus` and `sonnet` added by inference (the AI-team
 * naming category — natural extension of the same carve-out).
 */

/** T1 — System / framework. Hard-reserved. */
export const RESERVED_T1 = [
    'api',
    '_next',
    '_static',
    '_vercel',
    '404',
    '500',
    'index',
] as const;

/** T2 — PD brand + AI team. Brendon owns these forever. */
export const RESERVED_T2 = [
    // PD brand
    'pd',
    'pricediscussion',
    'discussion',
    'petey',
    'hothurt',
    'attention',
    'dot',
    'matrix',
    'mcdonalds2050',
    'permille',
    'price',
    '$price',
    // AI team
    'claude',
    'gemini',
    'opus',
    'sonnet',
] as const;

/** T3 — Functional routes (current and future). */
export const RESERVED_T3 = [
    // Current routes
    'art',
    'artists',
    'mint',
    'browse',
    'search',
    'settings',
    'feed',
    'home',
    // Profile sub-routes (cannot be a top-level handle)
    'owned',
    'anointed',
    'wishlist',
    'stars',
    'notes',
    'albums',
    // Future-reserved
    'connect',
    'login',
    'signin',
    'signup',
    'wallet',
    'auth',
    'admin',
    'staff',
    'team',
    'support',
    'help',
    'legal',
    'terms',
    'privacy',
    'docs',
    'about',
    'manifesto',
    'drops',
    // Social redirects (T3 + are reserved for redirect routes)
    'discord',
    'twitter',
    'farcaster',
    'x',
    'ens',
] as const;

/**
 * The full static reserved set, lowercase, no duplicates.
 * Use this for synchronous validation.
 */
export const RESERVED_HANDLES_STATIC: ReadonlySet<string> = new Set([
    ...RESERVED_T1,
    ...RESERVED_T2,
    ...RESERVED_T3,
]);

/**
 * Returns true if `handle` is reserved by the static list, or if it
 * is purely numeric (the `/{globalId}` namespace owns all-digit URLs).
 *
 * For T4 (auto-derived from deployed collection slugs), the caller
 * must additionally check against the live collection list — this
 * function only covers the static tiers.
 */
export function isReservedHandle(handle: string): boolean {
    const normalised = handle.trim().toLowerCase();
    if (normalised.length === 0) return true;
    if (/^\d+$/.test(normalised)) return true; // all-digit handles → token namespace
    return RESERVED_HANDLES_STATIC.has(normalised);
}
