'use client';

/*
 * components/artwork/ArtworkPageBody.tsx
 *
 * Artwork page body — mounted by app/[slug]/page.tsx (canonical
 * `/{globalId}`) and app/art/[slug]/[localId]/page.tsx (alt URL).
 * Forked from ProjectPageBody.tsx (NOT the profile body): the hero
 * markup mirrors project line-for-line so existing globals.css
 * rules paint the surface identically — same `.project-title`,
 * same `.project-custom` lockup (By + artist-name-wrap +
 * artist-tag + follow-badge + follower-count), same `.info-line`
 * "Collected by"-shape chip pattern (here: "Held by"), same
 * `.stats-grid` with class-qualified icons that the CSS sizes
 * per-row (.stats-row .stat-icon-owners, .stats-row-2
 * .stat-icon-owned/spent, .stats-row-2 .stat-item-anchor
 * .stat-icon-box). Same BUY button format (parens around price,
 * no space between mint-lbl and mint-price spans).
 *
 * The three differences from project:
 *   - Title reads `{Project} #{n}` (e.g. "Prisms #1"); no date span.
 *   - Held-by chip replaces project's Collected-by list (current
 *     owner instead of past collectors).
 *   - Tabs are Artwork / Albums / + More; gallery section below
 *     renders a single span-3 card on the Artwork tab.
 *
 * v0 hardcodes:
 *   - Project name "Prisms" Title-Case for canonical URL; alt URL
 *     passes its slug and we title-case here.
 *   - Artist line @claude placeholder mirrors project page exactly.
 *   - Held-by chip @cto static.
 *   - Stats values are static placeholders.
 *   - BUY button toasts "Buy — coming soon".
 *
 * Alt URL passes localId as the placeholder globalId for the
 * renderer; the indexer mapping (project, localId) ↔ globalId is
 * parked. Both URLs render the same body once that mapping lands.
 */

import { useState, type KeyboardEvent } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import ArtworkCard from '../ArtworkCard';

type ArtworkTab = 'artwork' | 'albums' | 'more';

interface Props {
    globalId: number;
    /* Alt-URL context — when mounted via /art/{slug}/{localId}, the
       project slug and localId are available for the title line.
       Canonical /{globalId} mounts pass only globalId. */
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
    const [activeTab, setActiveTab] = useState<ArtworkTab>('artwork');

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

    /* Title: "Prisms #1". Canonical URL has only globalId (Prisms is
       hardcoded for v0 demo data); alt URL passes its slug + localId. */
    const projectName = projectSlug ? titleCase(projectSlug) : 'Prisms';
    const numberPart = typeof localId === 'number' ? localId : globalId;
    const titleLabel = `${projectName} #${numberPart}`;

    return (
        <ProjectProvider slug={projectSlug}>
            <section className="project-hero" aria-label="Artwork Info">
                <div className="hero-group-1">
                    <h1 className="project-title">
                        <span>{titleLabel}</span>
                    </h1>

                    {/* Artist line — mirrors ProjectPageBody.tsx exactly
                        (.project-custom + by-text + artist-lockup +
                        artist-name-wrap + artist-tag + follow-badge +
                        follower-count). @claude placeholder per the
                        project page convention. */}
                    <div className="hero-line project-custom">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/profile/claude">@claude</a>
                                <span
                                    className="artist-tag"
                                    aria-label="artist"
                                >
                                    {'✺\uFE0E'}
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

                    {/* Held-by line — same chip shape as project's
                        "Collected by" (.info-line + .info-rubik +
                        .collected-pair containing .collected-sprite +
                        .profile-link). Current owner @cto. */}
                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Held by{' '}
                            <span className="collected-pair">
                                <span className="collected-sprite">
                                    (⌐■_■)
                                </span>
                                <a className="profile-link">@cto</a>
                            </span>
                        </span>
                    </div>

                    {/* Stats grid — class structure mirrors project
                        line-for-line so the same per-class icon-sizing
                        rules apply (.stats-row .stat-icon-owners,
                        .stats-row-2 .stat-icon-owned/spent, anchor
                        cell). Content is artwork-relevant; wrapper
                        classes are project-identical. */}
                    <div className="stats-grid">
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
                                    className="stat-icon stat-icon-eth"
                                    {...iconToastProps('Last Sale')}
                                >⟠&#xFE0E;</span>{' '}
                                <span className="stat-val stat-val-vol">
                                    0.038 ETH
                                </span>
                            </span>
                            <span className="stat-item stat-item-owners">
                                <span
                                    className="stat-icon stat-icon-owners"
                                    {...iconToastProps('Past Owners')}
                                >
                                    ⌗&#xFE0E;
                                </span>{' '}
                                <span
                                    className="stat-val stat-val-owners"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => showToast('Ownership history — coming soon')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            showToast('Ownership history — coming soon');
                                        }
                                    }}
                                >
                                    7 PPL
                                </span>
                            </span>
                        </div>

                        <div className="hero-line stats-row stats-row-2">
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box stat-icon-owned"
                                    {...iconToastProps('Your Holding Status')}
                                >
                                    ⊡&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-empty"></span>
                            </span>
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box stat-icon-spent"
                                    {...iconToastProps('Floor Price')}
                                >
                                    ↨&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">0.042 ETH</span>
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
                                    onClick={() => showToast('Anchor — coming soon')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            showToast('Anchor — coming soon');
                                        }
                                    }}
                                ></span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hero-group-2">
                    {/* Action button — mirrors project's BUY format
                        (mint-lbl + mint-price spans, parens around
                        price, no space between spans). */}
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title={`Buy ${titleLabel}`}
                            onClick={() => showToast('Buy — coming soon')}
                        >
                            <span className="mint-lbl">BUY</span>
                            <span className="mint-price">(0.042 ETH)</span>
                        </button>
                    </div>

                    {/* Tab row — Artwork / Albums / + More. Same
                        `.profile-tabs-row` + `.pill .pill-l1` structure
                        as project + profile pages. */}
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
                </div>
            </section>

            {/* Artwork tab — single large render. Reuses #gallery's
                auto-fill grid template; the wrapper's `grid-column:
                span 3` lands ~3-col-wide on desktop and falls back to
                single full-width column on narrow viewports. */}
            <section
                id="gallery"
                aria-label="Artwork"
                style={{ display: onArtwork ? undefined : 'none' }}
            >
                <div style={{ gridColumn: 'span 3' }}>
                    <ArtworkCard id={globalId} />
                </div>
            </section>

            {/* Albums tab — placeholder. */}
            <section
                id="albums-panel"
                aria-label="Albums"
                style={{ display: onAlbums ? 'block' : 'none' }}
            >
                <p className="info-rubik">Not in any albums yet.</p>
            </section>

            {/* + More tab — full details placeholder. */}
            <section
                id="details-panel"
                aria-label="Details"
                style={{ display: onMore ? 'block' : 'none' }}
            >
                <p className="info-rubik">Full details coming soon.</p>
            </section>
        </ProjectProvider>
    );
}
