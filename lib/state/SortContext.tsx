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
import { getRememberedGroup, getRememberedLayers, rememberGroup, rememberLayers } from './groupMemoryStore';

export type SortKey = 'id' | 'price' | 'feed' | 'fog' | 'az' | 'rarity';
export type SortDir = 'asc' | 'desc';
export type FeedKind = 'time' | 'price';
/* ⛔ RARITY IS ITS OWN SORT NOW, NOT A MODIFIER (Brendon, 2026-09-03 —
   "take rarity out of ID and PRICE sorts as a modifier in the cycle
   picker... return those two to just up and down... add rarity as its own
   sort, glyph-only"). #ID and $PRICE went back to a plain 2-step asc/desc
   toggle; 'rarity' takes the same plain toggle as its own SortKey family,
   wearing the ❖ glyph the old modifier used to wear. `rank`/`SortRank`
   stay in the context (harmless — nothing sets them to 'rarity' anymore)
   so nothing downstream that still reads them has to change shape. */
export type SortRank = 'natural' | 'rarity';
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
    | 'owner' | 'color' | 'lastSold' | 'rarity'
    /* THE EXPANSION (Brendon, 2026-07-16 — "way more group options… deep cuts
       deep in the cycle"). Everyday cuts first, the esoterica buried deep:
       market state · Fate · REAL pdRarity tiers · the stored visual
       fingerprint (temperature/light/mood/orientation) · the mint sky
       (moon phase/zodiac/weekday) · the war (owner faction) · numerology.
       Values resolve through lib/state/groupDimensions (shared by both
       galleries). */
    | 'listed' | 'fate' | 'temperature' | 'light' | 'mood' | 'orientation'
    | 'moon' | 'zodiac' | 'weekday' | 'faction' | 'numerology'
    /* LANGUAGE — the coding-language platform trait as a shelf (Brendon,
       2026-08-02; docs/languages-trait-spec.md). Resolves from the project
       registry, so it needs no per-piece data at all. */
    | 'language'
    /* PROFILE TAGS — group pieces by their owner's leading tag (Brendon,
       2026-07-26). A main, sitting straight after owner. */
    | 'tag';

/* ── THE MAINS (Brendon, 2026-07-26) ────────────────────────────────────────
   The tap cycle was 17-19 stops deep and took forever to get anywhere. It is
   now only the five Brendon named — artist · project · owner · colour · rarity
   — each surface showing the ones that can apply (a project page has one artist
   and one project; your own Collected grid has one owner).

   NOTHING WAS DELETED. Every other dimension — the whole 2026-07-16 expansion,
   plus the old hardcoded PAIRS (artist+project, owner+colour…) — is still here
   and reachable: the pairs are now expressible as layers, and the deep cuts live
   behind the group toggle's LONG-PRESS menu (GROUP_MENU_DIMS below). The tap is
   the fast path; the hold is the full vocabulary. */
export const PROJECT_GROUP_ORDER: GroupKey[] =
    ['none', 'owner', 'tag', 'orientation', 'color', 'rarity'];
export const COLLECTED_GROUP_ORDER: GroupKey[] =
    ['none', 'artist', 'project', 'orientation', 'color', 'rarity'];

/* ⛔ ORIENT ONLY WHERE THE ART CAN ACTUALLY BE SHAPED DIFFERENTLY (Brendon,
   2026-08-01). A project that draws at one aspect can only ever produce one
   orientation, so offering the grouping there is a dead tap. The registry says
   which shapes a project's engine can reach, so this is settled from the
   project itself — no sampling, no guessing. It sits THIRD-LAST; rarity is
   always last. */
export function groupOrderFor(order: GroupKey[], multiAspect: boolean): GroupKey[] {
    return multiAspect ? order : order.filter((d) => d !== 'orientation');
}

/* Everything the LONG-PRESS menu offers for a layer, in menu order: the mains
   first, then the deep cuts. 'lastSold' stays out — it has no data yet
   (GROUP_SOON) and would offer an empty grouping. */
export const GROUP_MENU_DIMS: GroupKey[] = [
    'artist', 'project', 'owner', 'tag', 'color', 'rarity',
    /* Language leads the deep cuts — identity-adjacent, the p5/three/vanilla
       shelf (Brendon, 2026-08-02). */
    'language',
    'listed', 'fate', 'temperature', 'light', 'mood', 'orientation',
    'moon', 'zodiac', 'weekday', 'faction', 'numerology',
];

