'use client';

/*
 * MarketplacePageBody — the Marketplace homepage (`/marketplace`).
 *
 * Delta off the HOME surface (collection-as-template, exactly like home is a
 * delta off the project page): same <Hero> chrome + same tab-row pills,
 * market-focused center.
 *
 * Tabs (Brendon, 2026-09-18):
 *   - Artworks (default) → the HOME's Now Minting UI (same sort/facet bar,
 *     same carousels) showing only LISTED pieces, price under each tile.
 *     FEED sort = the market tape (LIST · SALE · OFFER) in the home feed rows.
 *   - Collectibles       → same UI over stickers + keychains + gnomes on the
 *     secondary; a tap opens that secondary's modal on the listing, and
 *     closing it lands you back here (modals are overlays, never a nav).
 *
 * The action row: PURCHASE PAL door (opens on the Purchase side) + WANTED
 * (button only for now — the Wanted section lands later).
 *
 * Live = server-seeded payload (app/marketplace/page.tsx), re-pulled on
 * 'pd:project-refresh' plus the visible-tab poll fallback — the home pattern.
 */

import { useEffect, useMemo, useState } from 'react';
import Hero from '../hero/Hero';
import ArtworkCard from '../ArtworkCard';
import { GhostCarousels } from '../home/HomeGhosts';
import { GhostFeedRows } from '../GhostFeed';
import { FeaturingRow } from '../home/HomePageBody';
import HomeProjectFacetBar, {
    projectFacetValueOf,
    type EnrichedProject,
    type HomeSortKey,
    type HomeSortDir,
} from '../home/HomeProjectFacetBar';
import SocialFeed from '../home/SocialFeed';
import NewUsersFeed from '../home/NewUsersFeed';
import { StickerArt } from '../stickers/StickerArt';
import { GnomeFigure } from '../project/GnomePanel';
import { SHEETS } from '../../lib/stickers/catalog';
import { projectGnome, gnomePalette } from '../../lib/project/gnome';
import { hashString } from '../../lib/art/rng';
import { useTraits } from '../../lib/state/TraitsContext';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { ProjectProvider, useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useAuth } from '../../lib/state/AuthContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { getProject, projectTraits, projectColorway } from '../../lib/project/registry';
import { formatEth } from '../../lib/format/eth';
import type {
    MarketplaceResponse,
    MarketplaceListing,
    MarketplaceEvent,
    StickerListing,
    GnomeListing,
    CollectibleEvent,
} from '../../lib/marketplace/marketData';

const VS15 = '︎';
const POLL_MS = 30_000;
/* Carousel tile budget — the home rows' size (Brendon 2026-06-18: 18). */
const CAROUSEL_SIZE = 18;
const EAGER_TILES = 4;

type MarketTab = 'artworks' | 'collectibles' | 'shuffle';

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

/* One collectible tile — art square + name + the artwork caption convention
   (.meta: left = qty/#id, right = price). */
function CollectibleTile({ art, name, left, price, title, onOpen }: {
    art: React.ReactNode; name: string; left: string; price: number; title: string; onOpen: () => void;
}) {
    return (
        <div
            className="mk-coll-tile"
            role="button"
            tabIndex={0}
            title={title}
            onClick={onOpen}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
        >
            <div className="mk-coll-art">{art}</div>
            <div className="mk-coll-name">{name}</div>
            <div className="meta">
                <span className="meta-id">{left}</span>
                <span className="meta-owner price-trigger">{formatEth(price)} ETH</span>
            </div>
        </div>
    );
}

function GnomeTileArt({ projectId }: { projectId: string }) {
    const gnome = useMemo(() => projectGnome(projectId), [projectId]);
    const palette = useMemo(() => gnomePalette(gnome, projectColorway(projectId)), [gnome, projectId]);
    const rhythm = useMemo(() => {
        const h = hashString(`rhythm:${projectId.toLowerCase()}`);
        return { bob: -((h % 56) / 10), blink: -(((h >> 8) % 52) / 10) };
    }, [projectId]);
    return <GnomeFigure gnome={gnome} palette={palette} rhythm={rhythm} />;
}

