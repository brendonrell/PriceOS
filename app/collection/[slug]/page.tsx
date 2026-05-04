'use client';

/*
 * app/collection/[slug]/page.tsx
 *
 * Collection page port. Sim is the spec — every section here mirrors
 * a sim line range so a side-by-side diff against sim.html is the
 * fastest way to spot drift:
 *
 *   - .collection-hero (.hero-group-1 + .hero-group-2)  → sim 5099-5165
 *   - .traits-ui + .sort-bar + .search-row              → sim 5167-5193
 *   - #gallery (1..222 ArtworkCards)                    → sim 5195
 *                                                          (JS-populated
 *                                                          via renderFeed
 *                                                          ~8155 in sim)
 *   - #activity-feed (mock rows)                        → sim 5199-5203
 *                                                          + mockEvents
 *                                                          shape sim ~7412
 *   - #albums-panel (REPLAY / ALBUMS / GENOME / PRICE
 *                    TARGETS / ATH & HOLDERS /
 *                    DISAGREEMENT SCORE)                → sim 5205-5354
 *
 * Tab routing follows sim's switchCollectionTab (sim ~13134):
 *   - showcase  → gallery visible (.showcase-mode), no traits/sort/feed
 *   - artworks  → gallery or activity-feed (depending on
 *                 currentSort.startsWith('feed')), traits-ui + sort-bar
 *                 visible
 *   - albums    → albums-panel visible, everything else hidden
 *
 * v0 scope notes (this build):
 *   - Footer is rendered globally by PriceOSShell (components/shell/Footer.tsx
 *     already matches sim 5336-5355) so no <footer> here. Same for <main>:
 *     PriceOSShell wraps {children} in <main>, so the page just returns
 *     sections.
 *   - .traits-ui / .sort-bar are rendered as empty containers matching
 *     sim's pre-JS DOM (sim 5169 + 5180). The JS-populated controls
 *     (renderTraitUI, renderSortUI ~8417) are deferred to later builds.
 *     Search-row markup is full but inputs are uncontrolled — wiring is
 *     out of v0 scope.
 *   - Hero stat onclick handlers (openCollectorsModal at sim 5125,
 *     openAnchorPrompt at sim 5145) route through showToast until
 *     CollectorsModal lands (Build 4) and AnchorPrompt arrives later.
 *   - Activity feed rows are hardcoded from sim's mockEvents seed (sim
 *     ~7412) — same six rows so the visual diff matches once CSS lands.
 *   - Albums-panel onclicks fire showToast() the same way sim does
 *     (sim 5212, 5249, 5292, 5305, 5310, 5318) — same coming-soon copy.
 *
 * Scope guard (per session bootstrap): no edits to ArtworkModal, any
 * shell component, any other route page, any state file, or any
 * dropdown component. Strictly the two files in this build.
 */

import { useState, type ReactNode } from 'react';
import { useCollection } from '../../../lib/state/CollectionContext';
import { useSort } from '../../../lib/state/SortContext';
import { useToast } from '../../../lib/state/ToastContext';
import { useModal } from '../../../lib/state/ModalContext';
import { TraitsProvider } from '../../../lib/state/TraitsContext';
import ArtworkCard from '../../../components/ArtworkCard';
import TraitsUI from '../../../components/collection/TraitsUI';

type CollectionTab = 'showcase' | 'artworks' | 'albums';

/* Sim mockEvents shape (sim ~7412). Full payload kept lean — sim's six
   seed rows, matched to the .feed-row / .feed-line / .f-icon-wrap /
   .f-time / .f-type / .f-content layout (sim ~8204). The detail field
   here splits sim's innerHTML into JSX so we keep the same visual
   without dangerouslySetInnerHTML. */
interface FeedEvent {
    id: number;
    icon: string;
    time: string;
    type: 'MINT' | 'LIST' | 'OFFER' | 'XFER';
    detail: ReactNode;
}

