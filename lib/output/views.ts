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
