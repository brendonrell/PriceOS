'use client';

/*
 * FingerprintSampler — reads a piece's visual fingerprint off its STORED
 * picture (Brendon, 2026-07-31).
 *
 * The fingerprint (colour · aspect · brightness · saturation · complexity, plus
 * the deep look) was only ever read where the generative engine painted live.
 * Since the app went images-everywhere that is the Output feature page and
 * nowhere else, so a piece stayed blank — no search words, no taste bands, no
 * sight for the Cast — until somebody opened its own page. The stored picture
 * is the same pixels the engine would have drawn, so it reads identically; it
 * just arrives as a load rather than a paint, which is the only reason the old
 * code skipped it.
 *
 * The display seam fires `pd:art-seen` whenever a stored picture really lands
 * on a canvas. This listener, mounted once app-wide, samples the ones that have
 * nothing stored yet — so every surface fills the table again as it is browsed.
 *
 * Deliberately the PreviewHealer shape, verbatim (Rule #0): one app-wide
 * listener, once per piece per session, a queue that drains slowly so the
 * reading never competes with the painting.
 */

import { useEffect } from 'react';
import { artThumbUrl, artImageUrl } from '../../lib/project/registry';
import { sampleCanvasFingerprint } from '../../lib/art/sampleColor';
import { needsColorSample, reportFingerprint, resolveFingerprint } from '../../lib/art/colorStore';

interface SeenDetail { slug: string; tokenId: number }

/* The read downsamples to 48×48 at its deepest, so a 256px copy is already far
   more than it can use — and the small tile is the one a grid has loaded
   anyway, so it is normally free from the browser's own cache. */
const READ_PX = 256;

/** Load a stored picture and read its fingerprint. Same origin, so the pixels
 *  are readable; the small tile first, the master only if that is missing. */
async function sampleStored(slug: string, tokenId: number): Promise<void> {
    const urls = [artThumbUrl(slug, tokenId), artImageUrl(slug, tokenId)].filter(
        (u): u is string => !!u,
    );
    for (const url of urls) {
        const img = await new Promise<HTMLImageElement | null>((resolve) => {
            const el = new Image();
            el.crossOrigin = 'anonymous';
            el.decoding = 'async';
            el.onload = () => resolve(el.naturalWidth > 0 ? el : null);
            el.onerror = () => resolve(null);
            el.src = url;
        });
        if (!img) continue;
        const scale = Math.min(1, READ_PX / Math.max(img.naturalWidth, img.naturalHeight));
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        reportFingerprint(slug, tokenId, sampleCanvasFingerprint(canvas));
        canvas.width = 0;
        canvas.height = 0;
        /* Say it landed, so a surface reading these (the collection portrait)
           refines as they arrive instead of popping in at the end. */
        try {
            window.dispatchEvent(new CustomEvent('pd:fingerprint-filled', { detail: { slug, tokenId } }));
        } catch { /* CustomEvent unsupported — the surface fills on its next read */ }
        return;
    }
}

export default function FingerprintSampler() {
    useEffect(() => {
        // Attempted this session — a failure retries next session, never in a
        // tight loop.
        const attempted = new Set<string>();
        const queue: SeenDetail[] = [];
        let draining = false;

        const drain = async () => {
            if (draining) return;
            draining = true;
            while (queue.length) {
                const { slug, tokenId } = queue.shift()!;
                try { await sampleStored(slug, tokenId); } catch { /* best-effort */ }
                // Breathe between reads so filling never competes with painting.
                await new Promise((r) => setTimeout(r, 250));
            }
            draining = false;
        };

        const onSeen = (e: Event) => {
            const d = (e as CustomEvent<SeenDetail>).detail;
            if (!d || !d.slug || !Number.isInteger(d.tokenId)) return;
            const key = `${d.slug}/${d.tokenId}`;
            if (attempted.has(key)) return;
            /* Already carries a full fingerprint (or a colour reported this
               session) — nothing to read. */
            if (!needsColorSample(d.slug, d.tokenId) && resolveFingerprint(d.slug, d.tokenId) != null) return;
            attempted.add(key);
            queue.push(d);
            void drain();
        };

        window.addEventListener('pd:art-seen', onSeen as EventListener);
        return () => window.removeEventListener('pd:art-seen', onSeen as EventListener);
    }, []);

    return null;
}
