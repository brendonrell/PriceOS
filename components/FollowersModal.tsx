'use client';

/*
 * FRIEND INSPECTOR — interior rebuilt 2026-07-06 from
 * docs/briefs/friend-inspector-rebuild.md, re-cut same day to Brendon's
 * corrections: ROWS, not cards; PriceSprites at the app's normal chip size;
 * every piece built from PD's OWN UI vocabulary (Rule #0) — the dossier is
 * a FUNCTION, not a look.
 *
 * CHROME UNTOUCHED: the compact ambient-pop popup + jumbo sticker-mgr-plus
 * expansion via ↑, the four tabs, open/close — all the 2026-06-25 shell.
 *
 * The interior:
 *   THE LEDGER — one dense row per friend in both altitudes: ★ ·
 *     sprite+@name chip (CollectedPair, the app's identity unit) · ✺ ·
 *     relationship glyph · the three stats in FIXED ALIGNED COLUMNS
 *     (⬚ collected · ⟠ spent · ⚬ followers) so the list reads like a
 *     terminal ledger.
 *   THE DUEL — tap a row and it unfolds in place: YOU vs THEM as real
 *     Attributes tiles (attr-tile / attr-spectrum — the +More vocabulary),
 *     each stat a tile with a split duel bar that fills on open and a
 *     "YOU LEAD / @them LEADS" verdict line. Follow/unfollow lives here.
 *     Shared-⟁ holdings + their full collection render as real
 *     sprite+@name project chips linking to the art.
 *
 * RIVALRY SOCKETS (designed now, features later — render NOTHING while
 * empty): per-dossier badge row (Argue scars — ClickUp 86b9eretz), a
 * relationship-line slot (Understudy/Counterweight 86b9fcnnc · PriceTwin
 * 86b9fcngz), and one --fi-accent color channel per row (Sigil Faction
 * paint — 86baf786c).
 *
 * Data (all live, no new endpoints): /api/follows graph,
 * /api/social/circle-stats (self included for the duel),
 * /api/user/{addr}/owned-projects for the shared-⟁ intersection,
 * /api/user/by-handle/{h} for PriceScore, /api/project-follows,
 * cartel counts, the shared artist/project star stores.
 */

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import CollectedPair from './hero/CollectedPair';
import { useSpiteMatcher } from '../lib/pins/spiteStore';
import SpriteFace from './SpriteFace';
import { projectSpriteFace } from '../lib/project/projectSprite';
import { useCartelMutualCount } from '../lib/social/cartel';
import { fmtFollowers } from '../lib/social/useArtistSocial';
import type { CircleStat } from '../app/api/social/circle-stats/route';
import { getArtistStars, toggleArtistStar, subscribeArtistStars } from '../lib/pins/artistStarStore';
import { getProjectStars, toggleProjectStar, subscribeProjectStars } from '../lib/pins/projectStarStore';
import { DISCORD_URL } from '../lib/config/discord';
import { PROFILE_LOGOS_BY_ID } from '../lib/profile/profileLogos';
import type { Sticker } from '../lib/stickers/catalog';
import { StickerArt } from './stickers/StickerArt';
import FriendInspectorPreview, { type PreviewPerson } from './FriendInspectorPreview';
import FriendSpritePopover from './FriendSpritePopover';

const VS15 = '︎';

type FollowersTab = 'followers' | 'following' | 'mutuals' | 'cartel' | 'projects';
type SortKey = 'default' | 'followers' | 'collected' | 'spent' | 'faction';

const TABS: { key: FollowersTab; label: string; icon: string }[] = [
    { key: 'followers', label: 'FOLLOWERS', icon: '⚬' },
    { key: 'following', label: 'FOLLOWING', icon: '⚯' },
    { key: 'mutuals', label: 'MUTUALS', icon: '⚭' },
    { key: 'cartel', label: 'CARTEL', icon: '⟁' },
    { key: 'projects', label: 'PROJECTS', icon: '⬚' },
];

const SORTS: { key: SortKey; label: string }[] = [
    { key: 'default', label: 'A–Z' },
    { key: 'followers', label: 'Followers' },
    { key: 'collected', label: 'NFTs' },
    { key: 'spent', label: 'Spent' },
    { key: 'faction', label: 'Factions' },
];

