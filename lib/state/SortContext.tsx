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
/* Group-by dimension for the gallery (Brendon, 2026-06-16; redesigned
   2026-07-12). Grouping is its OWN icon-only toggle at the start of the sort
   row — one tap advances the dimension, independent of which sort is active
   (it no longer rides inside each sort button's cycle). The first option is
   always 'none' (plain sort, no grouping). Master cycle order:
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
/* The settings DEFAULT SORT row's group pill cycles the full master order —
   every dimension, in the §comment order above (Brendon, 2026-07-12). A
   surface that doesn't carry the chosen dimension simply shows ungrouped. */
export const DEFAULT_GROUP_ORDER: GroupKey[] =
    ['none', 'artist', 'project', 'artistProject', 'owner', 'color', 'artistColor', 'projectColor', 'ownerColor', 'lastSold', 'rarity'];

/* Single-character glyph per dimension (docs/GLYPHS.md). 'none' shows NO glyph
   in group headers (Brendon, 2026-06-18); the standalone group TOGGLE wears
   GROUP_BTN_ICON as its resting face instead. Combos read left→right: the
   level-1 dimension's glyph then the level-2 dimension's. */
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

/* Resting face of the standalone group toggle (grouping OFF) — the four-dot
   cluster (Brendon's pick, 2026-07-12; replaced the first-pass ▥), docs/
   GLYPHS.md. When a grouping is live the toggle wears that dimension's
   GROUP_GLYPH instead. */
export const GROUP_BTN_ICON = '⁘︎';

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

/* ── Shareable sort slug (Brendon, 2026-07-02) ──────────────────────────
   The active grid sort + grouping serialises to a compact `?sort=` slug so a
   view can be copied out of the address bar and pasted to reproduce it. It's
   OFF by default (clean URL) and turns on the instant the user taps their
   first sort option; a fresh Project (reset-to-default) clears it again.
     id-asc · price-desc · az-asc-color · feed-time-desc · feed-price-asc-artist · fog
   Family first, then direction (omitted for fog), feed carries its kind, and a
   non-'none' grouping is appended as the last token. */
const SLUG_PARAM = 'sort';

export function encodeSortSlug(
    sort: SortKey, dir: SortDir, feedKind: FeedKind, group: GroupKey,
): string {
    let base: string;
    if (sort === 'fog') base = 'fog';
    else if (sort === 'feed') base = `feed-${feedKind}-${dir}`;
    else base = `${sort}-${dir}`; // id / price / az
    if (group && group !== 'none') base += `-${group}`;
    return base;
}

export interface DecodedSort {
    sort: SortKey; dir: SortDir; feedKind: FeedKind; group: GroupKey;
}

export function decodeSortSlug(slug: string): DecodedSort | null {
    const parts = slug.split('-');
    const fam = parts[0];
    if (fam === 'fog') return { sort: 'fog', dir: 'asc', feedKind: 'time', group: 'none' };
    if (fam === 'feed') {
        const feedKind: FeedKind = parts[1] === 'price' ? 'price' : 'time';
        const dir: SortDir = parts[2] === 'asc' ? 'asc' : 'desc';
        const group: GroupKey = isGroupKey(parts[3]) ? parts[3] : 'none';
        return { sort: 'feed', dir, feedKind, group };
    }
    if (fam === 'id' || fam === 'price' || fam === 'az') {
        const dir: SortDir = parts[1] === 'desc' ? 'desc' : 'asc';
        const group: GroupKey = isGroupKey(parts[2]) ? parts[2] : 'none';
        return { sort: fam, dir, feedKind: 'time', group };
    }
    return null;
}

function readUrlSlug(): DecodedSort | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = new URLSearchParams(window.location.search).get(SLUG_PARAM);
        return raw ? decodeSortSlug(raw) : null;
    } catch { return null; }
}

function writeUrlSlug(slug: string): void {
    if (typeof window === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        if (url.searchParams.get(SLUG_PARAM) === slug) return;
        url.searchParams.set(SLUG_PARAM, slug);
        window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* ignore */ }
}

