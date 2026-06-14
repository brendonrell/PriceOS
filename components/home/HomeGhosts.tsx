'use client';

/*
 * HomeGhosts — empty/loading stand-ins for the home page feeds (Brendon,
 * 2026-06-14: "show, don't tell" — every null state is a ghost in the SHAPE
 * of the feed when it's on, never a line of text). Sharp PD ghosts, reusing
 * the real layout classes so the placeholder carries the live rhythm.
 *
 *   GhostCarousels → Now Minting: a stack of carousel rows (name-bar ghost +
 *                    a track of ghost tiles), 1:1 with .home-carousel-row.
 *   GhostGallery   → Shuffle: the #gallery grid filled with ghost tiles.
 *
 * Tiles are real GhostCards (sampled aspect ratios), so the empty grid breathes
 * with the same mixed-ratio rhythm a populated one would.
 */

import GhostCard from '../project/GhostCard';

/* Mixed aspect ratios so the ghosts read like a real, varied grid — not a wall
   of identical squares. Cycled by index. */
const GHOST_ASPECTS = [1, 0.8, 1.25, 1, 0.75, 1.5];

export function GhostCarousels({
    rows = 3,
    perRow = 6,
}: {
    rows?: number;
    perRow?: number;
}) {
    return (
        <>
            {Array.from({ length: rows }, (_, r) => (
                <section
                    className="home-carousel-row ghost-carousel-row"
                    key={`ghost-carousel-${r}`}
                    aria-hidden="true"
                >
                    <div className="home-carousel-head">
                        <span className="ghost-feed-bar ghost-carousel-title-bar" />
                    </div>
                    <div className="home-carousel-track">
                        {Array.from({ length: perRow }, (_, i) => (
                            <GhostCard
                                key={i}
                                aspect={GHOST_ASPECTS[(r * perRow + i) % GHOST_ASPECTS.length]}
                                index={i}
                            />
                        ))}
                    </div>
                </section>
            ))}
        </>
    );
}

export function GhostGallery({ count = 12 }: { count?: number }) {
    return (
        <section id="gallery" aria-label="Shuffle" aria-hidden="true">
            {Array.from({ length: count }, (_, i) => (
                <GhostCard
                    key={i}
                    aspect={GHOST_ASPECTS[i % GHOST_ASPECTS.length]}
                    index={i}
                />
            ))}
        </section>
    );
}
