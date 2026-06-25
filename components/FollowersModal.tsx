'use client';

/*
 * FollowersModal → FOLLOWERS MANAGER (Brendon, 2026-06-25). Rebuilt on the
 * Sticker Manager's exact shell — a floating popup (COMPACT) that expands to a
 * full jumbo panel (PLUS) via the ↑, same as stickers. "The same thing, but for
 * your circle."
 *
 * Every row is a browsable, comparable card:
 *   - People (Followers / Following / Mutuals): the sprite+@name chip, your
 *     relationship to them, an artist ✺ badge, and the SAME three profile stats
 *     inline — ⬚ collected · ⟠ spent · ⚬ followers — sortable by any of them.
 *   - Projects: the project's sprite+@name (PriceSprite, like users), its ✺
 *     creator, ⬚ minted/supply, and ⟁ how many of your mutuals collect it
 *     (reusing the Cartel count).
 *   - A ★ on every row stars that follower (followerStarStore) — the same star
 *     the Artists list uses; sort to "Starred" to see just them.
 *
 * Data: the live follow graph (/api/follows), followed projects
 * (/api/project-follows), and the batch row stats (/api/social/circle-stats).
 * Opens via useModal('followers'); the default tab arrives in the payload.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import CollectedPair from './hero/CollectedPair';
import SpriteFace from './SpriteFace';
import { projectSpriteFace } from '../lib/project/projectSprite';
import { useCartelMutualCount } from '../lib/social/cartel';
import { fmtFollowers } from '../lib/social/useArtistSocial';
import type { CircleStat } from '../app/api/social/circle-stats/route';
import { getArtistStars, toggleArtistStar, subscribeArtistStars } from '../lib/pins/artistStarStore';
import { getProjectStars, toggleProjectStar, subscribeProjectStars } from '../lib/pins/projectStarStore';

const VS15 = '︎';

type FollowersTab = 'followers' | 'following' | 'mutuals' | 'projects';
type SortKey = 'default' | 'followers' | 'collected' | 'spent';

const TABS: { key: FollowersTab; label: string; icon: string }[] = [
    { key: 'followers', label: 'FOLLOWERS', icon: '⚬' },
    { key: 'following', label: 'FOLLOWING', icon: '⚯' },
    { key: 'mutuals', label: 'MUTUALS', icon: '⚭' },
    { key: 'projects', label: 'PROJECTS', icon: '⬚' },
];

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'default', label: 'A–Z' },
    { key: 'followers', label: 'Followers' },
    { key: 'collected', label: 'NFTs' },
    { key: 'spent', label: 'Spent' },
];

const EMPTY_LINE: Record<FollowersTab, string> = {
    followers: 'No followers yet.',
    following: 'Not following anyone yet.',
    mutuals: 'No mutuals yet.',
    projects: 'Nothing here yet.',
};

interface Graph { followers: string[]; following: string[]; mutuals: string[]; }
const EMPTY_GRAPH: Graph = { followers: [], following: [], mutuals: [] };

interface FollowedProjectRow {
    project_id: string;
    handle: string | null;
    title: string;
    held: boolean;
    artist: string | null;
    minted: number;
    supply: number;
}

function isTab(v: unknown): v is FollowersTab {
    return v === 'followers' || v === 'following' || v === 'mutuals' || v === 'projects';
}
const lc = (s: string) => s.toLowerCase().replace(/^@/, '');

export default function FollowersModal() {
    const { openModal, close, open } = useModal();
    const { siweAddress } = useAuth();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'followers';

    const [tab, setTab] = useState<FollowersTab>('followers');
    const [sort, setSort] = useState<SortKey>('default');
    const [graph, setGraph] = useState<Graph>(EMPTY_GRAPH);
    const [projects, setProjects] = useState<FollowedProjectRow[]>([]);
    const [statByAddr, setStatByAddr] = useState<Record<string, CircleStat>>({});
    const [handleToAddr, setHandleToAddr] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [full, setFull] = useState(false);

    /* Stars — the SAME DB-backed sets the Artists list + project pages use, so a
       star here shows everywhere (people → the shared collector/artist star set;
       projects → the project star set). Starred rows pin to the top, alphabetised. */
    const [starredPeople, setStarredPeople] = useState<Set<string>>(() => new Set(getArtistStars().map(lc)));
    const [starredProjects, setStarredProjects] = useState<Set<string>>(() => new Set(getProjectStars().map((s) => s.toLowerCase())));
    useEffect(() => subscribeArtistStars((names) => setStarredPeople(new Set(names.map(lc)))), []);
    useEffect(() => subscribeProjectStars((slugs) => setStarredProjects(new Set(slugs.map((s) => s.toLowerCase())))), []);
    const onStarPerson = useCallback((handle: string) => {
        const r = toggleArtistStar(`@${lc(handle)}`);
        showToast(`Starred: ${r === 'starred' ? 'ADDED' : 'REMOVED'}`);
    }, [showToast]);
    const onStarProject = useCallback((slug: string) => {
        const r = toggleProjectStar(slug);
        showToast(`Starred: ${r === 'starred' ? 'ADDED' : 'REMOVED'}`);
    }, [showToast]);

    /* Sync tab from payload on each open; reset to compact + default sort. */
    useEffect(() => {
        if (!isOpen) { setFull(false); return; }
        const payload = openModal?.payload;
        setTab(isTab(payload) ? payload : 'followers');
        setSort('default');
    }, [isOpen, openModal]);

    /* Freeze the page underneath while open (matches the Sticker Manager). */
    useEffect(() => {
        if (!isOpen) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen]);

    /* Esc: step out of PLUS first, then close. */
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (full) setFull(false); else close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, full, close]);

    /* Live graph + projects + row stats — on open and on any follow change. */
    useEffect(() => {
        if (!isOpen) return;
        if (!siweAddress) { setGraph(EMPTY_GRAPH); setProjects([]); setStatByAddr({}); setHandleToAddr({}); return; }
        let alive = true;
        const load = async () => {
            setLoading(true);
            try {
                const [followRes, projRes] = await Promise.all([
                    fetch(`/api/follows/${siweAddress}`, { cache: 'no-store' }),
                    fetch(`/api/project-follows?follower=${siweAddress}`, { cache: 'no-store' }),
                ]);
                const j = await followRes.json().catch(() => ({}));
                const p = await projRes.json().catch(() => ({}));
                if (!alive) return;

                const followerHandles: string[] = Array.isArray(j?.follower_handles) ? j.follower_handles : [];
                const followingHandles: string[] = Array.isArray(j?.following_handles) ? j.following_handles : [];
                const followerAddrs: string[] = Array.isArray(j?.followers) ? j.followers : [];
                const followingAddrs: string[] = Array.isArray(j?.following) ? j.following : [];
                const fset = new Set(followerHandles.map(lc));
                setGraph({
                    followers: followerHandles,
                    following: followingHandles,
                    mutuals: followingHandles.filter((h) => fset.has(lc(h))),
                });
                setProjects(Array.isArray(p?.projects) ? p.projects : []);

                // Map @handle → address (parallel arrays from /api/follows).
                const h2a: Record<string, string> = {};
                followerHandles.forEach((h, i) => { if (followerAddrs[i]) h2a[lc(h)] = followerAddrs[i].toLowerCase(); });
                followingHandles.forEach((h, i) => { if (followingAddrs[i]) h2a[lc(h)] = followingAddrs[i].toLowerCase(); });
                setHandleToAddr(h2a);

                // Batch the inline row stats for everyone in the circle.
                const addrs = Array.from(new Set([...followerAddrs, ...followingAddrs].map((a) => a.toLowerCase())));
                if (addrs.length) {
                    const sRes = await fetch(`/api/social/circle-stats?addresses=${addrs.join(',')}`, { cache: 'no-store' });
                    const sJson = await sRes.json().catch(() => ({}));
                    if (alive && sJson?.stats) setStatByAddr(sJson.stats as Record<string, CircleStat>);
                }
            } catch {
                if (alive) { setGraph(EMPTY_GRAPH); setProjects([]); setStatByAddr({}); }
            } finally {
                if (alive) setLoading(false);
            }
        };
        void load();
        const onChange = () => void load();
        window.addEventListener('pd:follows-changed', onChange);
        window.addEventListener('pd:project-follows-changed', onChange);
        return () => {
            alive = false;
            window.removeEventListener('pd:follows-changed', onChange);
            window.removeEventListener('pd:project-follows-changed', onChange);
        };
    }, [isOpen, siweAddress]);

    const counts: Record<FollowersTab, number> = {
        followers: graph.followers.length,
        following: graph.following.length,
        mutuals: graph.mutuals.length,
        projects: projects.length,
    };

    const statOf = useCallback((handle: string): CircleStat | undefined => {
        const addr = handleToAddr[lc(handle)];
        return addr ? statByAddr[addr] : undefined;
    }, [handleToAddr, statByAddr]);

    const followerSet = useMemo(() => new Set(graph.followers.map(lc)), [graph.followers]);
    const followingSet = useMemo(() => new Set(graph.following.map(lc)), [graph.following]);
    const relTag = useCallback((handle: string): string | null => {
        const k = lc(handle);
        const f = followerSet.has(k), g = followingSet.has(k);
        if (f && g) return 'MUTUAL';
        if (f) return 'FOLLOWS YOU';
        if (g) return 'FOLLOWING';
        return null;
    }, [followerSet, followingSet]);

    /* The ordered people rows for the active tab. Starred pin to the top
       (alphabetised); the rest follow the chosen sort (A–Z by default). */
    const peopleRows = useMemo(() => {
        if (tab === 'projects') return [];
        const all = graph[tab];
        const alpha = (a: string, b: string) => lc(a).localeCompare(lc(b));
        const v = (h: string, key: 'followers' | 'collected' | 'spentEth') => statOf(h)?.[key] ?? 0;
        const sortRest = (arr: string[]) => {
            if (sort === 'followers') return arr.sort((a, b) => v(b, 'followers') - v(a, 'followers'));
            if (sort === 'collected') return arr.sort((a, b) => v(b, 'collected') - v(a, 'collected'));
            if (sort === 'spent') return arr.sort((a, b) => v(b, 'spentEth') - v(a, 'spentEth'));
            return arr.sort(alpha);
        };
        const pinned = all.filter((h) => starredPeople.has(lc(h))).sort(alpha);
        const rest = sortRest(all.filter((h) => !starredPeople.has(lc(h))));
        return [...pinned, ...rest];
    }, [tab, graph, sort, statOf, starredPeople]);

    /* Projects, starred pinned to the top (alphabetised), then by title. */
    const projectRows = useMemo(() => {
        const key = (p: FollowedProjectRow) => (p.handle ?? p.title).toLowerCase();
        const pinned = projects.filter((p) => starredProjects.has(p.project_id.toLowerCase())).sort((a, b) => key(a).localeCompare(key(b)));
        const rest = projects.filter((p) => !starredProjects.has(p.project_id.toLowerCase()));
        return [...pinned, ...rest];
    }, [projects, starredProjects]);

    const isEmpty = tab === 'projects' ? projectRows.length === 0 : peopleRows.length === 0;

    const body = (
        <>
            <div className="fm-tabs" role="tablist" aria-label="Circle">
                {TABS.map((t) => (
                    <div
                        key={t.key}
                        id={`fmTab-${t.key}`}
                        className={`pill pill-l2${tab === t.key ? ' active' : ''}`}
                        role="tab"
                        aria-selected={tab === t.key}
                        tabIndex={0}
                        onClick={() => setTab(t.key)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTab(t.key); } }}
                        style={{ cursor: 'pointer' }}
                    >
                        <span className="fm-icon">{t.icon}{VS15}</span>{' '}{t.label}
                        <span className="fm-count">{counts[t.key]}</span>
                    </div>
                ))}
            </div>

            {tab !== 'projects' && (
                <div className="fm-sort" role="group" aria-label="Sort">
                    <span className="fm-sort-label">SORT</span>
                    {SORTS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            className={`ambient-chip fm-sort-chip${sort === s.key ? ' on' : ''}`}
                            onClick={() => setSort(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
            )}

            <div className="fm-list">
                {loading && isEmpty ? (
                    <div className="fm-empty fm-loading">Loading…</div>
                ) : isEmpty ? (
                    <div className="fm-empty">
                        {!siweAddress ? 'Sign in to see your circle.' : EMPTY_LINE[tab]}
                    </div>
                ) : tab === 'projects' ? (
                    projectRows.map((proj) => (
                        <ProjectRow
                            key={proj.project_id}
                            proj={proj}
                            enabled={isOpen}
                            starred={starredProjects.has(proj.project_id.toLowerCase())}
                            onStar={onStarProject}
                        />
                    ))
                ) : (
                    peopleRows.map((handle) => (
                        <PersonRow
                            key={handle}
                            handle={handle}
                            stat={statOf(handle)}
                            tag={relTag(handle)}
                            starred={starredPeople.has(lc(handle))}
                            onStar={onStarPerson}
                        />
                    ))
                )}
            </div>
        </>
    );

    if (!isOpen || typeof document === 'undefined') return null;

    const title = (words: string) => (
        <span className="ambient-pop-title-text">
            <span className="smgr-title-ic">{`⚬${VS15}`}</span>{' '}<span className="smgr-title-words">{words}</span>
        </span>
    );

    // ── FOLLOWERS MANAGER+ — full jumbo panel (matches Sticker Manager Plus) ──
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" role="dialog" aria-modal="true" aria-label="Followers Manager" onClick={close}>
                <div className="sticker-mgr-plus followers-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        {title('FOLLOWERS MANAGER+')}
                        <button className="smgr-store" type="button" onClick={() => { close(); open('stickers'); }} title="Sticker Store">
                            <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKERS
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Followers Manager: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>
                    <div className="followers-plus-body">
                        {body}
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    // ── FOLLOWERS MANAGER — compact floating popup ──
    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Followers Manager" onClick={close}>
            <div className="ambient-pop followers-pop" role="dialog" aria-label="Followers Manager" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    {title('FOLLOWERS MANAGER')}
                    <button className="smgr-store" type="button" onClick={() => { close(); open('stickers'); }} title="Sticker Store">
                        <span className="smgr-store-ic">{`▶${VS15}`}</span> STICKERS
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Followers Manager: PLUS'); }} title="Open Manager Plus" aria-label="Open Manager Plus">
                        {`↑${VS15}`}
                    </button>
                </div>
                <div className="followers-pop-body">
                    {body}
                </div>
            </div>
        </div>,
        document.body,
    );
}

