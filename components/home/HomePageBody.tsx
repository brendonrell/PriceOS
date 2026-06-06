'use client';

/*
 * HomePageBody — the PD home / index surface.
 *
 * Built as a delta off the project page (collection-as-template): same
 * <Hero> chrome, different center. Where the project page's body is one
 * wrapping #gallery, home is a vertical stack of per-project carousels —
 * each project's recent outputs scroll horizontally instead of wrapping.
 *
 * Test-phase scope: only the one project we have (PRISMS) is wired, via
 * the global ProjectProvider. The structure already loops over a project
 * list, so adding the other ~30 projects later is data, not rework
 * (Art Blocks model — the site hosts many projects).
 *
 * Hero rows (Brendon's spec):
 *   - title    : "Price Discussion" + live date (PriceDaySlot)
 *   - identity : By @brendon
 *   - social   : rotating "Featuring @artist & N others"
 *   - stats    : platform-wide stats (roughed in; detail later)
 *
 * ArtworkCard calls useTraits(), which throws outside a TraitsProvider —
 * so the carousels are wrapped in one here. The trait UI itself isn't
 * rendered on home; the card just reads multiSelectActive (false).
 */

import { useEffect, useState } from 'react';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { useProject } from '../../lib/state/ProjectContext';

/* Outputs per carousel (Brendon: 6). */
const CAROUSEL_SIZE = 6;
/* Projects shown on home (Brendon: ~30). Only one is wired in the test
   phase; this caps the list once more projects land. */
const MAX_HOME_PROJECTS = 30;

/* Rotating "Featuring" credits — test-phase handles. */
const FEATURED_ARTISTS = ['@brendon', '@opus4-6', '@snowfro', '@claude', '@rudxane'];
const FEATURE_ROTATE_MS = 2600;

/* Platform stats — rough test-phase placeholders. Wire to /api/stats later. */
const PLATFORM_STATS = { projects: 1, minted: 500, volumeEth: '14.2' };

interface HomeProject {
    slug: string;
    title: string;
    /** Output ids for this project's carousel, newest first. */
    ids: number[];
}

export default function HomePageBody() {
    const project = useProject();

    /* Rotating "Featuring" lead credit. */
    const [featIdx, setFeatIdx] = useState(0);
    useEffect(() => {
        const t = setInterval(
            () => setFeatIdx((i) => (i + 1) % FEATURED_ARTISTS.length),
            FEATURE_ROTATE_MS,
        );
        return () => clearInterval(t);
    }, []);
    const lead = FEATURED_ARTISTS[featIdx];
    const otherCount = FEATURED_ARTISTS.length - 1;

    /* 6 most recent outputs = the highest ids (sequential mint order),
       newest first. */
    const recentIds = Array.from(
        { length: CAROUSEL_SIZE },
        (_, i) => project.totalOutputs - i,
    ).filter((id) => id >= 1);

    /* Projects, newest on top. Only PRISMS wired this build. */
    const projects: HomeProject[] = [
        { slug: 'prisms', title: project.title, ids: recentIds },
    ].slice(0, MAX_HOME_PROJECTS);

    return (
        <TraitsProvider>
            <Hero
                ariaLabel="Price Discussion"
                titleRow={
                    <h1 className="project-title">
                        <span>Price Discussion</span>
                        <PriceDaySlot />
                    </h1>
                }
                identityRow={
                    <div className="hero-line project-custom">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/brendon">@brendon</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺︎'}
                                </span>
                            </span>
                        </div>
                    </div>
                }
                socialRow={
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Featuring</span>{' '}
                        <a className="cbr-name" href={`/${lead.slice(1)}`}>
                            {lead}
                        </a>{' '}
                        <span className="cbr-others">&amp; {otherCount} others</span>
                    </div>
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span className="stat-icon stat-icon-box">⬚&#xFE0E;</span>{' '}
                            <span className="stat-val">{PLATFORM_STATS.projects} PROJECTS</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-vol">{PLATFORM_STATS.volumeEth} VOL</span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            <span className="stat-icon stat-icon-owners">⌗&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">{PLATFORM_STATS.minted} MINTED</span>
                        </span>
                    </div>
                }
            />

            {projects.map((p) => (
                <section
                    className="home-carousel-row"
                    key={p.slug}
                    aria-label={`${p.title} — recent outputs`}
                >
                    <div className="home-carousel-head">
                        <a className="home-carousel-title" href={`/art/${p.slug}`}>
                            {p.title}
                        </a>
                    </div>
                    <div className="home-carousel-track">
                        {p.ids.map((id) => (
                            <ArtworkCard key={id} id={id} />
                        ))}
                    </div>
                </section>
            ))}
        </TraitsProvider>
    );
}
