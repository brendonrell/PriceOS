'use client';

/*
 * components/profile/ProfilePageBody.tsx
 *
 * Profile page body — mounted by app/[slug]/page.tsx (server shell
 * which resolves the slug + emits metadata). Forked from the project
 * page body per the Launch Cut spec: same CSS classes (`.collection-
 * hero`, `.hero-group-1`, `.hero-group-2`, `.stats-grid`, `.btn-mint`,
 * `.profile-tabs-row`, `.info-rubik`, `.collected-pair`, `.profile-
 * link`) so the existing globals.css rules paint the surface without
 * a parallel CSS port.
 *
 * v0 hardcodes for @cto:
 *   - Handle / ENS / followed-by chips are static
 *   - Stats values are static placeholders (collected count, volume,
 *     followers, following; two slots intentionally empty `—`)
 *   - FOLLOW button is hardcoded (no state-dependent variant)
 *   - Three tabs: Created / Collected / + More
 *   - Created + Collected = ArtworkCard placeholder-id grids
 *   - + More = TraitsUI(hideSortBar, profilePills) — view-mode
 *     switcher + Starred/Wishlists/Albums L1 pills only
 *
 * Profile-theme boot lands in lib/state/ThemeContext.tsx and the
 * prehydration script in app/layout.tsx: when no theme is saved and
 * pathname matches a profile-handle shape, the bg paints
 * Attention Yellow (#FFE600).
 *
 * Mounts TraitsProvider as a thin outer wrapper so the +More tab's
 * <TraitsUI/> can call useTraits() — mirrors the project-page pattern
 * at the bottom of ProjectPageBody.tsx.
 */

import { useState, type KeyboardEvent } from 'react';
import {
    TraitsProvider,
} from '../../lib/state/TraitsContext';
import { useToast } from '../../lib/state/ToastContext';
import ArtworkCard from '../ArtworkCard';
import TraitsUI, { type ProfilePill } from '../project/TraitsUI';

type ProfileTab = 'created' | 'collected' | 'more';
type ProfileMoreL1 = 'starred' | 'wishlists' | 'albums';

/* Placeholder id slices for the gradient renderer. The same ids paint
   stable gradients (lib/art/placeholderRenderer.ts hashes id → spec)
   so a tab swap renders a consistent grid every visit. */
const CREATED_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COLLECTED_IDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

