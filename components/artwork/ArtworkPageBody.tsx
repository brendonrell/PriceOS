'use client';

/*
 * components/artwork/ArtworkPageBody.tsx
 *
 * Artwork page body — mounted by app/[slug]/page.tsx (canonical
 * `/{globalId}`) and app/art/[slug]/[localId]/page.tsx (alt URL).
 * Forked from ProfilePageBody.tsx (which itself forked from
 * ProjectPageBody): same `.collection-hero` shell with .hero-group-1
 * (title / info / stats) + .hero-group-2 (action + tabs), then
 * three sibling tab panels below. Existing globals.css rules paint
 * the surface without parallel CSS.
 *
 * Tabs (client-side state for v0; no URL changes):
 *   - Artwork — single large gradient render. `grid-column: span 3`
 *     against #gallery's `repeat(auto-fill, minmax(220px, 1fr))`
 *     template lands the card ~3 cols wide on desktop; auto-fill
 *     collapses to a single column on narrow viewports so mobile
 *     gets full-bleed within the gallery padding.
 *   - Albums — albums this artwork appears in (placeholder empty).
 *   - + More — full details (placeholder; trait rows, contract
 *     info, mint date, etherscan link land in subsequent ships).
 *
 * v0 hardcodes:
 *   - Title: `#{globalId}` for canonical URL; `{slug.toUpperCase()}
 *     #{localId}` for the alt URL.
 *   - Project + held-by chips (PRISMS / @brendon / @cto) static;
 *     anchors are inert (no href) until profile / project routes
 *     are wired across click destinations.
 *   - Stats values static placeholders (floor / last sale, transfers
 *     / age; two slots left as empty `—` placeholders per the
 *     profile-page pattern).
 *   - BUY button hardcoded; no LIST / OFFER variants for v0.
 *
 * Alt URL passes localId as the placeholder globalId for the
 * renderer. The indexer mapping (project, localId) ↔ globalId is
 * parked; both URLs render the same body once that mapping lands
 * without a contract change here.
 */

import { useState, type KeyboardEvent } from 'react';
import { useToast } from '../../lib/state/ToastContext';
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

export default function ArtworkPageBody({
    globalId,
    projectSlug,
    localId,
}: Props) {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<ArtworkTab>('artwork');

    /* Stat-icon toast helper — same pattern as ProfilePageBody and
       ProjectPageBody. Each .stat-icon spread becomes one line. */
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

    /* Canonical URL: `#{globalId}`. Alt URL passes project+localId
       so the hero title reads `{PROJECT} #{LOCAL}` instead. Both
       paint the same body. */
    const titleLabel =
        projectSlug && typeof localId === 'number'
            ? `${projectSlug.toUpperCase()} #${localId}`
            : `#${globalId}`;

    return (
        <>
            <section className="collection-hero" aria-label="Artwork Info">
                <div className="hero-group-1">
                    {/* Line 1: title (no artist badge — artwork is the
                        unit, not the artist). */}
                    <h1 className="collection-title">
                        <span>{titleLabel}</span>
                    </h1>

                    {/* Line 2: project + artist chip pair. Same chip
                        pattern as ProfilePageBody's "followed by" line —
                        `.info-rubik` + `.collected-pair` + `.profile-link`. */}
                    <div className="hero-line">
                        <span className="info-rubik">
                            from{' '}
                            <span className="collected-pair">
                                <a className="profile-link">PRISMS</a>
                            </span>
                            {' '}by{' '}
                            <span className="collected-pair">
                                <a className="profile-link">@brendon</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺\uFE0E'}
                                </span>
                            </span>
                        </span>
                    </div>

                    {/* Line 3: held-by chip — current owner of the
                        artwork. Static @cto placeholder for v0. */}
                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            held by{' '}
                            <span className="collected-pair">
                                <a className="profile-link">@cto</a>
                                <span className="artist-tag" aria-label="artist">
                                    {'✺\uFE0E'}
                                </span>
                            </span>
                        </span>
                    </div>

                    {/* Stats grid — two rows, semi-themed by glyph
                        family per the profile pattern:
                          Top row (economic): floor, last sale, —
                          Bottom row (lifecycle): transfers, age, —
                        Third columns hardcode `—` placeholders per
                        the same v0 spec as profile. Picks pending. */}
                    <div className="stats-grid">
                        <div className="hero-line stats-row">
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-eth"
                                    {...iconToastProps('Floor')}
                                >
                                    ↨&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">0.042 ETH</span>
                            </span>
                            <span className="stat-item stat-item-vol">
                                <span
                                    className="stat-icon stat-icon-eth"
                                    {...iconToastProps('Last Sale')}
                                >
                                    ⟠&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-vol">
                                    0.038 ETH
                                </span>
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
                                    {...iconToastProps('Transfers')}
                                >
                                    ⊚&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">7</span>
                            </span>
                            <span className="stat-item">
                                <span
                                    className="stat-icon stat-icon-box"
                                    {...iconToastProps('Age')}
                                >
                                    ⊙&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">42d</span>
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
                    {/* Action row — BUY hardcoded for v0. LIST /
                        OFFER variants land with the wallet wiring
                        workstream. */}
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title={`Buy ${titleLabel}`}
                            onClick={() => showToast('Buy — coming soon')}
                        >
                            <span className="mint-lbl">BUY</span>{' '}
                            <span className="mint-price">0.042 ETH</span>
                        </button>
                    </div>

                    {/* Tab row — Artwork / Albums / + More. Same
                        `.profile-tabs-row` + `.pill .pill-l1` structure
                        as profile + project pages so existing CSS
                        paints the row. */}
                    <div className="profile-tabs-row" id="artworkTabsRow">
                        <div
                            className={`pill pill-l1${onArtwork ? ' active' : ''}`}
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

            {/* Albums tab — placeholder. Album-list surface lands
                when the album builder workstream ships. */}
            <section
                id="albums-panel"
                aria-label="Albums"
                style={{ display: onAlbums ? 'block' : 'none' }}
            >
                <p className="info-rubik">Not in any albums yet.</p>
            </section>

            {/* + More tab — full details placeholder. Trait rows,
                contract info, mint date / mint tx, etherscan link
                land in subsequent ships. */}
            <section
                id="details-panel"
                aria-label="Details"
                style={{ display: onMore ? 'block' : 'none' }}
            >
                <p className="info-rubik">Full details coming soon.</p>
            </section>
        </>
    );
}
