'use client';

/*
 * HomePageBody — the PD home / index surface (logged-out first impression).
 *
 * Delta off the project page (collection-as-template): same <Hero> chrome
 * + same tab row, different center.
 *
 * Home tabs are the three surfaces that are neither curated nor gameable
 * (Brendon's call — the platform stays neutral, nothing rankable to game):
 *   - What's New (default) → per-project carousels of recent outputs
 *                            (chronological truth)
 *   - Sales Feed           → real secondary sales across the platform
 *                            (money-backed truth; mock now, indexer later)
 *   - Shuffle              → randomized discovery, re-rolls on demand
 *                            (no ranking = nothing to game)
 *
 * Test-phase scope: only the one project we have (PRISMS) is wired, via
 * the global ProjectProvider. The carousel list + sales feed loop over
 * data, so adding the other ~30 projects + real sales later is data, not
 * rework (Art Blocks model).
 *
 * ArtworkCard calls useTraits(), which throws outside a TraitsProvider —
 * so the body is wrapped in one here. The trait UI isn't rendered on home.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';

/* Outputs per carousel (Brendon: 6). */
const CAROUSEL_SIZE = 6;
/* Projects shown on home (Brendon: ~30). Only one is wired in the test
   phase; this caps the list once more projects land. */
const MAX_HOME_PROJECTS = 30;
/* Tiles in the Shuffle grid. */
const SHUFFLE_SIZE = 12;

/* Rotating "Featuring" credits — test-phase handles. */
const FEATURED_ARTISTS = ['@brendon', '@opus4-6', '@snowfro', '@claude', '@rudxane'];
const FEATURE_ROTATE_MS = 2600;

/* Platform stats — rough test-phase placeholders. Wire to /api/stats later. */
const PLATFORM_STATS = { projects: 1, minted: 500, volumeEth: '14.2' };

type HomeTab = 'new' | 'sales' | 'shuffle';

interface HomeProject {
    slug: string;
    title: string;
    /** Output ids for this project's carousel, newest first. */
    ids: number[];
}

/* Mock platform sales — test-phase. Real secondary sales land when the
   indexer is live; shape mirrors the project-page activity feed so the
   swap is a data change, not a markup change. */
interface SaleRow {
    id: number;
    time: string;
    buyer: string;
    project: string;
    token: number;
    priceEth: string;
}
const MOCK_SALES: SaleRow[] = [
    { id: 1, time: '12:04 PM', buyer: '@matty', project: 'Prisms', token: 442, priceEth: '0.44' },
    { id: 2, time: '11:31 AM', buyer: '@atlasforge', project: 'Meridian', token: 18, priceEth: '1.20' },
    { id: 3, time: '10:58 AM', buyer: '@gmoney', project: 'Strata', token: 207, priceEth: '0.31' },
    { id: 4, time: '10:12 AM', buyer: '@rudxane', project: 'Prisms', token: 88, priceEth: '0.62' },
    { id: 5, time: '09:40 AM', buyer: '@snowfro', project: 'Understory', token: 5, priceEth: '2.05' },
    { id: 6, time: '08:55 AM', buyer: '@darold', project: 'Signal Loss', token: 134, priceEth: '0.18' },
];

