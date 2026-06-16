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

import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useProject, ProjectProvider } from '../../lib/state/ProjectContext';
import { getRememberedTab, rememberTab } from '../../lib/state/tabMemoryStore';
import AudienceIndicator from './AudienceIndicator';
import { useCart } from '../../lib/state/CartContext';
import { getProject, projectTrueName } from '../../lib/project/registry';
import { projectSpriteFace } from '../../lib/project/projectSprite';
import { playlistWatchUrl } from '../../lib/project/soundtrack';
import { priceDayContents } from '../../lib/priceday/priceday';
import { COLOR_BUCKET_ORDER } from '../../lib/art/outputColor';
import { resolveBucket, useStoredColors } from '../../lib/art/colorStore';
import type { EventRow } from '../../lib/supabase';
import { GhostFeedRows } from '../GhostFeed';
import { useSort, GROUP_SOON, GROUP_LABEL, PROJECT_GROUP_ORDER } from '../../lib/state/SortContext';
import { useToast } from '../../lib/state/ToastContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useModal } from '../../lib/state/ModalContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';
import {
    TraitsProvider,
    useTraits,
    type TraitCategory,
} from '../../lib/state/TraitsContext';
import ArtworkCard from '../ArtworkCard';
import GhostCard from './GhostCard';
import MintButton from './MintButton';
import ReplayPanel from './ReplayPanel';
import ProjectFollowButton from './ProjectFollowButton';
import TraitsUI from './TraitsUI';
import Hero from '../hero/Hero';
import CollectedPair from '../hero/CollectedPair';
import {
    applyStepLine,
    getBudgets,
    registerStepLineRedraw,
    subscribeBudgets,
    type BudgetsState,
} from '../../lib/engines/budgetEngine';
import { forceRenderKeys } from '../../lib/virtualization/canvasVirtualizer';
import {
    getRecentIdsForProject,
    subscribeBreadcrumbs,
} from '../../lib/pins/breadcrumbStore';

type ProjectTab = 'project-showcase' | 'artworks' | 'albums';

/* How many leading gallery cards paint eagerly (synchronously on mount) so
   the visible art is "just there" on load. ~2 screenfuls across mobile (2-col)
   and desktop (4-5 col) layouts; everything past this lazy-loads via the
   IntersectionObserver crash-guard. */
const EAGER_GALLERY_COUNT = 24;

/* Activity-feed row model. The FEED view reads our OWN pre-chain ledger
   (Supabase `events` via /api/project/[slug]/feed) and maps each stored
   MINT / LIST / SALE / XFER into one of these (Brendon, 2026-06-13 — the
   feed is real now, not a mock seed). Feed sort cycles time-desc / time-asc
   / price-desc / price-asc, so the row carries numeric timestamp + price. */
interface FeedEvent {
    id: string;
    icon: string;
    time: string;
    type: 'MINT' | 'LIST' | 'SALE' | 'XFER';
    detail: ReactNode;
    timestamp: number;
    price: number;
}

const FEED_ICON: Record<FeedEvent['type'], string> = {
    MINT: '✶', LIST: '✹', SALE: '✦', XFER: '✸',
};

function feedShortAddr(a: string | null): string {
    if (!a) return 'someone';
    return a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : a;
}

/** Token number out of an event's `${slug}-${id}` token_id. */
function feedLocalId(tokenId: string | null): string {
    if (!tokenId) return '';
    const i = tokenId.lastIndexOf('-');
    return i >= 0 ? tokenId.slice(i + 1) : tokenId;
}

/** One stored event → one feed row. MINT / SALE credit the recipient;
    LIST / XFER credit the sender. Handles resolve server-side; a bare
    address falls back to a short 0x form. */
