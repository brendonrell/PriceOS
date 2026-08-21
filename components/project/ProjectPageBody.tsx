'use client';

/*
 * components/project/ProjectPageBody.tsx
 *
 * Project page body — mounted by app/art/[slug]/page.tsx (server shell
 * which handles slug validation + metadata). Sim is the spec — every
 * section here mirrors a sim line range so a side-by-side diff against
 * sim.html is the fastest way to spot drift:
 *
 *   - .project-hero (.hero-group-1 + .hero-group-2)  → sim 5099-5165
 *     · title + .project-custom + .info-rubik
 *     · stats-row + stats-row-2
 *     · BUY (action-row)
 *     · project tabs (Project Showcase / Artworks / + More)
 *   - .traits-ui + .sort-bar + .search-row              → sim 5167-5193
 *   - #gallery (1..500 ArtworkCards)                    → sim 5195
 *                                                          (sim populates
 *                                                          via renderFeed
 *                                                          ~8155)
 *   - #activity-feed (mock rows)                        → sim 5199-5203
 *                                                          + mockEvents
 *                                                          shape sim ~7412
 *   - #albums-panel (REPLAY / ALBUMS / GENOME / PRICE
 *                    TARGETS / ATH & HOLDERS /
 *                    DISAGREEMENT SCORE)                → sim 5205-5354
 *
 * Tab routing follows sim's switchCollectionTab (sim ~13134) — sim's
 * function name kept verbatim as a sim-reference, even though our tab
 * type is ProjectTab:
 *   - project-showcase  → gallery visible, no picks yet (feature TBD), no traits/sort/feed
 *   - artworks  → gallery or activity-feed (depending on
 *                 currentSort.startsWith('feed')), traits-ui + sort-bar
 *                 visible
 *   - albums    → albums-panel visible, everything else hidden
 *
 * Mock-data state (until indexer is live):
 *   - .traits-ui / .sort-bar are rendered as empty containers matching
 *     sim's pre-JS DOM (sim 5169 + 5180). The JS-populated controls
 *     (renderTraitUI, renderSortUI ~8417) are deferred to later builds.
 *     Search-row markup is full but inputs are uncontrolled.
 *   - Hero stat onclick handlers (openCollectorsModal at sim 5125,
 *     openAnchorPrompt at sim 5145) route through showToast until
 *     CollectorsModal lands and AnchorPrompt arrives.
 *   - Activity feed rows are hardcoded from sim's mockEvents seed (sim
 *     ~7412) — same six rows so the visual diff matches.
 *   - Albums-panel onclicks fire showToast() the same way sim does
 *     (sim 5212, 5249, 5292, 5305, 5310, 5318) — same coming-soon copy.
 *
 * Footer is rendered globally by PriceOSShell (components/shell/Footer.tsx
 * already matches sim 5336-5355) so no <footer> here. Same for <main>:
 * PriceOSShell wraps {children} in <main>, so the body returns
 * sibling sections directly — no nested <main>.
 *
 * Nomenclature note (locked May 9): "Project" = platform release,
 * "Output" = individual minted unit, "Token" = ERC-721 chain primitive
 * only. Internal refs to "tokens" / "tokenIds" in this file are
 * preserved where they shadow sim's internal JS variable names
 * (e.g. visibleTokenIds, _projectShowcasePicks); they are not chain-primitive
 * references — they're React state-cluster names mirroring sim's
 * naming for sim-diff legibility.
 */

import { useCallback, useEffect, useState, type KeyboardEvent } from 'react';
import { useProject, ProjectProvider } from '../../lib/state/ProjectContext';
import { useGridSettle } from '../../lib/hooks/useGridSettle';
import { getRememberedTab, rememberTab } from '../../lib/state/tabMemoryStore';
import { readViewParam, setViewParam } from '../../lib/state/viewLink';
import AudienceIndicator from './AudienceIndicator';
import { useCart } from '../../lib/state/CartContext';
import { getProject } from '../../lib/project/registry';
import SoundtrackStarButton from './SoundtrackStarButton';
import ProjectTitleStar from './ProjectTitleStar';
import { usePriceDay } from '../../lib/priceday/usePriceDay';
import { GhostFeedRows } from '../GhostFeed';
import FeedEventRow from '../feed/FeedEventRow';
import SocialFeed from '../home/SocialFeed';
import { fmtFeedDate } from '../profile/profilePageShared';
import { useSort, groupHeaderGlyph } from '../../lib/state/SortContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { TraitsProvider } from '../../lib/state/TraitsContext';
import ArtworkCard from '../ArtworkCard';
import GhostCard from './GhostCard';
import MintButton from './MintButton';
import TraitsUI from './TraitsUI';
import Hero from '../hero/Hero';
import { forceRenderKeys } from '../../lib/virtualization/canvasVirtualizer';
import { isRecordingEnabled } from '../../lib/pins/breadcrumbStore';
import { recordProjectView } from '../../lib/output/views';
import { usePriceDayPopover } from '../../lib/hooks/usePriceDayPopover';
import { useLedgerFeed } from '../../lib/feed/useLedgerFeed';
import { useSpiteMatcher } from '../../lib/pins/spiteStore';
import { useProjectSocial } from './useProjectSocial';
import { useProjectGallery } from './useProjectGallery';
import { useProjectFloor } from './useProjectMarket';
import { useFiat } from '../../lib/state/FiatContext';
import { formatEth, formatEthAmount } from '../../lib/format/eth';
import { useProjectAnchor } from './useProjectAnchor';
import { useBudgetStepLine } from './useBudgetStepLine';
import ProjectMorePanel, { type ProjectMoreL1 } from './ProjectMorePanel';
import MintRoomModal from './MintRoomModal';
import RewindProjectView from './RewindProjectView';
import { useRewindOptional } from '../../lib/state/RewindContext';
import { setMintState } from '../shell/ThemeMusic';

