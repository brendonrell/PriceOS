'use client';

/*
 * HomePageBody — the PD home / index surface (logged-out first impression).
 *
 * Delta off the project page (collection-as-template): same <Hero> chrome
 * + same tab row, different center.
 *
 * Home tabs (Brendon, 2026-06-12 — tab set is exactly these three):
 *   - Now Minting (default) → per-project carousels for projects at ≥12
 *                             mints, in the order they reached 12 — just
 *                             the carousels, no section header.
 *   - New Art               → the "New Uploads" text feed of uploaded
 *                             projects, newest first (a project graduates
 *                             to Now Minting at 12 mints).
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
import type { RealtimeChannel } from '@supabase/supabase-js';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { GhostFeedRows } from '../GhostFeed';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { getSupabaseBrowser } from '../../lib/supabase';
import { allProjects, getProject } from '../../lib/project/registry';
import HomeFacetBar, { type HomeSort } from './HomeFacetBar';
import type { HomeResponse } from '../../lib/home/homeData';

/* Outputs per carousel (Brendon 2026-06-13: 12, mobile + desktop). */
const CAROUSEL_SIZE = 12;
/* Outputs in the Shuffle grid — a fresh random project's 24 random outputs
   on every entry (Brendon 2026-06-13). */
const SHUFFLE_SIZE = 24;

/* "Featuring" credits — the REAL artist roster, from the registry
   (every project's artist, de-duped). New projects feed this automatically. */
const FEATURED_HANDLES: readonly string[] = [
    ...new Set(allProjects().map((p) => p.artistHandle)),
];

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
function HomeProjectCarousel({ eager = false }: { eager?: boolean }) {
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
                    <ArtworkCard key={id} id={id} eager={eager} />
                ))}
            </div>
        </section>
    );
}

/* Shuffle gallery — 24 random outputs of whatever project the parent picked
   for this entry, in the standard #gallery grid. Mounted under its own
   ProjectProvider so the cards paint THIS project's engine. */
