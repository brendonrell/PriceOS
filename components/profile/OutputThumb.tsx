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
        const paint = () => {
            if (painted) return;
            painted = true;
            try { paintOutput(cv, slug, id, size * 2); } catch { /* unknown slug — leave blank */ }
        };
        const io = new IntersectionObserver(
            (entries) => { if (entries.some((e) => e.isIntersecting)) { paint(); io.disconnect(); } },
            { rootMargin: '300px' },
        );
        io.observe(cv);
        return () => io.disconnect();
    }, [slug, id, size]);
    return (
        <canvas
            ref={ref}
            className="starred-row-thumb-canvas"
            style={{ width: size, height: size, display: 'block', borderRadius: 6, background: 'var(--stat-bg)' }}
        />
    );
}
