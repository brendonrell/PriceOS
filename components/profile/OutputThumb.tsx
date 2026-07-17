'use client';

/*
 * OutputThumb — a small, lazy-painted preview of an Output's generative art.
 * Shared by the profile row lists (Starred, Wishlist). Paints the canvas only
 * once it scrolls near the viewport (own IntersectionObserver) so a long list
 * never paints every thumbnail up front.
 */

import { useEffect, useRef } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';
import { paintAsciiStandin } from '../../lib/art/asciiStandin';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';

export default function OutputThumb({
    slug,
    id,
    size = 64,
    crop = false,
}: {
    slug: string;
    id: number;
    size?: number;
    /* When set, art is CROPPED to fill the square (cover) instead of the
       default stretch-to-fill. History opts in; Starred/Wishlist do not
       (Brendon 2026-06-26 — scope the crop to History only). */
    crop?: boolean;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    const { notifs } = usePdNotifs();
    const ascii = notifs.asciiArt;
    const degen = notifs.degen;
    useEffect(() => {
        if (degen) return;
        const cv = ref.current;
        if (!cv) return;
        let painted = false;
        let idle = 0;
        const ric: (cb: () => void) => number =
            typeof (window as unknown as { requestIdleCallback?: unknown }).requestIdleCallback === 'function'
                ? (cb) => (window as unknown as { requestIdleCallback: (cb: () => void) => number }).requestIdleCallback(cb)
                : (cb) => window.setTimeout(cb, 1);
        const paint = () => {
            if (painted) return;
            painted = true;
            /* Defer the actual canvas paint to an idle frame so a screenful of
               thumbs doesn't paint synchronously and block the list (Brendon,
               2026-06-24 — matches the gallery card's idle-paint). */
            idle = ric(() => {
                /* ASCII Art Mode: try the text-backup standin first; a miss
                   falls back to the normal preview paint. */
                if (ascii) {
                    paintAsciiStandin(cv, slug, id, size * 2).then((ok) => {
                        if (!ok) { try { paintOutput(cv, slug, id, size * 2); } catch { /* */ } }
                    }).catch(() => { try { paintOutput(cv, slug, id, size * 2); } catch { /* */ } });
                    return;
                }
                try { paintOutput(cv, slug, id, size * 2); } catch { /* unknown slug — leave blank */ }
            });
        };
        const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) { paint(); io.disconnect(); } },
            { rootMargin: '300px' },
        );
        io.observe(cv);
        return () => {
            io.disconnect();
            const cancel = (window as unknown as { cancelIdleCallback?: (h: number) => void }).cancelIdleCallback;
            if (idle) { cancel ? cancel(idle) : window.clearTimeout(idle); }
        };
    }, [slug, id, size, ascii, degen]);
    /* Degen Mode — no art anywhere: the row's own text carries the data, the
       thumb goes to the plain no-art square (2026-07-17). */
    if (degen) {
        return (
            <span
                className="degen-thumb"
                aria-hidden="true"
                style={{ width: size, height: size, display: 'block', borderRadius: 6 }}
            />
        );
    }
    return (
        <canvas
            ref={ref}
            className="starred-row-thumb-canvas"
            role="img"
            aria-label={`${slug} #${id} — artwork thumbnail`}
            /* Square slot. When `crop` is set the art fills it via cover — true
               aspect, trimmed, never distorted (Brendon 2026-06-26). Otherwise
               the original stretch-to-fill is kept (Starred/Wishlist unchanged). */
            style={{ width: size, height: size, display: 'block', borderRadius: 6, background: 'var(--stat-bg)', ...(crop ? { objectFit: 'cover' as const } : {}) }}
        />
    );
}