/* One person row — sprite+@name, relationship, artist badge, the three profile
   stats inline, and the ★ star. */
function PersonRow({
    handle, stat, tag, starred, onStar,
}: {
    handle: string; stat: CircleStat | undefined; tag: string | null; starred: boolean; onStar: (h: string) => void;
}) {
    return (
        <div className="fm-row">
            <button
                type="button"
                className={`fm-star${starred ? ' on' : ''}`}
                onClick={() => onStar(handle)}
                title={starred ? 'Unstar' : 'Star this follower'}
                aria-pressed={starred}
            >
                {starred ? `★${VS15}` : `☆${VS15}`}
            </button>
            <div className="fm-row-main">
                <div className="fm-row-id">
                    <CollectedPair handle={handle} />
                    {stat?.isArtist && <span className="fm-artist-badge" title="Artist">{`✺${VS15}`}</span>}
                </div>
                <div className="fm-row-stats">
                    {tag && <span className="fm-tag">{tag}</span>}
                    <span className="fm-stat" title="Outputs Collected">
                        <span className="fm-stat-ic">{`⬚${VS15}`}</span><b>{stat ? stat.collected : '—'}</b>
                    </span>
                    <span className="fm-stat" title="Volume Spent">
                        <span className="fm-stat-ic">{`⟠${VS15}`}</span><b>{stat ? stat.spentEth.toFixed(2) : '—'}</b>
                    </span>
                    <span className="fm-stat" title="Followers">
                        <span className="fm-stat-ic">{`⚬${VS15}`}</span><b>{stat ? fmtFollowers(stat.followers) : '—'}</b>
                    </span>
                </div>
            </div>
        </div>
    );
}

