'use client';

/*
 * HomePageBody — the PD home / index surface (logged-out first impression).
 *
 * Delta off the project page (collection-as-template): same <Hero> chrome
 * + same tab row, different center.
 *
 * Home tabs (Brendon, 2026-06-12 — tab set is exactly these three):
 *   - Now Minting (default) → per-project carousels for projects at ≥18
 *                             mints, in the order they reached 18 — just
 *                             the carousels, no section header.
 *   - New Art               → the "New Uploads" text feed of uploaded
 *                             projects, newest first (a project graduates
 *                             to Now Minting at 18 mints).
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

import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import SectionHead from '../SectionHead';
import PriceDaySlot from '../priceday/PriceDaySlot';
import { GhostFeedRows } from '../GhostFeed';
import { GhostCarousels, GhostGallery } from './HomeGhosts';
import { TraitsProvider, useTraits } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { getSupabaseBrowser } from '../../lib/supabase';
import { allProjects, getProject, projectTraits } from '../../lib/project/registry';
import HomeFacetBar, { type HomeSort } from './HomeFacetBar';
import HomeProjectFacetBar, {
    projectFacetValueOf,
    type EnrichedProject,
    type HomeSortKey,
    type HomeSortDir,
} from './HomeProjectFacetBar';
import { FEED_LIFECYCLE, FEED_SEQ, milestoneByKey } from '../../lib/home/milestones';
import { openExternal } from '../../lib/pwa/openExternal';
import { DISCORD_URL } from '../../lib/config/discord';
import type { HomeResponse } from '../../lib/home/homeData';

/* Outputs per carousel (Brendon 2026-06-13: 12, mobile + desktop;
   raised to 18 on 2026-06-18). Off-screen tiles paint lazily via the
   virtualizer, so the extra six don't cost page-load time. */
const CAROUSEL_SIZE = 18;
/* Now-Minting carousels deliberately omit the "by @artist" byline today
   (Brendon's call). Flip this to true to show it on every carousel — it's
   already formatted + wraps as a unit (Brendon, 2026-06-16). */
const SHOW_CAROUSEL_ARTIST = false;
/* Outputs in the Shuffle grid — a fresh random project's 18 random outputs
   on every entry (Brendon 2026-06-13). */
const SHUFFLE_SIZE = 18;

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

/* Home activity-feed item — a project lifecycle moment (uploaded · graduated ·
   each project milestone · sold-out/ascension). `label` is the ALLCAPS event
   name shown in the feed. */
interface HomeFeedItem { slug: string; title: string; label: string; glyph: string; cls?: string; ts: number; seq: number }

/* "JUN 11" — compact upload-date stamp for the feed's time column. */
function fmtUploadDate(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleDateString('en-US', { month: 'short', day: '2-digit', timeZone: 'UTC' })
        .toUpperCase();
}

/* "15:42" — clock time of the upload (24-hour, PD house style), shown in place
   of the redundant "UPLOAD" type label (the New Uploads header already says
   what these are). */