type ProjectTab = 'project-showcase' | 'artworks' | 'albums';

/* Activity-feed row model. The FEED view reads our OWN pre-chain ledger
   (Supabase `events` via /api/project/[slug]/feed) and maps each stored
   MINT / LIST / SALE / XFER into one of these (Brendon, 2026-06-13 — the
   feed is real now, not a mock seed). Feed sort cycles time-desc / time-asc
   / price-desc / price-asc, so the row carries numeric timestamp + price. */
/* The activity-feed event mapping (FeedEvent + eventToFeedEvent) now lives in
   lib/feed/feedRow — shared with the profile feed, and carries the Starred-Tx
   payload. Imported above. */

/* Build 19 split: TraitsProvider must wrap the consumer that calls
   useTraits(). The page now exports a thin outer wrapper that mounts
   the provider; ProjectPageBodyInner reads activeFilters/searchQuery/
   priceMin/priceMax via useTraits and runs the gallery predicate +
   sort below. Splitting at the provider boundary keeps the existing
   render shape (single root section before the provider closes) and
   avoids hoisting the filter logic into a separate component. */
/* "JUL 09 2026" — the project's real upload date (server-derived from
   cooldown_until − 60d; see app/art/[slug]/page.tsx). Null falls back to a
   dash rather than a fabricated date. */
