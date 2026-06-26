'use client';

/*
 * components/artwork/ArtworkPageBody.tsx
 *
 * Artwork page body — the FEATURE page for one Output. Mounted by
 * app/[slug]/page.tsx (canonical `/{globalId}`) and
 * app/art/[slug]/[localId]/page.tsx (alt URL).
 *
 * Hero markup mirrors ProjectPageBody so the shared globals.css rules paint it
 * identically. Differences from project:
 *   - Title reads `{Project} #{n}`; the PROJECT NAME links to the project page
 *     (like the modal); the #id stays plain text (not a link).
 *   - Held-by chip shows the current owner (live), linked to their profile.
 *   - The artwork renders LIVE + high-res (not the gallery thumbnail), using
 *     the full horizontal space for wide pieces.
 *   - A "Full Screen" link under the art opens the immersive fullscreen view.
 *   - The CTA mirrors the artwork modal: LIST / UNLIST / BUY · price / MAKE
 *     OFFER, driven by live ownership + listing.
 *   - Tabs are Artwork / Albums / + More. The second stats row lives in the
 *     Stats sub-tab under + More.
 */

import { useEffect, useMemo, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { useColorway, type ColorwayKey } from '../../lib/state/ColorwayContext';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { getProject } from '../../lib/project/registry';
import CollectedPair from '../hero/CollectedPair';
import Hero from '../hero/Hero';
import TraitsUI from '../project/TraitsUI';
import ReplayPanel from '../project/ReplayPanel';
import ArtworkLive from './ArtworkLive';
import OutputTitleStar from './OutputTitleStar';
import OutputFollowButton from './OutputFollowButton';
import AttributesPanel from './AttributesPanel';
import OutputActionRow from './OutputActionRow';
import { GhostFeedRows } from '../GhostFeed';
import { eventToFeedEvent, type FeedEvent } from '../../lib/feed/feedRow';
import type { EventRow } from '../../lib/supabase';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import type { AttrInput } from '../../lib/output/attributes';

function shortAddr(a: string | null): string {
    if (!a || a.length < 10) return a || '—';
    return '0x' + a.slice(2, 6) + '…' + a.slice(-4);
}

/* A project/artist history row in the output timeline — same two-line shape as
   the homepage Now-Minting feed. Mirrors the server FeedMarker. */
interface FeedMarker {
    id: string;
    glyph: string;
    cls: string | null;
    timestamp: string;
    seq: number;
    pin: number;
    tbdDay?: boolean;
    label: string;
    subject: string;
    href: string | null;
    badge?: boolean;
}

/* One rendered row of the output feed (transactions + history markers), shaped
   for the homepage `home-activity-feed` two-line row. */
interface FeedItem {
    key: string;
    glyph: string;
    cls: string | null;
    label: string;
    ts: number;
    tbdDay?: boolean;
    content: ReactNode;
    pin: number;
    seq: number;
    price: number;
    sortName: string;
}

/* Output feed sort — the homepage Now-Minting model (date / price / az / feed). */
type OutSortKey = 'date' | 'price' | 'az' | 'feed';
type OutSortDir = 'asc' | 'desc';

/* Colorway view squares — identical cluster to the homepage sort bar. */
const OUT_THEME_PILLS: { key: ColorwayKey; cls: string; glyph: string; title: string }[] = [
    { key: 'custom', cls: 't-custom', glyph: '◩︎', title: 'Custom Color' },
    { key: 'light',  cls: 't-light',  glyph: '◻︎', title: 'Light' },
    { key: 'dark',   cls: 't-dark',   glyph: '◼︎', title: 'Dark' },
    { key: 'orange', cls: 't-orange', glyph: '▨︎', title: 'Orange' },
];

/* The four homepage sort buttons (DATE · $PRICE · AZ/ZA · FEED). */
const OUT_SORTS: { key: OutSortKey; title: string; lbl: (s: { key: OutSortKey; dir: OutSortDir }) => string }[] = [
    { key: 'date',  title: 'Sort by date',     lbl: () => 'DATE' },
    { key: 'price', title: 'Sort by price',    lbl: () => '$PRICE' },
    { key: 'az',    title: 'Sort A–Z by name', lbl: (s) => (s.key === 'az' && s.dir === 'desc' ? 'ZA' : 'AZ') },
    { key: 'feed',  title: 'Activity Feed',    lbl: () => 'FEED' },
];

/* "MMM DD" (e.g. MAY 13), or "MMM ?" when the day is undecided — same base
   format as the homepage feed's upload date. */
function fmtFeedDate(iso: string, tbdDay?: boolean): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const month = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    if (tbdDay) return `${month} ?`;
    const day = d.toLocaleDateString('en-US', { day: '2-digit', timeZone: 'UTC' });
    return `${month} ${day}`;
}

