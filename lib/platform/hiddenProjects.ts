/*
 * Hidden projects — collections that exist in the database but must never
 * appear anywhere a person looks (Brendon, 2026-07-31).
 *
 * `pd-test-alpha` is the plumbing rig: real rows, real mints, real holders,
 * used to prove the mint/market path end-to-end. It is not art and it is not
 * part of the catalog, so it has no business in a collected count, a feed, a
 * search result or a market tape.
 *
 * This is a DISPLAY filter, not a delete — the rows stay, the test keeps
 * working, and the surfaces simply look past it. Add a slug here and it
 * vanishes from every reader that runs its rows through these helpers.
 */

/** Slugs excluded from every user-facing surface. Lowercase. */
export const HIDDEN_PROJECT_SLUGS: ReadonlySet<string> = new Set([
    'pd-test-alpha',
]);

/** True when this project must not be shown. */
export function isHiddenProject(slug: string | null | undefined): boolean {
    if (!slug) return false;
    return HIDDEN_PROJECT_SLUGS.has(slug.toLowerCase());
}

/** Drop every row belonging to a hidden project. `key` names the field the
 *  slug lives in (`project_id` in most tables, `id` on `projects` itself). */
export function withoutHiddenProjects<T extends Record<string, unknown>>(
    rows: readonly T[] | null | undefined,
    key: keyof T = 'project_id' as keyof T,
): T[] {
    if (!rows) return [];
    return rows.filter((r) => !isHiddenProject(r[key] as string | null | undefined));
}

/** The PostgREST filter value for `.not('<col>', 'in', …)` — lets a query
 *  exclude hidden projects at the database instead of after the read, which
 *  matters wherever a row cap or an exact count is involved. */
export const HIDDEN_PROJECTS_NOT_IN = `(${[...HIDDEN_PROJECT_SLUGS].join(',')})`;
