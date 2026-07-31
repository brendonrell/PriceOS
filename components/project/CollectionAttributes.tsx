'use client';

/*
 * CollectionAttributes — the Attributes tab for a GRADUATED project (≥18 mints).
 * Mirrors an Output's character sheet at collection scale: it renders the
 * existing project attributes PLUS aggregate Form / Palette / Spread / Collective
 * Fingerprint across the minted set (Brendon, 2026-06-25).
 *
 * The sampled half (palette mix + brightness / saturation / complexity averages)
 * needs real pixels. To guarantee a complete portrait the instant a project
 * graduates, the first COLLECTION_FORCE_SAMPLE (22) editions are rendered
 * off-screen on demand and sampled here; everything past that fills in the
 * existing lazy way as the gallery is browsed. The Form/Palette refine as each
 * forced sample lands, so the section visibly fills in rather than popping.
 */

import { useEffect, useMemo, useReducer } from 'react';
import AttrWall from '../artwork/AttrWall';
import { buildCollectionGroups, computeCollectionSpread, COLLECTION_FORCE_SAMPLE } from '../../lib/project/collectionAnalysis';
import { resolveBucket, resolveFingerprint, reportFingerprint, needsColorSample, useStoredColors } from '../../lib/art/colorStore';
import { sampleCanvasFingerprint } from '../../lib/art/sampleColor';
import { paintOutput } from '../../lib/state/ProjectContext';
import { ART_IMAGE_BASE } from '../../lib/project/registry';

/* How many un-fingerprinted pieces one visit to a project's Attributes hands to
   the sampler. Far past the 22 the portrait needs (reading a stored picture is
   cheap), but bounded, so a huge collection converges over a few visits instead
   of queueing thousands of loads at once (Brendon, 2026-07-31). */
const BACKFILL_PER_VISIT = 300;

export default function CollectionAttributes({
    slug,
    mintedCount,
    maxSupply,
    uploadedAt,
    query,
    onTileTap,
}: {
    slug: string;
    mintedCount: number;
    maxSupply: number;
    uploadedAt: number | null;
    query?: string;
    onTileTap?: (tapKey: string) => void;
}) {
    const storedVer = useStoredColors([slug]);
    const [tick, bump] = useReducer((x: number) => x + 1, 0);

    /* Fill the pieces that have no fingerprint yet, so a graduate has a full
       portrait without waiting for someone to scroll.

       ⛔ In stored-image mode this used to bail out entirely — the canvas holds
       a picture rather than a fresh engine paint, and the old code read it the
       instant it asked for it, before the picture had arrived, so it sampled
       blank. It now hands the pieces to the app-wide sampler, which waits for
       the picture and reads THAT (Brendon, 2026-07-31). The live-engine path
       below is untouched.

       Images are cheap enough to sweep far more than the 22 the portrait needs,
       so this doubles as the real backfill — bounded per visit so a huge
       collection trickles rather than stampedes, and picking up where it left
       off next visit. */
    useEffect(() => {
        let cancelled = false;
        const target = Math.min(ART_IMAGE_BASE ? BACKFILL_PER_VISIT : COLLECTION_FORCE_SAMPLE, mintedCount);
        const todo: number[] = [];
        for (let id = 1; id <= target; id++) {
            if (resolveFingerprint(slug, id) == null && needsColorSample(slug, id)) todo.push(id);
        }
        if (!todo.length) return;

        if (ART_IMAGE_BASE) {
            /* Announce them as seen — the sampler loads each stored picture and
               reads it, on its own throttle. */
            for (const id of todo) {
                if (cancelled) break;
                try {
                    window.dispatchEvent(new CustomEvent('pd:art-seen', { detail: { slug, tokenId: id } }));
                } catch { /* CustomEvent unsupported — fills on a later view */ }
            }
            /* Refine the Form/Palette as each read lands, so the section fills
               in rather than popping. */
            const onFilled = (e: Event) => {
                const d = (e as CustomEvent<{ slug: string }>).detail;
                if (d?.slug === slug) bump();
            };
            window.addEventListener('pd:fingerprint-filled', onFilled as EventListener);
            return () => {
                cancelled = true;
                window.removeEventListener('pd:fingerprint-filled', onFilled as EventListener);
            };
        }

        const canvas = document.createElement('canvas');
        let i = 0;
        const step = () => {
            if (cancelled) return;
            try {
                paintOutput(canvas, slug, todo[i], 256);
                reportFingerprint(slug, todo[i], sampleCanvasFingerprint(canvas));
            } catch { /* skip a piece that fails to paint */ }
            i += 1;
            bump();
            if (i < todo.length) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
        return () => { cancelled = true; };
    }, [slug, mintedCount]);

    /* Deterministic half (trait/fate spread, standout pieces, collective barcode)
       — independent of pixels, so it only recomputes when the project changes. */
    const spread = useMemo(() => computeCollectionSpread(slug, mintedCount), [slug, mintedCount]);

    /* Sampled half (palette mix + form averages) — recomputes as forced samples
       land (tick) or stored fingerprints arrive (storedVer). */
    const groups = useMemo(() => {
        const palCount = new Map<string, number>();
        for (let id = 1; id <= mintedCount; id++) {
            const b = resolveBucket(slug, id);
            if (b) palCount.set(b, (palCount.get(b) ?? 0) + 1);
        }
        const palette = [...palCount.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([bucket, count]) => ({ bucket, count }));

        let sb = 0, ss = 0, sc = 0, n = 0;
        for (let id = 1; id <= mintedCount; id++) {
            const fp = resolveFingerprint(slug, id);
            if (!fp) continue;
            if (fp.brightness != null) { sb += fp.brightness; n += 1; }
            if (fp.saturation != null) ss += fp.saturation;
            if (fp.complexity != null) sc += fp.complexity;
        }

        return buildCollectionGroups({
            slug,
            mintedCount,
            maxSupply,
            uploadedAt,
            palette,
            dominantBucket: palette[0]?.bucket ?? null,
            form: {
                brightness: n ? sb / n : null,
                saturation: n ? ss / n : null,
                complexity: n ? sc / n : null,
                sampleN: n,
            },
            spread,
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, mintedCount, maxSupply, uploadedAt, spread, tick, storedVer]);

    return <AttrWall groups={groups} query={query} onTileTap={onTileTap} />;
}