function clearUrlSlug(): void {
    if (typeof window === 'undefined') return;
    try {
        const url = new URL(window.location.href);
        if (!url.searchParams.has(SLUG_PARAM)) return;
        url.searchParams.delete(SLUG_PARAM);
        window.history.replaceState(window.history.state, '', url.toString());
    } catch { /* ignore */ }
}

interface SortContextValue {
    sort: SortKey;
    dir: SortDir;
    feedKind: FeedKind;
    /** Set sort family and reset dir/feedKind to family's default. */
    setSort: (s: SortKey) => void;
    /** Sim-faithful click handler — cycles direction within the family. */
    cycleSort: (s: SortKey) => void;
    /** Restore a full sort snapshot (used by Gallery View Presets). When
        `group` is given, the grouping dimension is restored too (a preset that
        was saved while grouped). Omit it to leave the current grouping alone. */
    applySort: (sort: SortKey, dir: SortDir, feedKind: FeedKind, group?: GroupKey) => void;
    /** Reset the gallery sort + grouping to the user's saved DEFAULT sort with
        no grouping. Called when a project page is entered so an in-project sort/
        grouping never carries over to the next project (Brendon, 2026-06-20). */
    resetToDefault: () => void;
    /** Current group-by dimension for the gallery. */
    group: GroupKey;
    /** Advance the group dimension through the given surface's cycle order —
        the standalone group toggle's tap (Brendon, 2026-07-12). Returns the
        dimension it landed on so the caller can toast it. Transient: never
        touches the saved default. */
    cycleGroup: (order: GroupKey[]) => GroupKey;
    /** The user's saved DEFAULT grouping (settings · DEFAULT SORT row). Boots
        the app and re-applies on every project entry, exactly like the default
        sort family (Brendon, 2026-07-12). */
    defaultGroup: GroupKey;
    /** Settings pill tap — advance the DEFAULT grouping through the master
        order, persist it, and apply it to the live view. Returns where it
        landed for the toast. */
    cycleDefaultGroup: () => GroupKey;
}

const SortContext = createContext<SortContextValue | null>(null);

function isSortKey(v: unknown): v is SortKey {
    return v === 'id' || v === 'price' || v === 'feed' || v === 'fog' || v === 'az';
}

