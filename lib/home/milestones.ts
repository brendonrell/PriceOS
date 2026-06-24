/*
 * Project milestones — count-based moments in a project's mint life that get a
 * timestamp the instant they're crossed and surface in the home feed. (UI name:
 * "project milestones".) Graduation (18) and sold-out have their own first-class
 * columns + feed labels; THESE for-fun ones live together in projects.milestones
 * (JSONB), keyed by the count threshold as a string → ISO timestamp.
 *
 * Client-safe: pure data, no server imports — shared by the mint route (server,
 * stamps) and HomePageBody (client, labels the feed). Edit this list and a row
 * stamps + feeds automatically; a project that never reaches a count simply
 * never gets that entry (fine — it's for fun).
 */

export interface ProjectMilestone {
    /** Mint count that unlocks it. */
    count: number;
    /** JSONB key (the count as a string). */
    key: string;
    /** Feed label — ALLCAPS, the changed state. */
    label: string;
    /** Feed glyph (iOS-safe, non-emoji — see docs/GLYPHS.md). */
    glyph: string;
    /** Optional per-glyph CSS class for size/alignment nudges. */
    cls?: string;
}

export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [
    { count: 1,    key: '1',    label: 'FIRST BLOOD',    glyph: '†', cls: 'af-ic--dagger' },
    { count: 22,   key: '22',   label: 'LUCKY 22',       glyph: '♧' },
    { count: 100,  key: '100',  label: 'CENTURY CLUB',   glyph: 'Ⅽ' },
    { count: 777,  key: '777',  label: 'HALO',           glyph: '⬭', cls: 'af-ic--oval' },
    { count: 1000, key: '1000', label: 'PER MILLE CLUB', glyph: '‰', cls: 'af-ic--mille' },
    { count: 1200, key: '1200', label: 'ARCHETYPE',      glyph: '✻' },
    { count: 4000, key: '4000', label: 'HI-DEF',         glyph: '⬢' },
];

/** Lifecycle feed events that aren't count milestones (their own columns/feed). */
export const FEED_LIFECYCLE = {
    upload:    { label: 'UPLOADED',  glyph: '✧' },
    graduated: { label: 'GRADUATED', glyph: '⟢⟢', cls: 'af-ic--grad' },
    ascension: { label: 'ASCENSION', glyph: '▲' },
} as const;

/* Canonical chronological order of a project's feed events, by the mint count
   that triggers each — the tiebreaker that makes the feed aware of the FULL
   milestone sequence. Many milestones can be crossed in a single mint
   transaction and so share one timestamp; without this, two same-timestamp
   events can render out of order (e.g. GRADUATED above FIRST BLOOD). The true
   order is: UPLOADED → FIRST BLOOD (1) → GRADUATED (18) → LUCKY 22 (22) →
   CENTURY (100) → HALO (777) → PER MILLE (1000) → ARCHETYPE (1200) →
   HI-DEF (4000) → ASCENSION (sold out, last). A count milestone's own seq IS
   its count; only the non-count lifecycle events need fixed ranks here. */
export const FEED_SEQ = {
    upload: 0,
    graduated: 18,
    ascension: Number.MAX_SAFE_INTEGER,
} as const;

/** The milestone config for a key/count, or null if not configured. */
export function milestoneByKey(key: string | number): ProjectMilestone | null {
    const k = String(key);
    return PROJECT_MILESTONES.find((m) => m.key === k) ?? null;
}

/** Label for a milestone key/count, or null if it isn't a configured milestone. */
export function milestoneLabel(key: string | number): string | null {
    const k = String(key);
    return PROJECT_MILESTONES.find((m) => m.key === k)?.label ?? null;
}

/* The Status facet ladder — the project's standing by mint count. First Blood +
   Graduation (18) + the milestones, in Title Case (facet-pill style; the feed
   uses the ALLCAPS labels). Sold-out / Ascension is deliberately NOT a status
   (Brendon 2026-06-15 — "we just don't show sold out"). */
export const STATUS_LADDER: readonly { count: number; label: string }[] = [
    { count: 1,    label: 'First Blood' },
    { count: 18,   label: 'Graduated' },
    { count: 22,   label: 'Lucky 22' },
    { count: 100,  label: 'Century Club' },
    { count: 777,  label: 'Halo' },
    { count: 1000, label: 'Per Mille Club' },
    { count: 1200, label: 'Archetype' },
    { count: 4000, label: 'Hi-Def' },
];

/** A project's Status = the highest ladder tier its mint count has reached. */
export function projectStatus(mintedCount: number): string {
    let label = STATUS_LADDER[0].label;
    for (const s of STATUS_LADDER) {
        if (mintedCount >= s.count) label = s.label;
        else break;
    }
    return label;
}
