'use client';

/*
 * HomePageBody — the PD home / index surface (logged-out first impression).
 *
 * Delta off the project page (collection-as-template): same <Hero> chrome
 * + same tab row, different center.
 *
 * Home tabs (Brendon, 2026-06-12 — tab set is exactly these three):
 *   - Now Minting (default) → per-project carousels for projects at ≥6
 *                             mints, in the order they reached 6 — just
 *                             the carousels, no section header.
 *   - New Art               → the "New Uploads" text feed of uploaded
 *                             projects, newest first (a project graduates
 *                             to Now Minting at 6 mints).
 *   - ⟳ (Shuffle)           → randomized discovery, re-rolls on demand.
 *                             Icon-only pill (Courier), real build later.
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
import { useRouter } from 'next/navigation';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Hero from '../hero/Hero';
import CollectedPair from '../hero/CollectedPair';
import ArtworkCard from '../ArtworkCard';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { getSupabaseBrowser } from '../../lib/supabase';
import { allProjects, getProject } from '../../lib/project/registry';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import type { HomeResponse } from '../../lib/home/homeData';

/* Outputs per carousel (Brendon: 6). */
const CAROUSEL_SIZE = 6;
/* Projects shown on home (Brendon: ~30). Caps the Minting Now carousels. */
const MAX_HOME_PROJECTS = 30;
/* Tiles in the Shuffle grid. */
const SHUFFLE_SIZE = 12;

/* Rotating "Featuring" credits — the REAL artist roster, from the registry
   (every project's artist, de-duped). New projects feed this automatically. */
const FEATURED_HANDLES: readonly string[] = [
    ...new Set(allProjects().map((p) => p.artistHandle)),
];
const FEATURE_ROTATE_MS = 2600;

/* Featured handles shown at once (Brendon, 2026-06-12: two sprite+name
   chips — the chips give each name more presence than the old bare trio). */
const FEATURE_SHOW = 2;

