'use client';

/*
 * History pillar — client helpers backed by the output_views table.
 *
 *   recordOutputView(slug, id) — fire-and-forget; the server records the view
 *                                under the signed-in viewer's @name (no-op when
 *                                signed out / pre-claim). Gated upstream by the
 *                                History recording toggle.
 *   fetchMyHistory()           — the viewer's own recently-viewed Outputs from
 *                                the table, freshest first (max 100).
 *   removeMyHistory(slug, id)  — drop one entry from the viewer's history.
 *
 * (Brendon, 2026-06-24.)
 */

export interface HistoryEntry { slug: string; id: number; ts: number; }

/** Sentinel token id for a PROJECT-PAGE view (no specific Output). A History
 *  entry with this id is a project visit, rendered as a project card; any id > 0
 *  is an Output visit. (Brendon, 2026-06-27.) */
export const PROJECT_VIEW_ID = 0;

/** True when a History entry is a project-page visit (vs an Output visit). */
export function isProjectView(e: { id: number }): boolean {
    return e.id === PROJECT_VIEW_ID;
}

export function recordOutputView(slug: string, id: number): void {
    try {
        void fetch('/api/output-views', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ slug, id }),
            keepalive: true,
        }).catch(() => { /* fire-and-forget */ });
    } catch {
        /* ignore */
    }
}

/** Record a PROJECT-PAGE view — same pillar table, token id 0 (the project
 *  sentinel). Fire-and-forget; the server attributes it to the signed-in @name
 *  and no-ops when signed out. Gate the call on the History recording toggle. */
export function recordProjectView(slug: string): void {
    recordOutputView(slug, PROJECT_VIEW_ID);
}

/** One hot piece — its token id and how many people it drew this week. */
export interface HotOutput { id: number; viewers: number }

/** What's Hot in a project — the hottest Outputs, hottest first (max 5). The
 *  public face of the same pillar History reads privately. */
export async function fetchHotOutputs(slug: string): Promise<HotOutput[]> {
    try {
        const r = await fetch(`/api/hot?slug=${encodeURIComponent(slug)}`);
        if (!r.ok) return [];
        return (await r.json()) as HotOutput[];
    } catch {
        return [];
    }
}

export async function fetchMyHistory(): Promise<HistoryEntry[]> {
    try {
        const r = await fetch('/api/history');
        if (!r.ok) return [];
        return (await r.json()) as HistoryEntry[];
    } catch {
        return [];
    }
}

export async function removeMyHistory(slug: string, id: number): Promise<void> {
    try {
        await fetch(`/api/history?slug=${encodeURIComponent(slug)}&id=${id}`, { method: 'DELETE' });
        if (typeof window !== 'undefined') window.dispatchEvent(new Event('pd:history-changed'));
    } catch {
        /* ignore */
    }
}
