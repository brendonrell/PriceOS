'use client';

/*
 * MarketplacePageBody — the Marketplace homepage (`/marketplace`).
 *
 * Delta off the HOME surface (collection-as-template, exactly like home is a
 * delta off the project page): same <Hero> chrome + same tab-row pills,
 * market-focused center.
 *
 * Tabs:
 *   - Listings (default) → per-project carousels of the pieces LISTED right
 *     now, cheapest first, floor in the row head — the Now Minting carousel
 *     markup verbatim, fed listing ids instead of latest ids.
 *   - Activity           → the market tape: LIST · SALE · OFFER events,
 *     newest first, in the home feed-row markup.
 *
 * The action row's one button is the PROFIT PAL door (Brendon, 2026-07-27 —
 * the Pal's marketplace entrance; the other door is Completionism's ⌂).
 *
 * Live = server-seeded payload (app/marketplace/page.tsx), re-pulled on
 * 'pd:project-refresh' plus the visible-tab poll fallback — the home pattern.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import { GhostCarousels } from '../home/HomeGhosts';
import { GhostFeedRows } from '../GhostFeed';
import { FeaturingRow } from '../home/HomePageBody';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { getProject } from '../../lib/project/registry';
import { formatEth } from '../../lib/format/eth';
import type {
    MarketplaceResponse,
    MarketplaceListing,
    MarketplaceEvent,
} from '../../lib/marketplace/marketData';

const VS15 = '︎';
const POLL_MS = 30_000;
/* Carousel tile budget — the home rows' size (Brendon 2026-06-18: 18). */
const CAROUSEL_SIZE = 18;
const EAGER_TILES = 4;

type MarketTab = 'listings' | 'activity';

/* Canonical market glyphs (docs/GLYPHS.md §1) — LIST ✹ · SALE ✦ · OFFER ✶. */
const EVENT_GLYPH: Record<MarketplaceEvent['type'], string> = {
    LIST: '✹',
    SALE: '✦',
    OFFER: '✶',
};
const EVENT_LABEL: Record<MarketplaceEvent['type'], string> = {
    LIST: 'LISTED',
    SALE: 'SOLD',
    OFFER: 'OFFER',
};