const EMPTY_LINE: Record<FollowersTab, string> = {
    followers: 'No followers yet.',
    following: 'Not following anyone yet.',
    mutuals: 'No mutuals yet.',
    cartel: 'No cartel yet — it forms when a mutual shares a holding with you.',
    projects: 'Nothing here yet.',
};

/* FACTION — a wearer's chosen BLANK speech bubble (bubble only, no per-mille;
   holo excluded) IS their faction, and its color is the faction color
   (Brendon 2026-07-06; Factions spec 86baf786c). */
function factionOf(profileLogo: string | null | undefined): Sticker | null {
    if (!profileLogo || !profileLogo.startsWith('plogo-blank-')) return null;
    return PROFILE_LOGOS_BY_ID.get(profileLogo) ?? null;
}

/* Relationship → its glyph (GLYPHS.md §12 social set). */
const REL_GLYPH: Record<string, string> = {
    MUTUAL: '⚭',
    'FOLLOWS YOU': '⚬',
    FOLLOWING: '⚯',
};

/* ── RIVALRY SOCKETS ──────────────────────────────────────────────────────
   Reserved per-friend slots the upcoming rivalry features plug into. All
   empty today, and empty slots render NOTHING (no placeholder cruft):
     badges  — badge row on the dossier (Argue scars & wins, 86b9eretz)
     relLine — a verdict line in the dossier head ("◈ following · 47 days
               behind" — Understudy/Counterweight 86b9fcnnc; PriceTwin
               marker 86b9fcngz)
     accent  — the one color channel per row, painted --fi-accent when
               Sigil Factions land (86baf786c). Unset = currentColor.     */
interface RivalrySlots {
    badges: string[];
    relLine: string | null;
    accent: string | null;
}
const EMPTY_SLOTS: RivalrySlots = { badges: [], relLine: null, accent: null };
function rivalrySlotsFor(_handle: string): RivalrySlots {
    return EMPTY_SLOTS;
}

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
    return v === 'followers' || v === 'following' || v === 'mutuals' || v === 'cartel' || v === 'projects';
}
const lc = (s: string) => s.toLowerCase().replace(/^@/, '');

