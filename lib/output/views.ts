'use client';

/*
 * Output views — client helpers for the cross-user views pillar.
 *
 *   recordOutputView(slug, id)   — fire-and-forget; the server attributes it to
 *                                  the signed-in viewer's @name (no-op when
 *                                  signed out / pre-claim).
 *   fetchOutputViewStats(slug,id) — anonymized counts for an output: total
 *                                  unique viewers, total raw views, and how many
 *                                  viewers are the caller's mutuals.
 *
 * Gated upstream by the History "Recording" toggle — when History is OFF we
 * don't call recordOutputView at all (Brendon, 2026-06-24).
 */

export interface OutputViewStats {
    totalViewers: number;
    totalViews: number;
    mutualViewers: number;
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

export async function fetchOutputViewStats(slug: string, id: number): Promise<OutputViewStats | null> {
    try {
        const r = await fetch(`/api/output-views?slug=${encodeURIComponent(slug)}&id=${id}`);
        if (!r.ok) return null;
        return (await r.json()) as OutputViewStats;
    } catch {
        return null;
    }
}
