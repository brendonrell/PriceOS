'use client';

/*
 * ASCII Art Mode standin loader — the site-wide "every artwork as its text
 * backup" display mode (Brendon, 2026-07-10). Fetches the write-once
 * artifact pinned at mint ({slug}/{id}.ascii.json, beside the preview PNG),
 * caches it per Output for the session, and paints it INSTANTLY via
 * paintAsciiArtifact — a real artwork stand-in, no typing animation, ever.
 * A missing artifact returns false and the caller falls back to its normal
 * PNG/live path, so the mode can never blank a surface.
 */

import { ART_IMAGE_BASE } from '../project/registry';
import { paintAsciiArtifact, isValidAsciiArtifact, type AsciiArtifact } from './ascii';

const cache = new Map<string, Promise<AsciiArtifact | null>>();

export function loadAsciiArtifact(slug: string, id: number): Promise<AsciiArtifact | null> {
    const key = `${slug}:${id}`;
    let p = cache.get(key);
    if (!p) {
        p = fetch(`${ART_IMAGE_BASE}/${slug}/${id}.ascii.json`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => (isValidAsciiArtifact(j) ? j : null))
            .catch(() => null);
        cache.set(key, p);
    }
    return p;
}

/** Paint the Output's ASCII standin into `cv`. Resolves false on a miss
 *  (no artifact pinned) — caller falls back to its normal render. */
export async function paintAsciiStandin(
    cv: HTMLCanvasElement,
    slug: string,
    id: number,
    widthPx: number,
): Promise<boolean> {
    const art = await loadAsciiArtifact(slug, id);
    if (!art) return false;
    paintAsciiArtifact(cv, art, widthPx);
    return true;
}
