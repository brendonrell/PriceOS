/*
 * Mock Artists — sim line 10510-10534 ported.
 *
 * Sim uses Math.random() for rel/status. We need deterministic data here:
 *   - SSR/CSR mismatch would crash hydration on the artists list
 *   - Brendon expects the same artist roster every visit until indexer wires up
 *
 * Roster is sim's exact mockArtistNames array (line 10510-10517). The hardcoded
 * mutuals match sim line 10526. Other rels + statuses are pre-rolled to a stable
 * distribution roughly matching sim's "~15% mutual / ~25% following / ~15%
 * followers / ~45% none" plus 50/50 active/cooldown.
 */

export type ArtistRel = 'mutual' | 'following' | 'followers' | 'none';
export type ArtistStatus = 'active' | 'cooldown';

export interface MockArtist {
    name: string;          // '@brendon'
    rel: ArtistRel;
    status: ArtistStatus;
}

// Real roster (Brendon 2026-06-10: "no more placeholders — just me and
// opus4-6"). The sim's 46-name placeholder roster is retired; the live
// platform has exactly two artists until the indexer feeds this for real.
const MOCK_ARTIST_NAMES = [
    'brendon', 'opus4-6',
];

const HARDCODED_MUTUALS = new Set([
    'brendon', 'opus4-6',
]);

// Pre-rolled rel + status, indexed by name. Frozen so the roster reads
// identically across sessions and across SSR/CSR.
const ROLLED: Record<string, { rel: ArtistRel; status: ArtistStatus }> = {
    brendon:   { rel: 'mutual', status: 'active' },
    'opus4-6': { rel: 'mutual', status: 'active' },
};

export const MOCK_ARTISTS: MockArtist[] = MOCK_ARTIST_NAMES
    .map((name) => {
        // Hardcoded mutuals always win over rolled rel.
        const rolled = ROLLED[name] ?? { rel: 'none' as const, status: 'active' as const };
        const rel: ArtistRel = HARDCODED_MUTUALS.has(name) ? 'mutual' : rolled.rel;
        return {
            name: '@' + name,
            rel,
            status: rolled.status,
        };
    })
    // Sim line 10534: sort alphabetically.
    .sort((a, b) => a.name.localeCompare(b.name));

/** Map of rel → glyph (with VS15 selector). Matches sim line 10520. */
export const REL_ICONS: Record<ArtistRel, string> = {
    mutual:    '\u26AD\uFE0E',  // ⚭
    following: '\u26AF\uFE0E',  // ⚯
    followers: '\u26AC\uFE0E',  // ⚬
    none:      '',
};

/** Status icons. Matches sim line 10536. */
export const STATUS_ICONS: Record<ArtistStatus, string> = {
    cooldown: '\u23FB\uFE0E',  // ⏻
    active:   '\u23FC\uFE0E',  // ⏼
};
