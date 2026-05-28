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
 *     · title + .project-artist + .info-rubik
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

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useSort } from '../../lib/state/SortContext';
import { useToast } from '../../lib/state/ToastContext';
import { useModal } from '../../lib/state/ModalContext';
import { useValuePrompt } from '../../lib/state/ValuePromptContext';
import {
    TraitsProvider,
    useTraits,
    type TraitCategory,
} from '../../lib/state/TraitsContext';
import ArtworkCard from '../ArtworkCard';
import TraitsUI from './TraitsUI';
import {
    applyStepLine,
    getBudgets,
    registerStepLineRedraw,
    subscribeBudgets,
    type BudgetsState,
} from '../../lib/engines/budgetEngine';
import { forceRenderIds } from '../../lib/virtualization/canvasVirtualizer';
import { openExternalLink } from '../../lib/pwa/openExternalLink';

type ProjectTab = 'project-showcase' | 'artworks' | 'albums';

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
    /* Brendon S5 May 11 — sort keys. Feed sort cycles 4 ways
       (time-desc, time-asc, price-desc, price-asc) per sim 8313 and
       SortContext.cycleSort. Without numeric timestamp + price fields
       the list rendered in array order regardless of feedKind+dir, so
       clicking the FEED pill produced no visual change. */
    timestamp: number;
    price: number;
}

/* Captured once at module load so MOCK_FEED_EVENTS timestamps stay
   stable across re-renders (sim does the same — sim 7411 `const now =
   Date.now()` before mockEvents). */
const MOCK_NOW = Date.now();

