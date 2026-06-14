'use client';

/*
 * FollowersModal v2 (Brendon 2026-06-12 — "current approach not ideal,
 * I leave it with you"). Redone:
 *
 *   - REAL follow graph — the viewer's followers/following via
 *     /api/follows/[address] (was the sim's mock arrays). Mutuals is the
 *     intersection. Refreshes on 'pd:follows-changed' (FollowButton fires
 *     it on every follow/unfollow).
 *   - Single-select tabs in one horizontal row with live counts (the v1
 *     stacked multi-select pills read as a filter, not tabs).
 *   - Rows are the platform sprite+handle chip (CollectedPair — live DB
 *     faces) linking to profiles, replacing bare monospace handles.
 *   - PROJECTS tab kept as the reserved slot it was in v1 — empty state
 *     until project-follow ships.
 *
 * Treatment stays the platform-modal overlay (same as v1). Triggered from
 * the user dropdown LinksView (the ⚬/⚯ stats next to "Profile"); default
 * tab arrives via useModal().openModal.payload.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import {
    useCallback,
    useEffect,
    useState,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import CollectedPair from './hero/CollectedPair';

const VS15 = '\uFE0E';

type FollowersTab = 'followers' | 'following' | 'mutuals' | 'projects';

const TABS: { key: FollowersTab; label: string; icon: string }[] = [
    { key: 'followers', label: 'FOLLOWERS', icon: '⚬' },
    { key: 'following', label: 'FOLLOWING', icon: '⚯' },
    { key: 'mutuals', label: 'MUTUALS', icon: '⚭' },
    { key: 'projects', label: 'PROJECTS', icon: '⬚' },
];

const EMPTY_LINE: Record<FollowersTab, string> = {
    followers: 'No followers yet.',
    following: 'Not following anyone yet.',
    mutuals: 'No mutuals yet.',
    projects: 'Nothing here yet.',
};

interface Graph {
    followers: string[];
    following: string[];
    mutuals: string[];
}

const EMPTY_GRAPH: Graph = { followers: [], following: [], mutuals: [] };

/** A project row in the Projects tab. `held` = you own a piece, so it follows
    YOU; otherwise you follow it. */
interface FollowedProjectRow {
    project_id: string;
    handle: string | null;
    title: string;
    held: boolean;
}

function isTab(v: unknown): v is FollowersTab {
    return v === 'followers' || v === 'following' || v === 'mutuals' || v === 'projects';
}

export default function FollowersModal() {
    const { openModal, close } = useModal();
    const { siweAddress } = useAuth();
    const isOpen = openModal?.name === 'followers';

    const [tab, setTab] = useState<FollowersTab>('followers');
    const [graph, setGraph] = useState<Graph>(EMPTY_GRAPH);
    const [projects, setProjects] = useState<FollowedProjectRow[]>([]);
    const [loading, setLoading] = useState(false);

    /* Sync tab from payload on each open. The opener (LinksView) passes
       'followers' or 'following'; switching afterwards is owned locally. */
    useEffect(() => {
        if (!isOpen) return;
        const payload = openModal?.payload;
        setTab(isTab(payload) ? payload : 'followers');
    }, [isOpen, openModal]);

    /* Live graph — fetched on open and again whenever the follow graph
       changes anywhere in the app. */
    useEffect(() => {
        if (!isOpen) return;
        if (!siweAddress) {
            setGraph(EMPTY_GRAPH);
            setProjects([]);
            return;
        }
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
                const followers: string[] = Array.isArray(j?.follower_handles) ? j.follower_handles : [];
                const following: string[] = Array.isArray(j?.following_handles) ? j.following_handles : [];
                const fset = new Set(followers);
                setGraph({
                    followers,
                    following,
                    mutuals: following.filter((h) => fset.has(h)),
                });
                setProjects(Array.isArray(p?.projects) ? p.projects : []);
            } catch {
                if (alive) { setGraph(EMPTY_GRAPH); setProjects([]); }
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

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

    const counts: Record<FollowersTab, number> = {
        followers: graph.followers.length,
        following: graph.following.length,
        mutuals: graph.mutuals.length,
        projects: projects.length,
    };
    const peopleRows = tab === 'projects' ? [] : graph[tab];
    const isEmpty = tab === 'projects' ? projects.length === 0 : peopleRows.length === 0;

    return (
        <div
            id="followersModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            onClick={onBackdropClick}
        >
            <div
                className="close-hint"
                role="button"
                tabIndex={0}
                onClick={close}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        close();
                    }
                }}
                title="Close"
            >
                {'\u00D7'}
                {VS15}
            </div>
            <div className="modal-info fm-box">
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
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    setTab(t.key);
                                }
                            }}
                            style={{ cursor: 'pointer' }}
                        >
                            <span className="fm-icon">{t.icon}{VS15}</span>
                            {' '}{t.label}
                            {t.key !== 'projects' && (
                                <span className="fm-count">{counts[t.key]}</span>
                            )}
                        </div>
                    ))}
                </div>
                <div className="collectors-list fm-list" id="followersListWrap">
                    {loading && isEmpty ? (
                        <div className="fm-empty fm-loading">Loading…</div>
                    ) : isEmpty ? (
                        <div className="fm-empty">
                            {siweAddress
                                ? EMPTY_LINE[tab]
                                : 'Sign in to see your circle.'}
                        </div>
                    ) : tab === 'projects' ? (
                        projects.map((proj) => (
                            <a
                                className="fm-row fm-project-row"
                                key={proj.project_id}
                                href={`/art/${proj.handle ?? proj.project_id}`}
                            >
                                <span className="fm-project-title">{proj.title}</span>
                                {proj.handle && (
                                    <span className="fm-project-handle">@{proj.handle}</span>
                                )}
                                <span className="fm-project-tag">
                                    {proj.held ? 'FOLLOWS YOU' : 'FOLLOWING'}
                                </span>
                            </a>
                        ))
                    ) : (
                        peopleRows.map((handle) => (
                            <div className="fm-row" key={handle}>
                                <CollectedPair handle={handle} />
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