function ProfilePageBodyInner() {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<ProfileTab>('created');
    /* +More L1 pill selection — visual-only for v0 per spec. */
    const [moreL1, setMoreL1] = useState<ProfileMoreL1>('starred');

    /* Stat-icon toast helper. Same pattern as
       ProjectPageBody.iconToastProps — icon click fires a toast
       describing the stat. Bundled here so each .stat-icon spread is
       one line. */
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

    const onCreated = activeTab === 'created';
    const onCollected = activeTab === 'collected';
    const onMore = activeTab === 'more';

    /* +More tab — three profile-mode L1 pills passed into TraitsUI's
       profilePills prop. The prop is visual-only for v0; no underlying
       gallery filter wires to it yet. TraitsUI auto-suppresses L2/L3
       rows in profile mode (no TraitCategory activeCategory). */
    const profilePills: ProfilePill[] = [
        {
            key: 'starred',
            label: 'Starred',
            active: moreL1 === 'starred',
            onClick: () => setMoreL1('starred'),
        },
        {
            key: 'wishlists',
            label: 'Wishlists',
            active: moreL1 === 'wishlists',
            onClick: () => setMoreL1('wishlists'),
        },
        {
            key: 'albums',
            label: 'Albums',
            active: moreL1 === 'albums',
            onClick: () => setMoreL1('albums'),
        },
    ];

    /* Gallery visibility — gallery shows on Created or Collected.
       The +More tab swaps the gallery out for the TraitsUI shell. */
    const galleryVisible = onCreated || onCollected;
    const galleryIds = onCreated ? CREATED_IDS : COLLECTED_IDS;

    return (
        <>
            <section className="collection-hero" aria-label="Profile Info">
                <div className="hero-group-1">
                    {/* Line 1: @HANDLE + artist badge. Reuses
                        `.collection-title` for visual parity with the
                        project page hero — no profile-specific title
                        class exists in globals.css. No status indicator
                        in this line per spec. */}
                    <h1 className="collection-title">
                        <span>@CTO</span>
                        <span className="artist-tag" aria-label="artist">
                            {'✺\uFE0E'}
                        </span>
                    </h1>

                    {/* Line 2: ENS placeholder + active status glyph.
                        Static for v0; getArtistGlyph() wiring lands in
                        a later workstream. */}
                    <div className="hero-line">
                        <span className="info-rubik">
                            via cto.eth{' '}
                            <span className="artist-tag" aria-label="active">
                                {'☼\uFE0E'}
                            </span>
                        </span>
                    </div>

                    {/* Line 3: followed-by chips. Same `.info-rubik` +
                        `.collected-pair` / `.profile-link` pattern as
                        ProjectPageBody's "Collected by" line. Sprite
                        slot intentionally omitted — sprites are the
                        project-page mascot decoration; profile chips
                        are the handle + (optional) artist badge only
                        for v0. */}
                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            followed by{' '}
                            <span className="collected-pair">
                                <a className="profile-link">@piterpasma</a>
                            </span>
                            {', '}
                            <span className="collected-pair">
                                <a className="profile-link">@rudxane</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺\uFE0E'}
                                </span>
                            </span>
                            {', '}
                            <span className="collected-pair">
                                <a className="profile-link">@gmoney</a>
                            </span>
                        </span>
                    </div>

                    {/* Stats grid — two rows, semi-themed by glyph
                        family per spec:
                          Top row (economic, geometric icons):
                            ⬚ collected count, ⟠ volume spent, ◈ —
                          Bottom row (social, circular icons):
                            ◎ followers, ⊙ following, ◉ —
                        All icons fire showToast on click via
                        iconToastProps. Third columns hardcode `—`
                        placeholders per spec — picks pending. */}
                    <div className="stats-grid">
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
                                    className="stat-icon stat-icon-eth"
                                    {...iconToastProps('Volume Spent')}
                                >
                                    ⟠&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-vol">3.2 ETH</span>
                            </span>
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box"
                                    {...iconToastProps('Stat 3 — coming soon')}
                                >
                                    ◈&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-empty"></span>
                            </span>
                        </div>

                        <div className="hero-line stats-row stats-row-2">
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box"
                                    {...iconToastProps('Followers')}
                                >
                                    ◎&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">89</span>
                            </span>
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box"
                                    {...iconToastProps('Following')}
                                >
                                    ⊙&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">34</span>
                            </span>
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box"
                                    {...iconToastProps('Stat 6 — coming soon')}
                                >
                                    ◉&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-empty"></span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hero-group-2">
                    {/* Action row — single FOLLOW button hardcoded for
                        v0. State-dependent variants (FOLLOW BACK /
                        FOLLOWING / EDIT) land when the social graph
                        wiring exists. SOUNDTRACK button is parked. */}
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title="Follow @cto"
                            onClick={() => showToast('Follow — coming soon')}
                        >
                            <span className="mint-lbl">FOLLOW</span>
                        </button>
                    </div>

                    {/* Tab row — three pills: Created / Collected /
                        + More. Same `.profile-tabs-row` + `.pill .pill-l1`
                        structure as the project page so existing CSS
                        applies. */}
                    <div className="profile-tabs-row" id="profileTabsRow">
                        <div
                            className={`pill pill-l1${onCreated ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('created')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('created');
                                }
                            }}
                            title="Created — artist's minted projects"
                        >
                            <span className="stat-name">Created</span>
                        </div>
                        <div
                            className={`pill pill-l1${onCollected ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('collected')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('collected');
                                }
                            }}
                            title="Collected — outputs held"
                        >
                            <span className="stat-name">Collected</span>
                        </div>
                        <div
                            className={`pill pill-l1${onMore ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('more')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('more');
                                }
                            }}
                            title="More — Starred / Wishlists / Albums"
                        >
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

                    {/* +More tab — TraitsUI in profile mode:
                          - hideSortBar suppresses the sort-icons cluster
                            (Recent + burn + multi + search) AND the
                            sort sub-row (#ID / $PRICE / FEED).
                          - profilePills replaces the project-mode L1
                            trait pill cluster with Starred / Wishlists
                            / Albums.
                        The .theme-pills four-square view-mode switcher
                        (bottom-left of .sort-bar) stays visible. */}
                    <TraitsUI
                        visible={onMore}
                        hideSortBar
                        profilePills={profilePills}
                    />
                </div>
            </section>

            {/* Gallery — Created or Collected tab.
                ArtworkCard already paints per-token gradient + aspect
                ratio via getTokenArtSpec(id), so this is just a
                placeholder-id grid. */}
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

/* Outer wrapper. Mounts TraitsProvider so the inner consumer's
   <TraitsUI/> on the +More tab can call useTraits(). Mirrors the
   project-page pattern at the bottom of ProjectPageBody.tsx. */
export default function ProfilePageBody() {
    return (
        <TraitsProvider>
            <ProfilePageBodyInner />
        </TraitsProvider>
    );
}
