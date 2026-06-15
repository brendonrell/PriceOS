'use client';

/*
 * GhostCard — empty-state placeholder tile.
 *
 * Shown ONLY while a project is unminted (0 Outputs). It is a frame, not art:
 * no canvas, no engine call, no phantom seed — just a softly-pulsing rectangle
 * whose aspect ratio is SAMPLED from the project's own aspect palette
 * (registry `aspects`), so the empty grid carries the real project's rhythm.
 * The moment the first Output mints, the page stops rendering ghosts and the
 * real ArtworkCards take over (see ProjectPageBody gallery section).
 *
 * Reuses the .output-card / .canvas-wrapper layout hooks so it lays out in
 * #gallery exactly like a real card; `.project-showcase-pick` lets the 6
 * showcase ghosts surface on the Project Showcase tab via the existing
 * #gallery.project-showcase-mode CSS.
 */

import type { CSSProperties } from 'react';

export default function GhostCard({
    aspect,
    showcasePick = false,
    index = 0,
    onActivate,
}: {
    aspect: number;
    showcasePick?: boolean;
    index?: number;
    /* When provided, the ghost becomes a real tappable affordance (used on the
       OWN profile's empty Showcase: tapping a ghost opens the Add-to-Showcase
       picker). Without it, the ghost stays a decorative aria-hidden frame. */
    onActivate?: () => void;
}) {
    // Stagger each ghost's pulse so the grid breathes organically, not in sync.
    const style: CSSProperties = {
        aspectRatio: String(aspect),
        ['--ghost-delay' as string]: `${(index % 6) * 0.32}s`,
    };
    const interactive = !!onActivate;
    return (
        <article
            className={'output-card ghost-card' + (showcasePick ? ' project-showcase-pick' : '') + (interactive ? ' ghost-card-tap' : '')}
            aria-hidden={interactive ? undefined : 'true'}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            title={interactive ? 'Add to your showcase' : undefined}
            onClick={interactive ? onActivate : undefined}
            onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onActivate!(); } } : undefined}
            style={interactive ? { cursor: 'pointer' } : undefined}
        >
            <div className="output-content">
                <div className="canvas-wrapper ghost-wrapper" style={style} />
            </div>
        </article>
    );
}
