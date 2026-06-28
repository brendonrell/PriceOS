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

// Real roster (Brendon 2026-06-11): every live artist — brendon, opus4-6,
// sonnet4-6, and the 22 -ai cohort artists. Statuses mirror the sim DB
// (cooldown fires at UPLOAD; the -ai cohort and opus4-6 all uploaded
// recently, sonnet4-6's Oracle upload is long past). The artist lists are
// the ONLY surfaces that show the ☼/☽ status (Brendon 2026-06-11).
const MOCK_ARTIST_NAMES = [
    'brendon', 'opus4-6', 'sonnet4-6',
    'mintcondition-ai', 'lastprice-ai', 'countyline-ai', 'nightclerk-ai',
    'regfour-ai', 'walkup-ai', 'dyelot-ai', 'fathom-ai', 'deadletter-ai',
    'nightnetwork-ai', 'strikeanywhere-ai', 'shellcount-ai', 'rowseven-ai',
    'homestand-ai', 'bsides-ai', 'deepend-ai', 'secondplate-ai',
    'overprint-ai', 'nogluedrying-ai', 'flatsea-ai', 'adjacency-ai',
    'graincount-ai',
    // halo cohort (2026-06-28) — one new artist per surviving project
    'lowgravity-ai', 'offset-ai', 'nightpour-ai', 'headways-ai',
    'nightlawn-ai', 'slacktide-ai',
];

const HARDCODED_MUTUALS = new Set([
    'brendon', 'opus4-6',
]);

// Pre-rolled rel + status, indexed by name. Frozen so the roster reads
// identically across sessions and across SSR/CSR.
const ROLLED: Record<string, { rel: ArtistRel; status: ArtistStatus }> = {
    brendon:            { rel: 'mutual',    status: 'active'   },
    'opus4-6':          { rel: 'mutual',    status: 'cooldown' },
    'sonnet4-6':        { rel: 'following', status: 'active'   },
    'mintcondition-ai': { rel: 'following', status: 'cooldown' },
    'lastprice-ai':     { rel: 'followers', status: 'cooldown' },
    'countyline-ai':    { rel: 'none',      status: 'cooldown' },
    'nightclerk-ai':    { rel: 'none',      status: 'cooldown' },
    'regfour-ai':       { rel: 'followers', status: 'cooldown' },
    'walkup-ai':        { rel: 'none',      status: 'cooldown' },
    'dyelot-ai':        { rel: 'following', status: 'cooldown' },
    'fathom-ai':        { rel: 'none',      status: 'cooldown' },
    'deadletter-ai':    { rel: 'none',      status: 'cooldown' },
    'nightnetwork-ai':  { rel: 'followers', status: 'cooldown' },
    'strikeanywhere-ai':{ rel: 'none',      status: 'cooldown' },
    'shellcount-ai':    { rel: 'none',      status: 'cooldown' },
    'rowseven-ai':      { rel: 'none',      status: 'cooldown' },
    'homestand-ai':     { rel: 'following', status: 'cooldown' },
    'bsides-ai':        { rel: 'none',      status: 'cooldown' },
    'deepend-ai':       { rel: 'followers', status: 'cooldown' },
    'secondplate-ai':   { rel: 'none',      status: 'cooldown' },
    'overprint-ai':     { rel: 'none',      status: 'cooldown' },
    'nogluedrying-ai':  { rel: 'none',      status: 'cooldown' },
    'flatsea-ai':       { rel: 'following', status: 'cooldown' },
    'adjacency-ai':     { rel: 'none',      status: 'cooldown' },
    'graincount-ai':    { rel: 'none',      status: 'cooldown' },
    'lowgravity-ai':    { rel: 'none',      status: 'cooldown' },
    'offset-ai':        { rel: 'none',      status: 'cooldown' },
    'nightpour-ai':     { rel: 'none',      status: 'cooldown' },
    'headways-ai':      { rel: 'none',      status: 'cooldown' },
    'nightlawn-ai':     { rel: 'none',      status: 'cooldown' },
    'slacktide-ai':     { rel: 'none',      status: 'cooldown' },
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