export function SortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<SortKey>('id');
    const [dir, setDir] = useState<SortDir>('asc');
    // Sim 8320 — feed entry point is feed-time-desc. Default kind = 'time'.
    const [feedKind, setFeedKind] = useState<FeedKind>('time');
    const [group, setGroupState] = useState<GroupKey>('none');
    /* The saved DEFAULT grouping (settings · DEFAULT SORT row, Brendon
       2026-07-12). In-page group taps stay transient; only the settings pill
       writes this. It boots the view and re-applies on project entry. */
    const [defaultGroup, setDefaultGroup] = useState<GroupKey>('none');
    /* Whether the shareable `?sort=` slug is live. Off by default (clean URL);
       flips on at the first user sort tap, off again on reset-to-default. */
    const [slugActive, setSlugActive] = useState(false);

    useEffect(() => {
        /* The saved default grouping loads regardless of entry path — the
           settings pill and resetToDefault both read it. */
        let bootGroup: GroupKey = 'none';
        try {
            const g = localStorage.getItem(GROUP_STORAGE_KEY);
            if (isGroupKey(g)) bootGroup = g;
        } catch { /* ignore */ }
        setDefaultGroup(bootGroup);
        // A pasted `?sort=` slug wins over the saved default — that IS the
        // shared view. Apply it and keep the slug live.
        const fromUrl = readUrlSlug();
        if (fromUrl) {
            setSortState(fromUrl.sort);
            setDir(fromUrl.dir);
            setFeedKind(fromUrl.feedKind);
            setGroupState(fromUrl.group);
            setSlugActive(true);
            return;
        }
        setGroupState(bootGroup);
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
                } else if (raw === 'id' || raw === 'price' || raw === 'az') {
                    setDir('asc');
                }
            }
        } catch {
            // ignore
        }
    }, []);

    /* Mirror the live sort/grouping into the `?sort=` slug once it's active. */
    useEffect(() => {
        if (!slugActive) return;
        writeUrlSlug(encodeSortSlug(sort, dir, feedKind, group));
    }, [slugActive, sort, dir, feedKind, group]);

    const setSort = useCallback((s: SortKey) => {
        setSlugActive(true);
        setSortState(s);
        // Reset to family-default direction state (sim 8329 / 8320).
        if (s === 'id' || s === 'price' || s === 'az') {
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
        setSlugActive(true);
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
            // Enter at asc (sim 8329). AZ persists like the rest now that it's
            // a Default Sort option (Brendon, 2026-07-12) — a project page
            // booting into a saved 'az' maps it to #ID in resetToDefault.
            setSortState(target);
            setDir('asc');
            persistFamily(target);
        }
    }, [sort, dir, feedKind]);

    const applySort = useCallback((s: SortKey, d: SortDir, fk: FeedKind, g?: GroupKey) => {
        setSlugActive(true);
        setSortState(s);
        setDir(d);
        setFeedKind(fk);
        if (g !== undefined) setGroupState(g);
    }, []);

    /* Reset to the user's saved DEFAULT sort family + DEFAULT grouping. Used
       on project entry so each project starts at the user's chosen defaults —
       an in-project sort/grouping never bleeds into the next project
       (Brendon, 2026-06-20; default grouping added 2026-07-12). */
    const resetToDefault = useCallback(() => {
        // A Project opened from a pasted `?sort=` link keeps that shared view
        // instead of snapping back to the saved default.
        const fromUrl = readUrlSlug();
        if (fromUrl) {
            setSortState(fromUrl.sort);
            setDir(fromUrl.dir);
            setFeedKind(fromUrl.feedKind);
            setGroupState(fromUrl.group);
            setSlugActive(true);
            return;
        }
        let fam: SortKey = 'id';
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (isSortKey(raw)) fam = raw;
        } catch {
            // ignore
        }
        // AZ is name-order across projects — meaningless inside ONE project,
        // and the project sort row doesn't offer it. A saved 'az' default
        // enters a project as #ID (Collected/home keep the AZ boot).
        if (fam === 'az') fam = 'id';
        setSortState(fam);
        if (fam === 'feed') {
            setFeedKind('time');
            setDir('desc');
        } else {
            // id / price / fog — asc (dir is inert for fog).
            setDir('asc');
        }
        setGroupState(defaultGroup);
        // Fresh Project = the no-slug default.
        setSlugActive(false);
        clearUrlSlug();
    }, [defaultGroup]);

    /* The standalone group toggle's tap — advances the dimension through this
       surface's cycle, independent of the active sort. Returns where it landed
       so the caller can toast it (React state is async). Transient by design:
       the saved DEFAULT grouping is written only by the settings pill below. */
    const cycleGroup = useCallback((order: GroupKey[]) => {
        setSlugActive(true);
        // If the current dimension isn't in this surface's cycle, restart from none.
        const cur = order.includes(group) ? group : 'none';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        setGroupState(next);
        return next;
    }, [group]);

    /* Settings · DEFAULT SORT group pill — advance the saved default through
       the master order, persist it, and apply it to the live view (exactly how
       the default-sort pills behave). */
    const cycleDefaultGroup = useCallback((): GroupKey => {
        setSlugActive(true);
        const cur = DEFAULT_GROUP_ORDER.includes(defaultGroup) ? defaultGroup : 'none';
        const next = DEFAULT_GROUP_ORDER[(DEFAULT_GROUP_ORDER.indexOf(cur) + 1) % DEFAULT_GROUP_ORDER.length];
        setDefaultGroup(next);
        setGroupState(next);
        try { localStorage.setItem(GROUP_STORAGE_KEY, next); } catch { /* ignore */ }
        return next;
    }, [defaultGroup]);

    const value = useMemo<SortContextValue>(
        () => ({ sort, dir, feedKind, setSort, cycleSort, applySort, resetToDefault, group, cycleGroup, defaultGroup, cycleDefaultGroup }),
        [sort, dir, feedKind, setSort, cycleSort, applySort, resetToDefault, group, cycleGroup, defaultGroup, cycleDefaultGroup]
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
