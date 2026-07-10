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
 *  (no artifact pinned) — caller falls back to its normal render.
 *
 *  Carries the ASCII Backup panel's display adjustments to every standin:
 *  - DEVICE RESOLUTION. The internal render is at or above the canvas's real
 *    device pixels (clientWidth × dpr, no dpr cap), so the screen only ever
 *    scales DOWN — same no-moiré rule the panel paints under.
 *  - SMALL-TILE BRIGHTNESS. Below ~5 device px per glyph column the ink
 *    texture can't be seen; the glyphs fuse into a cell average dimmer than
 *    the artwork and the tile reads washed-out grey. Ramp the colour underlay
 *    up as the displayed cell shrinks so tiles keep the piece's true
 *    brightness; at panel/modal scale the default treatment applies. */
export async function paintAsciiStandin(
    cv: HTMLCanvasElement,
    slug: string,
    id: number,
    widthPx: number,
): Promise<boolean> {
    const art = await loadAsciiArtifact(slug, id);
    if (!art) return false;
    const dpr = window.devicePixelRatio || 1;
    const displayPx = Math.round((cv.clientWidth || 0) * dpr);
    const px = Math.max(widthPx, displayPx);
    const pxPerCol = (displayPx || px) / art.cols;
    const underlay = pxPerCol >= 5
        ? undefined
        : Math.min(0.92, 0.55 + (5 - pxPerCol) * 0.15);
    paintAsciiArtifact(cv, art, px, underlay === undefined ? undefined : { underlay });
    return true;
}
