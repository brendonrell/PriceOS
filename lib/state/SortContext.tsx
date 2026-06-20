'use client';

/*
 * SortContext
 *
 * Owns the user's default sort preference for project pages.
 * Four families matching the sim's Default Sort row:
 *   id     — sort by token ID (default)
 *   price  — sort by price asc/desc
 *   feed   — activity feed view
 *   fog    — fog mode reveal (project unfolds artwork by artwork)
 *
 * Persisted in localStorage under 'pd_settings_sort' (family only —
 * matches sim's persisted defaultSort which is family-level too).
 *
 * Build 29 — D13 + D14 add direction state to the same context so
 * the in-project SortBtn (TraitsUI) and the settings DefaultSortRow
 * pill share a single source of truth for the direction arrow.
 *
 *   Sim's `currentSort` is a hyphenated string ('id-asc', 'price-desc',
 *   'feed-time-desc', 'feed-time-asc', 'feed-price-desc',
 *   'feed-price-asc', 'fog'). The port factors that into three fields:
 *     - sort     : family ('id' | 'price' | 'feed' | 'fog')
 *     - dir      : 'asc' | 'desc'  (meaningless for fog)
 *     - feedKind : 'time' | 'price' (only meaningful when sort === 'feed')
 *
 *   `setSort(family)` keeps its old contract — it sets the family and
 *   resets dir/feedKind to that family's default state (sim 8329 / 8320:
 *   id and price default to asc, feed defaults to feed-time-desc). This
 *   keeps WorkspacesContext.applyCode and the rest of the existing
 *   setSort callers backward-compatible with the previous family-only
 *   surface.
 *
 *   `cycleSort(family)` mirrors sim's window.setSort cycling logic
 *   (sim 8312-8331): clicking the active family flips direction (or
 *   advances through the 4-step FEED_SORTS sequence); clicking an
 *   inactive family enters at that family's default. Used by the
 *   in-project SortBtn (D13) and the settings DefaultSortRow
 *   pills (D14) — both of which want sim-faithful cycle-on-click.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

export type SortKey = 'id' | 'price' | 'feed' | 'fog' | 'az';
export type SortDir = 'asc' | 'desc';
export type FeedKind = 'time' | 'price';
/* Group-by dimension for the gallery (Brendon, 2026-06-16). Grouping is a
   MODIFIER on whatever sort is active — the little cycling letter on the sort
   pill, exactly like FEED's `$`. The first option is always 'none' (plain sort,
   no grouping). Master cycle order:
     none → artist → project → artist+project → owner → colour → last-sold → rarity
   Each surface exposes only the dimensions that can apply, so the cycle never
   lands on a dead option:
     - project page  (one artist / one project): owner · colour · owner+colour ·
       last-sold · rarity
     - collected grid (cross-project holdings):   artist · project · artist+project ·
       colour · artist+colour · project+colour · last-sold · rarity
   Combos are two-level: the first dimension titles the section, the second
   sub-titles within it (project+artist is omitted — a project has one artist). */
export type GroupKey =
    | 'none' | 'artist' | 'project' | 'artistProject'
    | 'artistColor' | 'projectColor' | 'ownerColor'
    | 'owner' | 'color' | 'lastSold' | 'rarity';

export const PROJECT_GROUP_ORDER: GroupKey[] =
    ['none', 'owner', 'color', 'ownerColor', 'lastSold', 'rarity'];
export const COLLECTED_GROUP_ORDER: GroupKey[] =
    ['none', 'artist', 'project', 'artistProject', 'color', 'artistColor', 'projectColor', 'lastSold', 'rarity'];

/* Single-character glyph per dimension (docs/GLYPHS.md). 'none' is the resting
   "pure sort" state and shows NO glyph at all (Brendon, 2026-06-18 — the old
   neutral dot is gone); each grouping shows its own glyph. Combos read left→
   right: the level-1 dimension's glyph then the level-2 dimension's. */
export const GROUP_GLYPH: Record<GroupKey, string> = {
    none: '',
    artist: '✺︎',
    project: '⬚︎',
    artistProject: '✺︎⬚︎',
    artistColor: '✺︎◉︎',
    projectColor: '⬚︎◉︎',
    ownerColor: '⌂︎◉︎',
    owner: '⌂︎',
    color: '◉︎',
    lastSold: '$',
    rarity: '❖︎',
};

/* ALLCAPS state for the toast (Brendon's toast-casing rule). */
export const GROUP_LABEL: Record<GroupKey, string> = {
    none: 'OFF', artist: 'ARTIST', project: 'PROJECT',
    artistProject: 'ARTIST + PROJECT',
    artistColor: 'ARTIST + COLOR', projectColor: 'PROJECT + COLOR',
    ownerColor: 'OWNER + COLOR',
    owner: 'OWNER',
    color: 'COLOR', lastSold: 'LAST SOLD', rarity: 'RARITY',
};

/* Dimensions with no data yet — render as a single greyed "coming soon" group. */
export const GROUP_SOON: Partial<Record<GroupKey, boolean>> = { lastSold: true, rarity: true };

