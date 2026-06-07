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
import TraitsUI from '../project/TraitsUI';
import Hero from '../hero/Hero';
import FollowButton from './FollowButton';
import ProjectCard from './ProjectCard';
import { projectsByArtist, getProject, outputTraits } from '../../lib/project/registry';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import type { UserProfileData } from '../../lib/profile/getUserProfileByHandle';

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

type ProfileTab = 'created' | 'collected' | 'more';
type ProfileMoreL1 = 'starred' | 'wishlists' | 'albums';

/** One collected Output, from /api/user/[address]/outputs. */
interface Holding { slug: string; token_id: number; list_price_eth: string | null; }

/* Feed/special filter categories that don't map to an Output's trait values —
   skipped by the Collected-tab predicate. */
const SPECIAL_CATS = new Set(['Network', 'Breadcrumb', 'Event', 'Market']);

function ProfilePageBodyInner({
    handle,
    initialUser,
}: {
    handle: string;
    initialUser: UserProfileData;
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
    /* Live follower/following counts — seeded from the server row, refreshed
       from /api/follows and on any follow toggle ('pd:follows-changed'). */
    const [counts, setCounts] = useState<{ followers: number; following: number }>(
        { followers: user.follower_count, following: 0 },
    );
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/follows/${user.address.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setCounts({ followers: d.follower_count ?? 0, following: d.following_count ?? 0 }); })
                .catch(() => {});
        load();
        const h = () => load();
        window.addEventListener('pd:follows-changed', h);
        return () => { cancelled = true; window.removeEventListener('pd:follows-changed', h); };
    }, [user.address]);
    const followerCount = counts.followers;

    /* Projects this user created (they're an artist). The Created tab shows
       these as Project cards. */
    const artistProjects = useMemo(() => projectsByArtist(user.handle ?? handle), [user.handle, handle]);

    /* Real collected Outputs (holders rows) for THIS profile's wallet — empty
       at fresh state, populating as the wallet mints/buys. Spans both projects;
       grouped by slug for rendering. Re-fetches on 'pd:project-refresh' (fired
       after a mint / market action) so the gallery updates without a reload. */
    const [holdings, setHoldings] = useState<Holding[]>([]);
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/user/${user.address.toLowerCase()}/outputs`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { holdings?: Holding[] } | null) => {
                    if (!cancelled && d?.holdings) setHoldings(d.holdings);
                })
                .catch(() => {});
        load();
        const onRefresh = () => load();
        window.addEventListener('pd:project-refresh', onRefresh);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onRefresh); };
    }, [user.address]);

    /* Collected-tab search + filter + sort, over the real holdings. Mirrors the
       project page's gallery predicate (ProjectPageBody), but cross-project:
       traits come from the registry per Output (outputTraits), price from the
       live listing. Search matches "{slug} #{id}" so a project name OR an id
       both narrow. Trait pills come from the active Project's schema (TraitsUI),
       so they filter shared traits like Fate across both projects. */
    const visibleCollected = useMemo(() => {
        const minVal = parseFloat(priceMin);
        const maxVal = parseFloat(priceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = searchQuery.trim().toLowerCase();
        const activeCats = Object.keys(activeFilters).filter((c) => activeFilters[c].size > 0);

        const filtered = holdings.filter((h) => {
            if (!getProject(h.slug)) return false;
            const priceNum = h.list_price_eth ? parseFloat(h.list_price_eth) : null;

            if (activeCats.length) {
                const traits = outputTraits(h.slug, h.token_id);
                for (const cat of activeCats) {
                    if (SPECIAL_CATS.has(cat)) continue;
                    const v = traits[cat];
                    if (v === undefined || !activeFilters[cat].has(v)) return false;
                }
            }
            if (q && !`${h.slug} #${h.token_id}`.toLowerCase().includes(q)) return false;
            if (hasMin && (priceNum == null || priceNum < minVal)) return false;
            if (hasMax && priceNum != null && priceNum > maxVal) return false;
            return true;
        });

        const dirMult = dir === 'asc' ? 1 : -1;
        const byId = (a: Holding, b: Holding) =>
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
    }, [holdings, sort, dir, activeFilters, searchQuery, priceMin, priceMax]);

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

    const [activeTab, setActiveTab] = useState<ProfileTab>('created');
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>('starred');

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

    // ── Tab / sub-tab state ───────────────────────────────────────────
    const onCreated   = activeTab === 'created';
    const onCollected = activeTab === 'collected';
    const onMore      = activeTab === 'more';

    // ── Zen mode: Albums-only in + More sub-nav ───────────────────────
    useEffect(() => {
        if (isZen && moreL1 !== 'albums') setMoreL1('albums');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isZen]);

    const galleryVisible = onCreated || onCollected;

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
                                title="Member Since"
                            >{memberSince || '\u2014'}</span>
                            {priceDayOpen && priceDayPos && (
                                <div
                                    className="priceday-popover"
                                    style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}
                                >
                                    <div className="dp-title">MEMBER SINCE</div>
                                    <div className="dp-title-spacer" />
                                    <div className="pd-section-header">JOINED</div>
                                    <div className="dp-row">
                                        <span className="dp-label">{memberSince || '\u2014'}</span>
                                        <span className="dp-value">@{displayHandle}</span>
                                    </div>
                                    <div className="pd-section-end" />
                                    <div className="pd-section-header">FIRST COLLECT</div>
                                    <div className="dp-row">
                                        <span className="dp-label">Prisms #14</span>
                                        <span className="dp-value">0.05 ETH</span>
                                    </div>
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
                                <a href={`/${displayHandle}`}>
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
                            onClick={() => showToast('Followers — coming soon')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    showToast('Followers — coming soon');
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
                            onClick={() => showToast('Coming soon')}
                        >
                            <span>SHARE</span>
                        </button>
                    </div>

                    {/* Tab row */}
                    <div className="profile-tabs-row" id="profileTabsRow">
                        <div
                            className={`pill pill-l1${onCreated ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('created')}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setActiveTab('created'); } }}
                        >
                            <span className="stat-name">Created</span>
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
                    {onMore && (
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
                                    showToast('Discord linking test entry added');
                                }}
                            >
                                Link Discord
                            </button>
                        </div>
                    )}

                    {/* + More tab: profile sub-nav pills (Starred / Wishlists / Albums) */}
                    {onMore && (
                        <TraitsUI
                            visible={true}
                            hideSortBar
                            profilePills={
                                (isZen
                                    ? [{ key: 'albums', label: 'Albums', active: moreL1 === 'albums', onClick: () => setMoreL1('albums') }]
                                    : [
                                        { key: 'starred',   label: 'Starred',   active: moreL1 === 'starred',   onClick: () => setMoreL1('starred')   },
                                        { key: 'wishlists', label: 'Wishlists', active: moreL1 === 'wishlists', onClick: () => setMoreL1('wishlists') },
                                        { key: 'albums',    label: 'Albums',    active: moreL1 === 'albums',    onClick: () => setMoreL1('albums')    },
                                    ]
                                )
                            }
                        />
                    )}

                    {/* Collected tab: full TraitsUI — same surface as project Artworks tab.
                        End goal: sort/filter the user's cross-project collection (OpenSea-style).
                        For now backed by COLLECTED_IDS mock data; full predicate wiring lands
                        when real per-user collection data is available. */}
                    <TraitsUI visible={onCollected} />
            </Hero>

            {/* Gallery — Created or Collected depending on active tab */}
            <section
                id="gallery"
                aria-label="Gallery"
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {onCreated
                    ? artistProjects.map((p) => (
                          <ProjectCard key={p.slug} slug={p.slug} displayName={p.displayName} outputs={p.outputs} />
                      ))
                    : collectedByProject.map(({ slug, ids }) => (
                          <ProjectProvider key={slug} slug={slug}>
                              {ids.map((id) => (
                                  <ArtworkCard key={`${slug}-${id}`} id={id} />
                              ))}
                          </ProjectProvider>
                      ))}
            </section>
        </>
    );
}

export default function ProfilePageBody({
    handle,
    initialUser,
}: {
    handle: string;
    initialUser: UserProfileData;
}) {
    return (
        <TraitsProvider>
            <ProfilePageBodyInner handle={handle} initialUser={initialUser} />
        </TraitsProvider>
    );
}
