'use client';

/*
 * ProjectMorePanel — the project page's + More panel (sim 5205-5354):
 * Social · Stats · Attributes · Replay · Albums · Genome · Gnome ·
 * Sentiment · Price Story · Offers section blocks, plus the panel-local
 * data reads (the market/sentiment ledger fetch and the project follow
 * counts). Split out of ProjectPageBody 2026-07-06 — pure move, no
 * behavior change. The section stays MOUNTED with display:none off-tab,
 * exactly as before, so fetch timing is unchanged.
 */

import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useToast } from '../../lib/state/ToastContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';
import { getProject } from '../../lib/project/registry';
import { buildProjectAttributes } from '../../lib/project/projectAttributes';
import { MINTING_NOW_THRESHOLD } from '../../lib/home/homeData';
import AttrWall from '../artwork/AttrWall';
import CollectionAttributes from './CollectionAttributes';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import { projectContractAddress, shortAddress } from '../../lib/project/projectAddress';
import ReplayPanel from './ReplayPanel';
import GenomePanel from './GenomePanel';
import PriceStoryPanel from '../market/PriceStoryPanel';
import OffersInline from '../market/OffersInline';
import ProjectFollowButton from './ProjectFollowButton';
import Hero from '../hero/Hero';

/* + More sub-nav (Brendon, 2026-06-13) — same trait-pill tab system as the
   profile's + More. The panel's stacked sections are grouped under pills so
   only one group shows at a time:
     Social    → Follow CTA + follower/following counts
     Stats     → Price Stats + ATH & Holders (the factual numbers)
     Attributes→ Attributes (the default lead, Brendon 2026-06-25)
     Replay    → Replay
     Albums    → Albums
     Genome    → Genome
     Sentiment → Price Targets + Disagreement Score (what the crowd thinks) */
export type ProjectMoreL1 = 'social' | 'stats' | 'replay' | 'albums' | 'genome' | 'gnome' | 'sentiment' | 'attributes' | 'pricestory' | 'offers';