function ShuffleGallery({ seed }: { seed: number }) {
    const project = useProject();
    const ids = useMemo(() => {
        const max = project.totalOutputs;
        const target = Math.min(SHUFFLE_SIZE, max);
        const picks = new Set<number>();
        while (picks.size < target) {
            picks.add(1 + Math.floor(Math.random() * max));
        }
        return [...picks];
        // seed is the re-roll trigger (a new project + fresh picks per entry).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.totalOutputs, seed]);
    return (
        <section id="gallery" aria-label={`Shuffle — ${project.title}`}>
            {ids.map((id) => (
                <ArtworkCard key={`${seed}-${id}`} id={id} eager />
            ))}
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
    const { showToast } = useToast();
    const { open: openModal } = useModal();

    /* Home CTA (Brendon, 2026-06-13) — the primary button is "Join The Chat",
       linking to the community Discord (same target as the connect-menu
       Discord link). */
    const DISCORD_URL = 'https://discord.gg/mJteKZmg28';

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

    const stats = feed?.stats ?? null;

    /* Sort / filter / search for the home project feeds (Brendon, 2026-06-13).
       Now Minting pours in EVERY graduated project (the old 30-cap is gone),
       so it carries the same controls as a project's Artworks tab — Newest /
       Oldest / A–Z, an Artist filter, and search. The same state drives the
       New Art feed so the two project lists behave alike. */
    const [homeSort, setHomeSort] = useState<HomeSort>('newest');
    const [artistFilter, setArtistFilter] = useState<string | null>(null);
    const [homeQuery, setHomeQuery] = useState('');

    const artistOf = (slug: string): string | null =>
        getProject(slug)?.artistHandle ?? null;

    /* Artist pool — only the handles actually present across the live feeds,
       so the filter never offers an artist with nothing behind it. */
    const homeArtists = useMemo(() => {
        const s = new Set<string>();
        for (const m of feed?.minting_now ?? []) {
            const a = artistOf(m.slug);
            if (a) s.add(a);
        }
        for (const u of feed?.uploads ?? []) {
            const a = artistOf(u.slug);
            if (a) s.add(a);
        }
        return [...s].sort((a, b) => a.localeCompare(b));
    }, [feed]);

    const matches = (slug: string, title: string): boolean => {
        if (artistFilter && artistOf(slug) !== artistFilter) return false;
        const q = homeQuery.trim().toLowerCase();
        if (!q) return true;
        const a = (artistOf(slug) ?? '').toLowerCase();
        return title.toLowerCase().includes(q) || a.includes(q);
    };

    /* Graduated projects, filtered + ordered. Newest = most-recently reached
       12 mints first (default); Oldest = the reverse; A–Z = by title. */
    const mintingView = useMemo(() => {
        const rows = (feed?.minting_now ?? []).filter((m) => matches(m.slug, m.title));
        return [...rows].sort((a, b) => {
            if (homeSort === 'az') return a.title.localeCompare(b.title);
            const av = a.reached_at ?? 0;
            const bv = b.reached_at ?? 0;
            return homeSort === 'newest' ? bv - av : av - bv;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feed, homeSort, artistFilter, homeQuery]);

    /* New uploads, same filters; Newest/Oldest order by upload moment. */
    const uploadsView = useMemo(() => {
        const rows = (feed?.uploads ?? []).filter((u) => matches(u.slug, u.title));
        return [...rows].sort((a, b) => {
            if (homeSort === 'az') return a.title.localeCompare(b.title);
            const av = a.uploaded_at ?? 0;
            const bv = b.uploaded_at ?? 0;
            return homeSort === 'newest' ? bv - av : av - bv;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [feed, homeSort, artistFilter, homeQuery]);

    /* Stable signature of the rendered carousel order — re-binds the
       drag-to-scroll handlers when filtering/sorting changes the row set. */
    const mintingKey = mintingView.map((m) => m.slug).join(',');

    const hasMintingBase = (feed?.minting_now?.length ?? 0) > 0;
    const hasUploadsBase = (feed?.uploads?.length ?? 0) > 0;

    /* Featuring — REAL artists (Brendon, 2026-06-12): two sprite+name chips
       from the registry roster + "& X others". The pair randomizes ONCE per
       page load (refresh = new pair; the live ticker is retired — Brendon's
       call after it misbehaved). First paint is deterministic so SSR/CSR
       agree; the mount effect re-rolls immediately. */
    const [featNames, setFeatNames] = useState<string[]>(() =>
        FEATURED_HANDLES.slice(0, FEATURE_SHOW),
    );
    useEffect(() => {
        setFeatNames(pickFeatured());
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
        // mintingKey re-binds when sort/filter changes the rendered row set.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, feed, mintingKey]);

    /* Shuffle — every ENTRY into the tab surfaces a DIFFERENT random project
       and a fresh 24 random outputs of it (Brendon, 2026-06-13). No re-roll
       button: leaving and coming back is the shuffle. */
    const [shuffleSeed, setShuffleSeed] = useState(0);
    useEffect(() => {
        if (activeTab === 'shuffle') setShuffleSeed((s) => s + 1);
    }, [activeTab]);
    /* Pool of projects that actually have outputs to show (graduated + new). */
    const shufflePool = useMemo(() => {
        const rows: { slug: string; minted: number }[] = [];
        for (const m of feed?.minting_now ?? []) rows.push({ slug: m.slug, minted: m.minted_count });
        for (const u of feed?.uploads ?? []) rows.push({ slug: u.slug, minted: u.minted_count });
        return rows.filter((p) => p.minted > 0);
    }, [feed]);
    const shufflePick = useMemo(() => {
        if (shufflePool.length === 0) return null;
        return shufflePool[Math.floor(Math.random() * shufflePool.length)];
        // shuffleSeed re-rolls the project on every tab entry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [shufflePool, shuffleSeed]);

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
                showToast(`Tab: ${label.toUpperCase()}`);
            }}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveTab(id);
                    showToast(`Tab: ${label.toUpperCase()}`);
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
                    /* One line, plain @name links — identical treatment to the
                       project page's social row (Brendon 2026-06-13: reverted
                       the sprite+name rectangle chips; CollectedPair kept but
                       unused in case it comes back). */
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Featuring</span>{' '}
                        <a className="profile-link" href={`/${featNames[0]}`}>@{featNames[0]}</a>
                        {featNames[1] && (
                            <>, <a className="profile-link" href={`/${featNames[1]}`}>@{featNames[1]}</a></>
                        )}{' '}
                        <span className="cbr-others">&amp; {featOthers} others</span>
                    </div>
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span className="stat-icon stat-icon-box">⬚&#xFE0E;</span>{' '}
                            <span className="stat-val">{stats ? stats.projects : '—'} PRO</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                            {/* Integer ETH only on the home stats row — decimals
                                cost width the row can't spare (Brendon, 2026-06-13). */}
                            <span className="stat-val stat-val-vol">{stats ? Math.round(Number(stats.volume_eth) || 0) : '—'} VOL</span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            <span className="stat-icon stat-icon-owners">⌗&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">{stats ? stats.minted : '—'} NFT<span style={{ fontSize: '0.72em' }}>s</span></span>
                        </span>
                    </div>
                }
            >
                {/* Action row — same chrome as the project page's mint +
                    soundtrack pair. Primary = Join The Chat (Discord);
                    second = Stickers (play icon retained). */}
                <div className="action-row">
                    <button
                        className="btn-mint btn-explore"
                        title="Join the chat on Discord"
                        onClick={() => window.open(DISCORD_URL, '_blank', 'noopener,noreferrer')}
                    >
                        <span className="mint-lbl">Join The Chat</span>
                    </button>
                    <a
                        className="btn-soundtrack"
                        title="Stickers"
                        role="button"
                        tabIndex={0}
                        onClick={() => openModal('stickers')}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                openModal('stickers');
                            }
                        }}
                    >
                        <span className="btn-icon-play">▶&#xFE0E;</span>{' '}STICKERS
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
                at 12+ mints, in the order they reached 12. No section header,
                the tab is the label. */}
            {activeTab === 'minting' && (
                <section aria-label="Now Minting">
                    {hasMintingBase && (
                        <HomeFacetBar
                            sort={homeSort}
                            setSort={setHomeSort}
                            artists={homeArtists}
                            artist={artistFilter}
                            setArtist={setArtistFilter}
                            query={homeQuery}
                            setQuery={setHomeQuery}
                        />
                    )}
                    {!feed && <div className="home-feed-loading">Loading…</div>}
                    {feed && !hasMintingBase && (
                        <div className="home-empty-note">
                            Projects land here at 12 mints — none yet.
                        </div>
                    )}
                    {feed && hasMintingBase && mintingView.length === 0 && (
                        <div className="home-empty-note">
                            No projects match — clear the filters to see them all.
                        </div>
                    )}
                    {/* Only the first carousel paints eagerly; every other
                        row lazy-paints through the card virtualizer as it
                        scrolls into view. Painting every project's 12 canvases
                        up front is what made home crawl (Brendon, 2026-06-13). */}
                    {mintingView.map((m, i) => (
                        <ProjectProvider
                            key={m.slug}
                            slug={m.slug}
                            initialTotal={m.minted_count}
                        >
                            <HomeProjectCarousel eager={i === 0} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* New Art — the New Uploads text feed: uploaded projects,
                newest first (a project graduates to Now Minting at 12). */}
            {activeTab === 'new' && (
                <section className="home-uploads" aria-label="New Uploads">
                    {hasUploadsBase && (
                        <HomeFacetBar
                            sort={homeSort}
                            setSort={setHomeSort}
                            artists={homeArtists}
                            artist={artistFilter}
                            setArtist={setArtistFilter}
                            query={homeQuery}
                            setQuery={setHomeQuery}
                        />
                    )}
                    <div className="home-section-head">
                        <span className="home-section-title">New Uploads</span>
                    </div>
                    <div className="feed-list">
                        {!hasUploadsBase ? <GhostFeedRows /> : uploadsView.length === 0 ? (
                            <div className="home-empty-note">
                                No uploads match — clear the filters to see them all.
                            </div>
                        ) : uploadsView.map((u) => {
                            const def = getProject(u.slug);
                            const title = def?.displayName ?? u.title;
                            return (
                                <div className="feed-row" key={u.slug}>
                                    <div className="feed-line" />
                                    <div className="f-icon-wrap">✶&#xFE0E;</div>
                                    <div className="f-time">{fmtUploadDate(u.uploaded_at)}</div>
                                    <div className="f-type">UPLOAD</div>
                                    <div className="f-content">
                                        <a className="f-highlight upload-title" href={`/art/${u.slug}`}>
                                            {title}
                                        </a>
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
            {activeTab === 'shuffle' &&
                (shufflePick ? (
                    <ProjectProvider
                        key={`${shuffleSeed}:${shufflePick.slug}`}
                        slug={shufflePick.slug}
                        initialTotal={shufflePick.minted}
                    >
                        <ShuffleGallery seed={shuffleSeed} />
                    </ProjectProvider>
                ) : (
                    <section id="gallery" aria-label="Shuffle" />
                ))}
        </TraitsProvider>
    );
}