/* Per-LEVEL dimension key for a grouping — so a group HEADER can show the glyph
   for what THAT header represents (level-1 = primary dimension, level-2 = the
   sub-dimension), reusing GROUP_GLYPH. Combos split into their two parts; a
   single-dimension group is its own primary with no secondary. */
export const GROUP_PRIMARY_KEY: Record<GroupKey, GroupKey> = {
    none: 'none', artist: 'artist', project: 'project', owner: 'owner',
    color: 'color', lastSold: 'lastSold', rarity: 'rarity',
    artistProject: 'artist', artistColor: 'artist', projectColor: 'project',
    ownerColor: 'owner',
};
export const GROUP_SECONDARY_KEY: Partial<Record<GroupKey, GroupKey>> = {
    artistProject: 'project', artistColor: 'color', projectColor: 'color',
    ownerColor: 'color',
};
/** Glyph for a grouping header at the given level (1 = primary, 2 = sub). */
export function groupHeaderGlyph(group: GroupKey, level: 1 | 2): string {
    const key = level === 2 ? GROUP_SECONDARY_KEY[group] : GROUP_PRIMARY_KEY[group];
    return key ? GROUP_GLYPH[key] : '';
}

const ALL_GROUP_KEYS: GroupKey[] = [
    'none', 'artist', 'project', 'artistProject', 'artistColor', 'projectColor',
    'ownerColor', 'owner', 'color', 'lastSold', 'rarity',
];
function isGroupKey(v: unknown): v is GroupKey {
    return typeof v === 'string' && (ALL_GROUP_KEYS as string[]).includes(v);
}

const STORAGE_KEY = 'pd_settings_sort';
const GROUP_STORAGE_KEY = 'pd_settings_group';

interface SortContextValue {
    sort: SortKey;
    dir: SortDir;
    feedKind: FeedKind;
    /** Set sort family and reset dir/feedKind to family's default. */
    setSort: (s: SortKey) => void;
    /** Sim-faithful click handler — cycles direction within the family. */
    cycleSort: (s: SortKey) => void;
    /** Restore a full sort snapshot (used by Gallery View Presets). */
    applySort: (sort: SortKey, dir: SortDir, feedKind: FeedKind) => void;
    /** Reset the gallery sort + grouping to the user's saved DEFAULT sort with
        no grouping. Called when a project page is entered so an in-project sort/
        grouping never carries over to the next project (Brendon, 2026-06-20). */
    resetToDefault: () => void;
    /** Current group-by dimension for the gallery. */
    group: GroupKey;
    /** Advance the group dimension through the given surface's cycle order. */
    cycleGroup: (order: GroupKey[]) => void;
    /** Unified grid-sort tap (Brendon, 2026-06-18). One button advances the
        whole sort/group/direction space for a grid family (id/price/az) so the
        grouping is no longer a separate tiny chip — mirrors how FEED cycles its
        kind+direction in a single button. Sequence per tap:
        enter family (asc, no group) → flip to desc → next group (asc) → its desc
        → … → wrap. Returns which facet changed so the caller can toast it. */
    cycleGridSort: (
        family: SortKey,
        order: GroupKey[],
    ) => { changed: 'enter' | 'dir' | 'group'; dir: SortDir; group: GroupKey };
}

const SortContext = createContext<SortContextValue | null>(null);

function isSortKey(v: unknown): v is SortKey {
    return v === 'id' || v === 'price' || v === 'feed' || v === 'fog';
}