/* "15:42" — 24-hour clock, matching the homepage feed. Blank for undecided-day
   rows (no meaningful time). */
function fmtFeedTime(iso: string, tbdDay?: boolean): string {
    if (tbdDay) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });
}

type ArtworkTab = 'artwork' | 'albums' | 'more';
/* + More sub-sections — same set as the project page's + More. */
type MoreL1 =
    | 'replay' | 'stats'
    | 'social' | 'attributes' | 'pricestory' | 'asciibackup' | 'offers' | 'neighbourhood';
const MORE_PILLS: { key: MoreL1; label: string }[] = [
    { key: 'attributes', label: 'Attributes' },
    { key: 'offers', label: 'Offers' },
    { key: 'neighbourhood', label: 'Neighbourhood' },
    { key: 'pricestory', label: 'Price Story' },
    { key: 'replay', label: 'Replay' },
    { key: 'stats', label: 'Stats' },
    { key: 'social', label: 'Social' },
    { key: 'asciibackup', label: 'ASCII Backup' },
];

interface Props {
    globalId: number;
    projectSlug?: string;
    localId?: number;
}

/* Title-case a slug for display: "prisms" → "Prisms". */
function titleCase(s: string): string {
    if (!s) return s;
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export default function ArtworkPageBody({
    globalId,
    projectSlug,
    localId,
}: Props) {
    const { showToast } = useToast();
    const { add: cartAdd, has: cartHas, items: cartItems } = useCart();
    const [activeTab, setActiveTab] = useState<ArtworkTab>('artwork');
    const [moreL1, setMoreL1] = useState<MoreL1>('attributes');

    /* Stat-icon toast helper — mirrors project + profile pages. */
    const iconToastProps = (label: string) => ({
        role: 'button' as const,
        tabIndex: 0,
        title: label,
        onClick: () => showToast(label),
        onKeyDown: (e: KeyboardEvent) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                showToast(label);
            }
        },
    });

    const onArtwork = activeTab === 'artwork';
    const onAlbums = activeTab === 'albums';
    const onMore = activeTab === 'more';

    const numberPart = typeof localId === 'number' ? localId : globalId;
    const slug = (projectSlug ?? 'prisms').toLowerCase();
    /* Title name = the Project's real display name (proper casing + punctuation),
       same source as the Project page. Falls back to a title-cased slug only for
       an unknown project. */
    const projectName = getProject(slug)?.displayName ?? (projectSlug ? titleCase(projectSlug) : 'Prisms');
    const projectHref = `/art/${slug}`;
    const fullscreenHref = `/art/${slug}/${numberPart}/full`;

    const artistHandle = getProject(slug)?.artistHandle ?? 'opus4-6';

    /* Live market stats for this Output. */
    const [market, setMarket] = useState<{
        owner: string | null; owner_handle: string | null;
        listing: { price_eth: string } | null;
        last_sale: string | null; floor: string | null; volume_eth: string | null;
        followers: number | null;
        viewer: { address: string; isOwner: boolean; balance: number } | null;
    } | null>(null);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/output/${slug}-${numberPart}/market`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (!cancelled && d) setMarket(d); })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [slug, numberPart]);

    /* This Output's platform traits (Artist/Project/PriceDay/Sun/Moon/Rising/
       Fate/…) — computed server-side from its mint moment, so Sun/Moon/Rising
       are real. Powers the + More → Attributes box. */
    const [traits, setTraits] = useState<Record<string, string>>({});
    const [mintMs, setMintMs] = useState<number | null>(null);
    const [trueName, setTrueName] = useState<string>('');
    const [fingerprint, setFingerprint] = useState<AttrInput['fingerprint']>(null);
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/output/${slug}-${numberPart}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                if (d.traits) setTraits(d.traits as Record<string, string>);
                if (d.minted_at) setMintMs(new Date(d.minted_at).getTime());
                if (d.true_name) setTrueName(d.true_name as string);
                if (d.fingerprint) setFingerprint(d.fingerprint as AttrInput['fingerprint']);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [slug, numberPart]);

    /* This Output's activity timeline — REAL pre-chain transaction rows from
       Supabase `events` (scoped to this token), PLUS the project/artist history
       markers (artist joined · uploaded · milestones · graduated · ascension).
       Same source + mapping as the project feed, so they read identically.
       Re-pulled on any market action. */
    const [feedRows, setFeedRows] = useState<FeedEvent[]>([]);
    const [feedMarkers, setFeedMarkers] = useState<FeedMarker[]>([]);
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(`/api/output/${slug}-${numberPart}/feed?limit=100`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[]; markers?: FeedMarker[] } | null) => {
                    if (cancelled || !d) return;
                    if (Array.isArray(d.events)) setFeedRows(d.events.map(eventToFeedEvent));
                    if (Array.isArray(d.markers)) setFeedMarkers(d.markers);
                })
                .catch(() => { /* keep last good rows */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [slug, numberPart]);

    /* Feed sort — the homepage Now-Minting model. Default 'feed' = the activity
       order (newest first, with the fixed platform/identity rows pinned to the
       bottom). DATE / $PRICE / AZ re-order the rest. */
    const { colorway, setColorway } = useColorway();
    const activeColorway: ColorwayKey = colorway ?? 'custom';
    const [outSort, setOutSort] = useState<{ key: OutSortKey; dir: OutSortDir }>({ key: 'feed', dir: 'desc' });
    const onOutSort = (key: OutSortKey) =>
        setOutSort((prev) =>
            prev.key === key
                ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
                : { key, dir: key === 'price' || key === 'az' ? 'asc' : 'desc' },
        );

    /* Merge transactions + history markers into one homepage-shaped feed. The
       fixed platform/identity rows (`pin` > 0) always anchor to the BOTTOM in
       their pinned order; everything else sorts by the active sort. */
    const feedItems = useMemo<FeedItem[]>(() => {
        const items: FeedItem[] = [];
        for (const fe of feedRows) {
            items.push({
                key: `tx-${fe.id}`, glyph: fe.icon, cls: null, label: fe.type,
                ts: fe.timestamp, content: fe.detail, pin: 0, seq: Number.MAX_SAFE_INTEGER,
                price: fe.price, sortName: fe.type,
            });
        }
        for (const m of feedMarkers) {
            const name = (
                <>
                    {m.href
                        ? <a className="f-highlight upload-title" href={m.href}>{m.subject}</a>
                        : <span className="f-highlight upload-title">{m.subject}</span>}
                    {m.badge && <span className="artist-tag is-sm" aria-label="PD Artist">{' ✺︎'}</span>}
                </>
            );
            items.push({
                key: `m-${m.id}`, glyph: m.glyph, cls: m.cls, label: m.label,
                ts: Date.parse(m.timestamp) || 0, tbdDay: m.tbdDay, content: name,
                pin: m.pin, seq: m.seq, price: 0, sortName: m.subject,
            });
        }
        const dirMult = outSort.dir === 'asc' ? 1 : -1;
        items.sort((a, b) => {
            if (a.pin !== b.pin) return a.pin - b.pin;          // genesis/identity to the bottom
            if (a.pin > 0) return b.seq - a.seq;                // pinned block: fixed order
            if (outSort.key === 'price') return (a.price - b.price) * dirMult || (b.ts - a.ts);
            if (outSort.key === 'az') return a.sortName.localeCompare(b.sortName) * dirMult || (b.ts - a.ts);
            return (a.ts - b.ts) * dirMult || (b.seq - a.seq);  // date / feed
        });
        return items;
    }, [feedRows, feedMarkers, outSort]);

    const owned = market?.viewer?.isOwner ?? false;
    const ownerHref = market?.owner_handle
        ? `/${market.owner_handle}`
        : (market?.owner ? `/${market.owner}` : undefined);
    const heldBy = market?.owner_handle ? `@${market.owner_handle}` : shortAddr(market?.owner ?? null);

    /* The output's @name (project @handle + token number, e.g. @oracle234) and
       its PriceSprite — outputs have no sprite of their own, so they wear their
       project's (Brendon, 2026-06-25). */
    const outputName = `@${slug}${numberPart}`;
    const outputFace = projectSpriteFace(slug);
    const outputRef = `${slug}-${numberPart}`;

    /* Follower count for the Social tab — stored user followers + the parent
       project (parental support), so it's never 0. Refreshes on follow change. */
    const [outputFollowers, setOutputFollowers] = useState(1);
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/output-follows?output=${encodeURIComponent(outputRef)}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setOutputFollowers(d.count ?? 1); })
                .catch(() => {});
        load();
        const h = () => load();
        window.addEventListener('pd:output-follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:output-follows-changed', h); };
    }, [outputRef]);

    /* CTA — mirrors the artwork modal (OutputPreview): owner sees LIST/UNLIST,
       a non-owner sees BUY · price when listed, else MAKE OFFER. */
    const listPrice = market?.listing?.price_eth ?? null;
    const isListed = listPrice != null;
    let ctaLabel: ReactNode;
    let ctaAction: 'buy' | 'list' | 'unlist' | 'offer';
    if (owned) {
        ctaLabel = <span className="mint-lbl">{isListed ? 'UNLIST' : 'LIST'}</span>;
        ctaAction = isListed ? 'unlist' : 'list';
    } else if (isListed) {
        ctaLabel = (<><span className="mint-lbl">BUY</span><span className="mint-price">({listPrice} ETH)</span></>);
        ctaAction = 'buy';
    } else {
        ctaLabel = <span className="mint-lbl">MAKE OFFER</span>;
        ctaAction = 'offer';
    }
    const onCta = () => {
        if (ctaAction === 'buy') {
            if (cartHas(slug, numberPart)) {
                showToast(`${projectName} #${numberPart}: ALREADY IN CART`);
            } else {
                cartAdd(slug, numberPart);
                const next = cartItems.length + 1;
                showToast(`Added to cart · ${next} item${next === 1 ? '' : 's'}`);
            }
        } else if (ctaAction === 'list') {
            showToast('List: COMING SOON');
        } else if (ctaAction === 'unlist') {
            showToast('Unlist: COMING SOON');
        } else {
            showToast('Make Offer: COMING SOON');
        }
    };

    return (
        <ProjectProvider slug={projectSlug}>
            <TraitsProvider>
            <section className="project-hero" aria-label="Artwork Info">
                <div className="hero-group-1">
                    <h1 className="project-title">
                        {/* Project name → project page (like the modal); the #id
                            stays plain text. Long-press the title to star this
                            Output (Brendon 2026-06-19). */}
                        <OutputTitleStar slug={slug} id={numberPart} projectName={projectName} projectHref={projectHref} />
                    </h1>

                    <div className="hero-line project-custom">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a className="profile-link" href={`/${artistHandle}`}>@{artistHandle}</a>
                                <span
                                    className="artist-tag"
                                    aria-label="artist"
                                >
                                    {'✺︎'}
                                </span>
                                <span className="follow-badge">
                                    <span className="ico-mutual" title="Mutual">
                                        ⚭&#xFE0E;
                                    </span>
                                </span>
                            </span>
                            <span className="follower-count">32</span>
                        </div>
                    </div>

                    {/* Held-by line — the live ID Rectangle (real PriceSprite +
                        @name) for the current owner, same chip as the Followers
                        modal. Falls back to an address-only chip when the holder
                        has no handle (no fake sprite). */}
                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Held by{' '}
                            {market?.owner_handle ? (
                                <CollectedPair handle={market.owner_handle} />
                            ) : (
                                <span className="collected-pair">
                                    {ownerHref
                                        ? <a className="profile-link" href={ownerHref}>{heldBy}</a>
                                        : <span className="profile-link">{heldBy}</span>}
                                </span>
                            )}
                        </span>
                    </div>

                    {/* Stats row — transplanted from the profile hero so it lays
                        out identically (plain flex, not the grid). Same icons,
                        the output's own data (Brendon 2026-06-19). The second row
                        moved into the Stats sub-tab under + More. */}
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Output / Supply')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">
                                {numberPart}/222
                            </span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                {...iconToastProps('Total Volume')}
                            >⟠&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-vol">
                                {market ? `${market.volume_eth ?? '0'} VOL` : '—'}
                            </span>
                        </span>
                        <span className="stat-item stat-item-owners">
                            <span
                                className="stat-icon stat-icon-owners stat-icon-followers"
                                {...iconToastProps('Followers')}
                            >
                                {'⚬︎'}
                            </span>{' '}
                            <span className="stat-val stat-val-owners">
                                {market?.followers ?? 0} {(market?.followers ?? 0) === 1 ? 'FOLLOWER' : 'FOLLOWERS'}
                            </span>
                        </span>
                    </div>
                </div>

                <div className="hero-group-2">
                    {/* CTA — mirrors the artwork modal's ownership/listing-aware
                        button (LIST / UNLIST / BUY · price / MAKE OFFER). */}
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title={`${projectName} #${numberPart}`}
                            onClick={onCta}
                        >
                            {ctaLabel}
                        </button>
                    </div>

                    {/* Tab row — Artwork / Albums / + More. */}
                    <div className="profile-tabs-row" id="artworkTabsRow">
                        <div
                            className={`pill pill-l1${onArtwork ? ' active' : ''}`}
                            id="atab-artwork"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('artwork')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('artwork');
                                }
                            }}
                            title="Artwork — the artwork itself"
                        >
                            <span className="stat-name">Artwork</span>
                        </div>
                        <div
                            className={`pill pill-l1${onAlbums ? ' active' : ''}`}
                            id="atab-albums"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('albums')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('albums');
                                }
                            }}
                            title="Albums — albums containing this artwork"
                        >
                            <span className="stat-name">Albums</span>
                        </div>
                        <div
                            className={`pill pill-l1${onMore ? ' active' : ''}`}
                            id="atab-more"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('more')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('more');
                                }
                            }}
                            title="More — full details"
                        >
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

                    {/* + More sub-nav — placed INSIDE the hero right after the
                        main tabs, exactly like the Project page, so the pill row
                        sits in the same constrained container (identical spacing). */}
                    {onMore && (
                        <TraitsUI
                            visible
                            hideSortBar
                            profilePills={MORE_PILLS.map((p) => ({
                                key: p.key,
                                label: p.label,
                                active: moreL1 === p.key,
                                onClick: () => setMoreL1(p.key),
                            }))}
                        />
                    )}
                </div>
            </section>

            {/* Artwork tab — the LIVE, high-res render. Full horizontal width;
                tall pieces cap to viewport height and centre. A footer row
                carries #id, an owned ✓, the Full Screen link, and the owner. */}
            <section
                id="artwork-feature"
                aria-label="Artwork"
                style={{ display: onArtwork ? undefined : 'none' }}
            >
                <div className="artwork-feature-stage">
                    <ArtworkLive slug={slug} id={globalId} contain className="artwork-feature-art" />
                </div>
                <div className="artwork-feature-foot">
                    <span className="aff-id">
                        #{numberPart}
                        {owned && (
                            <span className="badge-owned" title="You own this">
                                <span className="css-check" />
                            </span>
                        )}
                        {' '}
                        <a
                            className="aff-fullscreen"
                            href={fullscreenHref}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Full Screen
                        </a>
                    </span>
                    {ownerHref
                        ? <a className="aff-owner profile-link" href={ownerHref}>{heldBy}</a>
                        : <span className="aff-owner">{heldBy}</span>}
                </div>

                {/* Action row — the artwork-modal buttons (star / wishlist /
                    album / note / to-do / grail / cart), just below the art. */}
                <OutputActionRow slug={slug} id={numberPart} listed={!!market?.listing} owned={owned} />

                {/* Output activity feed — the homepage Now-Minting feed, exact:
                    colorway squares + DATE / $PRICE / AZ / FEED, then the
                    two-line activity rows. Fed by THIS output's history. */}
                <div className="home-facet-bar output-feed-bar">
                    <div className="sort-bar" id="sortOptions" style={{ display: 'flex' }}>
                        <div className="colorway-pills">
                            {OUT_THEME_PILLS.map((t) => (
                                <div
                                    key={t.key ?? 'default'}
                                    className={`pill-colorway ${t.cls}${activeColorway === t.key ? ' active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => setColorway(t.key)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setColorway(t.key); } }}
                                    title={t.title}
                                >
                                    <span>{t.glyph}</span>
                                </div>
                            ))}
                        </div>
                        <div className="sort-btn-group" style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'nowrap' }}>
                            {OUT_SORTS.map((s) => (
                                <span
                                    key={s.key}
                                    className={`sort-btn${outSort.key === s.key ? ' active' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    title={s.title}
                                    onClick={() => onOutSort(s.key)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOutSort(s.key); } }}
                                >
                                    <span className="sort-lbl">{s.lbl(outSort)}</span>
                                    <span className="sort-arrow">{outSort.key === s.key ? (outSort.dir === 'asc' ? '↑︎' : '↓︎') : ''}</span>
                                </span>
                            ))}
                        </div>
                    </div>
                </div>
                <section className="home-uploads" aria-label="Activity Feed">
                    <div className="feed-list home-activity-feed">
                        {feedItems.length === 0 ? (
                            <GhostFeedRows />
                        ) : feedItems.map((row) => (
                            <div className="feed-row" key={row.key}>
                                <div className="feed-line" />
                                <div className={`f-icon-wrap af-ic${row.cls ? ` ${row.cls}` : ''}`}>{row.glyph}&#xFE0E;</div>
                                <div className="f-time">{fmtFeedDate(new Date(row.ts).toISOString(), row.tbdDay)}</div>
                                <div className="f-type af-type">
                                    <span>{row.label}</span>
                                    <span>{fmtFeedTime(new Date(row.ts).toISOString(), row.tbdDay)}</span>
                                </div>
                                <div className="f-content">{row.content}</div>
                            </div>
                        ))}
                    </div>
                </section>
            </section>

            {/* Albums tab — placeholder. */}
            <section
                id="albums-panel"
                aria-label="Albums"
                style={{ display: onAlbums ? 'block' : 'none' }}
            >
                <p className="info-rubik">Not in any albums yet.</p>
            </section>

            {/* + More tab — same sub-section pill set as the project page; the
                Stats sub-tab holds the artwork's second stats row. */}
            <section
                id="details-panel"
                aria-label="Details"
                style={{ display: onMore ? 'block' : 'none' }}
            >
                {moreL1 === 'stats' && (
                    <>
                        <div className="more-section-header">STATS</div>
                        <div className="more-box-wrap">
                          <div className="more-box-card">
                            <div className="stats-row stats-row-2">
                                <span className="stat-item">
                                    <span
                                        className="stat-icon stat-icon-box stat-icon-owned"
                                        {...iconToastProps('Your Holding Status')}
                                    >
                                        ⊡&#xFE0E;
                                    </span>{' '}
                                    <span className="stat-val stat-val-empty">{owned ? 'OWNED' : ''}</span>
                                </span>
                                <span className="stat-item">
                                    <span
                                        className="stat-icon stat-icon-box stat-icon-spent"
                                        {...iconToastProps('Floor Price')}
                                    >
                                        ↨&#xFE0E;
                                    </span>{' '}
                                    <span className="stat-val">{market?.floor ? `${market.floor} ETH` : '—'}</span>
                                </span>
                                <span className="stat-item stat-item-anchor">
                                    <span
                                        className="stat-icon stat-icon-box"
                                        {...iconToastProps('Your Personal Reference Price')}
                                    >
                                        ⚓&#xFE0E;
                                    </span>{' '}
                                    <span
                                        className="stat-val stat-val-empty"
                                        role="button"
                                        tabIndex={0}
                                        title="Tap to set"
                                        onClick={() => showToast('Anchor: COMING SOON')}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                showToast('Anchor: COMING SOON');
                                            }
                                        }}
                                    ></span>
                                </span>
                            </div>
                          </div>
                        </div>
                    </>
                )}

                {/* ATTRIBUTES — this Output's full character sheet: identity +
                    true name, sampled form, natal sky, mint-moment almanac, the
                    I Ching oracle, and deterministic edition-set rarity. */}
                {moreL1 === 'attributes' && (
                    <AttributesPanel
                        slug={slug}
                        id={numberPart}
                        mintMs={mintMs}
                        traits={traits}
                        fingerprint={fingerprint}
                        trueName={trueName}
                    />
                )}

                {/* Replay + Albums are the ONLY sections without a dotted box
                    (Brendon) — plain content under the header, same as the
                    Project page. */}
                {/* Same Replay tab as the Project page — the live time-machine
                    player, not a "coming soon" stub (Brendon, 2026-06-20). */}
                {moreL1 === 'replay' && (
                    <>
                        <div className="more-section-header">REPLAY</div>
                        <ReplayPanel />
                    </>
                )}
                {/* SOCIAL — mirrors the project's social profile (Brendon,
                    2026-06-25): the same Hero rows, filled with output data —
                    the output @name, the PROJECT's PriceSprite (outputs have
                    none of their own) + the owner, the follower count (incl. the
                    parent project), and Follow + Share. Outputs don't follow
                    anyone, so there's no FOLLOWING stat. */}
                {moreL1 === 'social' && (
                    <>
                        <div className="more-section-header">OUTPUT SOCIAL PROFILE</div>
                        <div className="more-box-wrap">
                          <div className="more-box-card">
                            <Hero
                                ariaLabel="Output Profile"
                                titleRow={
                                    <h1 className="project-title">
                                        <span>{outputName}</span>
                                    </h1>
                                }
                                identityRow={
                                    <div className="hero-line project-custom id-row-fit">
                                        {outputFace && (
                                            <span className="id-row-sprite">{outputFace}</span>
                                        )}
                                        {heldBy && (
                                            <div className="artist-lockup">
                                                <span className="artist-name-wrap">
                                                    {ownerHref ? <a href={ownerHref}>{heldBy}</a> : <span>{heldBy}</span>}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                }
                                statsRow={
                                    <div className="hero-line stats-row">
                                        <span className="stat-item stat-item-owners">
                                            <span className="stat-icon stat-icon-owners stat-icon-followers" {...iconToastProps('Followers — wallets that follow this Output')}>{'⚬︎'}</span>{' '}
                                            <span className="stat-val stat-val-owners">{outputFollowers} {outputFollowers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}</span>
                                        </span>
                                    </div>
                                }
                            >
                                <div className="action-row">
                                    <OutputFollowButton outputId={outputRef} label={outputName} />
                                    <button
                                        className="btn-soundtrack"
                                        title="Share — coming soon"
                                        onClick={() => showToast('Share: COMING SOON')}
                                    >
                                        <span className="btn-icon-play">▶&#xFE0E;</span>{' '}<span>SHARE</span>
                                    </button>
                                </div>
                            </Hero>
                          </div>
                        </div>
                    </>
                )}

                {/* Every other section — titled dotted box, same as the Project
                    page's not-yet-filled sections. Content lands later. */}
                {moreL1 !== 'stats' && moreL1 !== 'attributes' && moreL1 !== 'replay' && moreL1 !== 'social' && (
                    <>
                        <div className="more-section-header">
                            {(MORE_PILLS.find((p) => p.key === moreL1)?.label ?? '').toUpperCase()}
                        </div>
                        <div className="more-box-wrap">
                            <div className="more-box-card more-box-empty" />
                        </div>
                    </>
                )}
            </section>
            </TraitsProvider>
        </ProjectProvider>
    );
}