export default function FollowersModal() {
    const { openModal, close } = useModal();
    const { siweAddress, handle: myHandle } = useAuth();
    const { showToast } = useToast();
    const isOpen = openModal?.name === 'followers';

    /* Whose circle we're showing. Opened from a profile, the inspector reflects
       THAT user's followers (Brendon, 2026-07-11 view-as); with no target it
       falls back to the signed-in user's own circle. The duel's YOU side always
       stays the signed-in viewer (mySlugs / myScore below). */
    const targetAddrLc = (
        ((openModal?.name === 'followers' ? openModal?.slug : null) || siweAddress || '')
    ).toLowerCase() || null;

    const [tab, setTabState] = useState<FollowersTab>('followers');
    const [sort, setSort] = useState<SortKey>('default');
    /* The dossier — one friend open at a time; resets on tab/open change. */
    const [inspected, setInspected] = useState<string | null>(null);
    const [mySlugs, setMySlugs] = useState<string[] | null>(null);
    const [myScore, setMyScore] = useState<number | null>(null);
    const [graph, setGraph] = useState<Graph>(EMPTY_GRAPH);
    const [projects, setProjects] = useState<FollowedProjectRow[]>([]);
    const [statByAddr, setStatByAddr] = useState<Record<string, CircleStat>>({});
    const [handleToAddr, setHandleToAddr] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [full, setFull] = useState(false);

    const setTab = useCallback((t: FollowersTab) => {
        setTabState(t);
        setInspected(null);
    }, []);

    /* Stars — the SAME DB-backed sets the Artists list + project pages use, so a
       star here shows everywhere. Starred pin to the top, alphabetised. */
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
        setTabState(isTab(payload) ? payload : 'followers');
        setSort('default');
        setInspected(null);
    }, [isOpen, openModal]);

    /* Your own holdings — fetched once per open; every dossier intersects
       against it for the shared-holdings (Cartel ⟁) read. */
    useEffect(() => {
        if (!isOpen || !siweAddress) { setMySlugs(null); return; }
        let alive = true;
        fetch(`/api/user/${siweAddress}/owned-projects`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (alive && Array.isArray(j?.slugs)) setMySlugs(j.slugs as string[]); })
            .catch(() => { /* dossiers show holdings only */ });
        return () => { alive = false; };
    }, [isOpen, siweAddress]);

    /* Your PriceScore — once per open, for the duel's ◍ tile. */
    useEffect(() => {
        if (!isOpen || !myHandle) { setMyScore(null); return; }
        let alive = true;
        fetch(`/api/user/by-handle/${lc(myHandle)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => { if (alive) setMyScore(typeof u?.price_score === 'number' ? u.price_score : 0); })
            .catch(() => { /* duel shows — for score */ });
        return () => { alive = false; };
    }, [isOpen, myHandle]);

    /* Freeze the page underneath ONLY in PLUS (full) mode. Compact is a small
       floating panel — the page stays scrollable behind it (Brendon, 2026-07-14). */
    useEffect(() => {
        if (!isOpen || !full) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen, full]);

    /* PLUS mode lets the Digital Familiar walk IN FRONT of the panel and
       talk (Brendon, 2026-07-06) — the body flag lifts the familiar layer
       above the jumbo backdrop while we're open. */
    useEffect(() => {
        if (!isOpen || !full) return;
        document.body.classList.add('fi-plus-open');
        return () => document.body.classList.remove('fi-plus-open');
    }, [isOpen, full]);

    /* THE CARTEL — shared-holdings count per mutual (their owned projects ∩
       yours; the same intersection every dossier shows). Powers the CARTEL
       tab + its permanent pill count. Launch-scale circles are small, so one
       read per mutual per open is cheap. */
    const [sharedBy, setSharedBy] = useState<Record<string, number> | null>(null);
    useEffect(() => {
        if (!isOpen) { setSharedBy(null); return; }
        if (!mySlugs || graph.mutuals.length === 0) { setSharedBy(graph.mutuals.length === 0 ? {} : null); return; }
        let alive = true;
        const mine = new Set(mySlugs.map((s) => s.toLowerCase()));
        Promise.all(graph.mutuals.map(async (h) => {
            const addr = handleToAddr[lc(h)];
            if (!addr) return [lc(h), 0] as const;
            try {
                const j = await fetch(`/api/user/${addr}/owned-projects`).then((r) => (r.ok ? r.json() : null));
                const slugs: string[] = Array.isArray(j?.slugs) ? j.slugs : [];
                return [lc(h), slugs.filter((s) => mine.has(s.toLowerCase())).length] as const;
            } catch {
                return [lc(h), 0] as const;
            }
        })).then((entries) => { if (alive) setSharedBy(Object.fromEntries(entries)); });
        return () => { alive = false; };
    }, [isOpen, mySlugs, graph.mutuals, handleToAddr]);
    const cartelHandles = useMemo(
        () => graph.mutuals.filter((h) => (sharedBy?.[lc(h)] ?? 0) > 0),
        [graph.mutuals, sharedBy],
    );

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

    /* Live graph + projects + row stats — on open and on any follow change.
       Your own address rides the stats batch so the duel's YOU side reads
       from the exact same numbers as everyone else's. */
    useEffect(() => {
        if (!isOpen) return;
        if (!targetAddrLc) { setGraph(EMPTY_GRAPH); setProjects([]); setStatByAddr({}); setHandleToAddr({}); return; }
        let alive = true;
        const load = async () => {
            setLoading(true);
            try {
                const [followRes, projRes] = await Promise.all([
                    fetch(`/api/follows/${targetAddrLc}`, { cache: 'no-store' }),
                    fetch(`/api/project-follows?follower=${targetAddrLc}`, { cache: 'no-store' }),
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

                // Batch the row stats for everyone in the circle — plus the
                // target and you (the duel's YOU side reads from the same batch).
                const addrs = Array.from(new Set(
                    [...followerAddrs, ...followingAddrs, targetAddrLc, siweAddress]
                        .filter(Boolean)
                        .map((a) => (a as string).toLowerCase()),
                ));
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
    }, [isOpen, targetAddrLc, siweAddress]);

    const counts: Record<FollowersTab, number> = {
        followers: graph.followers.length + projects.filter((p) => p.held).length,
        following: graph.following.length,
        mutuals: graph.mutuals.length,
        cartel: cartelHandles.length,
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

    /* Follow / unfollow from the dossier — the same /api/follows contract the
       profile FollowButton uses, same toasts, same refresh event. */
    const [followBusy, setFollowBusy] = useState(false);
    const toggleFollow = useCallback(async (handle: string) => {
        const target = handleToAddr[lc(handle)];
        if (!siweAddress || !target) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
        const isFollowing = followingSet.has(lc(handle));
        setFollowBusy(true);
        try {
            if (isFollowing) {
                const r = await fetch(`/api/follows?target=${target}`, { method: 'DELETE' });
                if (r.ok) {
                    showToast(`@${lc(handle)}: UNFOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else showToast('Unfollow: FAILED');
            } else {
                const r = await fetch('/api/follows', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ target }),
                });
                if (r.status === 201 || r.status === 200) {
                    showToast(`@${lc(handle)}: FOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else if (r.status === 204) showToast(`@${lc(handle)}: NO @NAME YET`);
                else showToast('Follow: FAILED');
            }
        } finally {
            setFollowBusy(false);
        }
    }, [siweAddress, handleToAddr, followingSet, showToast]);

    /* The ordered people rows for the active tab. Starred pin to the top
       (alphabetised); the rest follow the chosen sort (A–Z by default; the
       CARTEL tab defaults to most-shared-first; Factions filters to faction
       wearers, grouped by faction color). */
    const peopleRows = useMemo(() => {
        if (tab === 'projects') return [];
        let all = tab === 'cartel' ? cartelHandles : graph[tab];
        if (sort === 'faction') all = all.filter((h) => factionOf(statOf(h)?.profileLogo) !== null);
        const alpha = (a: string, b: string) => lc(a).localeCompare(lc(b));
        const v = (h: string, key: 'followers' | 'collected' | 'spentEth') => statOf(h)?.[key] ?? 0;
        const sortRest = (arr: string[]) => {
            if (sort === 'followers') return arr.sort((a, b) => v(b, 'followers') - v(a, 'followers'));
            if (sort === 'collected') return arr.sort((a, b) => v(b, 'collected') - v(a, 'collected'));
            if (sort === 'spent') return arr.sort((a, b) => v(b, 'spentEth') - v(a, 'spentEth'));
            if (sort === 'faction') {
                return arr.sort((a, b) => {
                    const fa = factionOf(statOf(a)?.profileLogo)?.color ?? '';
                    const fb = factionOf(statOf(b)?.profileLogo)?.color ?? '';
                    return fa === fb ? alpha(a, b) : fa.localeCompare(fb);
                });
            }
            if (tab === 'cartel') {
                return arr.sort((a, b) =>
                    (sharedBy?.[lc(b)] ?? 0) - (sharedBy?.[lc(a)] ?? 0) || alpha(a, b));
            }
            return arr.sort(alpha);
        };
        const pinned = all.filter((h) => starredPeople.has(lc(h))).sort(alpha);
        const rest = sortRest(all.filter((h) => !starredPeople.has(lc(h))));
        return [...pinned, ...rest];
    }, [tab, graph, sort, statOf, starredPeople, cartelHandles, sharedBy]);

    /* Projects, starred pinned to the top (alphabetised), then by title. */
    const projectRows = useMemo(() => {
        const key = (p: FollowedProjectRow) => (p.handle ?? p.title).toLowerCase();
        const pinned = projects.filter((p) => starredProjects.has(p.project_id.toLowerCase())).sort((a, b) => key(a).localeCompare(key(b)));
        const rest = projects.filter((p) => !starredProjects.has(p.project_id.toLowerCase()));
        return [...pinned, ...rest];
    }, [projects, starredProjects]);

    /* Projects that FOLLOW YOU (you hold a piece) — folded into the Followers
       tab beneath the people who follow you (Brendon, 2026-07-14). */
    const followerProjects = useMemo(() => projectRows.filter((p) => p.held), [projectRows]);

    const isEmpty = tab === 'projects'
        ? projectRows.length === 0
        : tab === 'followers'
            ? peopleRows.length === 0 && followerProjects.length === 0
            : peopleRows.length === 0;

    /* The whole circle, deduped, for the preview strip (Wire + Constellation). */
    const previewPeople = useMemo<PreviewPerson[]>(() => {
        const mutualSet = new Set(graph.mutuals.map(lc));
        const seen = new Set<string>();
        const out: PreviewPerson[] = [];
        for (const h of [...graph.mutuals, ...graph.followers, ...graph.following]) {
            const k = lc(h);
            if (seen.has(k)) continue;
            seen.add(k);
            out.push({
                handle: k,
                addr: handleToAddr[k] ?? null,
                stat: statOf(h),
                mutual: mutualSet.has(k),
                shared: sharedBy ? sharedBy[k] ?? 0 : null,
            });
        }
        return out;
    }, [graph, handleToAddr, statOf, sharedBy]);

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
                    <>
                        {peopleRows.map((handle) => (
                            <PersonRow
                                key={handle}
                                handle={handle}
                                stat={statOf(handle)}
                                tag={relTag(handle)}
                                shared={tab === 'cartel' ? sharedBy?.[lc(handle)] ?? 0 : null}
                                starred={starredPeople.has(lc(handle))}
                                onStar={onStarPerson}
                                inspected={inspected === lc(handle)}
                                onInspect={() => setInspected((cur) => (cur === lc(handle) ? null : lc(handle)))}
                                friendAddr={handleToAddr[lc(handle)] ?? null}
                                mySlugs={mySlugs}
                                myStat={siweAddress ? statByAddr[siweAddress.toLowerCase()] : undefined}
                                myScore={myScore}
                                following={followingSet.has(lc(handle))}
                                followBusy={followBusy}
                                onToggleFollow={() => void toggleFollow(handle)}
                            />
                        ))}
                        {/* Projects that follow you (you hold a piece) fold in below
                            the people who follow you (Brendon, 2026-07-14). */}
                        {tab === 'followers' && followerProjects.map((proj) => (
                            <ProjectRow
                                key={`fp:${proj.project_id}`}
                                proj={proj}
                                enabled={isOpen}
                                starred={starredProjects.has(proj.project_id.toLowerCase())}
                                onStar={onStarProject}
                            />
                        ))}
                    </>
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

    // ── FRIEND INSPECTOR+ — full jumbo panel (matches Sticker Manager Plus) ──
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" role="dialog" aria-modal="true" aria-label="Friend Inspector" onClick={close}>
                <div className="sticker-mgr-plus followers-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        {title('FRIEND INSPECTOR+')}
                        <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Go To Discord">
                            GO TO DISCORD
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Friend Inspector: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
                            {`↓${VS15}`}
                        </button>
                        <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                            {`×${VS15}`}
                        </span>
                    </div>
                    {/* The reserved preview slot, alive: the Circle Wire / the
                        Constellation (Brendon's pick, 2026-07-06). */}
                    <div className="followers-plus-preview">
                        <FriendInspectorPreview
                            people={previewPeople}
                            inspected={inspected}
                            onInspect={(h) => {
                                const t: FollowersTab = graph.mutuals.some((x) => lc(x) === h) ? 'mutuals'
                                    : graph.followers.some((x) => lc(x) === h) ? 'followers' : 'following';
                                setTabState(t);
                                setInspected(h);
                            }}
                            myStat={siweAddress ? statByAddr[siweAddress.toLowerCase()] : undefined}
                            myHandle={myHandle ? lc(myHandle) : null}
                        />
                    </div>
                    <div className="followers-plus-body">
                        {body}
                    </div>
                </div>
            </div>,
            document.body,
        );
    }

    // ── FRIEND INSPECTOR — compact floating popup ──
    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" role="dialog" aria-modal="true" aria-label="Friend Inspector" onClick={close}>
            <div className="ambient-pop followers-pop" role="dialog" aria-label="Friend Inspector" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    {title('FRIEND INSPECTOR')}
                    <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Go To Discord">
                        GO TO DISCORD
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Friend Inspector: PLUS'); }} title="Open Friend Inspector+" aria-label="Open Friend Inspector+">
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

/* ── THE LEDGER — one person row. The app's sprite+@name chip at its normal
   size, relationship glyph, and the three stats in fixed aligned columns.
   Tapping the row (not the chip link / star) unfolds THE DUEL beneath. ── */
function PersonRow({
    handle, stat, tag, shared, starred, onStar, inspected, onInspect, friendAddr, mySlugs,
    myStat, myScore, following, followBusy, onToggleFollow,
}: {
    handle: string; stat: CircleStat | undefined; tag: string | null; shared: number | null;
    starred: boolean; onStar: (h: string) => void; inspected: boolean; onInspect: () => void;
    friendAddr: string | null; mySlugs: string[] | null;
    myStat: CircleStat | undefined; myScore: number | null;
    following: boolean; followBusy: boolean; onToggleFollow: () => void;
}) {
    const slots = rivalrySlotsFor(lc(handle));
    /* Faction paint takes the reserved accent channel; explicit socket wins. */
    const faction = factionOf(stat?.profileLogo);
    const accent = slots.accent ?? faction?.color ?? null;
    /* Tapping the sprite pops a small PriceRank card anchored to it. */
    const [spriteAnchor, setSpriteAnchor] = useState<DOMRect | null>(null);
    return (
        <div
            className={`fi-row${inspected ? ' inspecting' : ''}${shared !== null ? ' has-shared' : ''}`}
            style={accent ? ({ '--fi-accent': accent } as CSSProperties) : undefined}
        >
            <div className="fi-line">
                <button
                    type="button"
                    className={`fm-star${starred ? ' on' : ''}`}
                    onClick={() => onStar(handle)}
                    title={starred ? 'Unstar' : 'Star this friend'}
                    aria-pressed={starred}
                >
                    {starred ? `★${VS15}` : `☆${VS15}`}
                </button>
                <div
                    className="fi-line-main"
                    role="button"
                    tabIndex={0}
                    title="Inspect"
                    onClick={(e) => { if ((e.target as HTMLElement).closest('a')) return; onInspect(); }}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInspect(); } }}
                >
                    <CollectedPair handle={handle} onSpriteTap={(rect) => setSpriteAnchor(rect)} />
                    {spriteAnchor && (
                        <FriendSpritePopover
                            handle={handle}
                            anchor={spriteAnchor}
                            stat={stat}
                            onClose={() => setSpriteAnchor(null)}
                        />
                    )}
                    {stat?.isArtist && <span className="fm-artist-badge" title="Artist">{`✺${VS15}`}</span>}
                    {faction && (
                        <span className="fi-faction" title={faction.name}>
                            <StickerArt sticker={faction} size={15} />
                        </span>
                    )}
                    {tag && <span className="fi-rel" title={tag}>{REL_GLYPH[tag]}{VS15}</span>}
                    <span className="fi-cols">
                        {shared !== null && (
                            <span className="fi-col fi-col-n" title="Shared holdings">
                                <span className="fm-stat-ic">{`⟁${VS15}`}</span>{shared}
                            </span>
                        )}
                        <span className="fi-col fi-col-n" title="Outputs Collected">
                            <span className="fm-stat-ic">{`⬚${VS15}`}</span>{stat ? stat.collected : '—'}
                        </span>
                        <span className="fi-col fi-col-eth" title="Volume Spent">
                            <span className="fm-stat-ic">{`⟠${VS15}`}</span>{stat ? stat.spentEth.toFixed(2) : '—'}
                        </span>
                        <span className="fi-col fi-col-n fi-col-flw" title="Followers">
                            <span className="fm-stat-ic">{`⚬${VS15}`}</span>{stat ? fmtFollowers(stat.followers) : '—'}
                        </span>
                    </span>
                </div>
            </div>
            {inspected && (
                <FriendDossier
                    handle={lc(handle)}
                    stat={stat}
                    tag={tag}
                    friendAddr={friendAddr}
                    mySlugs={mySlugs}
                    myStat={myStat}
                    myScore={myScore}
                    following={following}
                    followBusy={followBusy}
                    onToggleFollow={onToggleFollow}
                    slots={slots}
                />
            )}
        </div>
    );
}

/* A project rendered as the app's own sprite+@name chip, linking to the art.
   Used for the dossier's shared-⟁ beads and their-collection rows. */
function ProjectChip({ slug, faceId }: { slug: string; faceId?: string }) {
    const face = projectSpriteFace(faceId ?? slug);
    return (
        <span className="collected-pair">
            {face && <SpriteFace className="collected-sprite" face={face} />}
            <a className="profile-link" href={`/art/${slug}`} onClick={(e) => e.stopPropagation()}>
                @{slug}
            </a>
        </span>
    );
}

/* ── THE DUEL — what a tapped row unfolds into. Head-to-head YOU vs THEM
   rendered in the app's Attributes vocabulary: one attr-tile per stat with
   a split duel bar (attr-spectrum) that fills on open and a verdict line.
   All real numbers; follow/unfollow rides the same row. ── */
function FriendDossier({
    handle, stat, tag, friendAddr, mySlugs, myStat, myScore,
    following, followBusy, onToggleFollow, slots,
}: {
    handle: string; stat: CircleStat | undefined; tag: string | null;
    friendAddr: string | null; mySlugs: string[] | null;
    myStat: CircleStat | undefined; myScore: number | null;
    following: boolean; followBusy: boolean; onToggleFollow: () => void;
    slots: RivalrySlots;
}) {
    const [theirSlugs, setTheirSlugs] = useState<string[] | null>(null);
    const [theirScore, setTheirScore] = useState<number | null>(null);

    useEffect(() => {
        if (!friendAddr) { setTheirSlugs([]); return; }
        let alive = true;
        fetch(`/api/user/${friendAddr}/owned-projects`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j) => { if (alive) setTheirSlugs(Array.isArray(j?.slugs) ? (j.slugs as string[]) : []); })
            .catch(() => { if (alive) setTheirSlugs([]); });
        return () => { alive = false; };
    }, [friendAddr]);

    useEffect(() => {
        let alive = true;
        fetch(`/api/user/by-handle/${handle}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((u) => { if (alive) setTheirScore(typeof u?.price_score === 'number' ? u.price_score : 0); })
            .catch(() => { if (alive) setTheirScore(0); });
        return () => { alive = false; };
    }, [handle]);

    const mine = useMemo(() => new Set((mySlugs ?? []).map((s) => s.toLowerCase())), [mySlugs]);
    const shared = useMemo(
        () => (theirSlugs ?? []).filter((s) => mine.has(s.toLowerCase())),
        [theirSlugs, mine],
    );

    const beads = (slugs: string[]) => (
        <div className="fi-beads">
            {slugs.slice(0, 8).map((s) => <ProjectChip key={s} slug={s} />)}
            {slugs.length > 8 && <span className="fi-beads-more">+{slugs.length - 8}</span>}
        </div>
    );

    const faction = factionOf(stat?.profileLogo);

    return (
        <div className="fi-dossier" onClick={(e) => e.stopPropagation()}>
            <div className="fi-dossier-head">
                {tag && <span className="fm-tag">{REL_GLYPH[tag]}{VS15} {tag}</span>}
                {faction && (
                    <span className="fm-tag fi-faction-tag" title="Faction">
                        <StickerArt sticker={faction} size={12} /> {faction.name.replace('Bubble — ', '').toUpperCase()}
                    </span>
                )}
                {/* Relationship-line socket — Understudy/Counterweight (86b9fcnnc),
                    PriceTwin (86b9fcngz). Empty renders nothing. */}
                {slots.relLine && <span className="fm-tag">{slots.relLine}</span>}
                <button
                    type="button"
                    className={`ambient-chip fi-follow${following ? ' on' : ''}`}
                    onClick={onToggleFollow}
                    disabled={followBusy}
                    title={following ? `Unfollow @${handle}` : `Follow @${handle}`}
                >
                    {followBusy ? '…' : following ? 'FOLLOWING' : 'FOLLOW'}
                </button>
            </div>

            {/* Badge-row socket — Argue scars & wins (86b9eretz). */}
            {slots.badges.length > 0 && (
                <div className="fi-dossier-head">
                    {slots.badges.map((b, i) => <span key={i} className="fm-tag">{b}</span>)}
                </div>
            )}

            {/* Their side of every duel bar runs in THEIR profile colorway. */}
            <div className="attr-grid fi-duel">
                <DuelTile glyph="⬚" label="Collected" you={myStat ? myStat.collected : null} them={stat ? stat.collected : null} handle={handle} themHex={stat?.profileHex ?? null} />
                <DuelTile glyph="⟠" label="Spent" you={myStat ? myStat.spentEth : null} them={stat ? stat.spentEth : null} handle={handle} themHex={stat?.profileHex ?? null} eth />
                <DuelTile glyph="⚬" label="Followers" you={myStat ? myStat.followers : null} them={stat ? stat.followers : null} handle={handle} themHex={stat?.profileHex ?? null} />
                <DuelTile glyph="◍" label="PriceScore" you={myScore} them={theirScore} handle={handle} themHex={stat?.profileHex ?? null} />
            </div>

            {theirSlugs === null ? (
                <div className="fm-empty fm-loading">Inspecting…</div>
            ) : (
                <>
                    <div className="fi-group-head">
                        <span className="attr-group-name">{`⟁${VS15}`} Shared Holdings</span>
                        <span className="attr-group-count">{shared.length}</span>
                    </div>
                    {shared.length > 0
                        ? beads(shared)
                        : <div className="fi-none">No shared holdings — yet.</div>}
                    {theirSlugs.length > 0 && (
                        <>
                            <div className="fi-group-head">
                                <span className="attr-group-name">{`⬚${VS15}`} Collects</span>
                                <span className="attr-group-count">{theirSlugs.length}</span>
                            </div>
                            {beads(theirSlugs)}
                        </>
                    )}
                </>
            )}
        </div>
    );
}