/* Distinct random handles for the Featuring row. */
function pickFeatured(): string[] {
    const pool = [...FEATURED_HANDLES];
    const out: string[] = [];
    while (out.length < FEATURE_SHOW && pool.length > 0) {
        out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return out;
}

/* Poll fallback for the live feed — Realtime push is the primary signal;
   this floor-sweeps staleness when the websocket can't connect. */
const FEED_POLL_MS = 30_000;

type HomeTab = 'minting' | 'new' | 'shuffle';

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

export default function HomePageBody({
    initialFeed = null,
}: {
    /** Server-computed home payload (app/page.tsx) — carousels + stats in
        the first paint. Null only when the server read failed. */
    initialFeed?: HomeResponse | null;
}) {
    const project = useProject();
    const { showToast } = useToast();
    const router = useRouter();

    /* Hero CTAs (Brendon, 2026-06-12) — both are uniform random draws, so
       the platform never picks favourites (neutrality law):
       EXPLORE → a project at random; SHUFFLE → a soundtrack at random. */
    const handleExplore = () => {
        const all = allProjects();
        const pick = all[Math.floor(Math.random() * all.length)];
        router.push(`/art/${pick.slug}`);
    };
    const handleShuffleSoundtrack = () => {
        const withSound = allProjects().filter((p) => p.soundtrack);
        if (withSound.length === 0) {
            showToast('Soundtracks: NONE YET');
            return;
        }
        const pick = withSound[Math.floor(Math.random() * withSound.length)];
        window.open(
            playlistWatchUrl(pick.soundtrack!.playlistId),
            '_blank',
            'noopener,noreferrer',
        );
    };

    const [activeTab, setActiveTab] = useState<HomeTab>('minting');

    /* The live home payload (stats + uploads + minting now). Server-seeded,
       re-pulled on every Realtime push / refresh nudge, poll fallback. */
    const [feed, setFeed] = useState<HomeResponse | null>(initialFeed);
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

    /* Featuring — REAL artists (Brendon, 2026-06-12): the registry's artist
       roster, one sprite+name chip at a time + "& X others", swapping on
       the interval with the split-flap flip. First paint is deterministic
       (first handle) so SSR/CSR agree; the first interval tick randomizes. */
    const [featNames, setFeatNames] = useState<string[]>(() =>
        FEATURED_HANDLES.slice(0, FEATURE_SHOW),
    );
    const [featTick, setFeatTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => {
            setFeatNames(pickFeatured());
            setFeatTick((n) => n + 1);
        }, FEATURE_ROTATE_MS);
        return () => clearInterval(t);
    }, []);
    const featOthers = Math.max(0, FEATURED_HANDLES.length - FEATURE_SHOW);

    /* Mouse drag-to-scroll for the carousels (no visible scrollbar). Touch
       already swipes natively; this gives desktop mouse users a grab-drag.
       A drag past a few px swallows the trailing click so it doesn't open
       the card modal. Re-binds when the Now Minting tab (re)mounts the
       tracks (and when the live feed lands/changes, adding/removing rows). */
    useEffect(() => {
        if (activeTab !== 'minting') return;
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

    /* Shuffle — a random sample of output ids. No re-roll button (Brendon,
       2026-06-12): every ENTRY into the tab re-shuffles, so leaving and
       coming back is the shuffle. Random, so there's no ranking to game. */
    const [shuffleSeed, setShuffleSeed] = useState(0);
    useEffect(() => {
        if (activeTab === 'shuffle') setShuffleSeed((s) => s + 1);
    }, [activeTab]);
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

    /* Tab pill. `display` lets a tab wear something other than its toast
       label — the Shuffle tab is an icon-only pill (Brendon, 2026-06-12). */
    const tab = (
        id: HomeTab,
        label: string,
        display?: ReactNode,
        extraClass?: string,
    ) => (
        <div
            className={`pill pill-l1${extraClass ? ` ${extraClass}` : ''}${activeTab === id ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            title={label}
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
            <span className="stat-name">{display ?? label}</span>
        </div>
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
                    /* Two fixed lines, one chip per line (Brendon,
                       2026-06-12): "Featuring [chip]" up top, "[chip] & X
                       others" below — steady height while chips flap. */
                    <div className="hero-line collected-by-row info-line feat-rotator">
                        <span className="feat-line">
                            <span className="cbr-label">Featuring</span>{' '}
                            <span key={`${featTick}-a-${featNames[0]}`} className="feat-flap">
                                <CollectedPair handle={featNames[0]} />
                            </span>
                        </span>
                        <span className="feat-line">
                            {featNames[1] && (
                                <span
                                    key={`${featTick}-b-${featNames[1]}`}
                                    className="feat-flap"
                                    style={{ animationDelay: '130ms' }}
                                >
                                    <CollectedPair handle={featNames[1]} />
                                </span>
                            )}{' '}
                            <span className="cbr-others">&amp; {featOthers} others</span>
                        </span>
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
                {/* Action row — same chrome as the project page's mint +
                    soundtrack pair. EXPLORE = random project; SHUFFLE =
                    random project soundtrack (play icon matches the
                    project soundtrack button). */}
                <div className="action-row">
                    <button
                        className="btn-mint"
                        title="Explore — opens a project at random"
                        onClick={handleExplore}
                    >
                        <span className="mint-lbl">EXPLORE</span>
                    </button>
                    <a
                        className="btn-soundtrack"
                        title="Shuffle — plays a project soundtrack at random"
                        role="button"
                        tabIndex={0}
                        onClick={handleShuffleSoundtrack}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                handleShuffleSoundtrack();
                            }
                        }}
                    >
                        <span className="btn-icon-play">▶&#xFE0E;</span>{' '}SHUFFLE
                    </a>
                </div>

                {/* Tab row — same pill markup as the project page (sim 5161).
                    Tab set is exactly: Now Minting / New Art / ⟳ (Brendon,
                    2026-06-12; Sales left the row with this set). */}
                <div className="profile-tabs-row" id="homeTabsRow">
                    {tab('minting', 'Now Minting')}
                    {tab('new', 'New Art')}
                    {tab('shuffle', 'Shuffle', <>⟳&#xFE0E;</>, 'pill-shuffle-icon')}
                </div>
            </Hero>

            {/* Now Minting (default) — just the carousels: one per project
                at 6+ mints, in the order they reached 6. No section header,
                the tab is the label. */}
            {activeTab === 'minting' && (
                <section aria-label="Now Minting">
                    {!feed && <div className="home-feed-loading">Loading…</div>}
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
            )}

            {/* New Art — the New Uploads text feed: uploaded projects,
                newest first (a project graduates to Now Minting at 6). */}
            {activeTab === 'new' && (
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
                                        <a className="f-highlight upload-title" href={`/art/${u.slug}`}>
                                            {title}
                                        </a>{' '}
                                        — {u.max_supply} outputs
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>
            )}

            {/* Shuffle — randomized discovery in THE gallery grid itself
                (#gallery — never a one-card-per-row list; the output page
                is the only single-artwork surface). Re-rolls on every tab
                entry; no button. */}
            {activeTab === 'shuffle' && (
                <section id="gallery" aria-label="Shuffle">
                    {shuffleIds.map((id) => (
                        <ArtworkCard key={`${shuffleSeed}-${id}`} id={id} eager />
                    ))}
                </section>
            )}
        </TraitsProvider>
    );
}