/* One project row — the project's PriceSprite+@name, its creator, mint count,
   and how many of your mutuals collect it (Cartel ⟁). */
function ProjectRow({ proj, enabled, starred, onStar }: { proj: FollowedProjectRow; enabled: boolean; starred: boolean; onStar: (slug: string) => void }) {
    const cartel = useCartelMutualCount(proj.project_id, enabled);
    const face = projectSpriteFace(proj.project_id);
    const h = proj.handle ?? proj.project_id;
    return (
        <div className="fm-row">
            <button
                type="button"
                className={`fm-star${starred ? ' on' : ''}`}
                onClick={() => onStar(proj.project_id)}
                title={starred ? 'Unstar' : 'Star this project'}
                aria-pressed={starred}
            >
                {starred ? `★${VS15}` : `☆${VS15}`}
            </button>
            <div className="fm-row-main">
                <div className="fm-row-id">
                    <span className="collected-pair">
                        {face && <SpriteFace className="collected-sprite" face={face} />}
                        <a className="profile-link" href={`/art/${h}`}>@{h}</a>
                    </span>
                </div>
                <div className="fm-row-stats">
                    <span className="fm-tag">{proj.held ? 'FOLLOWS YOU' : 'FOLLOWING'}</span>
                    {proj.artist && (
                        <span className="fm-stat" title="Creator">
                            <span className="fm-stat-ic">{`✺${VS15}`}</span><b>@{proj.artist}</b>
                        </span>
                    )}
                    <span className="fm-stat" title="Minted">
                        <span className="fm-stat-ic">{`⬚${VS15}`}</span><b>{proj.minted}{proj.supply ? `/${proj.supply}` : ''}</b>
                    </span>
                    <span className="fm-stat" title="Mutuals who collect">
                        <span className="fm-stat-ic">{`⟁${VS15}`}</span><b>{cartel}</b>
                    </span>
                </div>
            </div>
        </div>
    );
}
