/*
 * Project milestones — count-based moments in a project's mint life that get a
 * timestamp the instant they're crossed and surface in the home feed. (UI name:
 * "project milestones".) Graduation (12) and sold-out have their own first-class
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
}

export const PROJECT_MILESTONES: readonly ProjectMilestone[] = [
    { count: 1,    key: '1',    label: 'FIRST BLOOD' },
    { count: 22,   key: '22',   label: 'LUCKY 22' },
    { count: 100,  key: '100',  label: 'CENTURY CLUB' },
    { count: 777,  key: '777',  label: 'HALO' },
    { count: 1000, key: '1000', label: 'PER MILLE CLUB' },
    { count: 1200, key: '1200', label: 'ARCHETYPE' },
    { count: 4000, key: '4000', label: 'HI-DEF' },
];

/** Label for a milestone key/count, or null if it isn't a configured milestone. */
export function milestoneLabel(key: string | number): string | null {
    const k = String(key);
    return PROJECT_MILESTONES.find((m) => m.key === k)?.label ?? null;
}

/* The Status facet ladder — the project's standing by mint count. First Blood +
   Graduation (12) + the milestones, in Title Case (facet-pill style; the feed
   uses the ALLCAPS labels). Sold-out / Ascension is deliberately NOT a status
   (Brendon 2026-06-15 — "we just don't show sold out"). */
export const STATUS_LADDER: readonly { count: number; label: string }[] = [
    { count: 1,    label: 'First Blood' },
    { count: 12,   label: 'Graduated' },
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
