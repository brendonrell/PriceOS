'use client';

/*
 * useMoreControls — the +More sub-nav's search / multi-select / presets /
 * sort / grouping state machine (shared by Starred · Wishlist · History).
 * Split out of ProfilePageBody 2026-07-06 — pure move, no behavior change.
 */

import { useEffect, useRef, useState } from 'react';
import type { StarredPresetState } from '../../lib/pins/starredPresetStore';
import type { ProfileMoreL1 } from './profilePageShared';

export type MoreSortKey = 'recent' | 'id' | 'project' | 'price' | 'followers';
export type MoreMode = 'all' | 'artists' | 'collectors' | 'outputs' | 'traits' | 'soundtracks' | 'projects'
    | 'tx' | 'followers' | 'following' | 'mutuals';

/* Which sorts + groupings make sense for each Starred filter (and Wishlist).
   Groupings reuse the gallery's dimensions (color = outputs only, etc.) and
   are cycled by the standalone GROUP toggle leading the sort row (Brendon,
   2026-07-12 — grouping no longer rides inside a sort button's cycle). */
export const MORE_CFG: Record<string, { sorts: MoreSortKey[]; groups: string[] }> = {
    all:         { sorts: ['recent'],                     groups: ['none'] },
    outputs:     { sorts: ['recent', 'price', 'project'], groups: ['none', 'color', 'project', 'artist'] },
    traits:      { sorts: ['recent', 'price', 'project'], groups: ['none', 'project', 'artist'] },
    projects:    { sorts: ['recent', 'price', 'project'], groups: ['none', 'artist'] },
    artists:     { sorts: ['recent', 'price', 'followers', 'project'], groups: ['none', 'color'] },
    collectors:  { sorts: ['recent', 'price', 'followers', 'project'], groups: ['none', 'color'] },
    soundtracks: { sorts: ['recent', 'price', 'project'], groups: ['none', 'artist', 'project'] },
    wishlist:    { sorts: ['recent', 'price', 'id', 'project'], groups: ['none'] },
};

export const MORE_SORT_LABEL: Record<MoreSortKey, string> = { recent: 'Recent', id: '#ID', project: 'AZ', price: '$PRICE', followers: 'FLWRS' };
export const MORE_GROUP_NAME: Record<string, string> = { color: 'Color', project: 'Project', artist: 'Artist', type: 'Type' };
/* Canonical grouping glyphs (docs/GLYPHS.md) — worn by the standalone GROUP
   toggle, same vocabulary as the gallery. */
export const MORE_GROUP_GLYPH: Record<string, string> = { none: '', color: '◉︎', project: '⬚︎', artist: '✺︎' };

/* Remember the user's chosen sort per +More surface, locally — default to
   Recent (newest-first) when nothing's saved (Brendon, 2026-06-22). */
const MORE_SORT_LS = 'pd_more_sort';

