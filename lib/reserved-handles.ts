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
 *   T4 — Auto-derived (every deployed project slug, dynamic)
 *
 * T4 is computed at runtime by joining T1-T3 with the live Project
 * slug list from the indexer (Phase 5+). Until that wiring exists,
 * `RESERVED_HANDLES_STATIC` is the full enforceable set.
 *
 * Decision log:
 *   2026-04-29 — `claude` and `gemini` added to T2 by Brendon,
 *   `opus` and `sonnet` added by inference (the AI-team naming
 *   category — natural extension of the same carve-out).
 *   2026-05-13 — Nomenclature sweep. Locked nouns now: Project /
 *   Output / Artwork / Token / Starred / Collected / Showcase /
 *   Created (Edition banned platform-wide; Outputs replaces it).
 *   See ClickUp Platform Nomenclature SoT (page 2kyd6gx6-3274).
 *   2026-07-02 — `porsche`, `odin`, `thor` added to T2 by Brendon
 *   (protected names; the myth arc + one of them opens a side door).
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
    // Protected names (Brendon, 2026-07-02) — the myth arc + a side door
    'porsche',
    'odin',
    'thor',
    // PD's two generative-glyph features (Brendon, 2026-07-29)
    'formula',
    'formulas',
    'tabstract',
    'lanerunner',
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
    'collected',
    'showcase',
    'created',
    'anointed',
    'wishlist',
    'starred',
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
    // Authority / verification impersonation guard (anti-imposter). These read
    // as official-status words and must never be claimable as a handle.
    'official',
    'verified',
    'verify',
    'mod',
    'moderator',
    'root',
    'system',
    'notification',
    'notifications',
    'announcement',
    'announcements',
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
 * For T4 (auto-derived from deployed project slugs), the caller
 * must additionally check against the live project list — this
 * function only covers the static tiers.
 */
/** Owner claims — addresses allowed to claim a specific RESERVED handle.
 *  The PD treasury wallet (pricediscussion.eth, holder of the $PRICE supply)
 *  claims the brand handle (Brendon, 2026-07-06). Checked at signup AFTER the
 *  reserved gate: reserved for everyone, claimable by its owner. */
export const RESERVED_HANDLE_OWNERS: Readonly<Record<string, string>> = {
    pricediscussion: '0x146034ec25c277f30f63933b151297689e15b9b8',
};

/** True when `address` is the designated owner of a reserved `handle`. */
export function canClaimReservedHandle(handle: string, address: string): boolean {
    const owner = RESERVED_HANDLE_OWNERS[handle.trim().toLowerCase().replace(/^@/, '')];
    return !!owner && owner === address.toLowerCase();
}

export function isReservedHandle(handle: string): boolean {
    const normalised = handle.trim().toLowerCase();
    if (normalised.length === 0) return true;
    if (/^\d+$/.test(normalised)) return true; // all-digit handles → token namespace
    return RESERVED_HANDLES_STATIC.has(normalised);
}