const MOCK_FEED_EVENTS: FeedEvent[] = [
    {
        id: 14,
        icon: '✶',
        time: '12:04 PM',
        type: 'MINT',
        detail: (
            <>
                <span className="f-highlight">@matty</span>
                <span className="follow-badge">
                    <span className="ico-mutual" title="Mutual">
                        ⚭&#xFE0E;
                    </span>
                </span>{' '}
                collected <span className="f-highlight">#14</span>
            </>
        ),
    },
    {
        id: 22,
        icon: '✹',
        time: '11:45 AM',
        type: 'LIST',
        detail: (
            <>
                <span className="f-highlight">@atlasforge</span>
                <span className="follow-badge">
                    <span className="ico-following" title="You follow them">
                        ⚯&#xFE0E;
                    </span>
                </span>{' '}
                listed <span className="f-highlight">#22</span> for 0.4 ETH
            </>
        ),
    },
    {
        id: 8,
        icon: '✦',
        time: '10:30 AM',
        type: 'OFFER',
        detail: (
            <>
                <span className="f-highlight">@Darold</span>
                <span className="follow-badge">
                    <span className="ico-mutual" title="Mutual">
                        ⚭&#xFE0E;
                    </span>
                </span>{' '}
                offered 0.5 ETH on <span className="f-highlight">#8</span>
            </>
        ),
    },
    {
        id: 48,
        icon: '✶',
        time: '08:00 AM',
        type: 'MINT',
        detail: (
            <>
                <span className="f-highlight">@gmoney</span>
                <span className="follow-badge">
                    <span className="ico-mutual" title="Mutual">
                        ⚭&#xFE0E;
                    </span>
                </span>{' '}
                collected <span className="f-highlight">#48</span>
            </>
        ),
    },
    {
        id: 1,
        icon: '✹',
        time: 'Yesterday',
        type: 'LIST',
        detail: (
            <>
                <span className="f-highlight">@snowfro</span>
                <span className="artist-tag">✺</span> listed{' '}
                <span className="f-highlight">#1</span> for 2.0 ETH
            </>
        ),
    },
    {
        id: 42,
        icon: '✸',
        time: 'Yesterday',
        type: 'XFER',
        detail: (
            <>
                <span className="f-highlight">@XCOPY</span>
                <span className="artist-tag">✺</span>
                <span className="follow-badge">
                    <span className="ico-mutual" title="Mutual">
                        ⚭&#xFE0E;
                    </span>
                </span>{' '}
                transferred <span className="f-highlight">#42</span>
            </>
        ),
    },
];

/* Sim's GENOME card (sim ~5246) — 80 hand-placed scatter dots in a
   400×140 viewBox. Inlined as data so the JSX stays readable; same
   coordinate sequence sim uses. */
const GENOME_DOTS: Array<[number, number]> = [
    [42, 28], [58, 34], [71, 22], [88, 48], [103, 31], [120, 42],
    [140, 58], [155, 44], [175, 62], [188, 78], [210, 66], [228, 84],
    [245, 72], [266, 91], [284, 79], [300, 102], [320, 88], [340, 110],
    [358, 97], [372, 115], [50, 62], [68, 78], [82, 65], [96, 88],
    [115, 72], [132, 95], [148, 82], [168, 105], [184, 92], [205, 112],
    [222, 98], [240, 118], [260, 105], [278, 124], [296, 112], [312, 128],
    [335, 118], [355, 72], [34, 92], [55, 105], [74, 118], [92, 124],
    [112, 108], [125, 122], [380, 55], [368, 42], [352, 60], [325, 48],
    [308, 55], [290, 50], [275, 40], [258, 55], [240, 40], [220, 50],
    [200, 38], [180, 46], [160, 34], [140, 28], [122, 22], [105, 18],
    [86, 12],
];

