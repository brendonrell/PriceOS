'use client';

/*
 * One artist-project carousel — same markup + classes as the home page's
 * per-project carousel, mounted under its own ProjectProvider so the cards
 * paint THIS project's engine. Shows recent minted Outputs. A previewed tile
 * REQUIRES a real mint — an unminted project shows GHOST FRAMES in its row,
 * never phantom art off unminted token ids (Brendon, 2026-07-03: "when a
 * project is fresh there are no mints and thus no previews — we show the
 * ghosts instead"). Same GhostCard the Project page + Showcase use.
 *
 * Split out of ProfilePageBody 2026-07-06 — pure move.
 */

import ArtworkCard from '../ArtworkCard';
import GhostCard from '../project/GhostCard';
import { useProject } from '../../lib/state/ProjectContext';
import { getProject } from '../../lib/project/registry';
import { CAROUSEL_SIZE } from './profilePageShared';

export default function ArtistProjectCarousel({ eager = false }: { eager?: boolean }) {
    const project = useProject();
    const total = project.totalOutputs;
    const ids =
        total > 0
            ? Array.from({ length: Math.min(CAROUSEL_SIZE, total) }, (_, i) => total - i)
            : [];
    /* Ghost frames for an unminted row: aspect ratios sampled from the
       project's own aspect palette (registry), deterministic per index so
       SSR and client match. No canvas, no engine, no seed. */
    const ghostAspects = (() => {
        if (total > 0) return [];
        const pool = getProject(project.slug)?.aspects ?? [1];
        const aspects = pool.length ? pool : [1];
        return Array.from({ length: CAROUSEL_SIZE }, (_, i) => {
            const h = (((i + 1) * 2654435761) >>> 0) / 4294967296;
            return aspects[Math.floor(h * aspects.length) % aspects.length];
        });
    })();
    return (
        <section
            className="home-carousel-row"
            aria-label={`${project.title} — recent outputs`}
        >
            <div className="home-carousel-head">
                <a className="home-carousel-title" href={`/art/${project.slug}`}>
                    {project.title}
                </a>
            </div>
            <div className="home-carousel-track">
                {total > 0
                    ? ids.map((id) => (
                          <ArtworkCard key={id} id={id} eager={eager} />
                      ))
                    : ghostAspects.map((aspect, i) => (
                          <GhostCard key={`ghost-${i}`} aspect={aspect} index={i} />
                      ))}
            </div>
        </section>
    );
}