/** The dimensions a surface can actually resolve — the menu hides the rest
 *  rather than offering a grouping that would come back empty. */
export function groupDimsFor(surface: 'project' | 'collected' | 'all'): GroupKey[] {
    /* The saved DEFAULT applies wherever you land, so it offers everything —
       a surface that can't carry a dimension just shows one section — the
       menu is where a dead dimension gets greyed out, never the grid. */
    if (surface === 'all') return GROUP_MENU_DIMS.slice();
    return GROUP_MENU_DIMS.filter((d) =>
        surface === 'project'
            /* one artist, one project — and so one language: a single project
               can only ever fill one language shelf (the ORIENT dead-tap
               lesson, 2026-08-01). */
            ? d !== 'artist' && d !== 'project' && d !== 'language'
            /* your own wallet — one owner, so their tags don't cut anything
               either, and no faction war to sort by. */
            : d !== 'owner' && d !== 'tag' && d !== 'faction',
    );
}
/* The settings DEFAULT SORT row's group pill cycles the full master order —
   every dimension, in the §comment order above (Brendon, 2026-07-12). A
   surface that doesn't carry the chosen dimension simply shows ungrouped. */
export const DEFAULT_GROUP_ORDER: GroupKey[] =
    ['none', 'artist', 'project', 'artistProject', 'owner', 'color', 'artistColor', 'projectColor', 'ownerColor',
        'listed', 'fate', 'rarity', 'language', 'temperature', 'light', 'mood', 'orientation',
        'moon', 'zodiac', 'weekday', 'faction', 'numerology', 'lastSold'];

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
    /* The expansion (2026-07-16, docs/GLYPHS.md §4). Reuse before invention:
       ✹ = the canonical Listed star · ䷲ = the Fate hexagram (facet-bar L1
       pill) · ▦ = the Calendar square (born-on) · ⍟ = the sky/Stargazing star
       (context disambiguates, the ◉ precedent) · ⚐ = the war banner ·
       ○/◑ = the shipped lunarGlyph disc family. Plain chars ($ precedent):
       ° temperature · ~ mood · # numerology. */
    listed: '✹︎',
    fate: '䷲︎',
    temperature: '°',
    light: '◑︎',
    mood: '~',
    orientation: '▭︎',
    moon: '○︎',
    zodiac: '⍟︎',
    weekday: '▦︎',
    faction: '⚐︎',
    numerology: '#',
    /* The profile-tag chip's own mark — the canonical social/user glyph
       (docs/GLYPHS.md §12h), since a tag is who its owner is. */
    tag: '☻︎',
    /* Language — the code brace, plain-char family ($ ° ~ # precedent). */
    language: '{',
};

/* Resting face of the standalone group toggle (grouping OFF) — the four-dot
   cluster (Brendon's pick, 2026-07-12; replaced the first-pass ▥), docs/
   GLYPHS.md. When a grouping is live the toggle wears that dimension's
   GROUP_GLYPH instead. */
export const GROUP_BTN_ICON = '⁘︎';

/* ⛔ THE GROUP TOAST SAYS THERE IS MORE BEHIND A LONG-PRESS (Brendon,
   2026-08-02: "on row below that text put (longpress for more) with little
   icons on each side (the 4 dots)"). The four dots are the group button's own
   mark — reused, never a new glyph. Appended ONLY to the toast shown when
   grouping cycles back to OFF/'none' (Brendon, 2026-08-14) — every other
   group-cycle toast stays plain. The toast renders everything after the
   newline as its hint row. */
export const GROUP_TOAST_HINT = `\n${GROUP_BTN_ICON} (longpress for more) ${GROUP_BTN_ICON}`;

/* ALLCAPS state for the toast (Brendon's toast-casing rule). */
export const GROUP_LABEL: Record<GroupKey, string> = {
    none: 'OFF', artist: 'ARTIST', project: 'PROJECT',
    artistProject: 'ARTIST + PROJECT',
    artistColor: 'ARTIST + COLOR', projectColor: 'PROJECT + COLOR',
    ownerColor: 'OWNER + COLOR',
    owner: 'OWNER',
    color: 'COLOR', lastSold: 'LAST SOLD', rarity: 'RARITY',
    /* TEMP / ORIENT rather than the full words (Brendon, 2026-07-27) — they were
       the two long enough to widen the whole layer picker on their own. */
    listed: 'LISTED', fate: 'FATE', temperature: 'TEMP',
    light: 'LIGHT', mood: 'MOOD', orientation: 'ORIENT',
    moon: 'MOON PHASE', zodiac: 'ZODIAC', weekday: 'BORN ON',
    faction: 'FACTION', numerology: 'NUMEROLOGY', tag: 'TAG',
    language: 'LANGUAGE',
};

