'use client';

/*
 * components/profile/ProfilePageBody.tsx
 *
 * Profile page body — mounted by app/[slug]/page.tsx (server shell
 * which resolves the slug + emits metadata). Forked from the project
 * page body per the Launch Cut spec: same CSS classes (`.project-
 * hero`, `.hero-group-1`, `.hero-group-2`, `.stats-grid`, `.btn-mint`,
 * `.profile-tabs-row`, `.info-rubik`, `.collected-pair`, `.profile-
 * link`) so the existing globals.css rules paint the surface without
 * a parallel CSS port.
 */

import { useState, type KeyboardEvent } from 'react';
import {
    TraitsProvider,
} from '../../lib/state/TraitsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import ArtworkCard from '../ArtworkCard';
import TraitsUI, { type ProfilePill } from '../project/TraitsUI';

type ProfileTab = 'created' | 'collected' | 'more';
type ProfileMoreL1 = 'starred' | 'wishlists' | 'albums';

const CREATED_IDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const COLLECTED_IDS = [11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25];

function ProfilePageBodyInner() {
    const { showToast } = useToast();
    const { siweAddress } = useAuth();
    const isAuthed = !!siweAddress;

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

    const onCreated = activeTab === 'created';
    const onCollected = activeTab === 'collected';
    const onMore = activeTab === 'more';

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

    const galleryVisible = onCreated || onCollected;
    const galleryIds = onCreated ? CREATED_IDS : COLLECTED_IDS;

    return (
        <>
            <section className="project-hero" aria-label="Profile Info">
                <div className="hero-group-1">
                    <h1 className="project-title">
                        <span>@CTO</span>
                        <span className="artist-tag" aria-label="artist">
                            {'✺\uFE0E'}
                        </span>
                        <span className="project-date">APR 2025</span>
                    </h1>

                    <div className="hero-line">
                        <span className="info-rubik">
                            via cto.eth{' '}
                            <span className="artist-tag" aria-label="active">
                                {'☼\uFE0E'}
                            </span>
                        </span>
                    </div>

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

                    </div>
                </div>

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

                    {onMore && (
                        <div className="more-tab-stats">
                            <div className="hero-line stats-row stats-row-2">
                                <span className="stat-item">
                                    <span
                                        className="stat-icon stat-icon-box"
                                        {...iconToastProps('Followers')}
                                    >◎&#xFE0E;</span>{' '}
                                    <span className="stat-val">89</span>
                                </span>
                                <span className="stat-item">
                                    <span
                                        className="stat-icon stat-icon-box"
                                        {...iconToastProps('Following')}
                                    >⊙&#xFE0E;</span>{' '}
                                    <span className="stat-val">34</span>
                                </span>
                                <span className="stat-item">
                                    <span
                                        className="stat-icon stat-icon-box"
                                        {...iconToastProps('Anchor — coming soon')}
                                    >⚓&#xFE0E;</span>{' '}
                                    <span className="stat-val stat-val-empty">—</span>
                                </span>
                            </div>

                            <a
                                role="button"
                                tabIndex={isAuthed ? 0 : -1}
                                className={!isAuthed ? 'auth-gated' : undefined}
                                style={{
                                    cursor: 'pointer',
                                    fontFamily: 'Courier New, monospace',
                                    marginTop: 14,
                                    display: 'inline-block',
                                }}
                                onClick={(e) => {
                                    e.preventDefault();
                                    if (!isAuthed) return;
                                    showToast('Discord linking test entry added');
                                }}
                                onKeyDown={(e) => {
                                    if (!isAuthed) return;
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        showToast('Discord linking test entry added');
                                    }
                                }}
                            >
                                Link Discord
                            </a>
                        </div>
                    )}

                    <TraitsUI
                        visible={onMore}
                        hideSortBar
                        profilePills={profilePills}
                    />
                </div>
            </section>

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