/* A collectibles row head + track — the listed-carousel markup, verbatim. */
function CollectibleRow({ title, floorEth, count, children }: {
    title: string; floorEth: number; count: number; children: React.ReactNode;
}) {
    return (
        <section className="home-carousel-row" aria-label={`${title} — listed`}>
            <div className="home-carousel-head">
                <span className="home-carousel-title">{title}</span>
                <span className="section-head-by mk-carousel-floor">
                    {' '}floor {formatEth(floorEth)} ETH · {count} listed
                </span>
            </div>
            <div className="home-carousel-track">{children}</div>
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

    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    const [activeTab, setActiveTab] = useState<MarketTab>('artworks');
    const selectTab = (id: MarketTab, label: string) => {
        setActiveTab(id);
        showToast(`Tab: ${label.toUpperCase()}`);
    };

    /* Sort — the home's model: date ↓ default, tap flips, price/az enter asc. */
    const [sort, setSort] = useState<{ key: HomeSortKey; dir: HomeSortDir }>({ key: 'date', dir: 'desc' });
    const onSort = (key: HomeSortKey) =>
        setSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: key === 'price' || key === 'az' ? 'asc' : 'desc' },
        );
    const applySort = (key: HomeSortKey, dir: HomeSortDir) => setSort({ key, dir });
    const dirMult = sort.dir === 'asc' ? 1 : -1;

    /* Listings grouped per project (registry-known only), cheapest first
       inside each group. */
    const groups = useMemo(() => {
        const bySlug = new Map<string, MarketplaceListing[]>();
        for (const l of feed?.listings ?? []) {
            if (!getProject(l.slug)) continue;
            const arr = bySlug.get(l.slug) ?? [];
            arr.push(l);
            bySlug.set(l.slug, arr);
        }
        return [...bySlug.entries()].map(([slug, rows]) => {
            rows.sort((a, b) => a.price_eth - b.price_eth);
            return {
                slug, rows,
                floor: rows[0]?.price_eth ?? 0,
                latest: rows.reduce((m, r) => Math.max(m, r.listed_ms || 0), 0),
            };
        });
    }, [feed]);

    /* Each listed project enriched for the home facet bar (same traits). */
    const enriched = useMemo<EnrichedProject[]>(() => {
        const meta = new Map((feed?.projects ?? []).map((p) => [p.slug, p]));
        return groups.map((g) => {
            const m = meta.get(g.slug);
            return {
                slug: g.slug,
                title: getProject(g.slug)?.displayName ?? g.slug,
                mintPriceEth: g.floor,
                minted: m?.minted_count ?? 0,
                birthMs: m?.uploaded_at ?? null,
                reachedMs: g.latest || null,
                traits: projectTraits(g.slug, m?.uploaded_at ?? undefined, m ? m.minted_count : undefined),
            };
        });
    }, [groups, feed]);

    /* Filter + sort — the home's predicate, over listed projects. */
    const visibleGroups = useMemo(() => {
        const minV = parseFloat(priceMin);
        const maxV = parseFloat(priceMax);
        const q = searchQuery.trim().toLowerCase();
        const cats = Object.keys(activeFilters).filter((c) => activeFilters[c].size > 0);
        const keep = enriched.filter((p) => {
            for (const cat of cats) {
                const v = projectFacetValueOf(cat, p);
                if (v === undefined || !activeFilters[cat].has(v)) return false;
            }
            if (q && !`${p.traits.Artist ?? ''} ${p.traits.Project ?? ''} ${p.title}`.toLowerCase().includes(q)) return false;
            if (!Number.isNaN(minV) && p.mintPriceEth < minV) return false;
            if (!Number.isNaN(maxV) && p.mintPriceEth > maxV) return false;
            return true;
        });
        const by = new Map(groups.map((g) => [g.slug, g]));
        const title = new Map(keep.map((p) => [p.slug, p.title]));
        return keep
            .map((p) => by.get(p.slug)!)
            .sort((a, b) => {
                if (sort.key === 'price') return (a.floor - b.floor) * dirMult || a.slug.localeCompare(b.slug);
                if (sort.key === 'az') return (title.get(a.slug) ?? '').localeCompare(title.get(b.slug) ?? '') * dirMult || a.slug.localeCompare(b.slug);
                return (a.latest - b.latest) * dirMult || a.slug.localeCompare(b.slug);
            });
    }, [enriched, groups, activeFilters, searchQuery, priceMin, priceMax, sort.key, dirMult]);

    /* Collectibles — stickers + gnomes (keychains have no secondary yet). */
    const stickerName = (id: string) => SHEETS.find((x) => x.id === id)?.name ?? id.toUpperCase();
    const gnomeName = (id: string) => `${getProject(id)?.displayName ?? id.toUpperCase()} GNOME`;
    const collRows = useMemo(() => {
        const q = searchQuery.trim().toLowerCase();
        const minV = parseFloat(priceMin);
        const maxV = parseFloat(priceMax);
        const pass = (name: string, price: number) =>
            (!q || name.toLowerCase().includes(q)) &&
            (Number.isNaN(minV) || price >= minV) && (Number.isNaN(maxV) || price <= maxV);
        const order = <T,>(items: T[], name: (t: T) => string, price: (t: T) => number, at: (t: T) => number) =>
            items.sort((a, b) => {
                if (sort.key === 'price') return (price(a) - price(b)) * dirMult;
                if (sort.key === 'az') return name(a).localeCompare(name(b)) * dirMult;
                return (at(a) - at(b)) * dirMult;
            });
        const stickers = order(
            (feed?.collectibles?.stickers ?? []).filter((x: StickerListing) => SHEETS.some((sh) => sh.id === x.sheet_id) && pass(stickerName(x.sheet_id), x.price_eth)),
            (x) => stickerName(x.sheet_id), (x) => x.price_eth, (x) => x.listed_ms,
        );
        const gnomes = order(
            (feed?.collectibles?.gnomes ?? []).filter((x: GnomeListing) => !!getProject(x.project_id) && pass(gnomeName(x.project_id), x.price_eth)),
            (x) => gnomeName(x.project_id), (x) => x.price_eth, (x) => x.listed_ms,
        );
        return { stickers, gnomes };
    }, [feed, searchQuery, priceMin, priceMax, sort.key, dirMult]);
    const collEmpty = collRows.stickers.length === 0 && collRows.gnomes.length === 0;
    /* The bar only shows when there is something to sort — an empty Collectibles
       tab shows its note alone, same as an empty Artworks tab. Counted BEFORE
       the search/price filters so a filter can never strand its own bar. */
    const collAny =
        (feed?.collectibles?.stickers ?? []).some((x) => SHEETS.some((sh) => sh.id === x.sheet_id)) ||
        (feed?.collectibles?.gnomes ?? []).some((x) => !!getProject(x.project_id));
    const floorOf = (xs: { price_eth: number }[]) => xs.reduce((m, x) => Math.min(m, x.price_eth), Infinity);

    const tape = useMemo(
        () => (feed?.events ?? []).filter((e) => getProject(e.slug)).sort((a, b) => (a.ts - b.ts) * dirMult),
        [feed, dirMult],
    );
    const collTape = useMemo(
        () => [...(feed?.collectibles?.events ?? [])]
            .filter((e) => (e.kind === 'sticker' ? SHEETS.some((sh) => sh.id === e.ref) : !!getProject(e.ref)))
            .sort((a, b) => (a.ts - b.ts) * dirMult),
        [feed, dirMult],
    );

    const openCollectible = (kind: 'sticker' | 'gnome', ref: string) =>
        openModal(kind === 'sticker' ? 'stickers' : 'gnomewallet', `market:${ref}`);

    const stats = feed?.stats ?? null;
    const loading = feed == null;

    const tab = (id: MarketTab, label: string, display?: React.ReactNode, extraClass?: string) => (
        <div
            className={`pill pill-l1${extraClass ? ` ${extraClass}` : ''}${activeTab === id ? ' active' : ''}`}
            role="button"
            tabIndex={0}
            title={label}
            onClick={() => selectTab(id, label)}
            onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectTab(id, label); }
            }}
        >
            <span className="stat-name">{display ?? label}</span>
        </div>
    );

    /* The feed rows — the home feed-row markup (one shape for both tapes). */
    const feedRow = (key: string, type: MarketplaceEvent['type'], ts: number, price: number | null, label: React.ReactNode) => (
        <div className="feed-row" key={key}>
            <div className="feed-line" />
            <div className="f-icon-wrap af-ic">{EVENT_GLYPH[type]}{VS15}</div>
            <div className="f-time">
                <span>{fmtDate(ts)}</span>
                <span>{fmtTime(ts)}</span>
            </div>
            <div className="f-type af-type">
                <span>{EVENT_LABEL[type]}</span>
            </div>
            <div className="f-content">
                {label}
                {price != null && <span className="mk-tape-price">{formatEth(price)} ETH</span>}
            </div>
        </div>
    );

    /* Shuffle is an empty tab for now — nothing renders under it. */
    const onShuffle = activeTab === 'shuffle';
    const feedSort = !onShuffle && sort.key === 'feed';
    const carouselSort = sort.key !== 'feed' && sort.key !== 'social' && sort.key !== 'newusers';

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
                            <span className="stat-icon stat-icon-mk">{`✹${VS15}`}</span>{' '}
                            <span className="stat-val">{stats ? stats.listed : '—'} LISTED</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth">{`⟠${VS15}`}</span>{' '}
                            <span className="stat-val stat-val-vol">{stats ? Math.round(stats.volume_eth) : '—'} VOL</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-icon stat-icon-mk stat-icon-mk--offer">{`✶${VS15}`}</span>{' '}
                            <span className="stat-val">{stats ? stats.offers : '—'} OFFERS</span>
                        </span>
                    </div>
                }
            >
                {/* Action row — PURCHASE PAL door (lands on the Purchase tab)
                    + WANTED (button only for now), the home's action-row pair. */}
                <div className="action-row">
                    <button
                        className="btn-mint btn-explore"
                        title="Purchase Pal"
                        onClick={() => openModal('pal', 'purchase')}
                    >
                        <span className="mint-lbl">Purchase Pal</span>
                    </button>
                    <a className="btn-soundtrack" title="Wanted" role="button" tabIndex={0}>
                        <span className="btn-icon-play">▶&#xFE0E;</span>{' '}WANTED
                    </a>
                </div>

                {/* Tab row — same pill markup as home. */}
                <div className="profile-tabs-row">
                    {tab('artworks', 'Artworks')}
                    {tab('collectibles', 'Collectibles')}
                    {tab('shuffle', 'Shuffle', <>⟳&#xFE0E;</>, 'pill-shuffle-icon')}
                </div>

                {/* The home's sort/facet bar, verbatim. Collectibles carries the
                    sorts + colorway + search only (no project facets). */}
                {activeTab !== 'shuffle' && (activeTab === 'artworks' ? enriched.length > 0 : collAny) && (
                    <HomeProjectFacetBar
                        projects={enriched}
                        sortKey={sort.key}
                        sortDir={sort.dir}
                        onSort={onSort}
                        applySort={applySort}
                        facets={activeTab === 'collectibles' ? [] : undefined}
                    />
                )}
            </Hero>

            {/* ARTWORKS — one carousel per project with live listings, price
                under every tile. Ghosts while loading; a real empty market
                states itself plainly. */}
            {activeTab === 'artworks' && carouselSort && (
                <section aria-label="Artworks" className="mk-listed-row">
                    {loading && <GhostCarousels perRow={CAROUSEL_SIZE} />}
                    {!loading && visibleGroups.length === 0 && (
                        <div className="home-empty-note mk-empty-note">
                            {groups.length === 0
                                ? 'Nothing listed right now — the next listing lands here the moment it\u2019s live.'
                                : 'No listings match — clear the filters to see them all.'}
                        </div>
                    )}
                    {visibleGroups.map((g) => (
                        <ProjectProvider key={g.slug} slug={g.slug}>
                            <ListedCarousel ids={g.rows.map((r) => r.token_id)} floorEth={g.floor} />
                        </ProjectProvider>
                    ))}
                </section>
            )}

            {/* COLLECTIBLES — stickers · keychains · gnomes on the secondary.
                Tap = that secondary's modal on the listing (an overlay, so
                closing lands right back here). Keychains have no secondary
                yet, so no row until they do. */}
            {activeTab === 'collectibles' && carouselSort && (
                <section aria-label="Collectibles" className="mk-listed-row">
                    {loading && <GhostCarousels perRow={CAROUSEL_SIZE} />}
                    {!loading && collEmpty && (
                        <div className="home-empty-note mk-empty-note">
                            Nothing listed right now — the next listing lands here the moment it&apos;s live.
                        </div>
                    )}
                    {collRows.stickers.length > 0 && (
                        <CollectibleRow title="Stickers" floorEth={floorOf(collRows.stickers)} count={collRows.stickers.length}>
                            {collRows.stickers.map((x, i) => {
                                const sheet = SHEETS.find((sh) => sh.id === x.sheet_id)!;
                                return (
                                    <CollectibleTile
                                        key={`${x.sheet_id}-${i}`}
                                        art={<StickerArt sticker={sheet.cover} fill diecut />}
                                        name={sheet.name}
                                        left={`×${x.qty}`}
                                        price={x.price_eth}
                                        title={`${sheet.name} — sheet listing`}
                                        onOpen={() => openCollectible('sticker', x.sheet_id)}
                                    />
                                );
                            })}
                        </CollectibleRow>
                    )}
                    {collRows.gnomes.length > 0 && (
                        <CollectibleRow title="Gnomes" floorEth={floorOf(collRows.gnomes)} count={collRows.gnomes.length}>
                            {collRows.gnomes.map((x) => (
                                <CollectibleTile
                                    key={x.project_id}
                                    art={<GnomeTileArt projectId={x.project_id} />}
                                    name={gnomeName(x.project_id)}
                                    left={`#${x.token_id}`}
                                    price={x.price_eth}
                                    title={`${gnomeName(x.project_id)} — for sale`}
                                    onOpen={() => openCollectible('gnome', x.project_id)}
                                />
                            ))}
                        </CollectibleRow>
                    )}
                </section>
            )}

            {/* FEED sort — the market tape in the home feed-row markup. */}
            {feedSort && (
                <section className="home-uploads" aria-label="Market Activity">
                    <div className="feed-list home-activity-feed">
                        {loading ? (
                            <GhostFeedRows />
                        ) : activeTab === 'artworks' ? (
                            tape.length === 0 ? (
                                <div className="home-empty-note mk-empty-note">
                                    No market moves yet — listings, sales and offers land here live.
                                </div>
                            ) : (
                                tape.map((ev, i) => feedRow(
                                    `${ev.type}-${ev.slug}-${ev.token_id}-${ev.ts}-${i}`, ev.type, ev.ts, ev.price_eth,
                                    <a className="f-highlight upload-title" href={`/art/${ev.slug}`}>
                                        {getProject(ev.slug)?.displayName ?? ev.slug}{ev.token_id != null ? ` #${ev.token_id}` : ''}
                                    </a>,
                                ))
                            )
                        ) : collTape.length === 0 ? (
                            <div className="home-empty-note mk-empty-note">
                                No market moves yet — listings, sales and offers land here live.
                            </div>
                        ) : (
                            collTape.map((ev: CollectibleEvent, i) => feedRow(
                                `${ev.kind}-${ev.type}-${ev.ref}-${ev.ts}-${i}`, ev.type, ev.ts, ev.price_eth,
                                <a
                                    className="f-highlight upload-title"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => openCollectible(ev.kind, ev.ref)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openCollectible(ev.kind, ev.ref); } }}
                                >
                                    {ev.kind === 'sticker' ? stickerName(ev.ref) : gnomeName(ev.ref)}
                                </a>,
                            ))
                        )}
                    </div>
                </section>
            )}

            {/* ☻ sorts — the home's social + new-signups feeds, same markup. */}
            {!onShuffle && sort.key === 'social' && (
                <section className="home-uploads" aria-label="Social Feed">
                    <div className="home-section-head">
                        <span className="home-section-title">Social Feed</span>
                    </div>
                    <div className="feed-list home-activity-feed home-social-feed">
                        <SocialFeed dir={sort.dir} />
                    </div>
                </section>
            )}
            {!onShuffle && sort.key === 'newusers' && (
                <section className="home-uploads" aria-label="New Users">
                    <div className="home-section-head">
                        <span className="home-section-title">New Signups</span>
                    </div>
                    <div className="feed-list home-activity-feed home-signups-feed">
                        <NewUsersFeed dir={sort.dir} />
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
