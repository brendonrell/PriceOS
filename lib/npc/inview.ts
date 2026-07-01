'use client';

/*
 * npc/inview — the "piece in view" signal: what artwork is actually painted on
 * screen RIGHT NOW, with its freshly-sampled visual fingerprint. This is how
 * the NPC Cast truly SEES the piece you're looking at (ClickUp 86b9fcp11 —
 * "how they see the page, the key unlock").
 *
 * ArtworkLive publishes here every time it paints (the sample is a one-shot
 * 24×24 read, effectively free) and clears on unmount. Pure in-memory,
 * session-only; nothing here talks to the network — persistence stays on the
 * existing colorStore path.
 */

import type { Fingerprint } from '../art/sampleColor';
import { getProject } from '../project/registry';
import { recordView } from './memory';

export interface PieceInView {
    slug: string;
    id: number;
    /** Display label, e.g. "BOREAL #33". */
    label: string;
    /** The project's regular display name. */
    project: string;
    fp: Fingerprint | null;
    /** When it came into view (ms). */
    since: number;
}

let current: PieceInView | null = null;

/** Called by the artwork surface right after it paints. */
export function publishPieceInView(slug: string, id: number, fp: Fingerprint | null): void {
    const proj = getProject(slug);
    current = {
        slug,
        id,
        label: `${slug.toUpperCase()} #${id}`,
        project: proj?.displayName ?? slug,
        fp,
        since: Date.now(),
    };
    recordView(slug, id, current.label, fp?.bucket ?? null);
}

/** Called when the artwork surface unmounts (only clears if it's still ours). */
export function clearPieceInView(slug: string, id: number): void {
    if (current && current.slug === slug && current.id === id) current = null;
}

/** The piece on screen right now, or null. */
export function readPieceInView(): PieceInView | null {
    return current;
}
