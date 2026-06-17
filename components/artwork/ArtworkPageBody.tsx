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

import { useEffect, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useToast } from '../../lib/state/ToastContext';
import { useCart } from '../../lib/state/CartContext';
import { ProjectProvider } from '../../lib/state/ProjectContext';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import { getProject } from '../../lib/project/registry';
import ArtworkLive from './ArtworkLive';

function shortAddr(a: string | null): string {
    if (!a || a.length < 10) return a || '—';
    return '0x' + a.slice(2, 6) + '…' + a.slice(-4);
}

type ArtworkTab = 'artwork' | 'albums' | 'more';
/* + More sub-sections — same set as the project page's + More. */
type MoreL1 =
    | 'replay' | 'stats' | 'genome' | 'gnome' | 'albums'
    | 'social' | 'sentiment' | 'attributes' | 'pricestory';
const MORE_PILLS: { key: MoreL1; label: string }[] = [
    { key: 'replay', label: 'Replay' },
    { key: 'stats', label: 'Stats' },
    { key: 'genome', label: 'Genome' },
    { key: 'gnome', label: 'Gnome' },
    { key: 'albums', label: 'Albums' },
    { key: 'social', label: 'Social' },
    { key: 'sentiment', label: 'Sentiment' },
    { key: 'attributes', label: 'Attributes' },
    { key: 'pricestory', label: 'Price Story' },
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
    const [moreL1, setMoreL1] = useState<MoreL1>('stats');

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

    /* Title: "Prisms #1". */
    const projectName = projectSlug ? titleCase(projectSlug) : 'Prisms';
    const numberPart = typeof localId === 'number' ? localId : globalId;
    const slug = (projectSlug ?? 'prisms').toLowerCase();
    const projectHref = `/art/${slug}`;
    const fullscreenHref = `/art/${slug}/${numberPart}/full`;

    const artistHandle = getProject(slug)?.artistHandle ?? 'opus4-6';

    /* Live market stats for this Output. */
    const [market, setMarket] = useState<{
        owner: string | null; owner_handle: string | null;
        listing: { price_eth: string } | null;
        last_sale: string | null; floor: string | null;
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

    const owned = market?.viewer?.isOwner ?? false;
    const ownerHref = market?.owner_handle
        ? `/${market.owner_handle}`
        : (market?.owner ? `/${market.owner}` : undefined);
    const heldBy = market?.owner_handle ? `@${market.owner_handle}` : shortAddr(market?.owner ?? null);

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
                        {/* Project name → project page (like the modal). The
                            #id stays plain text, not a link. */}
                        <span><a className="artwork-title-link" href={projectHref}>{projectName}</a> #{numberPart}</span>
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

                    {/* Held-by line — current owner, linked to their profile. */}
                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Held by{' '}
                            <span className="collected-pair">
                                <span className="collected-sprite">
                                    (⌐■_■)
                                </span>
                                {ownerHref
                                    ? <a className="profile-link" href={ownerHref}>{heldBy}</a>
                                    : <span className="profile-link">{heldBy}</span>}
                            </span>
                        </span>
                    </div>

                    {/* Stats grid — FIRST row only in the hero. The second row
                        moved into the Stats sub-tab under + More. */}
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
                                    {market?.last_sale ? `${market.last_sale} ETH` : '—'}
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
                                    onClick={() => showToast('Ownership History: COMING SOON')}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            showToast('Ownership History: COMING SOON');
                                        }
                                    }}
                                >
                                    7 PPL
                                </span>
                            </span>
                        </div>
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
                <div className="profile-tabs-row artwork-more-pills">
                    {MORE_PILLS.map((p) => (
                        <div
                            key={p.key}
                            className={`pill pill-l1${moreL1 === p.key ? ' active' : ''}`}
                            role="button"
                            tabIndex={0}
                            onClick={() => setMoreL1(p.key)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setMoreL1(p.key);
                                }
                            }}
                            title={p.label}
                        >
                            <span className="stat-name">{p.label}</span>
                        </div>
                    ))}
                </div>

                {moreL1 === 'stats' ? (
                    <div className="stats-grid artwork-more-stats">
                        <div className="hero-line stats-row stats-row-2">
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
                ) : (
                    <p className="info-rubik">Coming soon.</p>
                )}
            </section>
            </TraitsProvider>
        </ProjectProvider>
    );
}
