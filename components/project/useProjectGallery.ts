'use client';

/*
 * useProjectGallery — the project gallery's whole data pipeline: the
 * deferred trait-filter copies, the Build-19 filter + sort pass
 * (visibleTokenIds), grouping sections, the stable eager set, the
 * scroll-windowed reveal, collapsible group headers, breadcrumb trails,
 * the showcase picks, the unminted ghost grid, and fog-mode reveal.
 * Split out of ProjectPageBody 2026-07-06 — pure move, no behavior change.
 */

import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useProject } from '../../lib/state/ProjectContext';
import { useAuth } from '../../lib/state/AuthContext';
import { useSort, GROUP_SOON, GROUP_LABEL, PROJECT_GROUP_ORDER } from '../../lib/state/SortContext';
import { EXTRA_GROUP_DIMS, groupSectionLabel, groupLabelComparator } from '../../lib/state/groupDimensions';
import { factionOf, useProjectFactions } from '../../lib/factions/factionStore';
import { useTraits, type TraitCategory } from '../../lib/state/TraitsContext';
import { COLOR_BUCKET_ORDER } from '../../lib/art/outputColor';
import { resolveBucket, useStoredColors } from '../../lib/art/colorStore';
import { getProject } from '../../lib/project/registry';
import { readNoteFor } from '../../lib/notes/tokenNotes';
import { getRecentIdsForProject, subscribeBreadcrumbs } from '../../lib/pins/breadcrumbStore';

/* Upper bound on how many leading gallery cards may paint eagerly
   (synchronously on mount). The ACTUAL count is derived from the device
   viewport (see eagerGalleryCount) so a phone — which shows ~2-3 cards — never
   force-paints a desktop's worth of heavy canvases up front (Brendon,
   2026-06-25: "it needs to be viewport aware"). This caps the widest desktops. */
const EAGER_GALLERY_MAX = 24;

/* How many gallery cards actually sit above the fold on this device — the set
   we paint eagerly. The grid is responsive: mobile (≤600px) is a 2-col grid of
   ~140px cards under a tall project hero, so ~3 rows show on load → 6 cards
   (Brendon 2026-06-25: "6 max on iPhone"). Desktop derives its count from its
   own 220px grid metrics (gap 20, 40px side padding, near-square art + ~46px
   meta), one viewport + a buffer row, capped at EAGER_GALLERY_MAX. Everything
   below streams in via the lazy observer. */
function eagerGalleryCount(): number {
    if (typeof window === 'undefined') return EAGER_GALLERY_MAX; // SSR fallback
    if (window.innerWidth <= 600) return 6; // mobile: ~2 cols × 3 visible rows
    const GAP = 20, MIN_COL = 220, PADDING_X = 80, META_H = 46;
    const contentW = Math.max(MIN_COL, window.innerWidth - PADDING_X);
    const cols = Math.max(1, Math.floor((contentW + GAP) / (MIN_COL + GAP)));
    const cardW = (contentW - GAP * (cols - 1)) / cols;
    const cardH = cardW + META_H;
    const rows = Math.max(1, Math.ceil(window.innerHeight / cardH));
    return Math.min(cols * (rows + 1), EAGER_GALLERY_MAX);
}

/* A grouping section row: a header (level-1 title, or level-2 sub-title in a
   combo) plus the pieces beneath it. `ckey` toggles this header's fold;
   `l1Key` is the section it belongs to (folding level-1 folds its level-2s). */
export type GSec = { ckey: string; l1Key: string; level: 1 | 2; label: string; ids: number[]; total: number; soon: boolean };

