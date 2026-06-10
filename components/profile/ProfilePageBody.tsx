'use client';

/*
 * components/profile/ProfilePageBody.tsx
 *
 * Profile page body — mounted by app/[slug]/page.tsx (server shell
 * which resolves the slug + emits metadata).
 *
 * Hero section: hero-group-1 is a straight transplant from ProjectPageBody.
 * The three named lines in every PriceOS hero:
 *   - Identity line  → "Via [handle]" with follow-badge + follower count
 *   - Social line    → "Followed by [mutuals]" — identical structure to
 *                       project's "Collected by" row (.collected-by-row /
 *                       .cbr-label / .cbr-name / .cbr-others), only the
 *                       label text changes
 *   - Stats line     → icon + value stat items row
 *
 * Tabs: Created / Collected / + More
 *   - Collected tab: full TraitsUI surface (same as project Artworks tab),
 *     backed by COLLECTED_IDS mock data for now
 *   - + More tab: secondary stats row + Discord link (as-is); colorway/colorway
 *     picker removed (now lives in Collected TraitsUI sort-bar)
 *
 * Default colorway: light — handled in ColorwayContext.tsx (profile
 * page boot path). Users who want colour customise from the sort-bar.
 */

import { useState, useEffect, useMemo, useRef, type KeyboardEvent } from 'react';
import { TraitsProvider, useTraits } from '../../lib/state/TraitsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useColorway } from '../../lib/state/ColorwayContext';
import { useProfileHex } from '../../lib/hooks/useProfileHex';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useSort } from '../../lib/state/SortContext';
import ArtworkCard from '../ArtworkCard';
import { getStarredItems, subscribeStarred } from '../../lib/pins/starStore';
import { getWishlistItems, subscribeWishlist } from '../../lib/pins/wishlistStore';
import StarredList from './StarredList';
import WishlistList from './WishlistList';
import GhostRows from './GhostRows';
import TraitsUI from '../project/TraitsUI';
import Hero from '../hero/Hero';
import FollowButton from './FollowButton';
import { getProject, outputTraits, allProjects } from '../../lib/project/registry';
import GhostCard from '../project/GhostCard';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import ProfileFacetBar, { facetValueOf, type EnrichedHolding } from './ProfileFacetBar';
import type { ShowcaseSlot } from '../../lib/supabase';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';
import { priceDayNumber, priceDayContents } from '../../lib/priceday/priceday';

/**
 * Format an ISO timestamp (users.created_at) as "MMM DD YYYY" in the hero
 * date slot — e.g. "2026-05-13T..." → "MAY 13 2026". Matches the project
 * page's PriceDay date format (JUL 09 2026).
 */
function formatMemberSince(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d
        .toLocaleDateString('en-US', {
            month: 'short',
            day: '2-digit',
            year: 'numeric',
            timeZone: 'UTC',
        })
        .replace(',', '')
        .toUpperCase();
}

type ProfileTab = 'showcase' | 'collected' | 'more';
type ProfileMoreL1 = 'starred' | 'wishlists' | 'albums' | 'info';

/** One collected Output, from /api/user/[address]/outputs. */
interface Holding {
    slug: string;
    token_id: number;
    list_price_eth: string | null;
    /** Mint event timestamp (Unix seconds) — source for PriceDay + Natal. */
    mint_ts: number | null;
}

