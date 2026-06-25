'use client';

/*
 * OutputThumb — a small, lazy-painted preview of an Output's generative art.
 * Shared by the profile row lists (Starred, Wishlist). Paints the canvas only
 * once it scrolls near the viewport (own IntersectionObserver) so a long list
 * never paints every thumbnail up front.
 */

import { useEffect, useRef } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';

export default function OutputThumb({
    slug,
    id,
    size = 64,
}: {
    slug: string;
    id: number;
    size?: number;
}) {
    const ref = useRef<HTMLCanvasElement>(null);
    useEffect(() => {
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
    }, [slug, id, size]);
    return (
        <canvas
            ref={ref}
            className="starred-row-thumb-canvas"
            style={{ width: size, height: size, display: 'block', borderRadius: 6, background: 'var(--stat-bg)' }}
        />
    );
}