function fmtUploadTime(ms: number | null): string {
    if (ms == null) return '—';
    return new Date(ms)
        .toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
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
                {SHOW_CAROUSEL_ARTIST && getProject(project.slug)?.artistHandle && (
                    <span className="section-head-by">
                        {' '}by <a href={`/${getProject(project.slug)!.artistHandle}`}>@{getProject(project.slug)!.artistHandle}</a>
                    </span>
                )}
            </div>
            <div className="home-carousel-track">
                {ids.map((id) => (
                    /* Carousel tiles cap at ~120px — paint a small canvas, not the
                       full 400px grid res, so a page of carousels stays snappy. */
                    <ArtworkCard key={id} id={id} eager={eager} renderSize={200} />
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
    const artist = getProject(project.slug)?.artistHandle ?? null;
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
        /* Cards lazy-paint through the virtualizer (no eager flag) — only the
           on-screen screenful paints on arrival, the rest as they scroll in.
           Forcing all 24 to paint at once was the Shuffle entry lag, worst on
           heavy projects (Brendon, 2026-06-13). */
        <>
            {/* Shuffle byline — the picked project + artist, Courier, sitting in
                the same spot as the New Uploads header (Brendon, 2026-06-15). */}
            <SectionHead
                title={project.title}
                titleHref={`/art/${project.slug}`}
                artist={artist}
                className="shuffle-head"
            />
            <section id="gallery" aria-label={`Shuffle — ${project.title}`}>
                {ids.map((id) => (
                    /* Shuffle teasers also show small — paint a smaller canvas. */
                    <ArtworkCard key={`${seed}-${id}`} id={id} renderSize={240} />
                ))}
            </section>
        </>
    );
}

function HomePageBodyInner({
    initialFeed = null,
}: {
    /** Server-computed home payload (app/page.tsx) — carousels + stats in
        the first paint. Null only when the server read failed. */
    initialFeed?: HomeResponse | null;
}) {
    const { showToast } = useToast();
    const { open: openModal } = useModal();
    const { siweAddress, handle: viewerHandle } = useAuth();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    const [activeTab, setActiveTab] = useState<HomeTab>('minting');

    /* Shuffle is non-essential: it shows ONLY when all three tabs fit on one
       line, and hides (rather than wrapping and disturbing the layout) when they
       don't — re-checked on resize/rotate so it returns the instant there's room,
       like the hero date in landscape (Brendon, 2026-06-17). Measured, not a
       fixed breakpoint, so it always shows whenever it genuinely fits. */
    const tabsRowRef = useRef<HTMLDivElement>(null);
    const [hideShuffle, setHideShuffle] = useState(false);
    useEffect(() => {
        const row = tabsRowRef.current;
        if (!row || typeof window === 'undefined') return;
        const measure = () => {
            // Show Shuffle for the test, then check if it actually wrapped to a
            // lower line than the other tabs (flex pills shrink rather than
            // overflow, so a width test is unreliable — detect the wrap directly).
            row.classList.add('tabs-measuring');
            const pills = row.querySelectorAll<HTMLElement>('.pill-l1');
            const shuf = row.querySelector<HTMLElement>('.pill-shuffle-icon');
            let wrapped = false;
            if (pills.length && shuf) {
                wrapped = shuf.getBoundingClientRect().top > pills[0].getBoundingClientRect().top + 2;
            }
            row.classList.remove('tabs-measuring');
            setHideShuffle(wrapped);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(row);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        // Re-measure once the custom tab font has loaded (it changes pill widths).
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts) fonts.ready.then(measure).catch(() => {});
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, []);

    /* Same treatment for the Stickers button: it shows beside Join The Chat only
       when both fit on one line, and hides (not wraps) otherwise (Brendon,
       2026-06-17). Join The Chat always stays. */
    const actionRowRef = useRef<HTMLDivElement>(null);
    const [hideStickers, setHideStickers] = useState(false);
    useEffect(() => {
        const row = actionRowRef.current;
        if (!row || typeof window === 'undefined') return;
        const measure = () => {
            row.classList.add('row-measuring');
            const chat = row.querySelector<HTMLElement>('.btn-mint');
            const stick = row.querySelector<HTMLElement>('.btn-soundtrack');
            let wrapped = false;
            if (chat && stick) {
                // The two buttons differ in height and are centre-aligned, so a
                // top-vs-top test misreads the same line — Stickers is only
                // wrapped if it starts at/after the chat button's BOTTOM edge.
                wrapped = stick.getBoundingClientRect().top >= chat.getBoundingClientRect().bottom - 2;
            }
            row.classList.remove('row-measuring');
            setHideStickers(wrapped);
        };
        measure();
        const ro = new ResizeObserver(measure);
        ro.observe(row);
        window.addEventListener('resize', measure);
        window.addEventListener('orientationchange', measure);
        const fonts = (document as Document & { fonts?: FontFaceSet }).fonts;
        if (fonts) fonts.ready.then(measure).catch(() => {});
        return () => {
            ro.disconnect();
            window.removeEventListener('resize', measure);
            window.removeEventListener('orientationchange', measure);
        };
    }, []);

    /* @brendon's real follower count + mutual badge beside the home byline —
       PD is his art, so the home credits him exactly like an artist on a project
       page (Brendon 2026-06-15). Hidden when he has zero followers. */
    const { notifs } = usePdNotifs();
    const [brendonSocial, setBrendonSocial] = useState<{ followers: number; mutual: boolean }>(
        { followers: 0, mutual: false },
    );
    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            try {
                const profRes = await fetch('/api/user/by-handle/brendon', { cache: 'no-store' });
                const prof = profRes.ok ? await profRes.json() : null;
                const followers = prof?.follower_count ?? 0;
                /* A user is mutuals with themselves (Brendon, 2026-06-16) — so
                   @brendon viewing the home credit (his own name) gets the
                   mutual badge without a real self-follow row. */
                let mutual =
                    (viewerHandle ?? '').toLowerCase().replace(/^@/, '') === 'brendon';
                if (!mutual && siweAddress) {
                    const fRes = await fetch(`/api/follows/${siweAddress.toLowerCase()}`, { cache: 'no-store' });
                    const f = fRes.ok ? await fRes.json() : null;
                    const lc = (a: unknown) => (Array.isArray(a) ? (a as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, ''));
                    const following = lc(f?.following_handles);
                    const followerH = lc(f?.follower_handles);
                    mutual = following.includes('brendon') && followerH.includes('brendon');
                }
                if (!cancelled) setBrendonSocial({ followers, mutual });
            } catch { /* keep last good */ }
        };
        load();
        const onCh = () => load();
        window.addEventListener('pd:follows-changed', onCh);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', onCh); };
    }, [siweAddress, viewerHandle]);

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
        // Only poll the home feed while the tab is visible; refresh on return.
        const poll = window.setInterval(() => { if (!document.hidden) load(); }, FEED_POLL_MS);
        const onVis = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            window.clearInterval(poll);
            window.removeEventListener('pd:project-refresh', onRefresh);
            document.removeEventListener('visibilitychange', onVis);
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

    /* Now Minting sort — LOCAL (kept off the global SortContext so it can't
       change the project pages' default sort). Date = birth order (desc =
       newest); Price = mint price; Feed = the activity feed (new-art events
       for now). */
    const [mintSort, setMintSort] = useState<{ key: HomeSortKey; dir: HomeSortDir }>(
        { key: 'grad', dir: 'desc' },
    );
    const onMintSort = (key: HomeSortKey) =>
        setMintSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: key === 'price' || key === 'az' ? 'asc' : 'desc' },
        );
    const applyMintSort = (key: HomeSortKey, dir: HomeSortDir) => setMintSort({ key, dir });

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

    /* Each graduated project enriched with its computed birth-traits (Artist ·
       @name · PriceDay · Sun · Moon · Rising · Fate) + live Status + mint price
       — the project-level analogue of an Output's traits. The facet bar reads
       this full set for its value pools. */
    const enrichedMinting = useMemo<EnrichedProject[]>(() => {
        return (feed?.minting_now ?? []).map((m) => {
            const def = getProject(m.slug);
            return {
                slug: m.slug,
                title: def?.displayName ?? m.title,
                mintPriceEth: def?.mintPriceEth ?? 0,
                minted: m.minted_count,
                birthMs: m.uploaded_at,
                reachedMs: m.reached_at,
                traits: projectTraits(
                    m.slug,
                    m.uploaded_at ?? undefined,
                    m.minted_count,
                ),
            };
        });
    }, [feed]);

    /* Filter + sort the carousels by the project facets / search / mint-price
       range — the Collected predicate, over projects instead of Outputs. */
    const visibleMinting = useMemo<EnrichedProject[]>(() => {
        const minV = parseFloat(priceMin);
        const maxV = parseFloat(priceMax);
        const hasMin = !Number.isNaN(minV);
        const hasMax = !Number.isNaN(maxV);
        const q = searchQuery.trim().toLowerCase();
        const activeCats = Object.keys(activeFilters).filter((c) => activeFilters[c].size > 0);

        const filtered = enrichedMinting.filter((p) => {
            for (const cat of activeCats) {
                const v = projectFacetValueOf(cat, p);
                if (v === undefined || !activeFilters[cat].has(v)) return false;
            }
            if (q) {
                const hay = `${p.traits.Artist ?? ''} ${p.traits.Project ?? ''} ${p.title}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (hasMin && p.mintPriceEth < minV) return false;
            if (hasMax && p.mintPriceEth > maxV) return false;
            return true;
        });

        const dirMult = mintSort.dir === 'asc' ? 1 : -1;
        if (mintSort.key === 'price') {
            filtered.sort((a, b) => (a.mintPriceEth - b.mintPriceEth) * dirMult || a.slug.localeCompare(b.slug));
        } else if (mintSort.key === 'az') {
            filtered.sort((a, b) => a.title.localeCompare(b.title) * dirMult || a.slug.localeCompare(b.slug));
        } else if (mintSort.key === 'date') {
            // Upload date — the project's birthday (uploaded_at), newest first by
            // default. The clock-glyph sort (Brendon 2026-06-23).
            filtered.sort((a, b) => ((a.birthMs ?? -Infinity) - (b.birthMs ?? -Infinity)) * dirMult || a.slug.localeCompare(b.slug));
        } else {
            // 'grad' (+ 'feed') — ORDER OF GRADUATING: when the project crossed
            // into Now Minting, newest first by default so a fresh graduation
            // pops straight to the top. The default sort, glyph ⟢⟢.
            filtered.sort((a, b) => ((a.reachedMs ?? -Infinity) - (b.reachedMs ?? -Infinity)) * dirMult || a.slug.localeCompare(b.slug));
        }
        return filtered;
    }, [enrichedMinting, activeFilters, searchQuery, priceMin, priceMax, mintSort]);

    /* Activity feed (FEED sort) — project LIFECYCLE events merged across every
       project: UPLOADED (born), GRADUATED (crossed 18 into Now Minting), SOLD
       OUT. Newest first by default; the sort dir flips it. A graduated project
       contributes both its upload and graduation rows. */
    const feedView = useMemo<HomeFeedItem[]>(() => {
        const items: HomeFeedItem[] = [];
        const push = (
            slug: string, fallbackTitle: string,
            label: string, glyph: string, cls: string | undefined,
            ms: number | null, seq: number,
        ) => {
            if (ms == null) return;
            items.push({ slug, title: getProject(slug)?.displayName ?? fallbackTitle, label, glyph, cls, ts: ms, seq });
        };
        const addMilestones = (slug: string, title: string, ms: Record<string, number>) => {
            for (const [count, ts] of Object.entries(ms)) {
                const m = milestoneByKey(count);
                if (m) push(slug, title, m.label, m.glyph, m.cls, ts, m.count);
            }
        };
        const L = FEED_LIFECYCLE;
        for (const u of feed?.uploads ?? []) {
            push(u.slug, u.title, L.upload.label, L.upload.glyph, undefined, u.uploaded_at, FEED_SEQ.upload);
            addMilestones(u.slug, u.title, u.milestones);
        }
        for (const m of feed?.minting_now ?? []) {
            push(m.slug, m.title, L.upload.label, L.upload.glyph, undefined, m.uploaded_at, FEED_SEQ.upload);
            addMilestones(m.slug, m.title, m.milestones);
            push(m.slug, m.title, L.graduated.label, L.graduated.glyph, L.graduated.cls, m.reached_at, FEED_SEQ.graduated);
            push(m.slug, m.title, L.ascension.label, L.ascension.glyph, undefined, m.sold_out_at, FEED_SEQ.ascension);
        }
        const dirMult = mintSort.dir === 'asc' ? 1 : -1;
        // Order by time, then by the milestone sequence so same-transaction
        // events (identical ts) still read FIRST BLOOD → GRADUATED → … in order.
        items.sort((a, b) => (a.ts - b.ts || a.seq - b.seq) * dirMult);
        return items;
    }, [feed, mintSort.dir]);

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
    const mintingKey = visibleMinting.map((m) => m.slug).join(',');

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
    /* Live "flipping" featuring row (Brendon, 2026-06-15 — back from retirement):
       re-roll the two shown names on a timer; each name card flips in. The row's
       height is locked in CSS so cycling never reflows the hero. First paint is
       deterministic (SSR/CSR agree); the mount re-roll + interval take over. */
    useEffect(() => {
        setFeatNames(pickFeatured());
        const id = window.setInterval(() => setFeatNames(pickFeatured()), 3600);
        return () => window.clearInterval(id);
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

    /* Shuffle — each visit surfaces a DIFFERENT random project + a fresh 24
       random outputs (Brendon, 2026-06-13). The re-roll fires when LEAVING the
       tab, so the next project is already chosen by the time the user returns —
       arrival just lazy-paints the pre-decided pick instead of re-rolling AND
       repainting in the same beat (the entry lag). No re-roll button. */
    const [shuffleSeed, setShuffleSeed] = useState(0);
    const prevTabRef = useRef<HomeTab>(activeTab);
    useEffect(() => {
        const prev = prevTabRef.current;
        prevTabRef.current = activeTab;
        if (prev === 'shuffle' && activeTab !== 'shuffle') {
            setShuffleSeed((s) => s + 1);
        }
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
        <>
            <Hero
                ariaLabel="Price Discussion"
                titleRow={
                    <h1 className="project-title home-title">
                        <span>Price Discussion</span>
                        <PriceDaySlot />
                    </h1>
                }
                identityRow={
                    <div className="hero-line project-custom home-id-row">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/brendon">@brendon</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺︎'}
                                </span>
                                {/* Cartel ⟁ — perk of being mutuals with @brendon (or being
                                    him): when Cartel is on, his name carries the cartel mark.
                                    Icon only, no count (Brendon, 2026-06-22). Sits between the
                                    artist badge and the mutuals icon (Brendon, 2026-06-22). */}
                                {notifs.spell_cartel && brendonSocial.mutual && (
                                    <span className="id-cartel" aria-label="cartel">{'⟁︎'}</span>
                                )}
                                {brendonSocial.mutual && (
                                    <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                                )}
                            </span>
                            {brendonSocial.followers > 0 && (
                                <span className="follower-count">{brendonSocial.followers >= 1000 ? `${(brendonSocial.followers / 1000).toFixed(1).replace(/\.0$/, '')}k` : brendonSocial.followers}</span>
                            )}
                        </div>
                    </div>
                }
                socialRow={
                    /* One line, plain @name links — identical treatment to the
                       project page's social row (Brendon 2026-06-13: reverted
                       the sprite+name rectangle chips; CollectedPair kept but
                       unused in case it comes back). */
                    <div className="hero-line collected-by-row info-line home-feat-row">
                        <span className="cbr-label">Featuring</span>{' '}
                        <a key={featNames[0]} className="profile-link feat-name" href={`/${featNames[0]}`}>@{featNames[0]}</a>
                        {featNames[1] && (
                            <>, <a key={featNames[1]} className="profile-link feat-name" href={`/${featNames[1]}`}>@{featNames[1]}</a></>
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
                <div
                    className={`action-row${hideStickers ? ' hide-stickers' : ''}`}
                    id="homeActionRow"
                    ref={actionRowRef}
                >
                    <button
                        className="btn-mint btn-explore"
                        title="Join the chat on Discord"
                        onClick={() => openExternal(DISCORD_URL)}
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
                <div
                    className={`profile-tabs-row${hideShuffle ? ' hide-shuffle' : ''}`}
                    id="homeTabsRow"
                    ref={tabsRowRef}
                >
                    {tab('minting', 'Now Minting')}
                    {tab('new', 'New Gen Art')}
                    {tab('shuffle', 'Shuffle', <>⟳&#xFE0E;</>, 'pill-shuffle-icon')}
                </div>

                {/* Sort/filter bar lives INSIDE the hero (after the tabs) — same
                    as the project page's trait bar — so the gap from the tabs is
                    the hero's own 16px rhythm, not the larger below-hero gap it
                    had as a separate section (Brendon, 2026-06-13). */}
                {activeTab === 'minting' && hasMintingBase && (
                    <HomeProjectFacetBar
                        projects={enrichedMinting}
                        sortKey={mintSort.key}
                        sortDir={mintSort.dir}
                        onSort={onMintSort}
                        applySort={applyMintSort}
                    />
                )}
                {activeTab === 'new' && hasUploadsBase && (
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
            </Hero>

            {/* Now Minting (default) — just the carousels: one per project
                at 18+ mints, in the order they reached 18. No section header,
                the tab is the label. */}
            {activeTab === 'minting' && mintSort.key !== 'feed' && (
                <section aria-label="Now Minting">
                    {/* Loading OR no graduated projects yet → ghost carousels in
                        the exact shape of the live rows (Brendon, 2026-06-14 —
                        never a text null state). */}
                    {(!feed || !hasMintingBase) && <GhostCarousels perRow={CAROUSEL_SIZE} />}
                    {feed && hasMintingBase && visibleMinting.length === 0 && (
                        <div className="home-empty-note">
                            No projects match — clear the filters to see them all.
                        </div>
                    )}
                    {/* Only the first carousel paints eagerly; every other
                        row lazy-paints through the card virtualizer as it
                        scrolls into view. Painting every project's canvases
                        up front is what made home crawl (Brendon, 2026-06-13). */}
                    {visibleMinting.map((m, i) => (
                        <ProjectProvider
                            key={m.slug}
                            slug={m.slug}
                            initialTotal={m.minted}
                        >
                            <HomeProjectCarousel eager={i === 0} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* FEED sort on Now Minting → the activity feed: project lifecycle
                events (uploaded · graduated · sold out), newest first. Count-based
                "project milestones" join this once the list is locked (Brendon
                2026-06-15). Same feed-row markup as the New Art tab. */}
            {activeTab === 'minting' && mintSort.key === 'feed' && (
                <section className="home-uploads" aria-label="Activity Feed">
                    <div className="feed-list home-activity-feed">
                        {feedView.length === 0 ? (
                            <GhostFeedRows />
                        ) : (
                            feedView.map((ev) => (
                                <div className="feed-row" key={`${ev.label}-${ev.slug}-${ev.ts}`}>
                                    <div className="feed-line" />
                                    <div className={`f-icon-wrap af-ic${ev.cls ? ` ${ev.cls}` : ''}`}>{ev.glyph}&#xFE0E;</div>
                                    <div className="f-time">{fmtUploadDate(ev.ts)}</div>
                                    <div className="f-type af-type">
                                        <span>{ev.label}</span>
                                        <span>{fmtUploadTime(ev.ts)}</span>
                                    </div>
                                    <div className="f-content">
                                        <a className="f-highlight upload-title" href={`/art/${ev.slug}`}>
                                            {ev.title}
                                        </a>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </section>
            )}

            {/* New Art — the New Uploads text feed: uploaded projects,
                newest first (a project graduates to Now Minting at 18). */}
            {activeTab === 'new' && (
                <section className="home-uploads" aria-label="New Uploads">
                    <div className="home-section-head">
                        <span className="home-section-title">New Uploads</span>
                    </div>
                    <div className="feed-list home-activity-feed">
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
                                    <div className="f-icon-wrap af-ic">✧&#xFE0E;</div>
                                    <div className="f-time">{fmtUploadDate(u.uploaded_at)}</div>
                                    <div className="f-type af-type">
                                        <span>UPLOADED</span>
                                        <span>{fmtUploadTime(u.uploaded_at)}</span>
                                    </div>
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

            {/* Shuffle — randomized discovery in THE gallery grid (#gallery).
                Stays MOUNTED but hidden when off-tab: the re-roll fires on EXIT
                (prevTab effect bumps the seed), so the next project's provider
                mounts + readies WHILE HIDDEN and the old one is gone. Entering
                just reveals it — no flash of the old project, no mount lag.
                Hidden = no layout = the cards don't paint (the virtualizer only
                paints on-screen), so it's "ready to paint", not painting. */}
            {shufflePick && (
                <div style={{ display: activeTab === 'shuffle' ? undefined : 'none' }}>
                    <ProjectProvider
                        key={`${shuffleSeed}:${shufflePick.slug}`}
                        slug={shufflePick.slug}
                        initialTotal={shufflePick.minted}
                    >
                        <ShuffleGallery seed={shuffleSeed} />
                    </ProjectProvider>
                </div>
            )}
            {/* Nothing minted to shuffle yet → ghost gallery, never an empty
                void (Brendon, 2026-06-14). */}
            {activeTab === 'shuffle' && !shufflePick && <GhostGallery />}
        </>
    );
}

export default function HomePageBody({
    initialFeed = null,
}: {
    /** Server-computed home payload (app/page.tsx) — carousels + stats in
        the first paint. Null only when the server read failed. */
    initialFeed?: HomeResponse | null;
}) {
    return (
        <TraitsProvider>
            <HomePageBodyInner initialFeed={initialFeed} />
        </TraitsProvider>
    );
}
