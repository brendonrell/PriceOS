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

// Sim's exact mockArtistNames roster (line 10510-10517).
const MOCK_ARTIST_NAMES = [
    'packy', 'shvembldr', 'tylerxhobbs', 'snowfro', 'dmitricherniak', 'xfar', 'brendon', 'matty',
    'atlasforge', 'rudxane', 'gmoney', 'darold', 'clownvamp', 'trinity',
    'willpop', 'cspok', 'siggi', 'ccddbb', 'piterpasma', 'richardnadal', 'mattdesl', 'ykx',
    'lorem', 'ixshells', 'generative', 'algorithm', 'noise', 'pixel',
    'vector', 'crypto', 'punk', 'ape', 'toadz', 'nouns', 'mfers', 'rekt', 'moon', 'hodl',
    'fren', 'gm', 'gn', 'wagmi', 'ngmi', 'vibes', 'based', 'degen',
];

// Sim line 10526: hardcoded mutuals.
const HARDCODED_MUTUALS = new Set([
    'brendon', 'matty', 'atlasforge', 'snowfro', 'rudxane', 'siggi', 'willpop',
]);

// Pre-rolled rel + status, indexed by name. Generated once with sim's
// distribution (15% mutual outside the hardcoded set, 25% following,
// 15% followers, 45% none; 50/50 active/cooldown). Frozen here so the
// roster reads identically across sessions and across SSR/CSR.
const ROLLED: Record<string, { rel: ArtistRel; status: ArtistStatus }> = {
    packy:          { rel: 'following', status: 'active' },
    shvembldr:      { rel: 'none',      status: 'cooldown' },
    tylerxhobbs:    { rel: 'following', status: 'active' },
    snowfro:        { rel: 'mutual',    status: 'active' },     // hardcoded
    dmitricherniak: { rel: 'followers', status: 'cooldown' },
    xfar:           { rel: 'none',      status: 'active' },
    brendon:        { rel: 'mutual',    status: 'active' },     // hardcoded (self)
    matty:          { rel: 'mutual',    status: 'active' },     // hardcoded
    atlasforge:     { rel: 'mutual',    status: 'cooldown' },   // hardcoded
    rudxane:        { rel: 'mutual',    status: 'active' },     // hardcoded
    gmoney:         { rel: 'following', status: 'active' },
    darold:         { rel: 'none',      status: 'cooldown' },
    clownvamp:      { rel: 'followers', status: 'active' },
    trinity:        { rel: 'following', status: 'active' },
    willpop:        { rel: 'mutual',    status: 'active' },     // hardcoded
    cspok:          { rel: 'following', status: 'cooldown' },
    siggi:          { rel: 'mutual',    status: 'active' },     // hardcoded
    ccddbb:         { rel: 'none',      status: 'active' },
    piterpasma:     { rel: 'following', status: 'cooldown' },
    richardnadal:   { rel: 'none',      status: 'active' },
    mattdesl:       { rel: 'followers', status: 'cooldown' },
    ykx:            { rel: 'none',      status: 'active' },
    lorem:          { rel: 'none',      status: 'active' },
    ixshells:       { rel: 'following', status: 'cooldown' },
    generative:     { rel: 'none',      status: 'active' },
    algorithm:      { rel: 'followers', status: 'cooldown' },
    noise:          { rel: 'none',      status: 'active' },
    pixel:          { rel: 'following', status: 'active' },
    vector:         { rel: 'none',      status: 'cooldown' },
    crypto:         { rel: 'none',      status: 'active' },
    punk:           { rel: 'following', status: 'cooldown' },
    ape:            { rel: 'followers', status: 'active' },
    toadz:          { rel: 'none',      status: 'active' },
    nouns:          { rel: 'following', status: 'cooldown' },
    mfers:          { rel: 'none',      status: 'active' },
    rekt:           { rel: 'followers', status: 'cooldown' },
    moon:           { rel: 'none',      status: 'active' },
    hodl:           { rel: 'following', status: 'cooldown' },
    fren:           { rel: 'none',      status: 'active' },
    gm:             { rel: 'followers', status: 'active' },
    gn:             { rel: 'none',      status: 'cooldown' },
    wagmi:          { rel: 'none',      status: 'active' },
    ngmi:           { rel: 'following', status: 'cooldown' },
    vibes:          { rel: 'none',      status: 'active' },
    based:          { rel: 'followers', status: 'active' },
    degen:          { rel: 'none',      status: 'cooldown' },
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
    mutual:    '\u26ED\uFE0E',  // ⚭
    following: '\u26EF\uFE0E',  // ⚯
    followers: '\u26AC\uFE0E',  // ⚬
    none:      '',
};

/** Status icons. Matches sim line 10536. */
export const STATUS_ICONS: Record<ArtistStatus, string> = {
    cooldown: '\u23FB\uFE0E',  // ⏻
    active:   '\u23FC\uFE0E',  // ⏼
};
