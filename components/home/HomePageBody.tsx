'use client';

/*
 * HomePageBody — the PD home / index surface (logged-out first impression).
 *
 * Delta off the project page (collection-as-template): same <Hero> chrome
 * + same tab row, different center.
 *
 * Home tabs are the three surfaces that are neither curated nor gameable
 * (Brendon's call — the platform stays neutral, nothing rankable to game):
 *   - New Art (default)    → two LIVE sections off /api/home (Brendon,
 *                            2026-06-11): "New Uploads", a text-only feed of
 *                            uploaded projects (newest first), and "Minting
 *                            Now", per-project carousels for projects at ≥6
 *                            mints, in the order they reached 6. A project
 *                            graduates from the list to the carousels at 6.
 *   - Sales Feed           → real secondary sales across the platform
 *                            (money-backed truth; mock now, indexer later)
 *   - Shuffle              → randomized discovery, re-rolls on demand
 *                            (no ranking = nothing to game)
 *
 * "Live" = Supabase Realtime push on projects/events re-pulls /api/home and
 * nudges the carousels' providers ('pd:project-refresh'), with a slow poll
 * as the fallback when the socket can't connect. The hero stats row reads
 * the same payload, so it's live too.
 *
 * ArtworkCard calls useTraits(), which throws outside a TraitsProvider —
 * so the body is wrapped in one here. The trait UI isn't rendered on home.
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { getSupabaseBrowser } from '../../lib/supabase';
import { getProject } from '../../lib/project/registry';
import type { HomeResponse } from '../../app/api/home/route';

/* Outputs per carousel (Brendon: 6). */
const CAROUSEL_SIZE = 6;
/* Projects shown on home (Brendon: ~30). Caps the Minting Now carousels. */
const MAX_HOME_PROJECTS = 30;
/* Tiles in the Shuffle grid. */
const SHUFFLE_SIZE = 12;

/* Rotating "Featuring" credits — test-phase handles. */
const FEATURED_ARTISTS = ['@brendon', '@opus4-6', '@snowfro', '@claude', '@rudxane'];
const FEATURE_ROTATE_MS = 2600;

/* Poll fallback for the live feed — Realtime push is the primary signal;
   this floor-sweeps staleness when the websocket can't connect. */
const FEED_POLL_MS = 30_000;

type HomeTab = 'new' | 'sales' | 'shuffle';

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

/* "JUN 11" — compact upload-date stamp for the feed's time column. */
function fmtUploadDate(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
        .toUpperCase();
}

/* One Minting Now carousel — mounted under its own ProjectProvider so the
   cards paint THIS project's engine (same markup as the original single-
   project carousel). totalOutputs is provider-live: a mint advances the row
   without a reload (the provider re-fetches on 'pd:project-refresh'). */
function HomeProjectCarousel() {
    const project = useProject();
    const ids = Array.from(
        { length: CAROUSEL_SIZE },
        (_, i) => project.totalOutputs - i,
    ).filter((id) => id >= 1);
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
                {ids.map((id) => (
                    <ArtworkCard key={id} id={id} eager />
                ))}
            </div>
        </section>
    );
}