/* Dimensions with no data yet — render as a single greyed "coming soon" group.
   RARITY left this list 2026-07-16: pdRarity ranks compute pure client-side
   (the Vault's appraisal read), so its tiers are real now. */
export const GROUP_SOON: Partial<Record<GroupKey, boolean>> = { lastSold: true };

/* Per-LEVEL dimension key for a grouping — so a group HEADER can show the glyph
   for what THAT header represents (level-1 = primary dimension, level-2 = the
   sub-dimension), reusing GROUP_GLYPH. Combos split into their two parts; a
   single-dimension group is its own primary with no secondary. */
export const GROUP_PRIMARY_KEY: Record<GroupKey, GroupKey> = {
    none: 'none', artist: 'artist', project: 'project', owner: 'owner',
    color: 'color', lastSold: 'lastSold', rarity: 'rarity',
    artistProject: 'artist', artistColor: 'artist', projectColor: 'project',
    ownerColor: 'owner',
    listed: 'listed', fate: 'fate', temperature: 'temperature',
    light: 'light', mood: 'mood', orientation: 'orientation',
    moon: 'moon', zodiac: 'zodiac', weekday: 'weekday',
    faction: 'faction', numerology: 'numerology', tag: 'tag',
    language: 'language',
};
export const GROUP_SECONDARY_KEY: Partial<Record<GroupKey, GroupKey>> = {
    artistProject: 'project', artistColor: 'color', projectColor: 'color',
    ownerColor: 'color',
};
/** Glyph for a grouping header at the given level.
 *  Pass the LAYERS (SortContext.groupLayers) and the level is simply an index
 *  into them — each layer is its own dimension now (Brendon, 2026-07-26).
 *  A bare GroupKey still works: the legacy combos split via the PRIMARY/
 *  SECONDARY maps above, which is what a saved pre-layers view resolves to. */
export function groupHeaderGlyph(
    group: GroupKey | readonly GroupKey[], level: 1 | 2 | 3,
    /** The header's own label — HELD takes its own mark (see below). */
    label?: string,
): string {
    let key: GroupKey | undefined;
    if (Array.isArray(group)) {
        key = (group as readonly GroupKey[])[level - 1];
    } else {
        const g = group as GroupKey;
        key = level === 2 ? GROUP_SECONDARY_KEY[g] : level === 1 ? GROUP_PRIMARY_KEY[g] : undefined;
    }
    /* ⛔ HELD WEARS THE COLLECT MARK (Brendon, 2026-08-02: "this one looks too
       much like the artist glyph"). The Listed layer marked BOTH its buckets
       with the Listed star ✹, and against the artist's ✺ — the same eight-armed
       silhouette, one notch apart — a HELD row read as an artist row. ON THE
       MARKET keeps ✹, which is what it means; HELD takes ✦, the canonical
       collect mark, which is what it means. No new glyph invented. */
    if (key === 'listed' && label && label.trim().toLowerCase() === 'held') return '✦︎';
    return key ? GROUP_GLYPH[key] ?? '' : '';
}