export function useProjectGallery({
    netSets,
    topHolders,
}: {
    netSets: { followers: Set<string>; following: Set<string> };
    topHolders: Set<string>;
}) {
    const project = useProject();
    const def = getProject(project.slug);
    const { siweAddress } = useAuth();
    const { sort, dir, group } = useSort();
    const { activeFilters, searchQuery, priceMin, priceMax, myNotesActive, activeCategory } = useTraits();

    /* Stored dominant colours for this project (re-renders grouping when they
       arrive); resolveBucket prefers them, falls back to live palette-math. */
    const colorsVer = useStoredColors([project.slug]);
    /* Owner→faction map — fetched lazily, ONLY once the viewer actually lands
       on the FACTION grouping (cycling past it costs nothing). */
    const factionsVer = useProjectFactions(project.slug, group === 'faction');

    /* Decouple the gallery from the trait pills (Brendon, 2026-06-18). Pills read
       the live filter state and dim instantly; the heavy gallery predicate reads
       a DEFERRED copy, so a pill tap never waits on the grid to recompute — the
       grid updates on its own frame. */
    const dActiveFilters = useDeferredValue(activeFilters);
    const dSearchQuery = useDeferredValue(searchQuery);
    const dPriceMin = useDeferredValue(priceMin);
    const dPriceMax = useDeferredValue(priceMax);
    const dMyNotesActive = useDeferredValue(myNotesActive);
    const dActiveCategory = useDeferredValue(activeCategory);

    /* Re-run the gallery filter when notes change so the My Notes view updates
       live as notes are added/removed (Brendon, 2026-06-13). */
    const [notesVersion, setNotesVersion] = useState(0);
    useEffect(() => {
        const bump = () => setNotesVersion((v) => v + 1);
        window.addEventListener('pd:notes-changed', bump);
        return () => window.removeEventListener('pd:notes-changed', bump);
    }, []);

    /* Collapsible grouping headers — tap one to fold its pieces away, tap again
       to reopen. Reset when the grouping dimension changes (keys are labels). */
    const [collapsedGroups, setCollapsedGroups] = useState<ReadonlySet<string>>(() => new Set());
    const toggleGroupCollapse = (key: string) =>
        setCollapsedGroups((prev) => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key); else next.add(key);
            return next;
        });
    useEffect(() => { setCollapsedGroups(new Set()); }, [group]);

    /* Breadcrumbs — REAL "recently visited" (Brendon, 2026-06-12; replaces
       the Build 22 random-sample placeholder). The dot marks the viewer's
       last 5 actually-opened Outputs in THIS Project, sourced from
       lib/pins/breadcrumbStore (recorded on every output-modal open) and
       live: opening an artwork re-renders the trail without a reload. */
    const [breadcrumbSample, setBreadcrumbSample] = useState<Set<number>>(
        () => new Set(getRecentIdsForProject(project.slug)),
    );
    /* The Recent FILTER shows the viewer's FULL visited trail for this Project
       (not just the 5 crumb-stickered ones) — sourced from the same store, no
       cap (Brendon, 2026-06-24). */
    const [breadcrumbAll, setBreadcrumbAll] = useState<Set<number>>(
        () => new Set(getRecentIdsForProject(project.slug, Infinity)),
    );
    useEffect(() => {
        const read = () => {
            setBreadcrumbSample(new Set(getRecentIdsForProject(project.slug)));
            setBreadcrumbAll(new Set(getRecentIdsForProject(project.slug, Infinity)));
        };
        read();
        return subscribeBreadcrumbs(read);
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

    /* Build 19: filter + sort pipeline.
       ───────────────────────────────────────────────────────────────────
       Order matches sim's two-pass model (sim 8684 updateGalleryUI for
       trait + sim 8875 applySearch for search + price), but collapsed to
       a single pass since we own the full token universe in React state.
       See the original header comment for the full four-step contract. */
    const visibleTokenIds = useMemo(() => {
        const ids: number[] = [];
        for (let i = 1; i <= project.totalOutputs; i++) ids.push(i);

        const minVal = parseFloat(dPriceMin);
        const maxVal = parseFloat(dPriceMax);
        const hasMin = !Number.isNaN(minVal);
        const hasMax = !Number.isNaN(maxVal);
        const q = dSearchQuery.trim().toLowerCase();

        const activeCats = (
            Object.keys(dActiveFilters) as TraitCategory[]
        ).filter((cat) => dActiveFilters[cat].size > 0);

        const filtered = ids.filter((id) => {
            const meta = project.outputs.get(id);
            if (!meta) return false;

            // 1. Trait filters
            for (const cat of activeCats) {
                const set = dActiveFilters[cat];
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
                    /* Fresh Wallets = freshly made on Ethereum. We don't index
                       on-chain wallet age yet, so this is a stopgap on PD-account
                       recency (< 30d) until Alchemy first-tx lands. */
                    if (!netMatch && set.has('Fresh Wallets') && meta.ownerCreatedAt
                        && (Date.now() - new Date(meta.ownerCreatedAt).getTime()) < 30 * 86400e3) netMatch = true;
                    /* New to PD = signed up a week or less ago (PD account age). */
                    if (!netMatch && set.has('New to PD') && meta.ownerCreatedAt
                        && (Date.now() - new Date(meta.ownerCreatedAt).getTime()) < 7 * 86400e3) netMatch = true;
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
            if (dMyNotesActive) {
                if (!readNoteFor(project.slug, id)) return false;
            }

            // 5. Recent (breadcrumbs) — when the Recent pill is active, show
            //    only Outputs the viewer has actually opened in this Project
            //    (the live recently-seen trail from breadcrumbStore).
            if (dActiveCategory === 'Breadcrumb') {
                if (!breadcrumbAll.has(id)) return false;
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
    }, [project, sort, dir, dActiveFilters, dSearchQuery, dPriceMin, dPriceMax, dMyNotesActive, notesVersion, dActiveCategory, breadcrumbAll, siweAddress, netSets, topHolders]);

    /* Group-by sections (Brendon, 2026-06-13). When GROUP is on, partition the
       already-sorted/filtered gallery into colour or owner buckets, preserving
       the sort order inside each. Colour is palette-derived (free, no canvas);
       owner reads the live outputs map. */
    const groupedSections = useMemo<GSec[] | null>(() => {
        /* Grouping rides its own toggle (Brendon, 2026-07-12) but still only
           shapes the GRID sorts — it never applies to FEED (chronological
           activity) or fog (reveal). Project-page dimensions: owner · colour ·
           owner+colour · last-sold · rarity. */
        if (group === 'none' || (sort !== 'id' && sort !== 'price')) return null;
        /* Ignore a group persisted on another surface (e.g. 'artist' from a
           profile) — it isn't a project-page dimension. */
        if (!PROJECT_GROUP_ORDER.includes(group)) return null;
        /* Last-sold + rarity have no data yet — one greyed "coming soon" group,
           the real art beneath it (Brendon: "mocked in and coming soon"). */
        if (GROUP_SOON[group]) {
            return [{ ckey: 'soon', l1Key: 'soon', level: 1, label: GROUP_LABEL[group], ids: visibleTokenIds, total: visibleTokenIds.length, soon: true }];
        }

        /* The 2026-07-16 expansion dimensions — every value resolves through
           the shared engine (lib/state/groupDimensions), so this one block
           serves listed/fate/rarity/fingerprint/sky/faction/numerology alike.
           Pieces the data can't place land in the honest tail bucket, which
           the comparator pins last. */
        if (EXTRA_GROUP_DIMS.has(group)) {
            const map = new Map<string, number[]>();
            for (const id of visibleTokenIds) {
                const meta = project.outputs.get(id);
                const label = groupSectionLabel(group, project.slug, id, {
                    listed: meta?.price != null,
                    fate: meta?.traits?.Fate ?? null,
                    faction: group === 'faction' ? factionOf(project.slug, meta?.ownerFull) : null,
                });
                const arr = map.get(label);
                if (arr) arr.push(id); else map.set(label, [id]);
            }
            const cmp = groupLabelComparator(group);
            return [...map.entries()]
                .sort((a, b) => cmp([a[0], a[1].length], [b[0], b[1].length]))
                .map(([label, ids]) => ({ ckey: label, l1Key: label, level: 1 as const, label, ids, total: ids.length, soon: false }));
        }
        const colorOrder = [...(COLOR_BUCKET_ORDER as string[]), 'Other'];

        // owner + colour — two-level: each holder titles a section, colour
        // buckets sub-title within it.
        if (group === 'ownerColor') {
            const byOwner = new Map<string, number[]>();
            for (const id of visibleTokenIds) {
                const o = project.outputs.get(id)?.ownerDisplay ?? '—';
                const arr = byOwner.get(o);
                if (arr) arr.push(id); else byOwner.set(o, [id]);
            }
            const out: GSec[] = [];
            for (const [owner, ids] of byOwner) {
                const oKey = `o:${owner}`;
                // Level-1 owner header has no direct cards (its colours do), but
                // its count totals every piece beneath it (Brendon, 2026-06-20).
                out.push({ ckey: oKey, l1Key: oKey, level: 1, label: owner, ids: [], total: ids.length, soon: false });
                const byColor = new Map<string, number[]>();
                for (const id of ids) {
                    const c = resolveBucket(project.slug, id) ?? 'Other';
                    const arr = byColor.get(c);
                    if (arr) arr.push(id); else byColor.set(c, [id]);
                }
                const colors = [...byColor.entries()]
                    .sort((a, b) => colorOrder.indexOf(a[0]) - colorOrder.indexOf(b[0]));
                for (const [clabel, cids] of colors) {
                    out.push({ ckey: `${oKey}|c:${clabel}`, l1Key: oKey, level: 2, label: clabel, ids: cids, total: cids.length, soon: false });
                }
            }
            return out;
        }

        // single-level: owner OR colour
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
        const sections: GSec[] = Array.from(map, ([label, ids]) => ({ ckey: label, l1Key: label, level: 1 as const, label, ids, total: ids.length, soon: false }));
        if (group === 'color') {
            sections.sort((a, b) => colorOrder.indexOf(a.label) - colorOrder.indexOf(b.label));
        }
        return sections;
    }, [group, sort, visibleTokenIds, project, colorsVer, factionsVer]);

    /* Stable "first screenful" set, by lowest token id — membership does NOT
       change when sort/group reorders the grid, so a card's `eager` flag never
       flips. (A flipped eager re-registers the canvas and forces a repaint,
       which is exactly the churn that made grouping jam.) */
    /* Viewport-derived eager count, fixed once at mount: re-deriving on resize
       would flip a card's `eager` flag and force a repaint (the exact churn the
       stable eager set avoids). */
    const [eagerCount] = useState(eagerGalleryCount);
    const eagerIds = useMemo(
        () => new Set([...visibleTokenIds].sort((a, b) => a - b).slice(0, eagerCount)),
        [visibleTokenIds, eagerCount],
    );

    /* The WHOLE gallery mounts at once (Brendon, 2026-07-06 — "draw the page
       ONCE and be good"): the old 48-card scroll-reveal made fresh tiles pop
       in as you scrolled, which read as the page flashing. Cards are native
       <img> tiles now — the browser lazy-loads/decodes them itself — so a
       full mount is cheap, and once drawn nothing ever pops in again. (The
       canvas fallback keeps its own virtualizer paint budget regardless of
       how many cards are mounted.) */
    const galleryShown = visibleTokenIds.length;
    const gallerySentinelRef = useRef<HTMLDivElement | null>(null);

    return {
        dMyNotesActive,
        breadcrumbSample,
        projectShowcasePicks,
        showGhosts,
        ghostSpecs,
        visibleTokenIds,
        groupedSections,
        eagerIds,
        galleryShown,
        gallerySentinelRef,
        collapsedGroups,
        toggleGroupCollapse,
    };
}