/* One duel tile — the Attributes tile carrying a head-to-head: both values,
   a split bar (your share fills from the left in full text colour), and the
   verdict. Ties split the bar down the middle. */
function DuelTile({
    glyph, label, you, them, handle, themHex, eth,
}: {
    glyph: string; label: string; you: number | null; them: number | null; handle: string;
    themHex: string | null; eth?: boolean;
}) {
    const fmt = (n: number) => (eth ? n.toFixed(2) : String(n));
    const known = you !== null && them !== null;
    const total = known ? (you as number) + (them as number) : 0;
    const share = known ? (total > 0 ? (you as number) / total : 0.5) : 0.5;
    const verdict = !known ? '' : (you as number) > (them as number) ? 'YOU LEAD' : (you as number) < (them as number) ? `@${handle} LEADS` : 'TIED';
    const lead = known && (you as number) !== (them as number);
    return (
        <div className={`attr-tile${lead ? ' rare' : ''}`}>
            <span className="attr-tile-label">{glyph}{VS15} {label}</span>
            <span className="attr-tile-value">
                {you === null ? '—' : fmt(you)}
                <span className="fi-duel-vs">VS</span>
                {them === null ? '—' : fmt(them)}
            </span>
            <span className="attr-spectrum fi-duel-bar" aria-hidden="true">
                <span className="attr-spectrum-seg fi-duel-you" style={{ flexGrow: Math.max(share, 0.02) }} />
                <span
                    className="attr-spectrum-seg fi-duel-them"
                    style={{ flexGrow: Math.max(1 - share, 0.02), ...(themHex ? { background: themHex } : null) }}
                />
            </span>
            <span className="attr-tile-sub">{verdict || ' '}</span>
        </div>
    );
}