export function SortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<SortKey>('id');
    const [dir, setDir] = useState<SortDir>('asc');
    // Sim 8320 — feed entry point is feed-time-desc. Default kind = 'time'.
    const [feedKind, setFeedKind] = useState<FeedKind>('time');
    const [group, setGroupState] = useState<GroupKey>('none');

    useEffect(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isSortKey(raw)) {
                setSortState(raw);
                // Family-only restore — reset dir/feedKind to that family's
                // default state. Sim doesn't persist dir either; currentSort
                // initializes to defaultSort + family default direction.
                if (raw === 'feed') {
                    setFeedKind('time');
                    setDir('desc');
                } else if (raw === 'id' || raw === 'price') {
                    setDir('asc');
                }
            }
            /* Grouping is a per-project, transient view modifier (Brendon,
               2026-06-20) — NOT a persisted setting. It always boots at 'none'
               and is reset on each project entry, so it never carries across
               projects or sessions. (The old boot-time restore is gone.) */
        } catch {
            // ignore
        }
    }, []);

    const setSort = useCallback((s: SortKey) => {
        setSortState(s);
        // Reset to family-default direction state (sim 8329 / 8320).
        if (s === 'id' || s === 'price') {
            setDir('asc');
        } else if (s === 'feed') {
            setFeedKind('time');
            setDir('desc');
        }
        try {
            localStorage.setItem(STORAGE_KEY, s);
        } catch {
            // ignore
        }
    }, []);

    const persistFamily = (next: SortKey) => {
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
            // ignore
        }
    };

    /* Sim 8312-8331 — window.setSort('feed' | 'fog' | 'id' | 'price').
       For feed: cycles through ['feed-time-desc', 'feed-time-asc',
       'feed-price-desc', 'feed-price-asc'] (sim 8313). For fog: toggle
       to id-asc if already fog, else to fog. For id/price: flip dir if
       already that family, else enter at `${type}-asc`. */
    const cycleSort = useCallback((target: SortKey) => {
        if (target === 'feed') {
            if (sort === 'feed') {
                // 4-step cycle within feed: matches FEED_SORTS order.
                if (feedKind === 'time' && dir === 'desc') {
                    setDir('asc');
                } else if (feedKind === 'time' && dir === 'asc') {
                    setFeedKind('price');
                    setDir('desc');
                } else if (feedKind === 'price' && dir === 'desc') {
                    setDir('asc');
                } else {
                    // price-asc → wrap back to time-desc
                    setFeedKind('time');
                    setDir('desc');
                }
            } else {
                // Enter feed at feed-time-desc (sim 8320).
                setSortState('feed');
                setFeedKind('time');
                setDir('desc');
                persistFamily('feed');
            }
            return;
        }
        if (target === 'fog') {
            if (sort === 'fog') {
                // Sim 8324 — toggle out of fog returns to id-asc.
                setSortState('id');
                setDir('asc');
                persistFamily('id');
            } else {
                setSortState('fog');
                persistFamily('fog');
            }
            return;
        }
        // id / price / az
        if (sort === target) {
            // Already this family — flip direction (sim 8327).
            setDir(dir === 'asc' ? 'desc' : 'asc');
        } else {
            // Enter at asc (sim 8329).
            setSortState(target);
            setDir('asc');
            // 'az' is a Collected-only sort — never persist it, so a project
            // page never boots into a sort it doesn't render (Brendon 2026-06-15).
            if (target !== 'az') persistFamily(target);
        }
    }, [sort, dir, feedKind]);

    const applySort = useCallback((s: SortKey, d: SortDir, fk: FeedKind) => {
        setSortState(s);
        setDir(d);
        setFeedKind(fk);
    }, []);

    /* Reset to the user's saved DEFAULT sort family + no grouping. Used on
       project entry so each project starts clean and an in-project sort /
       grouping never bleeds into the next project (Brendon, 2026-06-20). */
    const resetToDefault = useCallback(() => {
        let fam: SortKey = 'id';
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isSortKey(raw)) fam = raw;
        } catch {
            // ignore
        }
        setSortState(fam);
        if (fam === 'feed') {
            setFeedKind('time');
            setDir('desc');
        } else {
            // id / price / fog — asc (dir is inert for fog).
            setDir('asc');
        }
        setGroupState('none');
    }, []);

    const cycleGroup = useCallback((order: GroupKey[]) => {
        setGroupState((g) => {
            // If the current dimension isn't in this surface's cycle, restart from none.
            const cur = order.includes(g) ? g : 'none';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            try { localStorage.setItem(GROUP_STORAGE_KEY, next); } catch { /* ignore */ }
            return next;
        });
    }, []);

    /* One-button grid sort — folds direction + group into a single cycle so the
       grouping is no longer a separate (untappable) chip. Mirrors FEED. */
    const cycleGridSort = useCallback(
        (family: SortKey, order: GroupKey[]) => {
            const persistGroup = (g: GroupKey) => {
                try { localStorage.setItem(GROUP_STORAGE_KEY, g); } catch { /* ignore */ }
            };
            if (sort !== family) {
                // Enter the family fresh: ascending, no grouping.
                setSortState(family);
                setDir('asc');
                setGroupState('none');
                persistGroup('none');
                // 'az' is Collected-only — never persist it as the boot sort.
                if (family !== 'az') persistFamily(family);
                return { changed: 'enter' as const, dir: 'asc' as SortDir, group: 'none' as GroupKey };
            }
            if (dir === 'asc') {
                // Same group, flip to descending.
                setDir('desc');
                return { changed: 'dir' as const, dir: 'desc' as SortDir, group };
            }
            // Was descending — advance to the next group, back to ascending.
            const cur = order.includes(group) ? group : 'none';
            const next = order[(order.indexOf(cur) + 1) % order.length];
            setGroupState(next);
            setDir('asc');
            persistGroup(next);
            return { changed: 'group' as const, dir: 'asc' as SortDir, group: next };
        },
        [sort, dir, group],
    );

    const value = useMemo<SortContextValue>(
        () => ({ sort, dir, feedKind, setSort, cycleSort, applySort, resetToDefault, group, cycleGroup, cycleGridSort }),
        [sort, dir, feedKind, setSort, cycleSort, applySort, resetToDefault, group, cycleGroup, cycleGridSort]
    );

    return <SortContext.Provider value={value}>{children}</SortContext.Provider>;
}

export function useSort(): SortContextValue {
    const ctx = useContext(SortContext);
    if (!ctx) {
        throw new Error('useSort must be used inside <SortProvider>');
    }
    return ctx;
}