function ProfilePageBodyInner({
    handle,
    initialUser,
    initialHoldings,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
}) {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const { notifs } = usePdNotifs();
    const isZen = notifs.zenMode;
    const { sort, dir } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

    // Real user row — fetched server-side from the handle in the URL and
    // passed in, so the hero renders real values on first paint (no popin).
    const user = initialUser;

    /* Profile Colorway — paint this profile in ITS OWNER's colour. The page
       owner's `profile_hex` is the "Custom" colour for this page, shown to any
       visitor whose colorway is the default/Custom (an explicit pick still
       wins — handled in ColorwayContext). When the logged-in user is viewing
       their OWN profile, use the live hook value so edits in the picker repaint
       instantly; for anyone else's profile, use the server-provided value. */
    const { setActiveProfileHex } = useColorway();
    const { hex: myProfileHex } = useProfileHex();
    const isOwnProfile =
        !!siweAddress && siweAddress.toLowerCase() === user.address.toLowerCase();
    const ownerHex = isOwnProfile ? myProfileHex : user.profile_hex;
    useEffect(() => {
        setActiveProfileHex(ownerHex ?? null);
        return () => setActiveProfileHex(null);
    }, [ownerHex, setActiveProfileHex]);

    const displayHandle = user.handle ?? handle;
    const memberSince = formatMemberSince(user.created_at);

    // Identity row: chosen ENS if set, else the truncated wallet address.
    const viaLabel = user.ens_name
        ? user.ens_name
        : `${user.address.slice(0, 6)}…${user.address.slice(-4)}`;
    /* Live follower/following counts — fully seeded from the server row
       (both counts ship with the page since the 2026-06-10 perf batch; the
       old seed left `following` at 0 until a mount fetch landed), refreshed
       from /api/follows on any follow toggle ('pd:follows-changed'). The
       mount fetch is gone: it re-read the exact counts the server computed
       on this same request. */
    const [counts, setCounts] = useState<{ followers: number; following: number }>(
        { followers: user.follower_count, following: user.following_count },
    );

    /* Real collected Outputs (holders rows) for THIS profile's wallet —
       seeded server-side (they ship with the page, so the Collected grid
       paints on arrival; perf batch 2026-06-10). Declared here, above the
       identity-reset block that re-seeds it. */
    const [holdings, setHoldings] = useState<Holding[]>(initialHoldings);

    /* Client-nav identity reset — the App Router reuses this component
       instance when navigating between two profile pages (same segment,
       new params), so state seeded from props must re-seed when the profile
       address changes. Render-phase reset, per React's derived-state
       guidance. Previously the mount fetches papered over this; with those
       gone the reset has to be explicit. */
    const [seededFor, setSeededFor] = useState(user.address);
    if (seededFor !== user.address) {
        setSeededFor(user.address);
        setCounts({ followers: user.follower_count, following: user.following_count });
        setHoldings(initialHoldings);
    }

    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/follows/${user.address.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setCounts({ followers: d.follower_count ?? 0, following: d.following_count ?? 0 }); })
                .catch(() => {});
        const h = () => load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [user.address]);
    const followerCount = counts.followers;

    /* Showcase — the user's curated top-6 (users.showcase). Each slot points at
       one Output (project + token). 'static' keeps the saved order; 'generative'
       reshuffles once per visit. Empty slots are dropped. Wiring to ADD/curate
       slots ships later; this renders whatever's saved. */
    const showcaseSlots = useMemo<ShowcaseSlot[]>(() => {
        const slots = (user.showcase?.slots ?? []).filter(
            (s): s is ShowcaseSlot => !!s && !!s.project_id && s.token_id != null && getProject(s.project_id) != null,
        );
        if (user.showcase_style === 'generative') {
            const a = [...slots];
            for (let i = a.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [a[i], a[j]] = [a[j], a[i]];
            }
            return a;
        }
        return slots;
    }, [user.showcase, user.showcase_style]);

    /* Empty-state ghost frames for the Showcase — same idea as the project's
       unminted gallery: 6 placeholder frames (matching the 6 Showcase slots),
       shapes SAMPLED from the projects' aspect palettes (no art, no seeds).
       Deterministic per index (SSR-safe). Shown when nothing is curated yet. */
    const showcaseGhosts = useMemo(() => {
        const pool = allProjects().flatMap((p) => p.aspects);
        const aspects = pool.length ? pool : [1];
        return Array.from({ length: 6 }, (_, i) => {
            const h = (((i + 1) * 2654435761) >>> 0) / 4294967296;
            return aspects[Math.floor(h * aspects.length) % aspects.length];
        });
    }, []);

    /* Holdings refresh wiring (state itself is declared above the identity-
       reset block). Spans both projects; grouped by slug for rendering.
       Re-fetches on 'pd:project-refresh' (fired after a mint / market
       action) so the gallery updates without a reload. The mount fetch only
       runs when the server seed came back empty — a non-empty seed is the
       same query, same request; an empty one gets re-verified through the
       API so a transient server-side read failure can't strand an empty
       grid (and a genuinely-empty profile just repeats today's cheap
       no-op fetch). */
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/user/${user.address.toLowerCase()}/outputs`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { holdings?: Holding[] } | null) => {
                    if (!cancelled && d?.holdings) setHoldings(d.holdings);
                })
                .catch(() => {});
        if (initialHoldings.length === 0) load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onRefresh); };
        // initialHoldings is read once per profile identity; user.address is
        // the identity key (the reset block re-seeds state on change).
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user.address]);

    /* Enrich each held Output with its full platform traits (Artist/Project/
       PriceDay/Natal/Fate — PriceDay + Natal need the mint timestamp) and live
       listed status. Both the facet bar and the predicate read this, so they
       can never diverge. */
    const enriched = useMemo<EnrichedHolding[]>(
        () =>
            holdings
                .filter((h) => getProject(h.slug))
                .map((h) => ({
                    slug: h.slug,
                    token_id: h.token_id,
                    list_price_eth: h.list_price_eth,
                    listed: h.list_price_eth != null,
                    traits: outputTraits(
                        h.slug,
                        h.token_id,
                        h.mint_ts != null ? h.mint_ts * 1000 : undefined,
                    ),
                })),
        [holdings],
    );

    /* Collected-tab search + filter + sort over the enriched holdings. Filters
       by the platform facets (facetValueOf), searches @artist / @project / id,
       ranges on listing price, sorts by id or price. */
    const visibleCollected = useMemo<EnrichedHolding[]>(() => {
        const minVal = parseFloat(priceMin);
        const maxVal = parseFloat(priceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = searchQuery.trim().toLowerCase();
        const activeCats = Object.keys(activeFilters).filter((c) => activeFilters[c].size > 0);

        const filtered = enriched.filter((h) => {
            const priceNum = h.list_price_eth ? parseFloat(h.list_price_eth) : null;
            for (const cat of activeCats) {
                const v = facetValueOf(cat, h);
                if (v === undefined || !activeFilters[cat].has(v)) return false;
            }
            if (q) {
                const hay = `${h.traits.Artist ?? ''} ${h.traits.Project ?? ''} #${h.token_id}`.toLowerCase();
                if (!hay.includes(q)) return false;
            }
            if (hasMin && (priceNum == null || priceNum < minVal)) return false;
            if (hasMax && priceNum != null && priceNum > maxVal) return false;
            return true;
        });

        const dirMult = dir === 'asc' ? 1 : -1;
        const byId = (a: EnrichedHolding, b: EnrichedHolding) =>
            a.slug === b.slug ? (a.token_id - b.token_id) * dirMult : a.slug.localeCompare(b.slug);
        if (sort === 'price') {
            filtered.sort((a, b) => {
                const na = a.list_price_eth ? parseFloat(a.list_price_eth) : Infinity;
                const nb = b.list_price_eth ? parseFloat(b.list_price_eth) : Infinity;
                return na !== nb ? (na - nb) * dirMult : byId(a, b);
            });
        } else {
            filtered.sort(byId);
        }
        return filtered;
    }, [enriched, sort, dir, activeFilters, searchQuery, priceMin, priceMax]);

    /* Group the filtered/sorted holdings by Project for rendering. Each group
       renders inside its own ProjectProvider so ArtworkCard paints the right
       Project's art + meta — the provider is a context-only node (no DOM), so
       all cards still land as direct children of the single #gallery grid.
       (Sort is global within each project group; cross-project ordering follows
       the group order.) */
    const collectedByProject = useMemo(() => {
        const m = new Map<string, number[]>();
        for (const h of visibleCollected) {
            const arr = m.get(h.slug) ?? [];
            arr.push(h.token_id);
            m.set(h.slug, arr);
        }
        return [...m.entries()].map(([slug, ids]) => ({ slug, ids }));
    }, [visibleCollected]);

    // Identity-row copy: copies the chosen ENS if set, else the FULL wallet
    // address (row shows truncated, copy gives the whole thing — same as the
    // settings wallet copy). Inline checkmark swap for 1.5s.
    const copyValue = user.ens_name ?? user.address;
    const [idCopied, setIdCopied] = useState(false);
    const idCopyTimer = useRef<number | null>(null);
    const handleCopyIdentity = async () => {
        const confirm = () => {
            if (idCopyTimer.current != null) window.clearTimeout(idCopyTimer.current);
            setIdCopied(true);
            idCopyTimer.current = window.setTimeout(() => {
                setIdCopied(false);
                idCopyTimer.current = null;
            }, 1500);
        };
        try {
            await navigator.clipboard?.writeText(copyValue);
            confirm();
        } catch {
            confirm();
        }
    };

    // Social row (Twitter model): "Followed by X, Y, and N others you follow".
    // Names = people the viewer follows who also follow this profile. Empty
    // until the follows-intersection lands; row hides when empty.
    const mutuals: string[] = [];
    const mutualOthers: number = 0;

    const [activeTab, setActiveTab] = useState<ProfileTab>('showcase');
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>('starred');

    /* Starred — the viewer's PRIVATE bookmarks ("like it, star it, find it
       later"). Device-local, keyed slug:id so it spans Projects. Shown only on
       your own profile; a visitor never sees someone else's stars. */
    const [starredItems, setStarredItems] = useState(() => getStarredItems());
    useEffect(() => {
        setStarredItems(getStarredItems());
        return subscribeStarred(() => setStarredItems(getStarredItems()));
    }, []);
    const starredValid = useMemo(
        () => starredItems.filter((s) => getProject(s.slug) != null),
        [starredItems],
    );

    /* Wishlist — the viewer's PRIVATE "want to buy" list. Same shape as stars;
       shown only on your own profile. */
    const [wishlistItems, setWishlistItems] = useState(() => getWishlistItems());
    useEffect(() => {
        setWishlistItems(getWishlistItems());
        return subscribeWishlist(() => setWishlistItems(getWishlistItems()));
    }, []);
    const wishlistValid = useMemo(
        () => wishlistItems.filter((s) => getProject(s.slug) != null),
        [wishlistItems],
    );

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

    // ── PriceDay popover (identity line date) ─────────────────────────
    const [priceDayOpen, setPriceDayOpen] = useState(false);
    const [priceDayPos, setPriceDayPos] = useState<{ top: number; left: number } | null>(null);
    const priceDayRef = useRef<HTMLSpanElement>(null);

    useEffect(() => {
        if (!priceDayOpen) return;
        const handler = (e: MouseEvent) => {
            if (priceDayRef.current && !priceDayRef.current.contains(e.target as Node)) {
                setPriceDayOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [priceDayOpen]);

    const openPriceDay = () => {
        if (priceDayOpen) { setPriceDayOpen(false); return; }
        if (priceDayRef.current) {
            const rect = priceDayRef.current.getBoundingClientRect();
            const POPOVER_WIDTH = 260;
            const MARGIN = 8;
            const MOBILE_BP = 600;
            let left: number;
            if (window.innerWidth < MOBILE_BP) {
                left = (window.innerWidth - POPOVER_WIDTH) / 2;
            } else {
                left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
                left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
            }
            setPriceDayPos({ top: rect.bottom + 4, left });
        }
        setPriceDayOpen(true);
    };

    /* The profile date popover is the NORMAL PriceDay almanac (Brendon
       2026-06-10 — the bespoke "origin" card was never asked for). It shows
       the PriceDay of the user's join date, with their joining as the first
       event, then the standard almanac sections for that day. */
    const joinDate = useMemo(() => {
        const d = new Date(user.created_at);
        return Number.isNaN(d.getTime()) ? null : d;
    }, [user.created_at]);
    const joinPriceDay = joinDate ? priceDayNumber(joinDate) : null;
    const joinDayContents = useMemo(
        () => (joinDate ? priceDayContents(joinDate) : null),
        [joinDate]
    );

    // ── Tab / sub-tab state ───────────────────────────────────────────
    const onShowcase  = activeTab === 'showcase';
    const onCollected = activeTab === 'collected';
    const onMore      = activeTab === 'more';

    // ── Zen mode: Albums-only in + More sub-nav ───────────────────────
    useEffect(() => {
        if (isZen && moreL1 !== 'albums') setMoreL1('albums');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isZen]);

    /* Starred + Wishlists are PRIVATE — on someone else's profile the
       sections do not exist at all: no pills, no content, no notes
       (Brendon 2026-06-10). moreL1 can hold a stale private key after
       navigating own profile → other profile, so clamp it for visitors. */
    const effMoreL1: ProfileMoreL1 =
        !isOwnProfile && (moreL1 === 'starred' || moreL1 === 'wishlists')
            ? 'albums'
            : moreL1;
    const onStarredTab = onMore && isOwnProfile && effMoreL1 === 'starred';
    const onWishlistTab = onMore && isOwnProfile && effMoreL1 === 'wishlists';
    const galleryVisible = onShowcase || onCollected;

    return (
        <>
            <Hero
                ariaLabel="Profile Info"
                titleRow={
                    <h1 className="project-title">
                        <span>
                            @{displayHandle}
                            <span className="artist-tag" aria-label="artist">{'✺\uFE0E'}</span>
                        </span>
                        <span className="project-date-wrap" ref={priceDayRef}>
                            <span
                                className={`project-date${priceDayOpen ? ' pd-active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={openPriceDay}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        openPriceDay();
                                    }
                                }}
                                title="PriceDay"
                            >{memberSince || '\u2014'}</span>
                            {priceDayOpen && priceDayPos && joinDayContents && (
                                <div
                                    className="priceday-popover"
                                    style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}
                                >
                                    <div className="dp-title">PRICEDAY #{joinPriceDay}</div>
                                    <div className="dp-title-spacer" />

                                    <div className="pd-section-header">JOINED</div>
                                    <div className="dp-row">
                                        <span className="dp-label">{memberSince || '\u2014'}</span>
                                        <span className="dp-value">@{displayHandle}</span>
                                    </div>
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">MINTED THIS DAY</div>
                                    {joinDayContents.minted.map((r, i) => (
                                        <div className="dp-row" key={`m${i}`}>
                                            <span className="dp-label">{r.label}</span>
                                            <span className="dp-value">{r.value}</span>
                                        </div>
                                    ))}
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                                    {joinDayContents.uploaded.map((r, i) => (
                                        <div className="dp-row" key={`u${i}`}>
                                            <span className="dp-label">{r.label}</span>
                                            <span className="dp-value">{r.value}</span>
                                        </div>
                                    ))}
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">BIGGEST SALE</div>
                                    {joinDayContents.biggestSale && (
                                        <div className="dp-row">
                                            <span className="dp-label">{joinDayContents.biggestSale.label}</span>
                                            <span className="dp-value">{joinDayContents.biggestSale.value}</span>
                                        </div>
                                    )}
                                    <div className="pd-section-end" />
                                </div>
                            )}
                        </span>
                    </h1>
                }
                identityRow={
                    <div className="hero-line project-custom">
                        <span className="by-text">Via</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                {/* Links to the owner's Etherscan page (Brendon
                                    2026-06-10) — it used to link to this same
                                    profile, a circle. */}
                                <a
                                    href={`https://etherscan.io/address/${user.address}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {user.ens_name ? (
                                        viaLabel
                                    ) : (
                                        <>
                                            0<span className="addr-x">x</span>
                                            {viaLabel.slice(2)}
                                        </>
                                    )}
                                </a>
                                <span
                                    className="icon-copy id-copy"
                                    role="button"
                                    tabIndex={0}
                                    title={`Copy ${user.ens_name ? 'ENS' : 'wallet address'}`}
                                    onClick={(e) => { e.preventDefault(); handleCopyIdentity(); }}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            handleCopyIdentity();
                                        }
                                    }}
                                >
                                    {idCopied ? '\u2713\uFE0E' : '⧉\uFE0E'}
                                </span>
                            </span>
                            <span className="follower-count">{followerCount}</span>
                        </div>
                    </div>
                }
                socialRow={
                    mutuals.length > 0 ? (
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Followed by</span>{' '}
                        {mutuals.map((m, i) => (
                            <span key={m}>
                                {i > 0 && ', '}
                                <a className="cbr-name" href={`/${m}`}>@{m}</a>
                            </span>
                        ))}
                        {mutualOthers > 0 && (
                            <>
                                {' '}
                                <span className="cbr-others">
                                    &amp; {mutualOthers} {mutualOthers === 1 ? 'Other' : 'Others'} You Follow
                                </span>
                            </>
                        )}
                    </div>
                    ) : undefined
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Outputs Collected')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">{holdings.length}</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                {...iconToastProps('Volume Spent')}
                            >
                                ⟠&#xFE0E;
                            </span>{' '}
                            <span className="stat-val stat-val-vol">—</span>
                        </span>
                        <span
                            className="stat-item stat-item-owners"
                            role="button"
                            tabIndex={0}
                            onClick={() => showToast('Followers: COMING SOON')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    showToast('Followers: COMING SOON');
                                }
                            }}
                        >
                            <span className="stat-icon stat-icon-owners stat-icon-followers" {...iconToastProps('Followers')}>{'\u26AC\uFE0E'}</span>{' '}
                            <span className="stat-val stat-val-owners">{counts.followers} PPL</span>
                        </span>
                    </div>
                }
            >
                    <div className="action-row">
                        <FollowButton targetAddress={user.address} targetHandle={user.handle ?? displayHandle} />
                        <button
                            className="btn-soundtrack"
                            title="Profile action — coming soon"
                            onClick={() => showToast('Share: COMING SOON')}
                        >
                            <span>SHARE</span>
                        </button>
                    </div>

                    {/* Tab row */}
                    <div className="profile-tabs-row" id="profileTabsRow">
                        <div
                            className={`pill pill-l1${onShowcase ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('showcase')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('showcase'); } }}
                        >
                            <span className="stat-name">Showcase</span>
                        </div>
                        <div
                            className={`pill pill-l1${onCollected ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('collected')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('collected'); } }}
                        >
                            <span className="stat-name">Collected</span>
                        </div>
                        <div
                            className={`pill pill-l1${onMore ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('more')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('more'); } }}
                        >
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

                    {/* + More tab content: secondary stats + Discord link.
                        Colorway picker removed — now lives in Collected TraitsUI sort-bar. */}
                    {/* + More tab: profile sub-nav pills (Starred / Wishlists /
                        Albums / Info). Rendered first so the pill row sits flush
                        directly under the main tabs, mirroring the Collected
                        facet-bar pattern. */}
                    {onMore && (
                        <TraitsUI
                            visible={true}
                            hideSortBar
                            profilePills={
                                (isZen
                                    ? [{ key: 'albums', label: 'Albums', active: effMoreL1 === 'albums', onClick: () => setMoreL1('albums') }]
                                    : [
                                        /* Starred + Wishlists are private — the
                                           pills exist on YOUR OWN profile only. */
                                        ...(isOwnProfile
                                            ? [
                                                { key: 'starred',   label: 'Starred',   active: effMoreL1 === 'starred',   onClick: () => setMoreL1('starred')   },
                                                { key: 'wishlists', label: 'Wishlists', active: effMoreL1 === 'wishlists', onClick: () => setMoreL1('wishlists') },
                                            ]
                                            : []),
                                        { key: 'albums',    label: 'Albums',    active: effMoreL1 === 'albums',    onClick: () => setMoreL1('albums')    },
                                        { key: 'info',      label: 'Info',      active: effMoreL1 === 'info',      onClick: () => setMoreL1('info')      },
                                    ]
                                )
                            }
                        />
                    )}

                    {/* Info sub-tab content: followers / following / anchor + the
                        Discord link. Previously wedged between the main tabs and the
                        sub-pill row; now it lives under the Info sub-tab so the pills
                        sit flush under the main tabs (Collected-tab pattern). */}
                    {onMore && effMoreL1 === 'info' && (
                        <div className="more-tab-stats">
                            <div className="hero-line stats-row stats-row-2">
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Followers')}>◎&#xFE0E;</span>{' '}
                                    <span className="stat-val">{counts.followers}</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Following')}>⊙&#xFE0E;</span>{' '}
                                    <span className="stat-val">{counts.following}</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Anchor — coming soon')}>⚓&#xFE0E;</span>{' '}
                                    <span className="stat-val stat-val-empty">—</span>
                                </span>
                            </div>

                            {user.discord_id && user.discord_username ? (
                                <div style={{ marginTop: 14, fontFamily: 'Courier New, monospace' }}>
                                    <a
                                        href={`https://discord.com/users/${user.discord_id}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        Discord: @{user.discord_username}
                                    </a>
                                    {isOwnProfile && (
                                        <button
                                            type="button"
                                            style={{
                                                marginLeft: 10,
                                                cursor: 'pointer',
                                                fontFamily: 'inherit',
                                                background: 'none',
                                                border: 'none',
                                                padding: 0,
                                                opacity: 0.6,
                                            }}
                                            onClick={async () => {
                                                await fetch('/api/auth/discord', { method: 'DELETE' });
                                                window.location.reload();
                                            }}
                                        >
                                            (unlink)
                                        </button>
                                    )}
                                </div>
                            ) : isOwnProfile ? (
                                <button
                                    type="button"
                                    className={!isAuthed ? 'auth-gated' : undefined}
                                    style={{
                                        cursor: 'pointer',
                                        fontFamily: 'Courier New, monospace',
                                        marginTop: 14,
                                        background: 'none',
                                        border: 'none',
                                        padding: 0,
                                    }}
                                    onClick={() => {
                                        if (!isAuthed) return;
                                        window.location.href = '/api/auth/discord';
                                    }}
                                >
                                    Link Discord
                                </button>
                            ) : null}
                        </div>
                    )}

                    {/* Collected tab: platform-facet filter over the wallet's real
                        holdings (Artist · Project · PriceDay · Natal · Fate · Status).
                        Distinct from the project page's per-Project trait pills — a
                        collection spans independent projects, so it filters on the
                        platform facets every Output carries. */}
                    {onCollected && <ProfileFacetBar holdings={enriched} isOwnProfile={isOwnProfile} />}
            </Hero>

            {/* Starred / Wishlist ghost rows — YOUR OWN profile with zero
                items only (Brendon 2026-06-10: these sections are private
                and DO NOT EXIST on other users' profiles — no pills, no
                content, no notes). 1:1 stand-ins of the real rows, no
                copy; same wrapper classes so ghosts sit exactly where
                real rows render. */}
            {onStarredTab && starredValid.length === 0 && (
                <section className="starred-list" aria-label="Starred">
                    <div className="starred-rows">
                        <GhostRows variant="starred" />
                    </div>
                </section>
            )}
            {onWishlistTab && wishlistValid.length === 0 && (
                <section className="starred-list" aria-label="Wishlist">
                    <div className="starred-rows">
                        <GhostRows variant="wishlist" />
                    </div>
                </section>
            )}

            {/* Gallery — Showcase or Collected depending on active tab. Each
                Showcase slot is wrapped in its own ProjectProvider so the curated
                order is preserved exactly regardless of which project each pick is
                from (the provider is a context-only node, no DOM, so every card
                still lands in the single #gallery grid). */}
            <section
                id="gallery"
                aria-label="Gallery"
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {onShowcase
                    ? (showcaseSlots.length > 0
                        ? showcaseSlots.map((slot, i) => (
                              <ProjectProvider key={`sc-${i}-${slot.project_id}-${slot.token_id}`} slug={slot.project_id}>
                                  <ArtworkCard id={Number(slot.token_id)} />
                              </ProjectProvider>
                          ))
                        : showcaseGhosts.map((aspect, i) => (
                              <GhostCard key={`scghost-${i}`} aspect={aspect} index={i} />
                          )))
                    : collectedByProject.map(({ slug, ids }) => (
                          <ProjectProvider key={slug} slug={slug}>
                              {ids.map((id) => (
                                  <ArtworkCard key={`${slug}-${id}`} id={id} />
                              ))}
                          </ProjectProvider>
                      ))}
            </section>

            {/* Starred — a compact bookmark ROW list (not the gallery grid):
                sortable/filterable rows with a small preview that opens the
                Artwork modal. Own profile only (Stars are private). */}
            {onStarredTab && isOwnProfile && starredValid.length > 0 && (
                <StarredList items={starredValid} />
            )}

            {/* Wishlist — buy-focused row list (price + cart + remove). Own
                profile only (private). */}
            {onWishlistTab && isOwnProfile && wishlistValid.length > 0 && (
                <WishlistList items={wishlistValid} />
            )}
        </>
    );
}

export default function ProfilePageBody({
    handle,
    initialUser,
    initialHoldings,
}: {
    handle: string;
    initialUser: UserProfileData;
    initialHoldings: Holding[];
}) {
    return (
        <TraitsProvider>
            <ProfilePageBodyInner
                handle={handle}
                initialUser={initialUser}
                initialHoldings={initialHoldings}
            />
        </TraitsProvider>
    );
}