/* One project row — the project's own sprite+@name chip, creator, mint count,
   and how many of your mutuals collect it (Cartel ⟁), in the same aligned
   ledger columns as the people rows. */
function ProjectRow({ proj, enabled, starred, onStar }: { proj: FollowedProjectRow; enabled: boolean; starred: boolean; onStar: (slug: string) => void }) {
    /* Spite Book — a spited creator renders redacted on the row. */
    const fmIsSpited = useSpiteMatcher();
    const cartel = useCartelMutualCount(proj.project_id, enabled);
    const h = proj.handle ?? proj.project_id;
    return (
        <div className="fi-row">
            <div className="fi-line">
                <button
                    type="button"
                    className={`fm-star${starred ? ' on' : ''}`}
                    onClick={() => onStar(proj.project_id)}
                    title={starred ? 'Unstar' : 'Star this project'}
                    aria-pressed={starred}
                >
                    {starred ? `★${VS15}` : `☆${VS15}`}
                </button>
                <div className="fi-line-main">
                    <ProjectChip slug={h} faceId={proj.project_id} />
                    {proj.artist && (
                        <span className="fi-artist" title="Creator">
                            {`✺${VS15}`}<b className={fmIsSpited(proj.artist) ? 'spited' : undefined}>@{proj.artist}</b>
                        </span>
                    )}
                    <span className="fi-cols">
                        <span className="fi-col fi-col-mint" title="Minted">
                            <span className="fm-stat-ic">{`⬚${VS15}`}</span>{proj.minted}{proj.supply ? `/${proj.supply}` : ''}
                        </span>
                        <span className="fi-col fi-col-n" title="Mutuals who collect">
                            <span className="fm-stat-ic">{`⟁${VS15}`}</span>{cartel}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    );
}