function fmtUploadDate(ms: number | null): string {
    if (ms == null) return '—';
    const d = new Date(ms);
    const mon = d.toLocaleDateString('en-US', { month: 'short', timeZone: 'UTC' }).toUpperCase();
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${mon} ${day} ${d.getUTCFullYear()}`;
}

/* Distinct random sample of n handles from a pool — same picker as the
   homepage Featuring row's pickFeatured, transplanted here for the
   Collected-by row's cycling (Brendon, 2026-08-18). */
function pickN(pool: string[], n: number): string[] {
    const copy = [...pool];
    const out: string[] = [];
    while (out.length < n && copy.length > 0) {
        out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
    }
    return out;
}

function ProjectPageBodyInner({ uploadedAt = null, projectNo = null }: { uploadedAt?: number | null; projectNo?: number | null }) {
    /* Hooks first (no conditional returns above) — covers the lint rule
       Brendon called out in earlier sessions. */
    const project = useProject();
    const { sort, group, groupLayers, resetToDefault } = useSort();
    /* Entering a project resets the gallery sort to the user's default and the
       grouping to what the viewer last used ON THIS PROJECT (per-page memory,
       Brendon 2026-07-12) — an in-project grouping never carries into the next
       project (Brendon, 2026-06-20). Keyed on slug, so it fires on first mount
       and on every project-to-project navigation, but NOT on in-project sort
       taps (those depend on other state). */
    useEffect(() => { resetToDefault(project.slug); }, [project.slug, resetToDefault]);

    /* Record a PROJECT-PAGE view into History (the views pillar, token 0) on
       every project open, gated by the same History recording toggle as Output
       views. Private; no-ops when signed out or recording is off. */
    useEffect(() => {
        if (isRecordingEnabled()) recordProjectView(project.slug);
    }, [project.slug]);
    const { showToast } = useToast();
    /* MINT ROOM (Brendon, 2026-07-20): THE DOOR IS THE LONG-PRESS on the
       MINT button — that's the whole launch, his words. No toggle, no
       settings row. Optional by nature: only people who know press long. */
    const [mintRoomOpen, setMintRoomOpen] = useState(false);
    const { open } = useModal();
    /* Spite Book — spited handles render redacted on the hero's social rows. */
    const isSpited = useSpiteMatcher();
    const { add: cartAdd } = useCart();

    /* Collected-by row cycling — transplanted from the homepage Featuring
       row (Brendon, 2026-08-18). Re-rolls every 3.6s like the homepage, but
       ONLY once the pool is 6+: below that a 3.6s re-roll just loops the
       same 2-3 faces, which reads as broken rather than alive. Under 6, the
       row stays a static pick (first load only, no interval). */
    const collectedByPool = project.stats.collected_by_following;
    const [collectedByShown, setCollectedByShown] = useState<string[]>(() => collectedByPool.slice(0, 2));
    useEffect(() => {
        setCollectedByShown(pickN(collectedByPool, 2));
        /* Only cycle once the pool is 6+ (Brendon, 2026-08-20) — below that,
           a 3.6s re-roll just loops the same couple of faces. */
        if (collectedByPool.length < 6) return;
        const id = window.setInterval(() => setCollectedByShown(pickN(collectedByPool, 2)), 3600);
        return () => window.clearInterval(id);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectedByPool.join('|')]);

    /* Registry def for static fields not in ProjectContext (mint price,
       soundtrack). */
    const def = getProject(project.slug);
    const mintPrice = def?.mintPriceEth ?? 0.01;
    /* Soundtrack is DB-driven (projects.soundtrack) via ProjectContext; the
       registry value is only the pre-reconcile fallback. */
    const soundtrack = project.soundtrack;
    const soldOut = project.maxSupply > 0 && project.totalOutputs >= project.maxSupply;
    const remaining = Math.max(0, project.maxSupply - project.totalOutputs);
    /* Tell the theme music which face this project is wearing — the busy-mint
       theme while there's still supply, the sold-out one once it's gone
       (Brendon, 2026-07-31). No-op when theme music is off. */
    useEffect(() => {
        setMintState(soldOut ? 'soldout' : 'minting');
        return () => setMintState(null);
    }, [soldOut]);
    /* Brendon 2026-05-11 — stats grid: icon fires a toast describing the
       stat ("Outputs Minted / Total Supply", etc.); value is inert
       except for PPL (opens collectors modal) and Anchor (opens
       set-anchor prompt). This helper bundles the icon's
       button-like props (role, tabIndex, title, click + Enter/Space
       key handler) so each .stat-icon spread is one line. */
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
    const { netSets, artistSocial, topHolders } = useProjectSocial();

    const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
        /* A pasted deep link's ?tab= wins over everything — the shared view
           IS the view (Share Any View, Brendon 2026-07-19; same precedent
           as the ?sort= slug). */
        const shared = readViewParam('tab');
        if (shared === 'artworks' || shared === 'albums' || shared === 'project-showcase') {
            return shared;
        }
        /* Per-user, per-project memory wins — the saved tab is the ONLY thing
           that overrides the content-aware default (Brendon, 2026-06-16). */
        const remembered = getRememberedTab('project', project.slug);
        if (remembered === 'artworks' || remembered === 'albums' || remembered === 'project-showcase') {
            return remembered;
        }
        /* Content-aware landing (Brendon 2026-06-16): land on Showcase only when
           the Showcase is FULL — a curated set of 6 (minted), or, absent
           curation, 6+ mints auto-feeding the grid to 6. A short/empty Showcase
           is not a landing page, so anything under 6 lands on Artworks. Mirrors
           projectShowcasePicks' curated-then-auto-feed resolution below. */
        const curatedMinted = project.showcaseIds.filter(
            (id) => id >= 1 && id <= project.totalOutputs
        );
        const showcaseCount =
            curatedMinted.length > 0 ? curatedMinted.length : Math.min(6, project.totalOutputs);
        return showcaseCount >= 6 ? 'project-showcase' : 'artworks';
    });
    const setActiveTabPersisted = (tab: ProjectTab) => {
        rememberTab('project', project.slug, tab);
        setActiveTab(tab);
    };

    /* + More sub-nav pills — sections live in ProjectMorePanel. */
    const MORE_L1_KEYS: ReadonlySet<string> = new Set<ProjectMoreL1>(['social', 'stats', 'replay', 'albums', 'genome', 'gnome', 'sentiment', 'attributes', 'pricestory', 'offers', 'anoint', 'activity']);
    const [moreL1, setMoreL1] = useState<ProjectMoreL1>(() => {
        // A pasted deep link's ?sub= wins (Share Any View, Brendon 2026-07-19).
        const shared = readViewParam('sub');
        return shared && MORE_L1_KEYS.has(shared) ? (shared as ProjectMoreL1) : 'attributes';
    });

    /* Share Any View — register the live tab state so the SHARE VIEW pill
       composes an exact deep link at copy time (lib/state/viewLink.ts).
       (The +More tab's internal key is 'albums' — legacy name, kept.) */
    useEffect(() => {
        setViewParam('tab', activeTab);
        setViewParam('sub', activeTab === 'albums' ? moreL1 : null);
        return () => { setViewParam('tab', null); setViewParam('sub', null); };
    }, [activeTab, moreL1]);

    /* Search beside the +More pills — our usual gen-art search, in the pill row.
       Filters the active searchable tab (Attributes tiles · Offers list). */
    const [searchOpen, setSearchOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const searchableTab = moreL1 === 'attributes' || moreL1 === 'offers';
    // Reset the search when moving to a different +More tab.
    useEffect(() => { setSearchOpen(false); setSearchQuery(''); }, [moreL1]);

    const { lowestId, lowestFloor } = useProjectFloor();
    const { ethToFiat, ethToFiatValue, currency } = useFiat();
    const rewind = useRewindOptional();
    const floorFiat = lowestFloor !== null ? ethToFiat(lowestFloor) : null;

    const {
        dMyNotesActive, breadcrumbSample, projectShowcasePicks,
        showGhosts, ghostSpecs, visibleTokenIds, groupedSections,
        eagerIds, galleryShown, gallerySentinelRef,
        collapsedGroups, toggleGroupCollapse,
    } = useProjectGallery({ netSets, topHolders });

    /* Sim's tab visibility table (sim ~13150):
         project-showcase  → gallery, no feed/traits/sort/albums
         artworks  → gallery (or activity-feed if sort starts with 'feed'),
                     traits/sort visible
         albums    → albums-panel only
       Translated directly into booleans below. */
    const onArtworksTab = activeTab === 'artworks';
    const onAlbumsTab = activeTab === 'albums';
    const onShowcaseTab = activeTab === 'project-showcase';
    /* MIXED layout's lead — the set's first pick (insertion order). */
    const showcaseLeadId = [...projectShowcasePicks][0] ?? null;
    const feedActive = onArtworksTab && sort === 'feed';
    /* ☻ SOCIAL — the sort row's smiley made real (Brendon, 2026-08-02): this
       project's outputs activity as the home social feed. Page-local state
       (never persisted into the sort); any real sort tap hands the grid back. */
    const [socialActive, setSocialActive] = useState(false);
    const toggleSocial = useCallback(() => {
        showToast(!socialActive ? 'Feed: SOCIAL' : 'Feed: OFF');
        setSocialActive(!socialActive);
    }, [socialActive, showToast]);
    const socialVisible = onArtworksTab && socialActive;
    const galleryVisible = (onShowcaseTab || onArtworksTab) && !feedActive && !socialVisible;
    /* A re-sort or re-group lands with one short ease (Brendon, 2026-07-30). */
    useGridSettle(`${sort}|${groupLayers.join('>')}`, galleryVisible);
    const feedVisible = onArtworksTab && feedActive && !socialActive;
    /* Live grid column metrics — lets each grouping header cap its width to
       the columns its pieces occupy (glyph ends with the art, 2026-07-12). */
    /* Pre-mint, the trait filter bar would expose the project's feature names
       (Palette / Flow / Grain …) — a spoiler before a single Output exists.
       Hide the whole traits/sort/search bar until something is minted; the
       ghost grid carries NO traits, only sampled aspect ratios. */
    const traitsAndSortVisible = onArtworksTab && !showGhosts;

    /* D17 anchor — hydration + per-card delta stamping (see useProjectAnchor). */
    const anchorEth = useProjectAnchor(visibleTokenIds, onArtworksTab, activeTab);

    /* Live feed rows — our own pre-chain activity from Supabase `events`,
       pulled when the FEED view is open and re-pulled on any market action
       ('pd:project-refresh'). Feed sort (time/price × dir) rides SortContext
       inside the shared hook. Empty until activity accrues. */
    const sortedFeedEvents = useLedgerFeed(feedActive, `/api/project/${project.slug}/feed?limit=100`);

    /* F57 (BUG-10) — Budget step-line driver (see useBudgetStepLine). */
    useBudgetStepLine(visibleTokenIds, onShowcaseTab, activeTab);

    const { priceDayOpen, priceDayPos, priceDayRef, priceDayPopRef, openPriceDay } = usePriceDayPopover();

    /* PriceDay almanac for THIS project's upload day — seeded test-phase
       content (same source the home/profile popovers use), so the project
       popover shows the real PriceDay number instead of a hardcoded one. */
    const projectPdc = usePriceDay(uploadedAt != null ? new Date(uploadedAt) : new Date(),);

    /* Force-paint showcase picks that may never have scrolled into view.
       Fires whenever the showcase tab becomes active so grey placeholders
       don't show. forceRenderKeys bypasses the IntersectionObserver and
       directly queues the picked canvases for idle-time rendering. */
    useEffect(() => {
        if (onShowcaseTab) {
            forceRenderKeys(
                new Set(
                    Array.from(projectShowcasePicks, (id) => `${project.slug}:${id}`),
                ),
            );
        }
    }, [onShowcaseTab, projectShowcasePicks, project.slug]);



    /* The Rewind ◄ — docked at a past day, the project page shows only
       as-of state: stats-then + the gallery capped to pieces minted by that
       day. Market surfaces are absent while rewound (never a silent mix). */
    if (rewind?.day != null) {
        return (
            <Hero
                ariaLabel="Project Info"
                titleRow={
                    <h1 className="project-title">
                        <ProjectTitleStar slug={project.slug} title={project.title} />
                    </h1>
                }
            >
                <RewindProjectView slug={project.slug} />
            </Hero>
        );
    }

    return (
        <>
            <Hero
                ariaLabel="Project Info"
                titleRow={
                    <h1 className="project-title">
                        <ProjectTitleStar slug={project.slug} title={project.title} />
                        <span className="project-date-wrap" ref={priceDayRef}>
                            <span
                                className={`project-date${priceDayOpen ? ' pd-active' : ''}`}
                                role="button"
                                tabIndex={0}
                                onClick={openPriceDay}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPriceDay(); } }}
                                title="PriceDay"
                            >{fmtUploadDate(uploadedAt)}</span>
                            {priceDayOpen && priceDayPos && (
                                <div ref={priceDayPopRef} className="priceday-popover" style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}>
                                    <div className="dp-title">PRICEDAY #{projectPdc.number}</div>
                                    <div className="dp-title-spacer" />

                                    <div className="pd-section-header">MINTED THIS DAY</div>
                                    {projectPdc.minted.map((r, i) => (
                                        <div className="dp-row" key={`m${i}`}><span className="dp-label">{r.label}</span><span className="dp-value">{r.value}</span></div>
                                    ))}
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                                    {projectPdc.uploaded.map((r, i) => (
                                        <div className="dp-row" key={`u${i}`}><span className="dp-label">{r.label}</span><span className="dp-value">{r.value}</span></div>
                                    ))}
                                    <div className="pd-section-end" />

                                    {projectPdc.biggestSale && (
                                        <>
                                            <div className="pd-section-header">BIGGEST SALE</div>
                                            <div className="dp-row"><span className="dp-label">{projectPdc.biggestSale.label}</span><span className="dp-value">{projectPdc.biggestSale.value}</span></div>
                                            <div className="pd-section-end" />
                                        </>
                                    )}
                                    {projectPdc.flavor && (
                                        <>
                                            <div className="pd-section-header">THE DAY</div>
                                            <div className="dp-row dp-flavor"><span className="dp-label">{projectPdc.flavor}</span></div>
                                            <div className="pd-section-end" />
                                        </>
                                    )}
                                </div>
                            )}
                        </span>
                    </h1>
                }
                identityRow={
                    /* ⛔ THE BY-LINE CARRIES NO TAGS (Brendon, 2026-07-30 — the
                       project chips added the day before are removed). The name,
                       the mark, the mutual badge and the follower count, nothing
                       else; their tags live on their profile. */
                    <div className="hero-line project-custom owner-line">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a className={isSpited(def?.artistHandle ?? '') ? 'spited' : undefined} href={`/${def?.artistHandle ?? 'opus4-6'}`}>@{def?.artistHandle ?? 'opus4-6'}</a>
                                <span className="artist-tag" aria-label="artist">{'✺\uFE0E'}</span>
                                {artistSocial.mutual && (
                                    <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                                )}
                            </span>
                            {artistSocial.followers > 0 && (
                                <span className="follower-count">{artistSocial.followers >= 1000 ? `${(artistSocial.followers / 1000).toFixed(1).replace(/\.0$/, '')}k` : artistSocial.followers}</span>
                            )}
                        </div>
                    </div>
                }
                socialRow={
                    /* Twitter-style: only collectors the viewer follows. Hidden
                       when signed out or following none of this project's
                       collectors. */
                    project.stats.collected_by_following.length > 0 ? (() => {
                        const collectors = collectedByShown;
                        const handle = (n: string) => n.toLowerCase().replace(/^@/, '');
                        const others = Math.max(0, collectedByPool.length - 2);
                        return (
                        /* One typed line, matching the homepage Featuring row
                           exactly (Brendon, 2026-08-20): each name is
                           followed by a real &nbsp; — either straight after
                           the name, or after the comma — no CSS gap/margin
                           spacing left to fake it. */
                        <div className="hero-line collected-by-row info-line">
                            <span className="cbr-label">Collected by&nbsp;</span>
                            <a key={collectors[0]} className="profile-link feat-name" href={`/${handle(collectors[0])}`}>@{handle(collectors[0])}</a>
                            {collectors[1] ? (
                                <>,&nbsp;<a key={collectors[1]} className="profile-link feat-name" href={`/${handle(collectors[1])}`}>@{handle(collectors[1])}</a>&nbsp;</>
                            ) : '\u00A0'}
                            {others > 0 && (
                                <span className="cbr-others" onClick={() => open('collectors')}>
                                    &amp; {others} more you follow
                                </span>
                            )}
                        </div>
                        );
                    })() : null
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item" {...iconToastProps('Outputs Minted / Total Supply')}>
                            <span className="stat-icon stat-icon-box">
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">{project.totalOutputs}/{project.maxSupply}</span>
                        </span>
                        <span className="stat-item stat-item-vol" {...iconToastProps('Total Volume')}>
                            <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-vol">{project.stats.volume_eth} VOL</span>
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
                            {/* ✦ = the COLLECT mark (GLYPHS §1, as of the 2026-07-31
                                collect/offer swap). Was ⌗, the PROJECTS glyph, which
                                never meant people (Brendon, 2026-07-31). */}
                            <span className="stat-icon stat-icon-owners" {...iconToastProps('Collectors')}>✦&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-owners">{project.stats.collectors} {project.stats.collectors === 1 ? 'PRSN' : 'PPL'}</span>
                        </span>
                        <AudienceIndicator slug={project.slug} />
                    </div>
                }
            >
                <div className="action-row">
                        {soldOut ? (
                            /* Sold out → the mint button becomes BUY (floor):
                               shows the lowest listing and adds it to the cart. */
                            <button
                                className={`btn-mint${floorFiat && lowestFloor !== null && (ethToFiatValue(lowestFloor) ?? 0) >= 10 ? ' mint-fiat-on' : ''}`}
                                title="Buy the floor — adds the lowest-listed Output to your cart"
                                onClick={() => {
                                    if (lowestId == null) { showToast('Listings: NONE YET'); return; }
                                    cartAdd(project.slug, lowestId);
                                    showToast(`${project.title} #${lowestId}: ADDED TO CART`);
                                }}
                                disabled={lowestId == null}
                                style={lowestId == null ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
                            >
                                <span className="mint-lbl">BUY</span>
                                <span className="mint-price">
                                    {lowestFloor !== null
                                        ? `(${formatEthAmount(lowestFloor, !!floorFiat)} ETH)`
                                        : '(NONE LISTED)'}
                                </span>
                                {floorFiat && (
                                    <span className="mint-fiat">
                                        <span className="mint-fiat-amt">{floorFiat}</span>
                                        <span className="mint-fiat-cur">{currency}</span>
                                    </span>
                                )}
                            </button>
                        ) : (
                            <MintButton
                                slug={project.slug}
                                projectTitle={project.title}
                                mintPrice={mintPrice}
                                remaining={remaining}
                                onLongPress={() => setMintRoomOpen(true)}
                            />
                        )}
                        {soundtrack && (
                            <SoundtrackStarButton
                                slug={project.slug}
                                playlistId={soundtrack.playlistId}
                                label={soundtrack.label}
                                title={`${project.title} by @${def?.artistHandle ?? 'opus4-6'} Soundtrack`}
                            />
                        )}
                    </div>

                    {/* Sim 5161-5165: project tab pills (Project Showcase /
                        Artworks / + More). Visibility logic mirrors
                        switchCollectionTab (sim ~13134). */}
                    <div className="profile-tabs-row" id="projectTabsRow">
                        <div
                            className={`pill pill-l1${onShowcaseTab ? ' active' : ''}`}
                            id="ctab-project-showcase"
                            role="button"
                            tabIndex={0}
                            onClick={() => { setActiveTabPersisted('project-showcase'); showToast('Tab: SHOWCASE'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('project-showcase'); showToast('Tab: SHOWCASE');
                                }
                            }}
                            title="Project Showcase — curation feature coming soon"
                        >
                            <span className="stat-name">Showcase</span>
                        </div>
                        <div
                            className={`pill pill-l1${onArtworksTab ? ' active' : ''}`}
                            id="ctab-artworks"
                            role="button"
                            tabIndex={0}
                            onClick={() => { setActiveTabPersisted('artworks'); showToast('Tab: ARTWORKS'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('artworks'); showToast('Tab: ARTWORKS');
                                }
                            }}
                            title="Browse All Artworks in the Project"
                        >
                            <span className="stat-name">Artworks</span>
                        </div>
                        <div
                            className={`pill pill-l1${onAlbumsTab ? ' active' : ''}`}
                            id="ctab-albums"
                            role="button"
                            tabIndex={0}
                            onClick={() => { setActiveTabPersisted('albums'); showToast('Tab: + MORE'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('albums'); showToast('Tab: + MORE');
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
                    <TraitsUI visible={traitsAndSortVisible} socialPill={{ active: socialActive, onToggle: toggleSocial }} />

                    {/* + More sub-nav trait pills — same surface as the
                        profile's + More. Groups the panel's sections. */}
                    {onAlbumsTab && (
                        <>
                        <TraitsUI
                            visible
                            hideSortBar
                            profilePills={[
                                { key: 'attributes', label: <><span className="pill-tab-ico is-attributes">{'\u2A69\uFE0E'}</span> Attributes</>, active: moreL1 === 'attributes', onClick: () => setMoreL1('attributes') },
                                { key: 'stats', label: <><span className="pill-tab-ico is-stats">{'\u22DA\uFE0E'}</span> Stats</>, active: moreL1 === 'stats', onClick: () => setMoreL1('stats') },
                                { key: 'sentiment', label: <><span className="pill-tab-ico is-sentiment">{'\u26BC\uFE0E'}</span> Sentiment</>, active: moreL1 === 'sentiment', onClick: () => setMoreL1('sentiment') },
                                { key: 'offers', label: <><span className="pill-tab-ico is-offers">{'\u2736\uFE0E'}</span> Offers</>, active: moreL1 === 'offers', onClick: () => setMoreL1('offers') },
                                { key: 'pricestory', label: <><span className="pill-tab-ico is-pricestory">{'\u25BC\uFE0E'}</span> Price Story</>, active: moreL1 === 'pricestory', onClick: () => setMoreL1('pricestory') },
                                { key: 'social', label: <><span className="pill-tab-ico is-social">{'\u263B\uFE0E'}</span> Social</>, active: moreL1 === 'social', onClick: () => setMoreL1('social') },
                                { key: 'anoint', label: <><span className="pill-tab-ico is-anoint">{'\u2722\uFE0E'}</span> Anointed</>, active: moreL1 === 'anoint', onClick: () => setMoreL1('anoint') },
                                { key: 'albums', label: <><span className="pill-tab-ico is-album">{'◰︎'}</span> Albums</>, active: moreL1 === 'albums', onClick: () => setMoreL1('albums') },
                                { key: 'replay', label: <><span className="pill-tab-ico is-replay">{'\u23F4\uFE0E'}</span> Replay</>, active: moreL1 === 'replay', onClick: () => setMoreL1('replay') },
                                { key: 'activity', label: <><span className="pill-tab-ico is-activity">{'\u2B48\uFE0E'}</span> Activity</>, active: moreL1 === 'activity', onClick: () => setMoreL1('activity') },
                                { key: 'genome', label: <><span className="pill-tab-ico is-genome">{'\u224E\uFE0E'}</span> Genome</>, active: moreL1 === 'genome', onClick: () => setMoreL1('genome') },
                                { key: 'gnome', label: <><span className="pill-tab-ico is-gnome">{'\u2359\uFE0E'}</span> Gnome</>, active: moreL1 === 'gnome', onClick: () => setMoreL1('gnome') },
                            ]}
                            profilePillsTrailing={searchableTab ? (
                                <span className="attr-pill-search">
                                    <span
                                        className={`search-btn${searchOpen ? ' active' : ''}`}
                                        role="button"
                                        tabIndex={0}
                                        title="Search"
                                        onClick={() => setSearchOpen((v) => { const next = !v; if (!next) setSearchQuery(''); return next; })}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchOpen((v) => { const next = !v; if (!next) setSearchQuery(''); return next; }); } }}
                                    >
                                        {'⌕︎'}
                                    </span>
                                </span>
                            ) : undefined}
                        />
                        {searchableTab && (
                            /* Search opens in the STANDARD full-width row below the
                               pills (same .search-row slot every other page uses),
                               not crammed inline beside the ⌕ (Brendon, 2026-07-14). */
                            <div className={`search-row${searchOpen ? ' open' : ''}`}>
                                <input
                                    type="text"
                                    className="search-input"
                                    placeholder={moreL1 === 'offers' ? 'Search offers' : 'Search attributes'}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    spellCheck={false}
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                    aria-label="Search"
                                />
                                {searchQuery && (
                                    <span className="search-clear" role="button" tabIndex={0} title="Clear"
                                        onClick={() => setSearchQuery('')}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSearchQuery(''); } }}>
                                        {'×︎'}
                                    </span>
                                )}
                            </div>
                        )}
                        </>
                    )}
            </Hero>

            {/* My Notes empty state — shown when the notes filter is active
                but no outputs have notes yet. Sits above the (empty) gallery. */}
            {dMyNotesActive && visibleTokenIds.length === 0 && (
                <div className="my-notes-empty-state">
                    <span className="my-notes-empty-msg">
                        You haven&rsquo;t created any Artwork Notes yet
                    </span>
                </div>
            )}

            {/* Sim 5195: gallery section. JS-populated in sim via renderFeed
                (~8155). In React: one ArtworkCard per visible token id —
                Build 19 wires the visible set to TraitsContext (filter +
                search + price range) and SortContext (sort family).
                ProjectShowcase tab (sim ~13150): gallery gets
                .project-showcase-mode; 6 random picks from page-load carry
                .project-showcase-pick; CSS hides all other cards + their
                .meta. Full list still mounted — CSS does the filtering. */}
            {/* Artist Showcase placard — the profile Gen Curated caption,
                verbatim markup + classes (Rule #0; 2026-07-20). */}
            {onShowcaseTab && !showGhosts && project.showcaseCaption && (
                <div className="gencurated-caption sc-placard">
                    <span className="gc-glyph" aria-hidden="true">{'⑈︎'}</span>
                    <span className="gc-title">{project.showcaseCaption}</span>
                    <span className="gc-count">{`· ${projectShowcasePicks.size}`}</span>
                </div>
            )}
            <section
                id="gallery"
                data-my-notes={dMyNotesActive ? '1' : undefined}
                aria-label="Gallery"
                className={[
                    onShowcaseTab ? 'project-showcase-mode' : null,
                    /* Artist layouts (2026-07-20): masonry / mixed large-small
                       + the little titles — Showcase tab only. */
                    onShowcaseTab && project.showcaseLayout !== 'classic' ? `sc-${project.showcaseLayout}` : null,
                    onShowcaseTab && project.showcaseTitles ? 'sc-titles' : null,
                ].filter(Boolean).join(' ') || undefined}
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {showGhosts
                    ? ghostSpecs.map((g, i) => (
                        <GhostCard
                            key={`ghost-${i}`}
                            aspect={g.aspect}
                            showcasePick={g.showcasePick}
                            index={i}
                        />
                    ))
                    : groupedSections
                        /* Grouped grid renders FLAT — headers and cards are direct
                           children of #gallery (no per-group wrappers), every card
                           keeps its stable key={id} + stable `eager`. So changing
                           the grouping just REORDERS the cards (React moves the DOM
                           nodes) and swaps the cheap headers; the art canvases are
                           never unmounted, so they never repaint. Tap-to-group is
                           instant and can't jam, however heavy the art (Brendon,
                           2026-06-16). */
                        ? (() => {
                            // The whole grid mounts at once (galleryShown = the full
                            // list, 2026-07-06 — no scroll-reveal pop-in); the budget
                            // walk only skips cards inside folded groups.
                            let budget = galleryShown;
                            return groupedSections.flatMap((sec) => {
                            const isL2 = sec.level === 2;
                            const isL3 = sec.level === 3;
                            /* A folded ancestor hides everything nested under it —
                               now two levels deep, not one (Brendon, 2026-07-26). */
                            if (sec.level > 1 && collapsedGroups.has(sec.l1Key)) return [];
                            if (isL3 && sec.l2Key && collapsedGroups.has(sec.l2Key)) return [];
                            const folded = collapsedGroups.has(sec.ckey);
                            /* ⛔ A HEADER SPANS THE ROW (Brendon, 2026-07-30 —
                               "make it exactly the artifact"). It used to cap
                               itself to the columns its pieces occupy, which
                               left a one-piece group's title stopping mid-row
                               with its glyph stranded in the middle. */
                            const header = (
                            <div
                                key={`hdr-${sec.ckey}`}
                                className={`gallery-group-header is-collapsible${isL2 ? ' level-2' : ''}${isL3 ? ' level-3' : ''}${sec.soon ? ' soon' : ''}${folded ? ' collapsed' : ''}`}
                                role="button"
                                tabIndex={0}
                                aria-expanded={!folded}
                                onClick={() => toggleGroupCollapse(sec.ckey)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        toggleGroupCollapse(sec.ckey);
                                    }
                                }}
                            >
                                <span className="ggh-arrow" aria-hidden="true">{folded ? '▸︎' : '▾︎'}</span>
                                <span className="ggh-label">{sec.label}</span>
                                {sec.soon
                                    ? <span className="ggh-soon">coming soon</span>
                                    : sec.total > 0
                                        ? <span className="ggh-count">{sec.total}</span>
                                        : null}
                                {!sec.soon && groupHeaderGlyph(groupLayers, sec.level, sec.label)
                                    ? <span className="ggh-glyph" aria-hidden="true">{groupHeaderGlyph(groupLayers, sec.level, sec.label)}</span>
                                    : null}
                            </div>
                            );
                            if (folded || budget <= 0) return [header];
                            const cards = [];
                            for (const id of sec.ids) {
                                if (budget <= 0) break;
                                cards.push(
                                    <ArtworkCard
                                        key={id}
                                        id={id}
                                        projectShowcasePick={projectShowcasePicks.has(id)}
                                        showcaseLead={onShowcaseTab && id === showcaseLeadId}
                                        isBreadcrumb={breadcrumbSample.has(id)}
                                        eager={eagerIds.has(id)}
                                    />
                                );
                                budget--;
                            }
                            return [header, ...cards];
                        });
                        })()
                        : visibleTokenIds.slice(0, galleryShown).map((id) => (
                            <ArtworkCard
                                key={id}
                                id={id}
                                projectShowcasePick={projectShowcasePicks.has(id)}
                                showcaseLead={onShowcaseTab && id === showcaseLeadId}
                                isBreadcrumb={breadcrumbSample.has(id)}
                                eager={eagerIds.has(id)}
                            />
                        ))}
                {/* Showcase completeness: the tab always shows ALL its picks even
                    when an Artworks filter hides one from the main grid — any
                    missing pick mounts here while the showcase tab is active. */}
                {!showGhosts && onShowcaseTab && (() => {
                    const mounted = new Set(visibleTokenIds);
                    return [...projectShowcasePicks]
                        .filter((id) => !mounted.has(id))
                        .map((id) => (
                            <ArtworkCard
                                key={`sc-extra-${id}`}
                                id={id}
                                projectShowcasePick
                                showcaseLead={id === showcaseLeadId}
                                isBreadcrumb={false}
                                eager
                            />
                        ));
                })()}
                {!showGhosts && !onShowcaseTab && galleryShown < visibleTokenIds.length && (
                    <div ref={gallerySentinelRef} className="gallery-load-sentinel" aria-hidden="true" />
                )}
            </section>

            {mintRoomOpen && (
                <MintRoomModal
                    mintPrice={mintPrice}
                    remaining={remaining}
                    onClose={() => setMintRoomOpen(false)}
                />
            )}

            {/* Activity feed — REAL pre-chain rows from Supabase `events`
                (Brendon, 2026-06-13). Hidden by default; surfaces only when
                the 'artworks' tab is active AND sort is 'feed'. */}
            <section
                id="activity-feed"
                aria-label="Activity Feed"
                style={{ display: feedVisible ? 'block' : 'none' }}
            >
                <div className="feed-list" id="feedList">
                    {sortedFeedEvents.length === 0 ? (
                        <GhostFeedRows />
                    ) : sortedFeedEvents.map((e) => (
                        <FeedEventRow
                            key={e.id}
                            fe={e}
                            dateStamp={fmtFeedDate(e.timestamp)}
                            typeSub={e.price > 0 ? `${formatEth(e.price)} ETH` : undefined}
                        />
                    ))}
                </div>
            </section>

            {/* ☻ SOCIAL — this project's outputs activity as the home social
                feed (streaks, scenes, panoramas), the home wrapper verbatim
                (Rule #0). The social lens for a project's outputs. */}
            {socialVisible && (
                <section className="home-uploads" aria-label="Social Feed">
                    <div className="feed-list home-activity-feed home-social-feed">
                        <SocialFeed dir="desc" project={project.slug} />
                    </div>
                </section>
            )}

            {/* + More panel — Social / Stats / Attributes / Replay / Albums /
                Genome / Gnome / Sentiment / Price Story / Offers. Section blocks +
                their panel-local data reads live in ProjectMorePanel. */}
            <ProjectMorePanel
                onAlbumsTab={onAlbumsTab}
                moreL1={moreL1}
                uploadedAt={uploadedAt}
                projectNo={projectNo}
                lowestFloor={lowestFloor}
                anchorEth={anchorEth}
                searchQuery={searchableTab ? searchQuery : ''}
            />
        </>
    );
}

