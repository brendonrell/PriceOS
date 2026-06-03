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

import { useState, useEffect, type KeyboardEvent } from 'react';
import {
    TraitsProvider,
} from '../../lib/state/TraitsContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
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
    const { notifs } = usePdNotifs();
    const isZen = notifs.zenMode;

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

    const allProfilePills: ProfilePill[] = [
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

    /* Zen mode: only Albums is shown under + More. The feature pills
       (Starred, Wishlists) involve price-adjacent social signals that
       zen strips. Also ensure the active sub-tab is always albums
       when zen is on so the user doesn't land on a hidden state. */
    const profilePills = isZen
        ? allProfilePills.filter((p) => p.key === 'albums')
        : allProfilePills;

    // If zen turns on while the user is on a now-hidden sub-tab, snap to albums.
    // useEffect avoids calling setState during render.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
        if (isZen && moreL1 !== 'albums') {
            setMoreL1('albums');
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isZen]);

    const galleryVisible = onCreated || onCollected;
    const galleryIds = onCreated ? CREATED_IDS : COLLECTED_IDS;

    return (
        <>
            <section className="project-hero" aria-label="Profile Info">
                <div className="hero-group-1">
                    <h1 className="project-title">
                        <span>@CTO<span className="artist-tag" aria-label="artist">{'✺\uFE0E'}</span></span>
                        <span className="project-date">APR 2025</span>
                    </h1>

                    <div className="hero-line project-custom">
                        <span className="by-text">Via</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/profile/cto">cto.eth</a>
                            </span>
                        </div>
                    </div>

                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Followed by{' '}
                            <a className="profile-link">@matty</a>
                            <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                            {', '}
                            <a className="profile-link">@atlasforge</a>
                            {', '}
                            <a className="profile-link">@rudxane</a>
                            <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                            {' '}
                            <span
                                className="open-modal-text"
                                style={{ textDecoration: 'underline', textUnderlineOffset: '2px', cursor: 'pointer' }}
                                onClick={() => showToast('Followers — coming soon')}
                            >
                                &amp; 42 Others You Know
                            </span>
                        </span>
                    </div>

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
                        <div className={`pill pill-l1${onCreated ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => setActiveTab('created')}>
                            <span className="stat-name">Created</span>
                        </div>
                        <div className={`pill pill-l1${onCollected ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => setActiveTab('collected')}>
                            <span className="stat-name">Collected</span>
                        </div>
                        <div className={`pill pill-l1${onMore ? ' active' : ''}`} role="button" tabIndex={0} onClick={() => setActiveTab('more')}>
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

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

                    <TraitsUI visible={onMore} hideSortBar profilePills={profilePills} />
                </div>
            </section>

            <section id="gallery" aria-label="Gallery" style={{ display: galleryVisible ? undefined : 'none' }}>
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