const MOCK_FEED_EVENTS: FeedEvent[] = [
    {
        id: 14,
        icon: '✶',
        time: '12:04 PM',
        type: 'MINT',
        timestamp: MOCK_NOW - 100000,
        price: 0.05,
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
        timestamp: MOCK_NOW - 200000,
        price: 0.4,
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
        timestamp: MOCK_NOW - 300000,
        price: 0.5,
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
        timestamp: MOCK_NOW - 500000,
        price: 0.05,
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
        timestamp: MOCK_NOW - 86400000,
        price: 2.0,
        detail: (
            <>
                <span className="f-highlight">@snowfro</span>
                <span className="artist-tag" aria-label="artist">
                    {'✺\uFE0E'}
                </span>{' '}
                listed{' '}
                <span className="f-highlight">#1</span> for 2.0 ETH
            </>
        ),
    },
    {
        id: 42,
        icon: '✸',
        time: 'Yesterday',
        type: 'XFER',
        timestamp: MOCK_NOW - 90000000,
        price: 0,
        detail: (
            <>
                <span className="f-highlight">@XCOPY</span>
                <span className="artist-tag" aria-label="artist">
                    {'✺\uFE0E'}
                </span>
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

/* Build 19 split: TraitsProvider must wrap the consumer that calls
   useTraits(). The page now exports a thin outer wrapper that mounts
   the provider; ProjectPageBodyInner reads activeFilters/searchQuery/
   priceMin/priceMax via useTraits and runs the gallery predicate +
   sort below. Splitting at the provider boundary keeps the existing
   render shape (single root section before the provider closes) and
   avoids hoisting the filter logic into a separate component. */
function ProjectPageBodyInner() {
    /* Hooks first (no conditional returns above) — covers the lint rule
       Brendon called out in earlier sessions. */
    const project = useProject();
    const { sort, dir, feedKind } = useSort();
    const { showToast } = useToast();
    const { open } = useModal();
    const { openAnchorPrompt } = useValuePrompt();
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
    const { activeFilters, searchQuery, priceMin, priceMax, burnPileActive } = useTraits();
    const [activeTab, setActiveTab] = useState<ProjectTab>(() => {
        try {
            const saved = window.localStorage.getItem('pd_project_tab');
            if (saved === 'artworks' || saved === 'albums') return saved;
        } catch {}
        return 'project-showcase';
    });
    const setActiveTabPersisted = (tab: ProjectTab) => {
        try { window.localStorage.setItem('pd_project_tab', tab); } catch {}
        setActiveTab(tab);
    };    /* D17 anchor — local mirror of pd_anchors[project.title]. Hydrated
       from localStorage on mount, kept in sync via the 'pd:anchors-changed'
       window event below. Drives both the .stat-val text rendering for the
       ⚓ stat-item AND the price-trigger delta stamping in the gallery. */
    const [anchorEth, setAnchorEth] = useState<number | null>(null);

    /* Build 22 — Breadcrumb sample (sim 7145-7157). 5 random ids from
       the first 200 tokens, drawn once per page session, marked as
       "recently visited" via a small dot on the bottom-right of the
       artwork. Sim's pickBreadcrumbSample IIFE seeds traitData.Breadcrumb
       and _recentSubCats; here we just need the id Set for the visual
       sticker — the trait/recent-cats wiring lands when those features
       ship. _hotTokenIds collision avoidance mirrors sim 7149 verbatim. */
    const [breadcrumbSample] = useState<Set<number>>(() => {
        const HOT_TOKEN_IDS = [7, 42, 99, 147, 256, 444, 617, 888];
        const used = new Set<number>(HOT_TOKEN_IDS);
        const picks: number[] = [];
        while (picks.length < 5) {
            const id = 1 + Math.floor(Math.random() * 200);
            if (!used.has(id)) {
                used.add(id);
                picks.push(id);
            }
        }
        return new Set(picks);
    });

    /* ProjectShowcase tab (sim ~13110-13131). Pick 6 random ids once per
       page session — stable across tab switches, exactly as sim keeps
       `_showcasePicks` stable and only resets on page load.
       Picks from the full 1..totalOutputs universe (same as sim picking
       from all rendered cards before any filter is applied). */
    const [projectShowcasePicks] = useState<Set<number>>(() => {
        const total = project.totalOutputs;
        const all: number[] = [];
        for (let i = 1; i <= total; i++) all.push(i);
        for (let i = all.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [all[i], all[j]] = [all[j], all[i]];
        }
        return new Set(all.slice(0, 6));
    });

    /* F61 (BUG-30) — Burn Pile gallery effect (sim 6625-6643).
       When `burnPileActive` flips ON, sim picks 3 random gallery cards
       and stamps `.burn-pick` on them; the gallery itself gets
       `.burn-mode` so CSS dims everything except the picks (sim 2320-2321).
       In React: maintain a `burnPicks` Set keyed off the same flag —
       re-randomized on every transition to ON, cleared on transition to
       OFF. The visible-set dependency keeps the picks restricted to ids
       that survive the active filter / search predicate, mirroring sim's
       `gallery.querySelectorAll('.output-card')` (only mounted cards). */
    const [burnPicks, setBurnPicks] = useState<Set<number>>(() => new Set());
    /* Snapshot of visible ids for the burn-pick draw. Computed lower
       down (after all filter wiring) — this useEffect just consumes
       whatever the gallery is currently rendering when the flag flips. */

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
    const traitsAndSortVisible = onArtworksTab;

    /* Brendon S5 May 11 — feed sort actually sorts. Per sim 8159-8162,
       feedKind='time' sorts by timestamp; feedKind='price' sorts by
       price; dir flips ascending/descending. cycleSort('feed') cycles
       through all four combos (time-desc → time-asc → price-desc →
       price-asc → wrap). Before this fix the feed list rendered in
       array order regardless of feedKind+dir so the FEED pill cycled
       state without changing the visible order. */
    const sortedFeedEvents = useMemo(() => {
        const events = [...MOCK_FEED_EVENTS];
        const dirMult = dir === 'asc' ? 1 : -1;
        if (feedKind === 'price') {
            events.sort((a, b) => (a.price - b.price) * dirMult);
        } else {
            events.sort((a, b) => (a.timestamp - b.timestamp) * dirMult);
        }
        return events;
    }, [feedKind, dir]);

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
                    let netMatch = false;
                    if (set.has('Me') && meta.isOwnedByBrendon) netMatch = true;
                    // Future-proof: any non-'Me' Network value would compare
                    // against a Network trait; the mock has no such trait
                    // today, so non-'Me' selections never match. Sim parity
                    // (sim 8705) — when Network L2 lands, add the trait
                    // dimension here and the loop handles it.
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
    }, [project, sort, dir, activeFilters, searchQuery, priceMin, priceMax]);

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
       don't show. forceRenderIds bypasses the IntersectionObserver and
       directly queues the picked canvases for idle-time rendering. */
    useEffect(() => {
        if (onShowcaseTab) forceRenderIds(projectShowcasePicks);
    }, [onShowcaseTab, projectShowcasePicks]);

    /* F61 (BUG-30) — re-pick on burnPileActive flip ON.
       Sim 6629-6635 takes a fresh random sample of 3 cards each time
       Burn Pile turns on. We use a stable `wasOn` ref so we only
       re-randomize on the OFF → ON edge (not on every visibleTokenIds
       change, which would walk the picks around as the user filters).
       OFF clears the set entirely. Mount-time: flag defaults to false
       so the empty-set initializer wins; no draw runs until the user
       toggles. */
    const burnWasOnRef = useRef(false);
    useEffect(() => {
        if (burnPileActive && !burnWasOnRef.current) {
            const ids = visibleTokenIds.slice();
            for (let i = ids.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [ids[i], ids[j]] = [ids[j], ids[i]];
            }
            setBurnPicks(new Set(ids.slice(0, 3)));
        } else if (!burnPileActive && burnWasOnRef.current) {
            setBurnPicks(new Set());
        }
        burnWasOnRef.current = burnPileActive;
    }, [burnPileActive, visibleTokenIds]);

    return (
        <>
            <section className="project-hero" aria-label="Project Info">
                <div className="hero-group-1">
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
                            >JUL 09 2026</span>
                            {priceDayOpen && priceDayPos && (
                                <div className="priceday-popover" style={{ position: 'fixed', top: priceDayPos.top, left: priceDayPos.left }}>
                                    <div className="dp-title">PRICEDAY #47</div>
                                    <div className="dp-title-spacer" />

                                    <div className="pd-section-header">MINTED THIS DAY</div>
                                    <div className="dp-row"><span className="dp-label">Prisms #23</span><span className="dp-value">@Opus4-6</span></div>
                                    <div className="dp-row"><span className="dp-label">KIKI #441</span><span className="dp-value">@Claude</span></div>
                                    <div className="dp-row"><span className="dp-label">Meridian #8</span><span className="dp-value">@snowfro</span></div>
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">UPLOADED THIS DAY</div>
                                    <div className="dp-row"><span className="dp-label">Chromatic Drift</span><span className="dp-value">@Claude</span></div>
                                    <div className="dp-row"><span className="dp-label">Signal Loss</span><span className="dp-value">@Rudxane</span></div>
                                    <div className="pd-section-end" />

                                    <div className="pd-section-header">BIGGEST SALE</div>
                                    <div className="dp-row"><span className="dp-label">Prisms #7</span><span className="dp-value">0.44 ETH</span></div>
                                    <div className="pd-section-end" />
                                </div>
                            )}
                        </span>
                    </h1>

                    <div className="hero-line project-artist">
                        <span className="by-text">By</span>{' '}
                        <div className="artist-lockup">
                            <span className="artist-name-wrap">
                                <a href="/profile/opus4-6">@Opus4-6</a>
                                <span className="artist-tag" aria-label="artist">{'✺\uFE0E'}</span>
                                <span className="follow-badge"><span className="ico-mutual" title="Mutual">⚭&#xFE0E;</span></span>
                            </span>
                            <span className="follower-count">2.2k</span>
                        </div>
                    </div>

                    <div className="hero-line info-line">
                        <span className="info-rubik">
                            Collected by{' '}
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
                                onClick={() => open('collectors')}
                            >
                                &amp; 42 Others You Know
                            </span>
                        </span>
                    </div>
                    {/* Stats row — matches collection.html single-row layout */}
                    <div className="hero-line stats-row">
                        <span className="stat-item">
                            <span
                                className="stat-icon stat-icon-box"
                                {...iconToastProps('Outputs Minted / Total Supply')}
                            >
                                ⬚&#xFE0E;
                            </span>{' '}
                            <span className="stat-val">2222/2222</span>
                        </span>
                        <span className="stat-item stat-item-vol">
                            <span className="stat-icon-eth" {...iconToastProps('Total Volume')}>⟠&#xFE0E;</span>{' '}
                            <span className="stat-val stat-val-vol">14.2 VOL</span>
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
                            <span className="stat-val stat-val-owners">412 PPL</span>
                        </span>
                    </div>
                </div>

                <div className="hero-group-2">
                    <div className="action-row">
                        <button
                            className="btn-mint"
                            title="Buy the Lowest Listed Output"
                            onClick={() => {
                                if (lowestId !== null) open('output', lowestId);
                            }}
                            style={
                                lowestId === null
                                    ? { opacity: 0.5, cursor: 'not-allowed' }
                                    : undefined
                            }
                        >
                            <span className="mint-lbl">BUY</span>
                            <span className="mint-price">
                                {lowestFloor !== null
                                    ? `(${lowestFloor.toFixed(2)} ETH)`
                                    : '(SOLD OUT)'}
                            </span>
                        </button>
                        <a
                            href="https://youtube.com/playlist?list=PLCcn8jUjH5jNvd2HHBtCEqK73KoW_Xja_&si=OUkHXLNIYDjT7JzC"
                            onClick={(e) => { e.preventDefault(); openExternalLink('https://youtube.com/playlist?list=PLCcn8jUjH5jNvd2HHBtCEqK73KoW_Xja_&si=OUkHXLNIYDjT7JzC'); }}
                            className="btn-soundtrack"
                        >
                            <span className="btn-icon-play">▶&#xFE0E;</span>{' '}SOUNDTRACK
                        </a>
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
                            onClick={() => { setActiveTabPersisted('project-showcase'); showToast('TAB: Showcase'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('project-showcase'); showToast('TAB: Showcase');
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
                            onClick={() => { setActiveTabPersisted('artworks'); showToast('TAB: Artworks'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('artworks'); showToast('TAB: Artworks');
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
                            onClick={() => { setActiveTabPersisted('albums'); showToast('TAB: + More'); }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setActiveTabPersisted('albums'); showToast('TAB: + More');
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
                (~8155). In React: one ArtworkCard per visible token id —
                Build 19 wires the visible set to TraitsContext (filter +
                search + price range) and SortContext (sort family).
                ProjectShowcase tab (sim ~13150): gallery gets
                .project-showcase-mode; 6 random picks from page-load carry
                .project-showcase-pick; CSS hides all other cards + their
                .meta. Full list still mounted — CSS does the filtering. */}
            <section
                id="gallery"
                aria-label="Gallery"
                className={[
                    burnPileActive ? 'burn-mode' : null,
                    onShowcaseTab ? 'project-showcase-mode' : null,
                ].filter(Boolean).join(' ') || undefined}
                style={{ display: galleryVisible ? undefined : 'none' }}
            >
                {visibleTokenIds.map((id) => (
                    <ArtworkCard
                        key={id}
                        id={id}
                        projectShowcasePick={projectShowcasePicks.has(id)}
                        isBreadcrumb={breadcrumbSample.has(id)}
                        burnPick={burnPicks.has(id)}
                    />
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
                    {sortedFeedEvents.map((e) => (
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
                                {Array.from({ length: 11 }).map((_, i) => (
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
        </>
    );
}

/* Outer wrapper. Mounts TraitsProvider so the inner consumer can call
   useTraits(). Default-exported as ProjectPageBody and consumed by the
   server shell at app/art/[slug]/page.tsx which handles slug validation
   + metadata. */
export default function ProjectPageBody() {
    return (
        <TraitsProvider>
            <ProjectPageBodyInner />
        </TraitsProvider>
    );
}