export function useMoreControls(
    moreL1: ProfileMoreL1,
    showToast: (msg: string) => void,
) {
    /* +More search — lifted here so the ⌕ icon lives in the +More sub-nav row
       beside the Info pill (where Collected's search lives) and drives WHICHEVER
       +More sub-tab is open (the sub-tabs behave like real tabs). Resets when
       you switch sub-tab. The bar + filtering live in the open sub-tab's list. */
    const [moreSearchOpen, setMoreSearchOpen] = useState(false);
    const [moreQuery, setMoreQuery] = useState('');
    const toggleMoreSearch = () => setMoreSearchOpen((v) => { if (v) setMoreQuery(''); return !v; });
    const closeMoreSearch = () => { setMoreQuery(''); setMoreSearchOpen(false); };
    /* +More multi-select — same idea as Collected's ❐. Lives beside the search
       icon and drives the open sub-tab's row selection. */
    const [moreMultiActive, setMoreMultiActive] = useState(false);
    const [morePresetActive, setMorePresetActive] = useState(false);
    /* +More sort — Recent / AZ. Lives in the sub-nav sort-bar beside the colorway
       picker. Grouping is the standalone GROUP toggle leading the row (Brendon,
       2026-07-12 — pulled out of the AZ button's cycle). Wishlist keeps its own
       #ID sort. */
    const [moreMode, setMoreMode] = useState<MoreMode>('all');
    const [moreSort, setMoreSort] = useState<MoreSortKey>('recent');
    const [moreSortDir, setMoreSortDir] = useState<'asc' | 'desc'>('asc');
    const [moreGroup, setMoreGroup] = useState<string>('none');

    const readMoreSortStore = (): Record<string, { sort: string; dir: string; group: string }> => {
        try { return JSON.parse(localStorage.getItem(MORE_SORT_LS) || '{}') || {}; } catch { return {}; }
    };
    const restoreMoreSort = () => {
        const cfgKey = moreL1 === 'wishlists' ? 'wishlist' : moreMode;
        const allowed = (MORE_CFG[cfgKey]?.sorts ?? ['recent']) as string[];
        const saved = readMoreSortStore()[`${moreL1}:${moreMode}`];
        if (saved && allowed.includes(saved.sort)) {
            setMoreSort(saved.sort as MoreSortKey);
            setMoreSortDir(saved.dir === 'desc' ? 'desc' : 'asc');
            setMoreGroup(saved.group || 'none');
        } else {
            setMoreSort('recent'); setMoreSortDir('asc'); setMoreGroup('none');
        }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { setMoreSearchOpen(false); setMoreQuery(''); setMoreMultiActive(false); setMorePresetActive(false); restoreMoreSort(); }, [moreL1]);
    /* Reset sort + grouping when the active filter pill changes so a grouping
       never carries into a filter it can't apply — UNLESS we're applying a
       Starred Preset (which sets mode + sort + group together). */
    const applyingPreset = useRef(false);
    useEffect(() => {
        if (applyingPreset.current) { applyingPreset.current = false; return; }
        setMoreSort('recent'); setMoreSortDir('asc'); setMoreGroup('none');
    }, [moreMode]);
    const applyStarredPreset = (s: StarredPresetState) => {
        if (s.mode !== moreMode) applyingPreset.current = true;
        setMoreMode(s.mode as MoreMode);
        setMoreSort(s.sort as MoreSortKey);
        setMoreSortDir(s.dir);
        setMoreGroup(s.group);
        setMoreQuery(s.query);
        if (s.query) setMoreSearchOpen(true);
    };
    /* Tap an inactive sort → enter ascending. Tap the active sort → flip
       direction. Grouping is independent now (the GROUP toggle), so a sort tap
       never touches it (Brendon, 2026-07-12). */
    const cycleMoreSort = (key: MoreSortKey) => {
        if (moreSort !== key) {
            setMoreSort(key); setMoreSortDir('asc');
            showToast('SORT: ' + MORE_SORT_LABEL[key] + ' ↑');
            return;
        }
        const nd = moreSortDir === 'asc' ? 'desc' : 'asc';
        setMoreSortDir(nd);
        showToast('SORT: ' + MORE_SORT_LABEL[key] + (nd === 'asc' ? ' ↑' : ' ↓'));
    };

    /* The GROUP toggle's tap — advance through the surface's grouping options
       (the caller passes the active MORE_CFG entry's groups). */
    const cycleMoreGroup = (groups: string[]) => {
        const cur = groups.includes(moreGroup) ? moreGroup : 'none';
        const next = groups[(groups.indexOf(cur) + 1) % groups.length];
        setMoreGroup(next);
        showToast(next === 'none' ? 'GROUP: OFF' : 'GROUP: ' + (MORE_GROUP_NAME[next] ?? next).toUpperCase());
    };

    return {
        moreSearchOpen, moreQuery, setMoreQuery, toggleMoreSearch, closeMoreSearch,
        moreMultiActive, setMoreMultiActive,
        morePresetActive, setMorePresetActive,
        moreMode, setMoreMode,
        moreSort, moreSortDir, moreGroup,
        applyStarredPreset, cycleMoreSort, cycleMoreGroup,
    };
}