export default function CollectionPage({
    params,
}: {
    params: { slug: string };
}) {
    /* Hooks first (no conditional returns above) — covers the lint rule
       Brendon called out in earlier sessions. */
    const collection = useCollection();
    const { sort } = useSort();
    const { showToast } = useToast();
    const { open } = useModal();
    const [activeTab, setActiveTab] = useState<CollectionTab>('showcase');

    /* Slug is mock-only at v0 — sim has a single collection (PRISMS), so
       we read the title via CollectionContext and ignore the route param.
       The reference here keeps the unused-variable lint quiet. */
    void params.slug;

    /* Sim's tab visibility table (sim ~13150):
         showcase  → gallery, no feed/traits/sort/albums
         artworks  → gallery (or activity-feed if sort starts with 'feed'),
                     traits/sort visible
         albums    → albums-panel only
       Translated directly into booleans below. */
    const onArtworksTab = activeTab === 'artworks';
    const onAlbumsTab = activeTab === 'albums';
    const onShowcaseTab = activeTab === 'showcase';
    const feedActive = onArtworksTab && sort === 'feed';
    const galleryVisible = (onShowcaseTab || onArtworksTab) && !feedActive;
    const feedVisible = onArtworksTab && feedActive;
    const traitsAndSortVisible = onArtworksTab;

    const tokenIds: number[] = [];
    for (let i = 1; i <= collection.totalEditions; i++) tokenIds.push(i);

    return (
        <TraitsProvider>
            <section className="collection-hero" aria-label="Collection Info">
                <div className="hero-group-1">
                    <h1 className="collection-title">
                        <span>{collection.title}</span>
                        <span className="collection-date">AUG 14 2026</span>
                    </h1>

                    <div className="hero-line collection-artist">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/profile/claude">@claude</a>
                                <span className="artist-tag" aria-label="artist">
                                    ✺
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

                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Collected by{' '}
                            <span className="collected-pair">
                                <span className="collected-sprite">(⌐■_■)</span>
                                <a className="profile-link">@piterpasma</a>
                            </span>{' '}
                            &{' '}
                            <span className="collected-pair">
                                <span className="collected-sprite">ᕙ(⇀‸↼‶)ᕗ</span>
                                <a className="profile-link">@rudxane</a>
                            </span>
                        </span>
                    </div>

                    {/* Sim ~5121: stats grid wraps two stats-rows in a single
                        3-column grid so columns align across rows. Row 2
                        is "your relationship to this collection" (Owned,
                        Spent, Anchor) — hidden via CSS for logged-out
                        users. We render it always at v0; persona gating
                        is out of scope. */}
                    <div className="stats-grid">
                        <div className="hero-line stats-row">
                            <span
                                className="stat-item"
                                title="Editions Minted / Total Supply"
                            >
                                <span className="stat-icon stat-icon-box">
                                    ⬚&#xFE0E;
                                </span>{' '}
                                <span className="stat-val">198/222</span>
                            </span>
                            <span className="stat-item stat-item-vol">
                                <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                                <span className="stat-val stat-val-vol">14 VOL</span>
                            </span>
                            <span
                                className="stat-item stat-item-owners"
                                role="button"
                                tabIndex={0}
                                onClick={() => open('collectors')}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        open('collectors');
                                    }
                                }}
                            >
                                <span className="stat-icon stat-icon-owners">
                                    ⌗&#xFE0E;
                                </span>{' '}
                                <span className="stat-val stat-val-owners">
                                    67 PPL
                                </span>
                            </span>
                        </div>

                        <div className="hero-line stats-row stats-row-2">
                            <span className="stat-item" title="Editions You Own">
                                <span className="stat-icon stat-icon-box stat-icon-owned">
                                    ⊡&#xFE0E;
                                </span>{' '}
                                <span className="stat-val" id="statOwnedVal">
                                    —
                                </span>
                            </span>
                            <span
                                className="stat-item"
                                title="Total Spent on This Collection"
                            >
                                <span className="stat-icon stat-icon-box stat-icon-spent">
                                    ⎙&#xFE0E;
                                </span>{' '}
                                <span className="stat-val" id="statSpentVal">
                                    0.142 ETH
                                </span>
                            </span>
                            <span
                                className="stat-item stat-item-anchor"
                                role="button"
                                tabIndex={0}
                                title="Your Personal Reference Price — tap to set"
                                onClick={() =>
                                    showToast('Anchor — prompt pending')
                                }
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        showToast('Anchor — prompt pending');
                                    }
                                }}
                            >
                                <span className="stat-icon stat-icon-box">
                                    ⚓&#xFE0E;
                                </span>{' '}
                                <span
                                    className="stat-val stat-val-empty"
                                    id="statAnchorVal"
                                >
                                    —
                                </span>
                            </span>
                        </div>
                    </div>
                </div>

                <div className="hero-group-2">
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title="Buy the Lowest Listed Edition"
                            onClick={() =>
                                showToast('Mint flow — wiring pending')
                            }
                        >
                            <span className="mint-lbl">BUY</span>
                            <span className="mint-price">(0.014 ETH)</span>
                        </button>
                    </div>

                    {/* Sim 5161-5165: collection tab pills (Showcase /
                        Artworks / + More). Visibility logic mirrors
                        switchCollectionTab (sim ~13134). */}
                    <div className="profile-tabs-row" id="collectionTabsRow">
                        <div
                            className={`pill pill-l1${onShowcaseTab ? ' active' : ''}`}
                            id="ctab-showcase"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('showcase')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('showcase');
                                }
                            }}
                            title="Curated Showcase of Featured Editions"
                        >
                            <span className="stat-name">Showcase</span>
                        </div>
                        <div
                            className={`pill pill-l1${onArtworksTab ? ' active' : ''}`}
                            id="ctab-artworks"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('artworks')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('artworks');
                                }
                            }}
                            title="Browse All Artworks in the Collection"
                        >
                            <span className="stat-name">Artworks</span>
                        </div>
                        <div
                            className={`pill pill-l1${onAlbumsTab ? ' active' : ''}`}
                            id="ctab-albums"
                            role="button"
                            tabIndex={0}
                            onClick={() => setActiveTab('albums')}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTab('albums');
                                }
                            }}
                            title="More — curated sections"
                        >
                            <span className="stat-name">+ More</span>
                        </div>
                    </div>

                    {/* Sim 5168-5189: TraitsUI = .traits-ui + .sort-bar +
                        .search-row, mounted as one component so the three
                        sibling blocks share TraitsContext. Visibility
                        gating mirrors sim's switchCollectionTab — only
                        the Artworks tab shows trait/sort surfaces. */}
                    <TraitsUI visible={traitsAndSortVisible} />
                </div>
            </section>

            {/* Sim 5195: gallery section. JS-populated in sim via renderFeed
                (~8155). In React: one ArtworkCard per token id 1..222.
                showcase-mode class follows sim's switchCollectionTab toggle
                (sim ~13150) — CSS uses :nth-child gating to limit visible
                tiles, so all 222 still mount and we just flag the parent. */}
            <section
                id="gallery"
                aria-label="Gallery"
                className={onShowcaseTab ? 'showcase-mode' : undefined}
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {tokenIds.map((id) => (
                    <ArtworkCard key={id} id={id} />
                ))}
            </section>

            {/* Sim 5199-5203: activity feed. Mock rows seeded from sim's
                mockEvents (sim ~7412), structured per the feedList template
                in sim ~8204. Hidden by default; surfaces only when the
                'artworks' tab is active AND sort is 'feed'. */}
            <section
                id="activity-feed"
                aria-label="Activity Feed"
                style={{ display: feedVisible ? 'block' : 'none' }}
            >
                <div className="feed-list" id="feedList">
                    {MOCK_FEED_EVENTS.map((e) => (
                        <div className="feed-row" key={e.id}>
                            <div className="feed-line" />
                            <div className="f-icon-wrap">
                                {e.icon}
                                &#xFE0E;
                            </div>
                            <div className="f-time">{e.time}</div>
                            <div className="f-type">{e.type}</div>
                            <div className="f-content">{e.detail}</div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Sim 5205-5354: + More panel. Six section blocks under
                .more-section-header headings. Onclicks all route through
                showToast — sim does the same (sim 5212, 5249, 5292, 5305,
                5310, 5318) since these are mockup surfaces awaiting real
                indexer data. */}
            <section
                id="albums-panel"
                aria-label="More"
                style={{ display: onAlbumsTab ? 'block' : 'none' }}
            >
                {/* REPLAY — sim 5207-5228 */}
                <div className="more-section-header">REPLAY</div>
                <div className="more-replay-wrap">
                    <div
                        className="more-replay-card"
                        onClick={() =>
                            showToast('Replay — design sprint pending')
                        }
                    >
                        <div className="more-replay-timeline">
                            <div className="mr-tl-bar" />
                            <div className="mr-tl-playhead" />
                            <div className="mr-tl-events">
                                {Array.from({ length: 14 }).map((_, i) => (
                                    <span className="mr-tl-ev" key={i} />
                                ))}
                            </div>
                        </div>
                        <div className="more-replay-meta">
                            <span className="mr-play">▶&#xFE0E;</span>
                            <span className="mr-speed">1x</span>
                            <span className="mr-speed mr-speed-dim">5x</span>
                            <span className="mr-speed mr-speed-dim">22x</span>
                            <span className="mr-range">AUG 14 → TODAY</span>
                        </div>
                    </div>
                </div>

                {/* ALBUMS — sim 5230-5244 */}
                <div className="more-section-header">ALBUMS</div>
                <div id="albumsGrid" className="albums-grid">
                    {[
                        { name: 'Favourites', count: 12 },
                        { name: 'Dark Modes', count: 8 },
                        { name: 'Vibrant', count: 6 },
                        { name: 'Boss Encounters', count: 4 },
                    ].map((a) => (
                        <div className="album-card" key={a.name}>
                            <div className="album-thumb-grid">
                                <div className="atg-cell" />
                                <div className="atg-cell" />
                                <div className="atg-cell" />
                                <div className="atg-cell" />
                            </div>
                            <div className="album-meta">
                                <span className="album-name">{a.name}</span>
                                <span className="album-count">{a.count}</span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* GENOME — sim 5246-5283 */}
                <div className="more-section-header">GENOME</div>
                <div className="more-genome-wrap">
                    <div
                        className="more-genome-card"
                        onClick={() =>
                            showToast(
                                'Genome — parameter space map, coming soon'
                            )
                        }
                    >
                        <svg
                            className="more-genome-svg"
                            viewBox="0 0 400 140"
                            preserveAspectRatio="none"
                            aria-hidden="true"
                        >
                            <g fill="currentColor">
                                {GENOME_DOTS.map(([cx, cy], i) => (
                                    <circle key={i} cx={cx} cy={cy} r={1.8} />
                                ))}
                            </g>
                        </svg>
                        <div className="more-genome-meta">
                            <span>1000 minted · parameter space preview</span>
                        </div>
                    </div>
                </div>

                {/* PRICE TARGETS — sim 5285-5306 */}
                <div className="more-section-header">PRICE TARGETS</div>
                <div className="more-seal-wrap">
                    <div
                        className="more-seal-card"
                        onClick={() =>
                            showToast(
                                'Price Targets — predictions reveal after window closes'
                            )
                        }
                    >
                        <div className="more-seal-label">
                            WHERE THE CROWD THINKS FLOOR LANDS IN 30D
                        </div>
                        <div className="more-seal-buckets">
                            <div className="msb-bar" style={{ height: '18%' }} />
                            <div className="msb-bar" style={{ height: '32%' }} />
                            <div className="msb-bar" style={{ height: '52%' }} />
                            <div className="msb-bar" style={{ height: '78%' }} />
                            <div
                                className="msb-bar msb-peak"
                                style={{ height: '94%' }}
                            />
                            <div className="msb-bar" style={{ height: '66%' }} />
                            <div className="msb-bar" style={{ height: '42%' }} />
                            <div className="msb-bar" style={{ height: '28%' }} />
                            <div className="msb-bar" style={{ height: '14%' }} />
                        </div>
                        <div className="more-seal-axis">
                            <span>0.008</span>
                            <span>0.012</span>
                            <span>0.018</span>
                            <span>0.024</span>
                        </div>
                    </div>
                </div>

                {/* ATH & HOLDERS — sim 5308-5321 */}
                <div className="more-section-header">ATH & HOLDERS</div>
                <div className="more-stats-grid">
                    <div
                        className="more-stat-tile"
                        onClick={() =>
                            showToast('All-time high — indexer data')
                        }
                    >
                        <div className="mst-label">ALL-TIME HIGH</div>
                        <div className="mst-value">4.22 ETH</div>
                        <div className="mst-sub">#888 · OCT 09 2026</div>
                    </div>
                    <div
                        className="more-stat-tile"
                        onClick={() =>
                            showToast('Holder map — 342 unique holders')
                        }
                    >
                        <div className="mst-label">HOLDER MAP</div>
                        <div className="mst-value">342</div>
                        <div className="mst-sub">UNIQUE HOLDERS</div>
                    </div>
                </div>

                {/* DISAGREEMENT SCORE — sim 5323-5335 */}
                <div className="more-section-header">DISAGREEMENT SCORE</div>
                <div className="more-disagree-wrap">
                    <div
                        className="more-disagree-card"
                        onClick={() =>
                            showToast(
                                'Disagreement Score — holder conviction split'
                            )
                        }
                    >
                        <div className="mdg-bar">
                            <div
                                className="mdg-fill mdg-fill-left"
                                style={{ width: '62%' }}
                            />
                            <div
                                className="mdg-fill mdg-fill-right"
                                style={{ width: '38%' }}
                            />
                        </div>
                        <div className="mdg-labels">
                            <span className="mdg-label-l">HODL · 62%</span>
                            <span className="mdg-label-r">38% · LIST</span>
                        </div>
                    </div>
                </div>
            </section>
        </TraitsProvider>
    );
}