/* Outer wrapper. Mounts TraitsProvider so the inner consumer can call
   useTraits(). Default-exported as ProjectPageBody and consumed by the
   server shell at app/art/[slug]/page.tsx which handles slug validation
   + metadata. */
export default function ProjectPageBody({
    slug,
    initialTotal = 0,
    initialShowcaseIds = [],
    uploadedAt = null,
    projectNo = null,
}: {
    slug?: string;
    /** Server-seeded minted count (projects.minted_count) — first-paint art. */
    initialTotal?: number;
    /** Server-seeded curated showcase ids (projects.showcase_ids). */
    initialShowcaseIds?: readonly number[];
    /** Real upload moment in ms (cooldown_until − 60d), or null. */
    uploadedAt?: number | null;
    /** Sequential Project ID (upload order, unique) — shown in Attributes. */
    projectNo?: number | null;
}) {
    /* Re-provide ProjectContext with the route's slug so this page's gallery,
       hero, and trait schema all bind to the correct Project (the global
       provider in layout.tsx defaults to PRISMS for the rest of the app).
       The server seed makes the minted cards present from the first paint. */
    return (
        <ProjectProvider
            slug={slug}
            initialTotal={initialTotal}
            initialShowcaseIds={initialShowcaseIds}
        >
            <TraitsProvider memoryScope="project" memoryId={slug}>
                <ProjectPageBodyInner uploadedAt={uploadedAt} projectNo={projectNo} />
            </TraitsProvider>
        </ProjectProvider>
    );
}