/* Viewer-local date/time stamps — same format as the home feeds. */
function fmtDate(ms: number): string {
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    return `${mon} ${String(d.getDate()).padStart(2, '0')} ’${String(d.getFullYear()).slice(-2)}`;
}
function fmtTime(ms: number): string {
    return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/* One project's listed-pieces carousel — the HomeProjectCarousel markup with
   explicit ids (the listed tokens, cheapest first) and the floor in the head. */
function ListedCarousel({ ids, floorEth }: { ids: number[]; floorEth: number }) {
    const project = useProject();
    return (
        <section className="home-carousel-row" aria-label={`${project.title} — listed pieces`}>
            <div className="home-carousel-head">
                <a className="home-carousel-title" href={`/art/${project.slug}`}>
                    {project.title}
                </a>
                <span className="section-head-by mk-carousel-floor">
                    {' '}floor {formatEth(floorEth)} ETH · {ids.length} listed
                </span>
            </div>
            <div className="home-carousel-track">
                {ids.slice(0, CAROUSEL_SIZE).map((id, idx) => (
                    <ArtworkCard key={id} id={id} eager={idx < EAGER_TILES} renderSize={200} />
                ))}
            </div>
        </section>
    );
}

function MarketplacePageBodyInner({ initial = null }: { initial?: MarketplaceResponse | null }) {
    const { showToast } = useToast();
    const { open: openModal } = useModal();
    const { siweAddress, handle: viewerHandle } = useAuth();
    const { notifs } = usePdNotifs();

    /* @brendon's follower count + mutual badge beside the byline — the home
       hero's credit block, verbatim (PD is his art; the marketplace is the
       same surface's market side). */
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
                /* A user is mutuals with themselves (Brendon, 2026-06-16). */
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

    const [feed, setFeed] = useState<MarketplaceResponse | null>(initial);
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch('/api/marketplace', { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: MarketplaceResponse | null) => { if (!cancelled && d) setFeed(d); })
                .catch(() => { /* offline / 5xx — last good payload stays up */ });
        };
        load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        const poll = window.setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
        const onVis = () => { if (!document.hidden) load(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            window.clearInterval(poll);
            window.removeEventListener('pd:project-refresh', onRefresh);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, []);

    const [activeTab, setActiveTab] = useState<MarketTab>('listings');
    const selectTab = (id: MarketTab, label: string) => {
        setActiveTab(id);
        showToast(`Tab: ${label.toUpperCase()}`);
    };

    /* Listings grouped per project (registry-known only), cheapest first
       inside each group; groups ordered cheapest floor first. */
    const groups = useMemo(() => {
        const bySlug = new Map<string, MarketplaceListing[]>();
        for (const l of feed?.listings ?? []) {
            if (!getProject(l.slug)) continue;
            const arr = bySlug.get(l.slug) ?? [];
            arr.push(l);
            bySlug.set(l.slug, arr);
        }
        return [...bySlug.entries()]
            .map(([slug, rows]) => {
                rows.sort((a, b) => a.price_eth - b.price_eth);
                return { slug, rows, floor: rows[0]?.price_eth ?? 0 };
            })
            .sort((a, b) => a.floor - b.floor || a.slug.localeCompare(b.slug));
    }, [feed]);

    const tape = useMemo(
        () => (feed?.events ?? []).filter((e) => getProject(e.slug)),
        [feed],
    );

    const stats = feed?.stats ?? null;
    const loading = feed == null;

    const tab = (id: MarketTab, label: string) => (
        <div
            className={`pill pill-l1${activeTab === id ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            title={label}
            onClick={() => selectTab(id, label)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTab(id, label); }
            }}
        >
            <span className="stat-name">{label}</span>
        </div>
    );

    return (
        <>
            <Hero
                ariaLabel="PD Marketplace"
                titleRow={<h1 className="project-title">PD Marketplace</h1>}
                identityRow={
                    /* The home hero's credit line, verbatim. */
                    <div className="hero-line project-custom home-id-row">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/brendon">@brendon</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺︎'}
                                </span>
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
                socialRow={<FeaturingRow />}
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span className="stat-icon">{`✹${VS15}`}</span>{' '}
                            <span className="stat-val">{stats ? stats.listed : '—'} LISTED</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth">{`⟠${VS15}`}</span>{' '}
                            <span className="stat-val stat-val-vol">{stats ? Math.round(stats.volume_eth) : '—'} VOL</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-icon">{`✶${VS15}`}</span>{' '}
                            <span className="stat-val">{stats ? stats.offers : '—'} OFFERS</span>
                        </span>
                    </div>
                }
            >
                {/* Action row — the PROFIT PAL door (same chrome as home's
                    primary action button). */}
                <div className="action-row">
                    <button
                        className="btn-mint btn-explore"
                        title="Profit Pal"
                        onClick={() => openModal('pal', 'profit')}
                    >
                        <span className="mint-lbl">Profit Pal</span>
                    </button>
                </div>

                {/* Tab row — same pill markup as home. */}
                <div className="profile-tabs-row">
                    {tab('listings', 'Listings')}
                    {tab('activity', 'Activity')}
                </div>
            </Hero>

            {/* Listings — one carousel per project with live listings,
                cheapest floor first. Ghost carousels while loading; a real
                empty market states itself plainly. */}
            {activeTab === 'listings' && (
                <section aria-label="Listings">
                    {loading && <GhostCarousels perRow={CAROUSEL_SIZE} />}
                    {!loading && groups.length === 0 && (
                        <div className="home-empty-note">
                            Nothing listed right now — the next listing lands here the moment it&apos;s live.
                        </div>
                    )}
                    {groups.map((g) => (
                        <ProjectProvider key={g.slug} slug={g.slug}>
                            <ListedCarousel ids={g.rows.map((r) => r.token_id)} floorEth={g.floor} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* Activity — the market tape in the home feed-row markup. */}
            {activeTab === 'activity' && (
                <section className="home-uploads" aria-label="Market Activity">
                    <div className="feed-list home-activity-feed">
                        {loading ? (
                            <GhostFeedRows />
                        ) : tape.length === 0 ? (
                            <div className="home-empty-note">
                                No market moves yet — listings, sales and offers land here live.
                            </div>
                        ) : (
                            tape.map((ev, i) => {
                                const title = getProject(ev.slug)?.displayName ?? ev.slug;
                                return (
                                    <div className="feed-row" key={`${ev.type}-${ev.slug}-${ev.token_id}-${ev.ts}-${i}`}>
                                        <div className="feed-line" />
                                        <div className="f-icon-wrap af-ic">{EVENT_GLYPH[ev.type]}{VS15}</div>
                                        <div className="f-time">
                                            <span>{fmtDate(ev.ts)}</span>
                                            <span>{fmtTime(ev.ts)}</span>
                                        </div>
                                        <div className="f-type af-type">
                                            <span>{EVENT_LABEL[ev.type]}</span>
                                        </div>
                                        <div className="f-content">
                                            <a className="f-highlight upload-title" href={`/art/${ev.slug}`}>
                                                {title}{ev.token_id != null ? ` #${ev.token_id}` : ''}
                                            </a>
                                            {ev.price_eth != null && (
                                                <span className="mk-tape-price">{formatEth(ev.price_eth)} ETH</span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </section>
            )}
        </>
    );
}

export default function MarketplacePageBody({ initial = null }: { initial?: MarketplaceResponse | null }) {
    /* ArtworkCard calls useTraits() — the body needs a TraitsProvider,
       exactly like home. */
    return (
        <TraitsProvider>
            <MarketplacePageBodyInner initial={initial} />
        </TraitsProvider>
    );
}