function eventToFeedEvent(e: EventRow): FeedEvent {
    const type = e.type;
    const ms = Date.parse(e.timestamp) || 0;
    const price = e.price_eth ? parseFloat(e.price_eth) : 0;
    const lid = feedLocalId(e.token_id);
    const toSide = type === 'MINT' || type === 'SALE';
    const handle = toSide ? e.to_handle : e.from_handle;
    const addr = toSide ? e.to_address : e.from_address;
    const actor = handle ? `@${handle}` : feedShortAddr(addr ?? null);
    const tok = <span className="f-highlight">#{lid}</span>;
    let verb: ReactNode;
    if (type === 'MINT') verb = <>collected {tok}</>;
    else if (type === 'LIST') verb = <>listed {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else if (type === 'SALE') verb = <>bought {tok}{price ? ` for ${e.price_eth} ETH` : ''}</>;
    else verb = <>transferred {tok}</>;
    return {
        id: e.id,
        icon: FEED_ICON[type] ?? '✶',
        time: new Date(ms).toLocaleTimeString('en-GB', {
            hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'America/Montreal',
        }),
        type,
        detail: <><span className="f-highlight">{actor}</span> {verb}</>,
        timestamp: ms,
        price,
    };
}


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

function ProjectPageBodyInner({ uploadedAt = null }: { uploadedAt?: number | null }) {
    /* Hooks first (no conditional returns above) — covers the lint rule
       Brendon called out in earlier sessions. */
    const project = useProject();
    /* The project's PriceSprite face — composed deterministically from the slug
       (collision-proofed vs user sprites). Still face for the Social header. */
    const projectFace = useMemo(() => projectSpriteFace(project.slug), [project.slug]);
    /* Stored dominant colours for this project (re-renders grouping when they
       arrive); resolveBucket prefers them, falls back to live palette-math. */
    const colorsVer = useStoredColors([project.slug]);
    const { sort, dir, feedKind, group } = useSort();
    const { showToast } = useToast();
    const { open } = useModal();
    const { openAnchorPrompt } = useValuePrompt();
    const { add: cartAdd } = useCart();

    /* Registry def for static fields not in ProjectContext (mint price,
       soundtrack). */
    const def = getProject(project.slug);
    const mintPrice = def?.mintPriceEth ?? 0.01;
    /* Soundtrack is DB-driven (projects.soundtrack) via ProjectContext; the
       registry value is only the pre-reconcile fallback. */
    const soundtrack = project.soundtrack;
    const soldOut = project.maxSupply > 0 && project.totalOutputs >= project.maxSupply;
    const remaining = Math.max(0, project.maxSupply - project.totalOutputs);
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
    const { activeFilters, searchQuery, priceMin, priceMax, myNotesActive, activeCategory } = useTraits();

    /* Re-run the gallery filter when notes change so the My Notes view updates
       live as notes are added/removed (Brendon, 2026-06-13). */
    const [notesVersion, setNotesVersion] = useState(0);
    useEffect(() => {
        const bump = () => setNotesVersion((v) => v + 1);
        window.addEventListener('pd:notes-changed', bump);
        return () => window.removeEventListener('pd:notes-changed', bump);
    }, []);
    const { siweAddress, handle: viewerHandle } = useAuth();

    /* My Network — REAL filter data (Brendon 2026-06-11). The viewer's
       follow graph (handles + addresses, lowercased) feeds Mutuals /
       Following / Followers; Top Holders and New Wallets derive from the
       reconciled outputs below. */
    const [netSets, setNetSets] = useState<{ followers: Set<string>; following: Set<string> }>(
        { followers: new Set(), following: new Set() },
    );
    useEffect(() => {
        if (!siweAddress) { setNetSets({ followers: new Set(), following: new Set() }); return; }
        let cancelled = false;
        fetch('/api/follows/' + siweAddress.toLowerCase(), { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => {
                if (cancelled || !d) return;
                const norm = (arr: unknown) => new Set(
                    (Array.isArray(arr) ? (arr as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, '')),
                );
                setNetSets({ followers: norm(d.followers), following: norm(d.following) });
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [siweAddress]);

    /* The ARTIST's real social tags for the identity row (Brendon 2026-06-15 —
       was hardcoded "⚭ 2.2k"). Follower count from the artist's profile; the
       mutual badge shows only when the viewer and artist follow each other.
       Hidden entirely at 0 followers (rendered conditionally below). */
    const [artistSocial, setArtistSocial] = useState<{ followers: number; mutual: boolean }>(
        { followers: 0, mutual: false },
    );
    useEffect(() => {
        const handle = def?.artistHandle;
        if (!handle) return;
        const h = handle.toLowerCase();
        let cancelled = false;
        const load = async () => {
            try {
                const profRes = await fetch(`/api/user/by-handle/${handle}`, { cache: 'no-store' });
                const prof = profRes.ok ? await profRes.json() : null;
                const followers = prof?.follower_count ?? 0;
                /* A user is mutuals with themselves (Brendon, 2026-06-16) — the
                   viewer looking at their OWN project sees the mutual badge on
                   the artist row, no real self-follow row required. */
                let mutual = (viewerHandle ?? '').toLowerCase().replace(/^@/, '') === h;
                if (!mutual && siweAddress) {
                    const fRes = await fetch(`/api/follows/${siweAddress.toLowerCase()}`, { cache: 'no-store' });
                    const f = fRes.ok ? await fRes.json() : null;
                    const lc = (a: unknown) => (Array.isArray(a) ? (a as string[]) : []).map((v) => String(v).toLowerCase().replace(/^@/, ''));
                    const following = lc(f?.following_handles);
                    const followerH = lc(f?.follower_handles);
                    mutual = following.includes(h) && followerH.includes(h);
                }
                if (!cancelled) setArtistSocial({ followers, mutual });
            } catch { /* keep last good */ }
        };
        load();
        const onCh = () => load();
        window.addEventListener('pd:follows-changed', onCh);
        window.addEventListener('pd:project-refresh', onCh);
        return () => {
            cancelled = true;
            window.removeEventListener('pd:follows-changed', onCh);
            window.removeEventListener('pd:project-refresh', onCh);
        };
    }, [def?.artistHandle, siweAddress, viewerHandle]);

    /* Top 5 holders of THIS project by held count (reconciled owners). */
    const topHolders = useMemo(() => {
        const counts = new Map<string, number>();
        project.outputs.forEach((m) => {
            const a = (m.ownerFull || '').toLowerCase();
            if (a) counts.set(a, (counts.get(a) ?? 0) + 1);
        });
        return new Set([...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map((e) => e[0]));
    }, [project.outputs, project.totalOutputs]);

    const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
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

    /* + More sub-nav (Brendon, 2026-06-13) — same trait-pill tab system as the
       profile's + More. The panel's stacked sections are grouped under pills so
       only one group shows at a time:
         Social    → Follow CTA + follower/following counts (the default lead)
         Stats     → Price Stats + ATH & Holders (the factual numbers)
         Replay    → Replay
         Albums    → Albums
         Genome    → Genome
         Sentiment → Price Targets + Disagreement Score (what the crowd thinks) */
    type ProjectMoreL1 = 'social' | 'stats' | 'replay' | 'albums' | 'genome' | 'sentiment';
    const [moreL1, setMoreL1] = useState<ProjectMoreL1>('social');

    /* D17 anchor — local mirror of pd_anchors[project.title]. Hydrated
       from localStorage on mount, kept in sync via the 'pd:anchors-changed'
       window event below. Drives both the .stat-val text rendering for the
       ⚓ stat-item AND the price-trigger delta stamping in the gallery. */
    const [anchorEth, setAnchorEth] = useState<number | null>(null);

    /* Breadcrumbs — REAL "recently visited" (Brendon, 2026-06-12; replaces
       the Build 22 random-sample placeholder). The dot marks the viewer's
       last 5 actually-opened Outputs in THIS Project, sourced from
       lib/pins/breadcrumbStore (recorded on every output-modal open) and
       live: opening an artwork re-renders the trail without a reload. */
    const [breadcrumbSample, setBreadcrumbSample] = useState<Set<number>>(
        () => new Set(getRecentIdsForProject(project.slug)),
    );
    useEffect(() => {
        setBreadcrumbSample(new Set(getRecentIdsForProject(project.slug)));
        return subscribeBreadcrumbs(() =>
            setBreadcrumbSample(new Set(getRecentIdsForProject(project.slug))),
        );
    }, [project.slug]);

    /* ProjectShowcase tab — the artist's curated set of featured ids from the
       project record (projects.showcase_ids, via ProjectContext). Until the
       artist curates (empty set), auto-feed the FIRST 6 MINTS (lowest minted
       ids) so the Showcase is never empty post-launch; the artist overrides
       later by setting showcase_ids. Stable across loads/tab switches. */
    const projectShowcasePicks = useMemo<Set<number>>(() => {
        const firstMints = [...project.outputs.keys()].sort((a, b) => a - b).slice(0, 6);
        /* Curated ids count ONLY if actually minted. A stale/aspirational seed
           (e.g. showcase_ids pointing at #256 before #256 exists) must never
           blank the Showcase tab — we drop the unminted ones and, if nothing
           real survives, auto-feed the first 6 mints. Sound regardless of
           whatever's sitting in projects.showcase_ids. */
        const curatedMinted = project.showcaseIds.filter(
            (id) => id >= 1 && id <= project.totalOutputs
        );
        return new Set(curatedMinted.length > 0 ? curatedMinted : firstMints);
    }, [project.showcaseIds, project.outputs, project.totalOutputs]);

    /* Empty-state ghost grid. While a project is unminted (0 Outputs) the
       gallery would be a void; instead we render placeholder frames whose
       shapes are SAMPLED from the project's own aspect palette (no art, no
       phantom seeds). 18 in Artworks, the first 6 flagged for the Showcase
       tab. Gone the instant the first Output mints. Aspects are picked by a
       deterministic hash of the index (SSR-safe — no hydration mismatch). */
    const GHOST_TOTAL = 18;
    const GHOST_SHOWCASE = 6;
    const showGhosts = project.totalOutputs === 0;
    const ghostSpecs = useMemo(() => {
        if (!showGhosts) return [];
        const aspects = def?.aspects && def.aspects.length ? def.aspects : [1];
        return Array.from({ length: GHOST_TOTAL }, (_, i) => {
            const h = (((i + 1) * 2654435761) >>> 0) / 4294967296;
            const aspect = aspects[Math.floor(h * aspects.length) % aspects.length];
            return { aspect, showcasePick: i < GHOST_SHOWCASE };
        });
    }, [showGhosts, def]);

    /* Build 23 — Fog-mode click-to-reveal (sim 8364-8398). When sort is
       'fog', body.fog-mode CSS blurs every .output-card .canvas-wrapper
       until the card carries .fog-revealed. First tap on a fogged card
       adds the class and swallows the click so the modal doesn't open
       on the same gesture (sim 8378-8385); a second tap on the now-
       revealed card opens the modal normally.

       The handler is attached in the capture phase on #gallery so it
       runs before the .output-content onClick that opens the modal.
       Imperative DOM mutation (classList.add) mirrors sim's
       _startFogObserver pattern verbatim — no per-card React state
       needed, and switching sort away from 'fog' clears all
       .fog-revealed classes so re-entering fog starts clean
       (sim 8395-8398). */
    useEffect(() => {
        if (sort !== 'fog') {
            // Sim 8395-8398 cleanup: when fog turns off, scrub every
            // .fog-revealed flag so the next entry re-fogs the grid.
            document
                .querySelectorAll('.output-card.fog-revealed')
                .forEach((c) => c.classList.remove('fog-revealed'));
            return;
        }
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        const handler = (ev: Event) => {
            // Re-check inside the handler in case body.fog-mode was
            // dropped between attach and click (defensive — sim 8375).
            if (!document.body.classList.contains('fog-mode')) return;
            const target = ev.target as HTMLElement | null;
            if (!target) return;
            const card = target.closest('.output-card');
            if (!card || card.classList.contains('fog-revealed')) return;
            card.classList.add('fog-revealed');
            ev.preventDefault();
            ev.stopPropagation();
        };

        // Capture phase — runs before .output-content's bubbled onClick.
        gallery.addEventListener('click', handler, true);
        return () => {
            gallery.removeEventListener('click', handler, true);
        };
    }, [sort]);

    /* ── D17 anchor hydration + cross-surface sync ──
       Reads pd_anchors from localStorage on mount AND on every
       'pd:anchors-changed' window event (the ValuePromptContext helper
       fires this after every save). Each pass:
         1. Updates body.anchor-active iff at least one saved anchor > 0
            (defensive — the helper already toggles this on save, but a
             stale class from a prior session is possible if storage was
             cleared externally).
         2. Mirrors pd_anchors[project.title] into local anchorEth
            state, which drives the ⚓ .stat-val text rendering AND the
            delta-stamping useEffect that runs after visibleTokenIds. */
    useEffect(() => {
        const sync = () => {
            let anchors: Record<string, number> = {};
            try {
                const raw = window.localStorage.getItem('pd_anchors');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    if (parsed && typeof parsed === 'object') {
                        anchors = parsed as Record<string, number>;
                    }
                }
            } catch { /* keep empty */ }

            const hasAny = Object.values(anchors).some(
                (v) => typeof v === 'number' && isFinite(v) && v > 0
            );
            document.body.classList.toggle('anchor-active', hasAny);

            const v = anchors[project.title];
            setAnchorEth(
                typeof v === 'number' && isFinite(v) && v > 0 ? v : null
            );
        };

        sync();
        window.addEventListener('pd:anchors-changed', sync);
        return () => {
            window.removeEventListener('pd:anchors-changed', sync);
        };
    }, [project.title]);

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

    /* Slug is mock-only — sim has a single project (PRISMS), so we read
       the title via ProjectContext and ignore the route param. The
       server shell at app/art/[slug]/page.tsx already validates the slug
       upstream; per-slug data fetch lands when the indexer ships. */

    /* D003 + D004 — BUY button dynamic floor (sim 8127-8141).
       Sim walks metaCache[1..TOTAL_OUTPUTS] for the lowest listed price
       and wires buyBtn.onclick → openModal(lowestId), .mint-price text →
       `(${lowestFloor.toFixed(3)} ETH)`. Falls back to (SOLD OUT) +
       opacity 0.5 + cursor not-allowed when no listed Outputs exist.
       Token meta has only `price: string | null` (no rawPrice numeric),
       so we parseFloat in the same pattern as line 485 / 502. */
    const { lowestId, lowestFloor } = useMemo(() => {
        let lo = Infinity;
        let id: number | null = null;
        for (let i = 1; i <= project.totalOutputs; i++) {
            const meta = project.outputs.get(i);
            if (!meta || !meta.price) continue;
            const n = parseFloat(meta.price);
            if (!Number.isNaN(n) && n < lo) {
                lo = n;
                id = i;
            }
        }
        return { lowestId: id, lowestFloor: id !== null ? lo : null };
    }, [project]);

    /* Sim's tab visibility table (sim ~13150):
         project-showcase  → gallery, no feed/traits/sort/albums
         artworks  → gallery (or activity-feed if sort starts with 'feed'),
                     traits/sort visible
         albums    → albums-panel only
       Translated directly into booleans below. */
    const onArtworksTab = activeTab === 'artworks';
    const onAlbumsTab = activeTab === 'albums';
    const onShowcaseTab = activeTab === 'project-showcase';
    const feedActive = onArtworksTab && sort === 'feed';
    const galleryVisible = (onShowcaseTab || onArtworksTab) && !feedActive;
    const feedVisible = onArtworksTab && feedActive;
    /* Pre-mint, the trait filter bar would expose the project's feature names
       (Palette / Flow / Grain …) — a spoiler before a single Output exists.
       Hide the whole traits/sort/search bar until something is minted; the
       ghost grid carries NO traits, only sampled aspect ratios. */
    const traitsAndSortVisible = onArtworksTab && !showGhosts;

    /* Brendon S5 May 11 — feed sort actually sorts. Per sim 8159-8162,
       feedKind='time' sorts by timestamp; feedKind='price' sorts by
       price; dir flips ascending/descending. cycleSort('feed') cycles
       through all four combos (time-desc → time-asc → price-desc →
       price-asc → wrap). Before this fix the feed list rendered in
       array order regardless of feedKind+dir so the FEED pill cycled
       state without changing the visible order. */
    /* Live feed rows — our own pre-chain activity from Supabase `events`,
       pulled when the FEED view is open and re-pulled on any market action
       ('pd:project-refresh'). Empty until activity accrues. */
    const [feedRows, setFeedRows] = useState<FeedEvent[]>([]);
    useEffect(() => {
        if (!feedActive) return;
        let cancelled = false;
        const load = () => {
            fetch(`/api/project/${project.slug}/feed?limit=100`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((d: { events?: EventRow[] } | null) => {
                    if (!cancelled && Array.isArray(d?.events)) {
                        setFeedRows(d!.events.map(eventToFeedEvent));
                    }
                })
                .catch(() => { /* keep last good rows */ });
        };
        load();
        const onR = () => load();
        window.addEventListener('pd:project-refresh', onR);
        return () => { cancelled = true; window.removeEventListener('pd:project-refresh', onR); };
    }, [feedActive, project.slug]);

    const sortedFeedEvents = useMemo(() => {
        const events = [...feedRows];
        const dirMult = dir === 'asc' ? 1 : -1;
        if (feedKind === 'price') {
            events.sort((a, b) => (a.price - b.price) * dirMult);
        } else {
            events.sort((a, b) => (a.timestamp - b.timestamp) * dirMult);
        }
        return events;
    }, [feedRows, feedKind, dir]);

    /* Build 19: filter + sort pipeline.
       ───────────────────────────────────────────────────────────────────
       Order matches sim's two-pass model (sim 8684 updateGalleryUI for
       trait + sim 8875 applySearch for search + price), but collapsed to
       a single pass since we own the full token universe in React state.
       ───────────────────────────────────────────────────────────────────
       1. Trait filters (activeFilters):
          - intra-category OR (token must match SOMETHING in the Set)
          - inter-category AND (must satisfy every active category)
          - 'Network' special-cases 'Me' as ownership (sim 8702)
          - 'Breadcrumb' filters by mintId-as-string (sim 8694) — Breadcrumb
            L2 isn't surfaced yet so this is dormant in v0 but matches sim
            shape so it lights up the moment Breadcrumb pills land.
          - Layer / Mineral / Fate read meta.traits[cat].
       2. Search (searchQuery): case-insensitive substring match against
          token id and ownerDisplay (sim 8885 matches gateway/spectrum
          too — those become Layer/Mineral here, but per Build 19 spec
          we keep search to id + owner only; trait pills already cover
          trait searches).
       3. Price range (priceMin / priceMax): unlisted tokens pass when
          only priceMax is set; they fail the moment priceMin is non-empty
          (per Build 19 spec — listing-only floor). This deviates slightly
          from sim's `cardPrice >= minVal` where unlisted cards have
          dataset.price=-1 and naturally fail any positive minVal, but
          collapses to identical behavior in practice.
       4. Sort (sort from SortContext):
          - 'id'    → ascending id (default)
          - 'price' → ascending listed price, unlisted shoved to the
                      end via Infinity, id as stable tiebreaker
          - 'feed'  → reverse id (gallery is hidden when feed sort fires
                      on Artworks tab; on Project Showcase tab the gallery still
                      renders so we still apply the sort)
          - 'fog'   → falls through to ascending id
       ─────────────────────────────────────────────────────────────────── */
    const visibleTokenIds = useMemo(() => {
        const ids: number[] = [];
        for (let i = 1; i <= project.totalOutputs; i++) ids.push(i);

        const minVal = parseFloat(priceMin);
        const maxVal = parseFloat(priceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = searchQuery.trim().toLowerCase();

        const activeCats = (
            Object.keys(activeFilters) as TraitCategory[]
        ).filter((cat) => activeFilters[cat].size > 0);

        const filtered = ids.filter((id) => {
            const meta = project.outputs.get(id);
            if (!meta) return false;

            // 1. Trait filters
            for (const cat of activeCats) {
                const set = activeFilters[cat];
                if (cat === 'Breadcrumb') {
                    if (!set.has(String(id))) return false;
                    continue;
                }
                if (cat === 'Network') {
                    // REAL My Network filtering (Brendon 2026-06-11).
                    // Owner matches by wallet address OR handle so the
                    // follow graph (handle-keyed) and holders (address-
                    // keyed) both resolve.
                    const ownerAddr = (meta.ownerFull || '').toLowerCase();
                    const ownerHandle = meta.ownerDisplay.replace(/^@/, '').toLowerCase();
                    const me = siweAddress ? siweAddress.toLowerCase() : null;
                    const inSet = (s2: Set<string>) => s2.has(ownerAddr) || s2.has(ownerHandle);
                    let netMatch = false;
                    if (set.has('Me') && me && ownerAddr === me) netMatch = true;
                    if (!netMatch && set.has('⚯ Following') && inSet(netSets.following)) netMatch = true;
                    if (!netMatch && set.has('⚬ Followers') && inSet(netSets.followers)) netMatch = true;
                    if (!netMatch && set.has('⚭ Mutuals')
                        && inSet(netSets.following) && inSet(netSets.followers)) netMatch = true;
                    if (!netMatch && set.has('Top Holders') && topHolders.has(ownerAddr)) netMatch = true;
                    if (!netMatch && set.has('New Wallets') && meta.ownerCreatedAt
                        && (Date.now() - new Date(meta.ownerCreatedAt).getTime()) < 30 * 86400e3) netMatch = true;
                    if (!netMatch) return false;
                    continue;
                }
                // Chat H item 3 — Event / Market are feed-mode-only filter
                // categories (sim 8475-8509). They flow into activeFilters
                // when a feed-mode L3 leaf is toggled, but they don't apply
                // to the gallery view (sim 8302-8304: feed-mode toggleFilter
                // calls renderFeed, NOT updateGalleryUI). Skip them here so
                // a stale feed-mode selection doesn't accidentally hide
                // gallery cards when the user flips back to a non-feed sort.
                if (cat === 'Event' || cat === 'Market') {
                    continue;
                }
                // Layer | Mineral | Fate
                const v = meta.traits[cat];
                if (!set.has(v)) return false;
            }

            // 2. Search
            if (q) {
                const idStr = String(id);
                const owner = meta.ownerDisplay.toLowerCase();
                if (!idStr.includes(q) && !owner.includes(q)) return false;
            }

            // 3. Price range
            const priceNum = meta.price ? parseFloat(meta.price) : null;
            if (hasMin) {
                if (priceNum == null) return false;
                if (priceNum < minVal) return false;
            }
            if (hasMax) {
                if (priceNum != null && priceNum > maxVal) return false;
            }

            // 4. My Notes — hide outputs without a saved note.
            //    Reads from the same localStorage key used by
            //    NotePromptContext ('pd_token_notes') so no new
            //    context plumbing is needed.
            if (myNotesActive) {
                try {
                    const raw = typeof localStorage !== 'undefined'
                        ? localStorage.getItem('pd_token_notes')
                        : null;
                    const notes: Record<string, string> = raw ? JSON.parse(raw) : {};
                    if (!notes[String(id)]) return false;
                } catch {
                    return false;
                }
            }

            // 5. Recent (breadcrumbs) — when the Recent pill is active, show
            //    only Outputs the viewer has actually opened in this Project
            //    (the live recently-seen trail from breadcrumbStore).
            if (activeCategory === 'Breadcrumb') {
                if (!breadcrumbSample.has(id)) return false;
            }

            return true;
        });

        // 4. Sort
        // Brendon item 2 (chat A) — `dir` was destructured at top of
        // page.tsx but the comparator only ever sorted ascending. Now:
        // id family flips on dir; price family flips on dir; feed stays
        // descending-id (its own sort lives in the feed renderer). Sort
        // toast direction was correct (the dir state was tracked) — only
        // the gallery comparator missed the dir multiplier.
        const dirMult = dir === 'asc' ? 1 : -1;
        if (sort === 'price') {
            filtered.sort((a, b) => {
                const ma = project.outputs.get(a);
                const mb = project.outputs.get(b);
                const na = ma?.price ? parseFloat(ma.price) : Infinity;
                const nb = mb?.price ? parseFloat(mb.price) : Infinity;
                if (na !== nb) return (na - nb) * dirMult;
                return (a - b) * dirMult;
            });
        } else if (sort === 'id') {
            filtered.sort((a, b) => (a - b) * dirMult);
        } else if (sort === 'feed') {
            filtered.sort((a, b) => b - a);
        }
        // 'fog' = ascending id (already in order from construction)

        return filtered;
    }, [project, sort, dir, activeFilters, searchQuery, priceMin, priceMax, myNotesActive, notesVersion, activeCategory, breadcrumbSample, siweAddress, netSets, topHolders]);

    /* Group-by sections (Brendon, 2026-06-13). When GROUP is on, partition the
       already-sorted/filtered gallery into colour or owner buckets, preserving
       the sort order inside each. Colour is palette-derived (free, no canvas);
       owner reads the live outputs map. */
    const groupedSections = useMemo(() => {
        /* Grouping is a MODIFIER on the ID / PRICE sorts (Brendon, 2026-06-16) —
           it never applies to FEED (chronological activity) or fog (reveal).
           Project-page dimensions: owner · colour · last-sold · rarity. */
        if (group === 'none' || (sort !== 'id' && sort !== 'price')) return null;
        /* Ignore a group persisted on another surface (e.g. 'artist' from a
           profile) — it isn't a project-page dimension. */
        if (!PROJECT_GROUP_ORDER.includes(group)) return null;
        /* Last-sold + rarity have no data yet — one greyed "coming soon" group,
           the real art beneath it (Brendon: "mocked in and coming soon"). */
        if (GROUP_SOON[group]) {
            return [{ label: GROUP_LABEL[group], ids: visibleTokenIds, soon: true }];
        }
        const map = new Map<string, number[]>();
        for (const id of visibleTokenIds) {
            const label =
                group === 'color'
                    ? (resolveBucket(project.slug, id) ?? 'Other')
                    : (project.outputs.get(id)?.ownerDisplay ?? '—');
            const arr = map.get(label);
            if (arr) arr.push(id);
            else map.set(label, [id]);
        }
        const sections = Array.from(map, ([label, ids]) => ({ label, ids, soon: false }));
        if (group === 'color') {
            const order = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];
            sections.sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label));
        }
        return sections;
    }, [group, sort, visibleTokenIds, project, colorsVer]);

    /* ── D17 anchor delta stamping ──
       For every .meta-owner.price-trigger inside #gallery, parse the price
       from text content (format "0.014 ETH" — see ProjectContext token
       seeder) and stamp data-anchor-delta as the fully-formatted delta
       string ("(+18%)" / "(-3%)" / "0"). The CSS ::before appends this
       value verbatim after the ⚓ glyph. When anchor is null OR the price
       can't be parsed, the attr is removed so CSS body.anchor-active rules
       don't render a stale delta.

       Scoped to artworks tab only — anchor display has no meaning on the
       Project Showcase tab (cards are CSS-filtered to 6 picks, .meta is
       hidden) or Albums tab. Clear any stale attrs when not on artworks.

       Re-runs on every gallery re-render (visibleTokenIds change) because
       React's reconciler will not preserve imperatively-stamped attrs
       across card mount/unmount. Cheap — single querySelectorAll +
       parseFloat per card. Sim parity ref: applyAnchor sim 11333. */
    useEffect(() => {
        const gallery = document.getElementById('gallery');
        if (!gallery) return;

        const triggers = gallery.querySelectorAll<HTMLElement>(
            '.meta-owner.price-trigger'
        );

        if (anchorEth == null || !onArtworksTab) {
            triggers.forEach((el) => el.removeAttribute('data-anchor-delta'));
            return;
        }

        triggers.forEach((el) => {
            const p = parseFloat(el.textContent || '');
            if (!(p > 0) || !isFinite(p)) {
                el.removeAttribute('data-anchor-delta');
                return;
            }
            const pct = (p / anchorEth - 1) * 100;
            const sign = pct > 0 ? '+' : pct < 0 ? '-' : '';
            const abs = Math.abs(pct).toFixed(0);
            const isZero = parseFloat(abs) === 0;
            const str = isZero ? '0' : `(${sign}${abs}%)`;
            el.setAttribute('data-anchor-delta', str);
        });
    }, [anchorEth, visibleTokenIds, activeTab]);

    /* F57 (BUG-10) — Budget step-line driver.
       The engine owns budget state + body.budget-active toggle + per-card
       .in-budget class drive (via ArtworkCard subscribers). The step-line
       portion is layout-dependent (offsetTop / offsetLeft / offsetWidth)
       so it MUST be applied imperatively after the page commits — that's
       this useLayoutEffect's job. Re-runs on:
         - budgetsState change  (active budget toggled / added)
         - sort + dir change    (price-asc gate flips)
         - visibleTokenIds      (filter / search / trait change moves cards)
       Sim parity refs: applyBudget at sim 8148 (init), 8359 (sort change),
       8722 (trait), 8896/8909 (search), 9972 (toggle). One React hook
       collapses all of those touch points into one place.

       Resize is handled separately — engine attaches a debounced 150ms
       resize listener (sim 6076-6078) and invokes registered redraw
       callbacks. We register a closure that captures the live priceAsc
       flag via a ref so the listener doesn't go stale. */
    const [budgetsState, setBudgetsState] = useState<BudgetsState>(() =>
        getBudgets()
    );
    useEffect(() => {
        setBudgetsState(getBudgets());
        return subscribeBudgets((next) => setBudgetsState(next));
    }, []);

    const [priceDayOpen, setPriceDayOpen] = useState(false);
    const [priceDayPos, setPriceDayPos] = useState<{ top: number; left: number } | null>(null);
    const priceDayRef = useRef<HTMLSpanElement>(null);
    useEffect(() => {
        if (!priceDayOpen) return;
        const handler = (e: MouseEvent) => {
            if (priceDayRef.current && !priceDayRef.current.contains(e.target as Node)) {
                setPriceDayOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [priceDayOpen]);

    const openPriceDay = () => {
        if (priceDayOpen) { setPriceDayOpen(false); return; }
        if (priceDayRef.current) {
            const rect = priceDayRef.current.getBoundingClientRect();
            const POPOVER_WIDTH = 260;
            const MARGIN = 8;
            const MOBILE_BP = 600;
            let left: number;
            if (window.innerWidth < MOBILE_BP) {
                // Center in viewport on mobile
                left = (window.innerWidth - POPOVER_WIDTH) / 2;
            } else {
                // Center popover under the trigger
                left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
                // Clamp so it never clips either side
                left = Math.max(MARGIN, Math.min(left, window.innerWidth - POPOVER_WIDTH - MARGIN));
            }
            setPriceDayPos({ top: rect.bottom + 4, left });
        }
        setPriceDayOpen(true);
    };

    /* PriceDay almanac for THIS project's upload day — seeded test-phase
       content (same source the home/profile popovers use), so the project
       popover shows the real PriceDay number instead of a hardcoded one. */
    const projectPdc = priceDayContents(
        uploadedAt != null ? new Date(uploadedAt) : new Date(),
    );

    const priceAscActive = sort === 'price' && dir === 'asc';
    const priceAscRef = useRef(priceAscActive);
    priceAscRef.current = priceAscActive;

    useLayoutEffect(() => {
        /* project-showcase-mode CSS-hides all non-pick cards — their
           offsetTop/offsetLeft collapse to 0, which corrupts applyStepLine's
           row-detection geometry and produces phantom step-line overlays.
           Clear any stale step-line state and bail when on showcase tab. */
        if (onShowcaseTab) {
            applyStepLine(false);
            return;
        }
        applyStepLine(priceAscActive);
    }, [budgetsState, sort, dir, visibleTokenIds, priceAscActive, activeTab]);

    useEffect(() => {
        return registerStepLineRedraw(() => {
            applyStepLine(priceAscRef.current);
        });
    }, []);

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



    return (
        <>
            <Hero
                ariaLabel="Project Info"
                titleRow={
                    <h1 className="project-title">
                        <span>{project.title}</span>
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
                                <div className="priceday-popover" style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}>
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
                                </div>
                            )}
                        </span>
                    </h1>
                }
                identityRow={
                    <div className="hero-line project-custom">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href={`/${def?.artistHandle ?? 'opus4-6'}`}>@{def?.artistHandle ?? 'opus4-6'}</a>
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
                    project.stats.collected_by_following.length > 0 ? (
                        /* Plain @name links (Brendon 2026-06-13: reverted the
                           sprite+name rectangle chips; CollectedPair kept but
                           unused). */
                        <div className="hero-line collected-by-row info-line">
                            <span className="cbr-label">Collected by</span>{' '}
                            {project.stats.collected_by_following.slice(0, 2).map((name, i) => {
                                const h = name.toLowerCase().replace(/^@/, '');
                                return (
                                    <span key={name}>
                                        {i > 0 ? ', ' : ''}
                                        <a className="profile-link" href={`/${h}`}>@{h}</a>
                                    </span>
                                );
                            })}
                            {project.stats.collected_by_following.length > 2 && (
                                <span className="cbr-others" onClick={() => open('collectors')}>
                                    {' '}&amp; {project.stats.collected_by_following.length - 2} more you follow
                                </span>
                            )}
                        </div>
                    ) : null
                }
                statsRow={
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Outputs Minted / Total Supply')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">{project.totalOutputs}/{project.maxSupply}</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth" {...iconToastProps('Total Volume')}>⟠&#xFE0E;</span>{' '}
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
                            <span className="stat-icon stat-icon-owners" {...iconToastProps('Collectors')}>⌗&#xFE0E;</span>{' '}
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
                                className="btn-mint"
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
                                    {lowestFloor !== null ? `(${lowestFloor.toFixed(3)} ETH)` : '(NONE LISTED)'}
                                </span>
                            </button>
                        ) : (
                            <MintButton
                                slug={project.slug}
                                projectTitle={project.title}
                                mintPrice={mintPrice}
                                remaining={remaining}
                            />
                        )}
                        {soundtrack && (
                            <a
                                href={playlistWatchUrl(soundtrack.playlistId)}
                                onClick={(e) => { e.preventDefault(); window.open(playlistWatchUrl(soundtrack.playlistId), '_blank', 'noopener,noreferrer'); }}
                                className="btn-soundtrack"
                                title={soundtrack.label}
                            >
                                <span className="btn-icon-play">▶&#xFE0E;</span>{' '}SOUNDTRACK
                            </a>
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
                    <TraitsUI visible={traitsAndSortVisible} />

                    {/* + More sub-nav trait pills — same surface as the
                        profile's + More. Groups the panel's sections. */}
                    {onAlbumsTab && (
                        <TraitsUI
                            visible
                            hideSortBar
                            profilePills={[
                                { key: 'social', label: 'Social', active: moreL1 === 'social', onClick: () => setMoreL1('social') },
                                { key: 'stats', label: 'Stats', active: moreL1 === 'stats', onClick: () => setMoreL1('stats') },
                                { key: 'replay', label: 'Replay', active: moreL1 === 'replay', onClick: () => setMoreL1('replay') },
                                { key: 'albums', label: 'Albums', active: moreL1 === 'albums', onClick: () => setMoreL1('albums') },
                                { key: 'genome', label: 'Genome', active: moreL1 === 'genome', onClick: () => setMoreL1('genome') },
                                { key: 'sentiment', label: 'Sentiment', active: moreL1 === 'sentiment', onClick: () => setMoreL1('sentiment') },
                            ]}
                        />
                    )}
            </Hero>

            {/* My Notes empty state — shown when the notes filter is active
                but no outputs have notes yet. Sits above the (empty) gallery. */}
            {myNotesActive && visibleTokenIds.length === 0 && (
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
            <section
                id="gallery"
                data-my-notes={myNotesActive ? '1' : undefined}
                aria-label="Gallery"
                className={[
                    onShowcaseTab ? 'project-showcase-mode' : null,
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
                    : groupedSections && !onShowcaseTab
                        ? groupedSections.map((sec) => (
                            <Fragment key={`grp-${sec.label}`}>
                                <div className={`gallery-group-header${sec.soon ? ' soon' : ''}`}>
                                    <span className="ggh-label">{sec.label}</span>
                                    {sec.soon
                                        ? <span className="ggh-soon">coming soon</span>
                                        : <span className="ggh-count">{sec.ids.length}</span>}
                                </div>
                                {sec.ids.map((id) => (
                                    <ArtworkCard
                                        key={id}
                                        id={id}
                                        projectShowcasePick={projectShowcasePicks.has(id)}
                                        isBreadcrumb={breadcrumbSample.has(id)}
                                    />
                                ))}
                            </Fragment>
                        ))
                        : visibleTokenIds.map((id, i) => (
                            <ArtworkCard
                                key={id}
                                id={id}
                                projectShowcasePick={projectShowcasePicks.has(id)}
                                isBreadcrumb={breadcrumbSample.has(id)}
                                /* First screenful paints synchronously on mount —
                                   no observer/idle wait. EAGER_GALLERY_COUNT covers
                                   ~2 screenfuls across mobile + desktop column
                                   counts; the rest lazy-load (OOM crash-guard). */
                                eager={i < EAGER_GALLERY_COUNT}
                            />
                        ))}
            </section>

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
                {moreL1 === 'social' && (<>
                {/* SOCIAL — the lead +More section (Brendon, 2026-06-14). The
                    project's Follow CTA mirrors the hero's main action: same
                    .action-row wrapper + .btn-mint styling as the Mint/BUY
                    button, so it sits the same way. Below it, the follower /
                    following counts in the page's standard stat-item treatment.
                    project.slug IS projects.id, so it's the follow API key;
                    ProjectState carries no @handle, so we pass null. */}
                <div className="more-section-header">SOCIAL</div>
                {/* Project-as-user identity header — PriceSprite + @name, the
                    first content under Social (Brendon, 2026-06-16). */}
                <div className="project-id-header">
                    {projectFace && (
                        <span className="id-row-sprite">{projectFace}</span>
                    )}
                    <span className="project-id-name">@{project.slug}</span>
                </div>
                <div className="action-row">
                    <ProjectFollowButton projectId={project.slug} projectHandle={null} />
                </div>
                <div className="more-social-stats-row stats-row stats-row-2">
                    <span className="stat-item">
                        <span
                            className="stat-icon stat-icon-box stat-icon-owners"
                            {...iconToastProps('Followers — wallets that follow this Project')}
                        >
                            ⌗&#xFE0E;
                        </span>{' '}
                        <span className="stat-val">
                            FOLLOWERS · {followCounts.followers}
                        </span>
                    </span>
                    <span className="stat-item">
                        <span
                            className="stat-icon stat-icon-box stat-icon-owned"
                            {...iconToastProps('Following — current holders the Project follows back')}
                        >
                            ⊡&#xFE0E;
                        </span>{' '}
                        <span className="stat-val">
                            FOLLOWING · {followCounts.following}
                        </span>
                    </span>
                </div>

                {/* TRUE NAME — the Project's permanent, unique secret name in
                    uppercase Glagolitic (lib/project/trueName.ts). Identity
                    marker, shown here under Social for now. */}
                <div className="more-section-header">TRUE NAME</div>
                <div className="more-true-name-row">
                    <span
                        className="project-true-name"
                        {...iconToastProps('True Name — this Project’s permanent, unique secret name')}
                    >
                        {projectTrueName(project.slug)}
                    </span>
                </div>

                </>)}
                {moreL1 === 'stats' && (<>
                {/* PRICE STATS — stats-row-2 restored here from hero.
                    Percent Listed, Floor Price, and Anchor. The ⚓ anchor
                    tap opens the ValuePrompt to set / clear your reference
                    price. Moved out of the hero into +More so it is
                    accessible without crowding the main hero on mobile. */}
                <div className="more-section-header">PRICE STATS</div>
                <div className="more-price-stats-row stats-row stats-row-2">
                    <span className="stat-item">
                        <span
                            className="stat-icon stat-icon-box stat-icon-owned"
                            {...iconToastProps('Percent Listed')}
                        >
                            ⊡&#xFE0E;
                        </span>{' '}
                        <span className="stat-val" id="statOwnedVal">
                            57%
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
            </section>
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
}: {
    slug?: string;
    /** Server-seeded minted count (projects.minted_count) — first-paint art. */
    initialTotal?: number;
    /** Server-seeded curated showcase ids (projects.showcase_ids). */
    initialShowcaseIds?: readonly number[];
    /** Real upload moment in ms (cooldown_until − 60d), or null. */
    uploadedAt?: number | null;
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
            <TraitsProvider>
                <ProjectPageBodyInner uploadedAt={uploadedAt} />
            </TraitsProvider>
        </ProjectProvider>
    );
}
