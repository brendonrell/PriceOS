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
import { useModal } from '../../lib/state/ModalContext';
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
import GnomePanel from './GnomePanel';
import PriceStoryPanel from '../market/PriceStoryPanel';
import OffersInline from '../market/OffersInline';
import ProjectFollowButton from './ProjectFollowButton';
import ProjectAnointPanel from './ProjectAnointPanel';
import Hero from '../hero/Hero';
import { formatEth } from '../../lib/format/eth';
import { useAuth } from '../../lib/state/AuthContext';

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
export type ProjectMoreL1 = 'social' | 'stats' | 'replay' | 'albums' | 'genome' | 'gnome' | 'sentiment' | 'attributes' | 'pricestory' | 'offers' | 'anoint';

export default function ProjectMorePanel({
    onAlbumsTab,
    moreL1,
    uploadedAt,
    projectNo,
    lowestFloor,
    anchorEth,
    searchQuery = '',
}: {
    onAlbumsTab: boolean;
    moreL1: ProjectMoreL1;
    uploadedAt: number | null;
    /** Sequential Project ID (upload order, unique) — Attributes Identity tile. */
    projectNo?: number | null;
    lowestFloor: number | null;
    anchorEth: number | null;
    /** Search text from the box beside the +More pills — filters the active tab. */
    searchQuery?: string;
}) {
    const project = useProject();
    const def = getProject(project.slug);
    const { showToast } = useToast();
    const { open } = useModal();
    const { openAnchorPrompt } = useValuePrompt();

    /* Attribute tile taps — the Golf Score tile opens the Clubhouse leaderboard. */
    const onAttrTileTap = (k: string) => {
        if (k === 'golf') open('golf-leaderboard', undefined, project.slug);
    };

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
        held_pieces?: number; list_pct?: number | null; hodl_pct?: number | null;
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
         
    }, [project.slug]);

    /* PRICE TARGETS — the real crowd game (Brendon greenlight 2026-07-13).
       Monthly window, one call per wallet, sealed until the month turns,
       then last month's crowd reveals as a histogram beside the floor. */
    const { siweAddress } = useAuth();
    const [preds, setPreds] = useState<{
        window_key: string; reveals_on: string; sealed_count: number;
        mine: number | null; ladder: number[] | null;
        last: null | {
            window_key: string; count: number; median_eth: number; floor_now_eth: number | null;
            buckets: { from: number; to: number; count: number }[];
        };
    } | null>(null);
    const [casting, setCasting] = useState(false);
    useEffect(() => {
        if (!project.slug) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/project/${project.slug}/predictions`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => { if (!cancelled && d) setPreds(d); })
                .catch(() => {});
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [project.slug, siweAddress]);
    const castTarget = async (eth: number) => {
        if (casting) return;
        setCasting(true);
        try {
            const r = await fetch(`/api/project/${project.slug}/predictions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ floor_eth: eth }),
            });
            if (r.ok) {
                const retarget = preds?.mine != null;
                setPreds((p) => (p ? { ...p, mine: eth, sealed_count: p.mine == null ? p.sealed_count + 1 : p.sealed_count } : p));
                showToast(`Price Target: ${retarget ? 'RETARGETED' : 'CAST'} · ◊${formatEth(eth)}`);
            } else {
                showToast('Price Target: TRY AGAIN');
            }
        } catch {
            showToast('Price Target: TRY AGAIN');
        } finally {
            setCasting(false);
        }
    };

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
            {moreL1 === 'anoint' && <ProjectAnointPanel />}
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
                            ? `${formatEth(lowestFloor)} ETH`
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
                            ? `${formatEth(anchorEth)} ETH`
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
            {/* GNOME — the Project's guardian (GnomePanel): its one keeper,
                cast deterministically at birth, dressed in the colorway.
                Paired with Genome for the pun. */}
            <div className="more-section-header">GNOME</div>
            <GnomePanel />
            </>)}
            {moreL1 === 'sentiment' && (<>
            {/* PRICE TARGETS — REAL (Brendon greenlight 2026-07-13; was the
                sim 5285-5306 mock). Cast this month, sealed till it turns;
                last month's crowd shows as the histogram, vs the floor. */}
            <div className="more-section-header">PRICE TARGETS</div>
            <div className="more-seal-wrap">
                <div
                    className="more-seal-card"
                    onClick={() =>
                        showToast(
                            preds
                                ? `Price Targets — ${preds.sealed_count} sealed call${preds.sealed_count === 1 ? '' : 's'} this window · reveals ${preds.reveals_on}`
                                : 'Price Targets — the crowd calls the 30-day floor'
                        )
                    }
                >
                    <div className="more-seal-label">
                        WHERE THE CROWD THINKS FLOOR LANDS IN 30D
                    </div>

                    {/* This window — sealed, honest count, your standing call. */}
                    <div className="more-seal-status">
                        {preds
                            ? `THIS WINDOW: SEALED · ${preds.sealed_count} CALL${preds.sealed_count === 1 ? '' : 'S'} · REVEALS ${preds.reveals_on}`
                            : 'THIS WINDOW: SEALED'}
                    </div>
                    {siweAddress && preds?.ladder ? (
                        <>
                            <div className="more-seal-cast-label">
                                {preds.mine != null
                                    ? <>YOUR CALL · <span className="eth-mark">◊</span>{formatEth(preds.mine)} — tap a rung to retarget</>
                                    : 'CAST YOURS — tap where the floor lands'}
                            </div>
                            <div className="more-seal-cast-row" onClick={(e) => e.stopPropagation()}>
                                {preds.ladder.map((v) => (
                                    <button
                                        key={v}
                                        type="button"
                                        className={`pill pill-l1 more-seal-rung${preds.mine === v ? ' active' : ''}`}
                                        disabled={casting}
                                        onClick={() => { void castTarget(v); }}
                                    >
                                        <span className="stat-name"><span className="eth-mark">◊</span>{formatEth(v)}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : !siweAddress ? (
                        <div className="more-seal-cast-label">
                            CONNECT TO CAST YOURS — ONE CALL PER WINDOW, SEALED UNTIL IT TURNS
                        </div>
                    ) : null}

                    {/* Last window — the reveal: the real crowd vs the floor. */}
                    {preds?.last ? (
                        <>
                            <div className="more-seal-status more-seal-reveal">
                                LAST WINDOW · {preds.last.count} CALL{preds.last.count === 1 ? '' : 'S'} · MEDIAN <span className="eth-mark">◊</span>{formatEth(preds.last.median_eth)}
                                {preds.last.floor_now_eth != null ? <> · FLOOR NOW <span className="eth-mark">◊</span>{formatEth(preds.last.floor_now_eth)}</> : null}
                            </div>
                            <div className="more-seal-buckets">
                                {(() => {
                                    const max = Math.max(1, ...preds.last!.buckets.map((b) => b.count));
                                    return preds.last!.buckets.map((b, i) => (
                                        <div
                                            key={i}
                                            className={`msb-bar${b.count === max && b.count > 0 ? ' msb-peak' : ''}`}
                                            style={{ height: `${Math.max(4, Math.round((b.count / max) * 94))}%` }}
                                        />
                                    ));
                                })()}
                            </div>
                            <div className="more-seal-axis">
                                <span>{formatEth(preds.last.buckets[0].from)}</span>
                                <span>{formatEth(preds.last.buckets[2].to)}</span>
                                <span>{formatEth(preds.last.buckets[5].to)}</span>
                                <span>{formatEth(preds.last.buckets[8].to)}</span>
                            </div>
                        </>
                    ) : preds ? (
                        <div className="more-seal-status more-seal-reveal">
                            FIRST WINDOW — THE CROWD REVEALS {preds.reveals_on}
                        </div>
                    ) : null}
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
                        showToast(marketRead?.ath_eth != null ? `All-time high · ${formatEth(marketRead.ath_eth)} ETH` : 'All-time high — no sales yet')
                    }
                >
                    <div className="mst-label">ALL-TIME HIGH</div>
                    <div className="mst-value">{marketRead?.ath_eth != null ? `${formatEth(Number(marketRead.ath_eth))} ETH` : '—'}</div>
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
            {/* DISAGREEMENT SCORE — REAL (2026-07-13; was the sim 5323-5335
                mock 62/38). The measured split of what holders are DOING:
                pieces on the market (LIST) vs held tight (HODL). */}
            <div className="more-section-header">DISAGREEMENT SCORE</div>
            <div className="more-disagree-wrap">
                <div
                    className="more-disagree-card"
                    onClick={() =>
                        showToast(
                            marketRead?.list_pct != null
                                ? `Disagreement — ${marketRead.open_listings} of ${marketRead.held_pieces} held pieces on the market`
                                : 'Disagreement Score — holder conviction split'
                        )
                    }
                >
                    {marketRead?.list_pct != null && marketRead?.hodl_pct != null ? (
                        <>
                            <div className="mdg-bar">
                                <div
                                    className="mdg-fill mdg-fill-left"
                                    style={{ width: `${marketRead.hodl_pct}%` }}
                                />
                                <div
                                    className="mdg-fill mdg-fill-right"
                                    style={{ width: `${marketRead.list_pct}%` }}
                                />
                            </div>
                            <div className="mdg-labels">
                                <span className="mdg-label-l">HODL · {marketRead.hodl_pct}%</span>
                                <span className="mdg-label-r">{marketRead.list_pct}% · LIST</span>
                            </div>
                        </>
                    ) : (
                        <div className="mdg-labels">
                            <span className="mdg-label-l">NO HELD PIECES YET — THE SPLIT APPEARS WITH THE FIRST MINT</span>
                        </div>
                    )}
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
                        query={searchQuery}
                        onTileTap={onAttrTileTap}
                    />
                ) : (
                    <AttrWall
                        groups={buildProjectAttributes(project.slug, uploadedAt, { mintedCount: project.totalOutputs, maxSupply: project.maxSupply, projectNo })}
                        query={searchQuery}
                        onTileTap={onAttrTileTap}
                    />
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
            <OffersInline slug={project.slug} query={searchQuery} />
            </>)}
        </section>
    );
}