export default function HomePageBody() {
    const project = useProject();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<HomeTab>('new');

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

    /* Mouse drag-to-scroll for the carousels (no visible scrollbar). Touch
       already swipes natively; this gives desktop mouse users a grab-drag.
       A drag past a few px swallows the trailing click so it doesn't open
       the card modal. Re-binds when the New Art tab (re)mounts the tracks. */
    useEffect(() => {
        if (activeTab !== 'new') return;
        const tracks = Array.from(
            document.querySelectorAll<HTMLElement>('.home-carousel-track'),
        );
        const cleanups = tracks.map((track) => {
            let down = false;
            let moved = false;
            let startX = 0;
            let startLeft = 0;
            const onDown = (e: MouseEvent) => {
                down = true;
                moved = false;
                startX = e.pageX;
                startLeft = track.scrollLeft;
                track.classList.add('dragging');
            };
            const onMove = (e: MouseEvent) => {
                if (!down) return;
                const dx = e.pageX - startX;
                if (Math.abs(dx) > 4) moved = true;
                e.preventDefault();
                track.scrollLeft = startLeft - dx;
            };
            const onUp = () => {
                if (!down) return;
                down = false;
                track.classList.remove('dragging');
                if (moved) {
                    const swallow = (ev: Event) => {
                        ev.stopPropagation();
                        ev.preventDefault();
                    };
                    track.addEventListener('click', swallow, { capture: true, once: true });
                }
            };
            track.addEventListener('mousedown', onDown);
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onUp);
            return () => {
                track.removeEventListener('mousedown', onDown);
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
            };
        });
        return () => cleanups.forEach((c) => c());
    }, [activeTab]);

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

    /* Shuffle — a random sample of output ids, re-rolled by the version
       bump. Random, so there's no ranking to game. */
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const shuffleIds = useMemo(() => {
        const picks = new Set<number>();
        const max = project.totalOutputs;
        while (picks.size < Math.min(SHUFFLE_SIZE, max)) {
            picks.add(1 + Math.floor(Math.random() * max));
        }
        return [...picks];
        // shuffleSeed is the re-roll trigger.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.totalOutputs, shuffleSeed]);

    const tab = (id: HomeTab, label: string) => (
        <div
            className={`pill pill-l1${activeTab === id ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            onClick={() => {
                setActiveTab(id);
                showToast(`TAB: ${label}`);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(id);
                    showToast(`TAB: ${label}`);
                }
            }}
        >
            <span className="stat-name">{label}</span>
        </div>
    );

    const saleDetail = (s: SaleRow): ReactNode => (
        <>
            <span className="f-highlight">{s.buyer}</span> bought{' '}
            <span className="f-highlight">
                {s.project} #{s.token}
            </span>{' '}
            for {s.priceEth} ETH
        </>
    );

    return (
        <TraitsProvider>
            <Hero
                ariaLabel="Price Discussion"
                titleRow={
                    <h1 className="project-title home-title">
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
            >
                {/* Tab row — same pill markup as the project page (sim 5161). */}
                <div className="profile-tabs-row" id="homeTabsRow">
                    {tab('new', 'New Art')}
                    {tab('sales', 'Sales')}
                    {tab('shuffle', 'Shuffle')}
                </div>
            </Hero>

            {/* What's New — per-project carousels of recent outputs. */}
            {activeTab === 'new' &&
                projects.map((p) => (
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

            {/* Sales Feed — real secondary sales platform-wide (mock now).
                Reuses the project-page activity-feed markup. */}
            {activeTab === 'sales' && (
                <section id="activity-feed" aria-label="Sales Feed">
                    <div className="feed-list">
                        {MOCK_SALES.map((s) => (
                            <div className="feed-row" key={s.id}>
                                <div className="feed-line" />
                                <div className="f-icon-wrap">✸&#xFE0E;</div>
                                <div className="f-time">{s.time}</div>
                                <div className="f-type">SALE</div>
                                <div className="f-content">{saleDetail(s)}</div>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* Shuffle — randomized discovery, re-rolls on demand. */}
            {activeTab === 'shuffle' && (
                <section aria-label="Shuffle">
                    <div className="home-shuffle-bar">
                        <button
                            className="home-shuffle-btn"
                            onClick={() => setShuffleSeed((s) => s + 1)}
                        >
                            ⟳&#xFE0E; Shuffle
                        </button>
                    </div>
                    <div className="home-shuffle-grid">
                        {shuffleIds.map((id) => (
                            <ArtworkCard key={`${shuffleSeed}-${id}`} id={id} />
                        ))}
                    </div>
                </section>
            )}
        </TraitsProvider>
    );
}
