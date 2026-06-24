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
import CollectedPair from '../hero/CollectedPair';
import TraitsUI from '../project/TraitsUI';
import ReplayPanel from '../project/ReplayPanel';
import ArtworkLive from './ArtworkLive';
import OutputTitleStar from './OutputTitleStar';
import AttributesPanel from './AttributesPanel';
import type { AttrInput } from '../../lib/output/attributes';

function shortAddr(a: string | null): string {
    if (!a || a.length < 10) return a || '—';
    return '0x' + a.slice(2, 6) + '…' + a.slice(-4);
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
                {/* Every other section — titled dotted box, same as the Project
                    page's not-yet-filled sections. Content lands later. */}
                {moreL1 !== 'stats' && moreL1 !== 'attributes' && moreL1 !== 'replay' && (
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