export default function ProjectMorePanel({
    onAlbumsTab,
    moreL1,
    uploadedAt,
    lowestFloor,
    anchorEth,
}: {
    onAlbumsTab: boolean;
    moreL1: ProjectMoreL1;
    uploadedAt: number | null;
    lowestFloor: number | null;
    anchorEth: number | null;
}) {
    const project = useProject();
    const def = getProject(project.slug);
    const { showToast } = useToast();
    const { openAnchorPrompt } = useValuePrompt();

    /* The project's PriceSprite face — composed deterministically from the slug
       (collision-proofed vs user sprites). Still face for the Social header. */
    const projectFace = useMemo(() => projectSpriteFace(project.slug), [project.slug]);
    /* Simulated contract address — the wallet stand-in for the project-as-user
       Social hero (seeds the sprite, fills the identity line). */
    const projectAddr = useMemo(() => projectContractAddress(project.slug), [project.slug]);
    const [addrCopied, setAddrCopied] = useState(false);
    const copyProjectAddr = async () => {
        try {
            await navigator.clipboard.writeText(projectAddr);
            setAddrCopied(true);
            setTimeout(() => setAddrCopied(false), 1500);
        } catch { /* clipboard blocked — no-op */ }
    };

    /* The project market read — sentiment + ATH + holders + open book, one
       ledger fetch feeding the +More Stats tiles (real numbers, was mock). */
    const [marketRead, setMarketRead] = useState<{
        label: string; detail: string; open_listings: number; open_offers: number;
        ath_eth: number | null; ath_token: string | null; ath_ts: number | null; holders: number;
    } | null>(null);
    useEffect(() => {
        if (!project.slug) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/project/${project.slug}/sentiment`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setMarketRead(d); })
                .catch(() => {});
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project.slug]);

    /* Social — the project's follow graph (Brendon, 2026-06-14). FOLLOWERS =
       wallets that clicked Follow; FOLLOWING = the project's current holders
       (it auto-follows whoever owns a piece). Counts come client-side from
       /api/project-follows/{slug} (projects.id IS the slug). Refresh on the
       button's 'pd:project-follows-changed' event and on 'pd:project-refresh'. */
    const [followCounts, setFollowCounts] = useState<{ followers: number; following: number }>(
        { followers: 0, following: 0 },
    );
    useEffect(() => {
        let cancelled = false;
        const load = () =>
            fetch(`/api/project-follows/${encodeURIComponent(project.slug)}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancelled || !d) return;
                    setFollowCounts({
                        followers: d.follower_count ?? 0,
                        following: d.following_count ?? 0,
                    });
                })
                .catch(() => {});
        load();
        const h = () => load();
        window.addEventListener('pd:project-follows-changed', h);
        window.addEventListener('pd:project-refresh', h);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:project-follows-changed', h);
            window.removeEventListener('pd:project-refresh', h);
        };
    }, [project.slug]);

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

    return (
        <section
            id="albums-panel"
            aria-label="More"
            style={{ display: onAlbumsTab ? 'block' : 'none' }}
        >
            {moreL1 === 'social' && (<>
            {/* SOCIAL — the project rendered as a USER profile hero (Brendon,
                2026-06-16): the SAME Hero rows a person's profile uses, filled
                with project data — @name + upload date, the PriceSprite + the
                simulated contract address (wallet stand-in) + copy, the follow
                graph, and Follow + Share. The True Name sits below. */}
            <div className="more-section-header">PROJECT SOCIAL PROFILE</div>
            <div className="more-box-wrap">
              <div className="more-box-card">
            <Hero
                ariaLabel="Project Profile"
                titleRow={
                    <h1 className="project-title">
                        <span>@{project.slug}</span>
                    </h1>
                }
                identityRow={
                    <div className="hero-line project-custom id-row-fit">
                        {projectFace && (
                            <span className="id-row-sprite">{projectFace}</span>
                        )}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a
                                    href={`https://etherscan.io/address/${projectAddr}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    0<span className="addr-x">x</span>{shortAddress(projectAddr).slice(2)}
                                </a>
                                <span
                                    className="icon-copy id-copy"
                                    role="button"
                                    tabIndex={0}
                                    title="Copy contract address"
                                    onClick={copyProjectAddr}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            copyProjectAddr();
                                        }
                                    }}
                                >
                                    {addrCopied ? '✓︎' : '⧉︎'}
                                </span>
                            </span>
                        </div>
                    </div>
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item stat-item-owners">
                            <span className="stat-icon stat-icon-owners" {...iconToastProps('Followers — wallets that follow this Project')}>⌗&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">{followCounts.followers} {followCounts.followers === 1 ? 'FOLLOWER' : 'FOLLOWERS'}</span>
                        </span>
                        <span className="stat-item">
                            <span className="stat-icon stat-icon-box" {...iconToastProps('Following — accounts this Project follows')}>⊡&#xFE0E;</span>{' '}
                            <span className="stat-val">{followCounts.following} FOLLOWING</span>
                        </span>
                    </div>
                }
            >
                <div className="action-row">
                    <ProjectFollowButton projectId={project.slug} projectHandle={null} />
                    <button
                        className="btn-soundtrack"
                        title="Share — coming soon"
                        onClick={() => showToast('Share: COMING SOON')}
                    >
                        <span className="btn-icon-play">▶&#xFE0E;</span>{' '}<span>SHARE</span>
                    </button>
                </div>
            </Hero>
              </div>
            </div>
            </>)}
            {moreL1 === 'stats' && (<>
            {/* PRICE STATS — stats-row-2 restored here from hero.
                Percent Listed, Floor Price, and Anchor. The ⚓ anchor
                tap opens the ValuePrompt to set / clear your reference
                price. Moved out of the hero into +More so it is
                accessible without crowding the main hero on mobile. */}
            <div className="more-section-header">PRICE STATS</div>
            <div className="more-box-wrap">
              <div className="more-box-card">
                <div className="stats-row stats-row-2">
                <span className="stat-item">
                    <span
                        className="stat-icon stat-icon-box stat-icon-owned"
                        {...iconToastProps('Percent Listed')}
                    >
                        ⊡&#xFE0E;
                    </span>{' '}
                    <span className="stat-val" id="statOwnedVal">
                        {marketRead != null && project.totalOutputs > 0
                            ? `${Math.round(((marketRead.open_listings ?? 0) / project.totalOutputs) * 100)}%`
                            : '—'}
                    </span>
                </span>
                <span className="stat-item">
                    <span
                        className="stat-icon stat-icon-box stat-icon-spent"
                        {...iconToastProps('Floor Price')}
                    >
                        ↨&#xFE0E;
                    </span>{' '}
                    <span className="stat-val" id="statSpentVal">
                        {lowestFloor !== null
                            ? `${lowestFloor.toFixed(2)} ETH`
                            : '—'}
                    </span>
                </span>
                <span className="stat-item stat-item-anchor">
                    <span
                        className="stat-icon stat-icon-box"
                        {...iconToastProps('Your Personal Reference Price')}
                    >
                        ⚓&#xFE0E;
                    </span>{' '}
                    <span
                        className={
                            anchorEth != null
                                ? 'stat-val'
                                : 'stat-val stat-val-empty'
                        }
                        id="statAnchorVal"
                        role="button"
                        tabIndex={0}
                        title="Tap to set"
                        data-anchor-key={project.title}
                        onClick={(e) => {
                            const key =
                                e.currentTarget.dataset.anchorKey ||
                                project.title;
                            openAnchorPrompt({ key, label: key });
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                const key =
                                    e.currentTarget.dataset.anchorKey ||
                                    project.title;
                                openAnchorPrompt({ key, label: key });
                            }
                        }}
                    >
                        {anchorEth != null
                            ? `${anchorEth} ETH`
                            : ''}
                    </span>
                </span>
                </div>
              </div>
            </div>

            </>)}
            {moreL1 === 'replay' && (<>
            {/* REPLAY — Project time machine. Static mockup (sim 5207-5228)
                promoted to the live player: ReplayPanel animates seeded,
                end-state-pinned history (scrub + 1x/5x/22x + static lock). */}
            <div className="more-section-header">REPLAY</div>
            <ReplayPanel />

            </>)}
            {moreL1 === 'albums' && (<>
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

            </>)}
            {moreL1 === 'genome' && (<>
            {/* GENOME ◎ — the real parameter-space map (GenomePanel). */}
            <div className="more-section-header">GENOME</div>
            <GenomePanel />
            </>)}
            {moreL1 === 'gnome' && (<>
            {/* GNOME — paired with Genome for the pun; empty for now
                (Brendon, 2026-06-16). Empty box gives the title a home. */}
            <div className="more-section-header">GNOME</div>
            <div className="more-box-wrap">
                <div className="more-box-card more-box-empty" />
            </div>
            </>)}
            {moreL1 === 'sentiment' && (<>
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

            </>)}
            {moreL1 === 'stats' && (<>
            {/* ATH & HOLDERS — REAL ledger reads (was mock — the secondary
                build turned these live, 2026-07-02). */}
            <div className="more-section-header">ATH & HOLDERS</div>
            <div className="more-stats-grid">
                <div
                    className="more-stat-tile"
                    onClick={() =>
                        showToast(marketRead?.ath_eth != null ? `All-time high · ${marketRead.ath_eth} ETH` : 'All-time high — no sales yet')
                    }
                >
                    <div className="mst-label">ALL-TIME HIGH</div>
                    <div className="mst-value">{marketRead?.ath_eth != null ? `${Number(marketRead.ath_eth).toFixed(2)} ETH` : '—'}</div>
                    <div className="mst-sub">{marketRead?.ath_token != null ? `#${marketRead.ath_token}${marketRead.ath_ts ? ` · ${new Date(marketRead.ath_ts * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}` : ''}` : 'NO SALES YET'}</div>
                </div>
                <div
                    className="more-stat-tile"
                    onClick={() =>
                        showToast(`Holder map — ${marketRead?.holders ?? 0} unique holders`)
                    }
                >
                    <div className="mst-label">HOLDER MAP</div>
                    <div className="mst-value">{marketRead?.holders ?? '—'}</div>
                    <div className="mst-sub">UNIQUE HOLDERS</div>
                </div>
            </div>

            </>)}
            {moreL1 === 'sentiment' && (<>
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
            </>)}
            {moreL1 === 'attributes' && (
                /* ATTRIBUTES — the project's character sheet, rendered through
                   the SAME tile grid as an Output's (Brendon, 2026-06-24).
                   A GRADUATED project (≥18 mints) gains aggregate Form /
                   Palette / Spread / Collective Fingerprint across its minted
                   set (Brendon, 2026-06-25); ungraduated projects keep the
                   base attributes. Milestone badges show on both. */
                project.totalOutputs >= MINTING_NOW_THRESHOLD ? (
                    <CollectionAttributes
                        slug={project.slug}
                        mintedCount={project.totalOutputs}
                        maxSupply={project.maxSupply}
                        uploadedAt={uploadedAt}
                    />
                ) : (
                    <AttrWall groups={buildProjectAttributes(project.slug, uploadedAt, { mintedCount: project.totalOutputs, maxSupply: project.maxSupply })} />
                )
            )}
            {moreL1 === 'pricestory' && (<>
            {/* PRICE STORY — the collection's market biography, chapters
                from the real ledger (same panel as the Output story). */}
            <div className="more-section-header">PRICE STORY</div>
            <PriceStoryPanel slug={project.slug} />
            </>)}
            {moreL1 === 'offers' && (<>
            {/* OFFERS — the project's live book: every open offer (item +
                collection + trait). Browsing here; acting on the piece. */}
            <div className="more-section-header">OFFERS</div>
            <OffersInline slug={project.slug} />
            </>)}
        </section>
    );
}