export default function HomePageBody() {
    const project = useProject();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<HomeTab>('new');

    /* The live home payload (stats + uploads + minting now). Pulled fresh on
       mount, re-pulled on every Realtime push / refresh nudge, poll fallback. */
    const [feed, setFeed] = useState<HomeResponse | null>(null);
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch('/api/home', { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: HomeResponse | null) => {
                    if (!cancelled && d) setFeed(d);
                })
                .catch(() => {
                    /* offline / 5xx — last good payload stays up */
                });
        };
        load();
        /* DB push → one window-wide nudge: our listener re-pulls /api/home,
           and every mounted ProjectProvider re-fetches its outputs, so the
           carousels advance in the same beat. */
        const onDbChange = () => {
            window.dispatchEvent(new Event('pd:project-refresh'));
        };
        let channel: RealtimeChannel | null = null;
        try {
            channel = getSupabaseBrowser()
                .channel('home-live')
                .on(
                    'postgres_changes',
                    { event: '*', schema: 'public', table: 'projects' },
                    onDbChange,
                )
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'events' },
                    onDbChange,
                )
                .subscribe();
        } catch {
            /* anon env missing in this build — the poll below covers it */
        }
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        const poll = window.setInterval(load, FEED_POLL_MS);
        return () => {
            cancelled = true;
            window.clearInterval(poll);
            window.removeEventListener('pd:project-refresh', onRefresh);
            if (channel) {
                try {
                    getSupabaseBrowser().removeChannel(channel);
                } catch {
                    /* socket already gone */
                }
            }
        };
    }, []);

    const uploads = feed?.uploads ?? [];
    const mintingNow = (feed?.minting_now ?? []).slice(0, MAX_HOME_PROJECTS);
    const stats = feed?.stats ?? null;

    /* Rotating "Featuring" lead credit. */
    const [featIdx, setFeatIdx] = useState(0);

    /* By-line follower count — @brendon's live number beside the home hero
       name (Brendon 2026-06-11). Best-effort: renders only once loaded. */
    const [byFollowers, setByFollowers] = useState<number | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch('/api/user/by-handle/brendon', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (!cancelled && d && typeof d.follower_count === 'number')
                    setByFollowers(d.follower_count);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, []);
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
       the card modal. Re-binds when the New Art tab (re)mounts the tracks
       (and when the live feed lands/changes, which adds or removes rows). */
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
    }, [activeTab, feed]);

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
                            {byFollowers !== null && (
                                <span className="by-follower-stats" title="Followers">
                                    <span className='stat-icon stat-icon-followers'>{'\u26AC\uFE0E'}</span>{' '}
                                    <b>{byFollowers}</b>
                                </span>
                            )}
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
                            <span className="stat-val">{stats ? stats.projects : '—'} PROJECTS</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-vol">{stats ? stats.volume_eth : '—'} VOL</span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            <span className="stat-icon stat-icon-owners">⌗&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">{stats ? stats.minted : '—'} MINTED</span>
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

            {/* New Art — two live sections. New Uploads: text feed of
                uploaded projects, newest first (a project graduates out at
                6 mints). Minting Now: per-project carousels for projects at
                6+ mints, in the order they reached 6. */}
            {activeTab === 'new' && (
                <>
                    <section className="home-uploads" aria-label="New Uploads">
                        <div className="home-section-head">
                            <span className="home-section-title">New Uploads</span>
                        </div>
                        {!feed && <div className="home-feed-loading">Loading…</div>}
                        {feed && uploads.length === 0 && (
                            <div className="home-empty-note">No uploads yet.</div>
                        )}
                        <div className="feed-list">
                            {uploads.map((u) => {
                                const def = getProject(u.slug);
                                const title = def?.displayName ?? u.title;
                                const artist = def?.artistHandle ?? null;
                                return (
                                    <div className="feed-row" key={u.slug}>
                                        <div className="feed-line" />
                                        <div className="f-icon-wrap">✶&#xFE0E;</div>
                                        <div className="f-time">{fmtUploadDate(u.uploaded_at)}</div>
                                        <div className="f-type">UPLOAD</div>
                                        <div className="f-content">
                                            {artist && (
                                                <>
                                                    <a className="f-highlight" href={`/${artist}`}>
                                                        @{artist}
                                                    </a>{' '}
                                                    uploaded{' '}
                                                </>
                                            )}
                                            {!artist && <>Uploaded </>}
                                            <a className="f-highlight" href={`/art/${u.slug}`}>
                                                {title}
                                            </a>{' '}
                                            — {u.max_supply} outputs
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    <section aria-label="Minting Now">
                        <div className="home-section-head">
                            <span className="home-section-title">Minting Now</span>
                        </div>
                        {feed && mintingNow.length === 0 && (
                            <div className="home-empty-note">
                                Projects land here at 6 mints — none yet.
                            </div>
                        )}
                        {mintingNow.map((m) => (
                            <ProjectProvider
                                key={m.slug}
                                slug={m.slug}
                                initialTotal={m.minted_count}
                            >
                                <HomeProjectCarousel />
                            </ProjectProvider>
                        ))}
                    </section>
                </>
            )}

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