const ALL_GROUP_KEYS: GroupKey[] = [
    'none', 'artist', 'project', 'artistProject', 'artistColor', 'projectColor',
    'ownerColor', 'owner', 'color', 'lastSold', 'rarity',
    'listed', 'fate', 'temperature', 'light', 'mood', 'orientation',
    'moon', 'zodiac', 'weekday', 'faction', 'numerology', 'tag',
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
    if (fam === 'id' || fam === 'price' || fam === 'az' || fam === 'rarity') {
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
    /** Which ORDER #ID / $PRICE are running — their own, or by rarity. */
    rank: SortRank;
    /** Set sort family and reset dir/feedKind to family's default. */
    setSort: (s: SortKey) => void;
    /** Sim-faithful click handler — cycles direction within the family. */
    cycleSort: (s: SortKey) => void;
    /** Restore a full sort snapshot (used by Gallery View Presets). When
        `group` is given, the grouping dimension is restored too (a preset that
        was saved while grouped). Omit it to leave the current grouping alone. */
    applySort: (sort: SortKey, dir: SortDir, feedKind: FeedKind, group?: GroupKey) => void;
    /** Reset the gallery to the user's saved DEFAULT sort on project entry.
        Pass the project slug so the grouping restores to what the viewer last
        used ON THAT PROJECT (groupMemoryStore, Brendon 2026-07-12), falling
        back to the saved default grouping — an in-project grouping never
        carries into the next project (Brendon, 2026-06-20). */
    resetToDefault: (projectSlug?: string) => void;
    /** Restore the remembered grouping for a non-project surface (the
        Collected grid, keyed by profile address) — same memory contract. */
    restoreGroupFor: (scope: 'project' | 'profile', id: string) => void;
    /** Current group-by dimension for the gallery. */
    group: GroupKey;
    /** Advance the group dimension through the given surface's cycle order —
        the standalone group toggle's tap (Brendon, 2026-07-12). Returns the
        dimension it landed on so the caller can toast it. Never touches the
        saved default; pass `mem` to remember the pick for that page. */
    cycleGroup: (order: GroupKey[], mem?: { scope: 'project' | 'profile'; id: string }) => GroupKey;
    /** Layer 2 + 3 of the grouping — 'none' when that layer is off. */
    group2: GroupKey;
    group3: GroupKey;
    /** The active layers, holes removed: [] when grouping is off. */
    groupLayers: GroupKey[];
    /** Long-press menu — set one layer directly (layer 1 = the primary). */
    setGroupLayer: (layer: 1 | 2 | 3, key: GroupKey, mem?: { scope: 'project' | 'profile'; id: string }) => void;
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
    return v === 'id' || v === 'price' || v === 'feed' || v === 'fog' || v === 'az' || v === 'rarity';
}

export function SortProvider({ children }: { children: ReactNode }) {
    const [sort, setSortState] = useState<SortKey>('id');
    const [dir, setDir] = useState<SortDir>('asc');
    // Sim 8320 — feed entry point is feed-time-desc. Default kind = 'time'.
    const [feedKind, setFeedKind] = useState<FeedKind>('time');
    const [rank, setRank] = useState<SortRank>('natural');
    const [group, setGroupState] = useState<GroupKey>('none');
    /* THE SECOND + THIRD LAYERS (Brendon, 2026-07-26). `group` stays the
       primary — every saved default, share slug and per-project memory keeps
       working untouched — and these two ride on top. 'none' = that layer is
       off, so a plain single-dimension grouping is exactly what it always was.
       Set from the group toggle's long-press menu; a tap of the toggle cycles
       the primary and clears the sub-layers (a fresh cut, not a stale nest). */
    const [group2, setGroup2State] = useState<GroupKey>('none');
    const [group3, setGroup3State] = useState<GroupKey>('none');
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
                } else if (raw === 'id' || raw === 'price' || raw === 'az' || raw === 'rarity') {
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
        if (s === 'id' || s === 'price' || s === 'az' || s === 'rarity') {
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
        if (target !== 'id' && target !== 'price') setRank('natural');
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
        // id / price / az / rarity — all plain 2-step asc/desc toggles.
        if (sort === target) {
            // Already this family — flip direction (sim 8327).
            setDir(dir === 'asc' ? 'desc' : 'asc');
        } else {
            // Enter at asc (sim 8329). AZ persists like the rest now that it's
            // a Default Sort option (Brendon, 2026-07-12) — a project page
            // booting into a saved 'az' maps it to #ID in resetToDefault.
            setSortState(target);
            setRank('natural');
            setDir('asc');
            persistFamily(target);
        }
    }, [sort, dir, feedKind, rank]);

    const applySort = useCallback((s: SortKey, d: SortDir, fk: FeedKind, g?: GroupKey, rk: SortRank = 'natural') => {
        setSlugActive(true);
        setSortState(s);
        setDir(d);
        setFeedKind(fk);
        setRank(rk);
        if (g !== undefined) setGroupState(g);
    }, []);

    /* Reset to the user's saved DEFAULT sort family on project entry. The
       grouping restores to what the viewer last used ON THIS PROJECT (per-page
       memory, Brendon 2026-07-12 — "they find it like they left it"), falling
       back to the saved default grouping — an in-project grouping never bleeds
       into the next project (Brendon, 2026-06-20). */
    const resetToDefault = useCallback((projectSlug?: string) => {
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
        // enters a project as #ID (Collected/home keep the AZ boot). Rarity
        // is a standalone family now, but only the profile row wears the
        // button for it — same fallback.
        if (fam === 'az' || fam === 'rarity') fam = 'id';
        setSortState(fam);
        if (fam === 'feed') {
            setFeedKind('time');
            setDir('desc');
        } else {
            // id / price / fog — asc (dir is inert for fog).
            setDir('asc');
        }
        /* Project entry restores every layer it left with, not just the first. */
        const layers = (projectSlug ? getRememberedLayers('project', projectSlug) : []).filter(isGroupKey);
        setGroupState(layers[0] ?? defaultGroup);
        setGroup2State(layers[1] ?? 'none');
        setGroup3State(layers[2] ?? 'none');
        // Fresh Project = the no-slug default.
        setSlugActive(false);
        clearUrlSlug();
    }, [defaultGroup]);

    /* Restore the remembered grouping for a surface (Collected grid keyed by
       profile address; project grids go through resetToDefault above). */
    const restoreGroupFor = useCallback((scope: 'project' | 'profile', id: string) => {
        /* ⛔ THE WHOLE STACK COMES BACK, NOT JUST THE FIRST LAYER (Brendon,
           2026-08-02). Layers 2 and 3 were never saved and never restored, so a
           two- or three-deep grouping collapsed to one the moment you navigated
           away and came back. */
        const layers = getRememberedLayers(scope, id).filter(isGroupKey);
        if (layers.length === 0) {
            setGroupState(defaultGroup);
            setGroup2State('none');
            setGroup3State('none');
            return;
        }
        setGroupState(layers[0] ?? defaultGroup);
        setGroup2State(layers[1] ?? 'none');
        setGroup3State(layers[2] ?? 'none');
    }, [defaultGroup]);

    /* The standalone group toggle's tap — advances the dimension through this
       surface's cycle, independent of the active sort. Returns where it landed
       so the caller can toast it (React state is async). Never touches the
       saved DEFAULT (settings pill below); when `mem` is given the landing
       dimension is remembered for that page (groupMemoryStore), so the viewer
       finds the surface exactly as they left it (Brendon, 2026-07-12). */
    const cycleGroup = useCallback((order: GroupKey[], mem?: { scope: 'project' | 'profile'; id: string }) => {
        setSlugActive(true);
        // If the current dimension isn't in this surface's cycle, restart from none.
        const cur = order.includes(group) ? group : 'none';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        setGroupState(next);
        /* A tap is a FRESH cut — it never leaves a stale second/third layer
           nested under a dimension the user didn't pick them for. */
        setGroup2State('none');
        setGroup3State('none');
        if (mem) rememberGroup(mem.scope, mem.id, next);
        return next;
    }, [group]);

    /* Long-press menu — set one layer directly. Layer 1 doubles as the primary,
       so it drives everything the tap cycle already drives. Clearing a layer
       collapses the ones under it: a grouping can never have a hole in it
       (layer 3 with no layer 2 is not a hierarchy). */
    const setGroupLayer = useCallback((
        layer: 1 | 2 | 3, key: GroupKey,
        /* The surface this pick belongs to. Given, the whole stack is saved to
           the account so the page comes back exactly as it was left. */
        mem?: { scope: 'project' | 'profile'; id: string },
    ) => {
        setSlugActive(true);
        let next: [GroupKey, GroupKey, GroupKey];
        if (layer === 1) {
            next = key === 'none' ? ['none', 'none', 'none'] : [key, group2, group3];
        } else if (layer === 2) {
            next = key === 'none' ? [group, 'none', 'none'] : [group, key, group3];
        } else {
            next = [group, group2, key];
        }
        setGroupState(next[0]);
        setGroup2State(next[1]);
        setGroup3State(next[2]);
        if (mem) rememberLayers(mem.scope, mem.id, next);
    }, [group, group2, group3]);

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

    /* The layers as one ordered list, holes removed — what the galleries read.
       Empty = no grouping at all. */
    const groupLayers = useMemo<GroupKey[]>(
        () => [group, group2, group3].filter((g) => g && g !== 'none'),
        [group, group2, group3],
    );

    const value = useMemo<SortContextValue>(
        () => ({ sort, dir, feedKind, rank, setSort, cycleSort, applySort, resetToDefault, restoreGroupFor, group, group2, group3, groupLayers, setGroupLayer, cycleGroup, defaultGroup, cycleDefaultGroup }),
        [sort, dir, feedKind, rank, setSort, cycleSort, applySort, resetToDefault, restoreGroupFor, group, group2, group3, groupLayers, setGroupLayer, cycleGroup, defaultGroup, cycleDefaultGroup]
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
