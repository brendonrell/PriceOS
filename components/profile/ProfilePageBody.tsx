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

import { useState, useEffect, useRef, type KeyboardEvent } from 'react';
import {
    TraitsProvider,
    useTraits,
} from '../../lib/state/TraitsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { useSort } from '../../lib/state/SortContext';
import ArtworkCard from '../ArtworkCard';
import TraitsUI from '../project/TraitsUI';

type ProfileTab = 'created' | 'collected' | 'more';
type ProfileMoreL1 = 'starred' | 'wishlists' | 'albums';

const CREATED_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COLLECTED_IDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

function ProfilePageBodyInner() {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;
    const { notifs } = usePdNotifs();
    const isZen = notifs.zenMode;
    const { sort, dir } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax } = useTraits();

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

    // ── Collected gallery: sort + filter pipeline (mirrors project page) ──
    // For now backed by COLLECTED_IDS mock data.
    // When real per-user collection data lands, replace the id source here.
    const visibleCollectedIds = (() => {
        let ids = [...COLLECTED_IDS];

        // Basic sort (id / price fallback to id for mock data)
        const dirMult = dir === 'asc' ? 1 : -1;
        if (sort === 'id' || sort === 'fog') {
            ids.sort((a, b) => (a - b) * dirMult);
        } else if (sort === 'feed') {
            ids.sort((a, b) => b - a);
        }
        // price sort: no price data on mock collected ids yet — falls back to id order

        // Search filter: id substring only for now
        const q = searchQuery.trim().toLowerCase();
        if (q) {
            ids = ids.filter((id) => String(id).includes(q));
        }

        return ids;
    })();

    const galleryVisible = onCreated || onCollected;
    const galleryIds = onCreated ? CREATED_IDS : visibleCollectedIds;

    return (
        <>
            <section className="project-hero" aria-label="Profile Info">
                {/* ── hero-group-1: transplanted from ProjectPageBody ─────── */}
                <div className="hero-group-1">

                    {/* Title line */}
                    <h1 className="project-title">
                        <span>
                            @CTO
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
                            >APR 2025</span>
                            {priceDayOpen && priceDayPos && (
                                <div
                                    className="priceday-popover"
                                    style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}
                                >
                                    <div className="dp-title">MEMBER SINCE</div>
                                    <div className="dp-title-spacer" />
                                    <div className="pd-section-header">JOINED</div>
                                    <div className="dp-row">
                                        <span className="dp-label">APR 2025</span>
                                        <span className="dp-value">@CTO</span>
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

                    {/* Identity line — "Via [handle]" */}
                    <div className="hero-line project-custom">
                        <span className="by-text">Via</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/profile/cto">cto.eth</a>
                                <span className="follow-badge">
                                    <span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span>
                                </span>
                            </span>
                            <span className="follower-count">67</span>
                        </div>
                    </div>

                    {/* Social line — "Followed by" (identical structure to project's "Collected by") */}
                    <div className="hero-line collected-by-row info-line">
                        <span className="cbr-label">Followed by</span>{' '}
                        <a className="cbr-name">@matty</a>
                        <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                        {', '}
                        <a className="cbr-name">@atlasforge</a>
                        {', '}
                        <a className="cbr-name">@rudxane</a>
                        <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                        {' '}
                        <span className="cbr-others" onClick={() => showToast('Followers — coming soon')}>
                            &amp; 42 Others You Know
                        </span>
                    </div>

                    {/* Stats line */}
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Outputs Collected')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">142</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span
                                className="stat-icon-eth"
                                {...iconToastProps('Volume Spent')}
                            >
                                ⟠&#xFE0E;
                            </span>{' '}
                            <span className="stat-val stat-val-vol">3.2 ETH</span>
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
                            <span className="stat-icon stat-icon-owners" {...iconToastProps('Followers')}>⌗&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">67 PPL</span>
                        </span>
                    </div>
                </div>

                {/* ── hero-group-2: action row + tabs + TraitsUI ──────────── */}
                <div className="hero-group-2">
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title="Follow @cto"
                            onClick={() => showToast('Follow — coming soon')}
                        >
                            <span className="mint-lbl">FOLLOW</span>
                        </button>
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
                                    <span className="stat-val">89</span>
                                </span>
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box" {...iconToastProps('Following')}>⊙&#xFE0E;</span>{' '}
                                    <span className="stat-val">34</span>
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
                </div>
            </section>

            {/* Gallery — Created or Collected depending on active tab */}
            <section
                id="gallery"
                aria-label="Gallery"
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {galleryIds.map((id) => (
                    <ArtworkCard key={id} id={id} />
                ))}
            </section>
        </>
    );
}

export default function ProfilePageBody() {
    return (
        <TraitsProvider>
            <ProfilePageBodyInner />
        </TraitsProvider>
    );
}
