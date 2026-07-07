'use client';

/*
 * PreviewHealer — the self-healing half of the stored-preview system.
 *
 * The display seam (renderArtwork) fires `pd:preview-miss` whenever it has to
 * live-render a tile because its stored PNG is absent. This listener, mounted
 * once app-wide, pins a fresh deterministic render for that piece — so any
 * missing preview is repaired by the FIRST person who views it (the home page
 * heals its own tiles on load), never waiting on the piece's minter to return.
 *
 * Runs for EVERY viewer, signed in or not: the render is fully determined by
 * (slug, tokenId), so anyone reproduces the exact image and the writer endpoint
 * is open. Each piece is attempted once per session, and the queue drains slowly
 * so a home full of gaps can't stampede the paint.
 */

import { useEffect } from 'react';
import { storeMintPreviews, storeThumb } from '../../lib/art/storePreview';

interface MissDetail { slug: string; tokenId: number }
// 'preview' = the full master is absent (render + pin master AND thumb).
// 'thumb'   = the master exists but its small tile isn't pinned yet — pin only
//             the thumb, so existing pieces backfill their tile the first time a
//             grid asks for it (Brendon 2026-07-07).
type MissKind = 'preview' | 'thumb';
interface QueueItem extends MissDetail { kind: MissKind }

export default function PreviewHealer() {
    useEffect(() => {
        // Attempted this session per (kind, piece) — a fail retries next session,
        // never in a tight loop. A thumb attempt and a preview attempt are tracked
        // independently.
        const attempted = new Set<string>();
        const queue: QueueItem[] = [];
        let draining = false;

        const drain = async () => {
            if (draining) return;
            draining = true;
            while (queue.length) {
                const { slug, tokenId, kind } = queue.shift()!;
                try {
                    if (kind === 'thumb') await storeThumb(slug, tokenId);
                    else await storeMintPreviews(slug, [tokenId]);
                } catch { /* best-effort */ }
                // Breathe between pins so healing never competes with painting.
                await new Promise((r) => setTimeout(r, 400));
            }
            draining = false;
        };

        const enqueue = (kind: MissKind) => (e: Event) => {
            const d = (e as CustomEvent<MissDetail>).detail;
            if (!d || !d.slug || !Number.isInteger(d.tokenId)) return;
            const key = `${kind}:${d.slug}/${d.tokenId}`;
            if (attempted.has(key)) return;
            attempted.add(key);
            queue.push({ ...d, kind });
            void drain();
        };

        const onPreviewMiss = enqueue('preview');
        const onThumbMiss = enqueue('thumb');
        window.addEventListener('pd:preview-miss', onPreviewMiss as EventListener);
        window.addEventListener('pd:thumb-miss', onThumbMiss as EventListener);
        return () => {
            window.removeEventListener('pd:preview-miss', onPreviewMiss as EventListener);
            window.removeEventListener('pd:thumb-miss', onThumbMiss as EventListener);
        };
    }, []);

    return null;
}
