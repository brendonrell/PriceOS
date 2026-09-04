'use client';

/*
 * CollectorsModal — OWNERS, on the Friend Inspector shell (Brendon,
 * 2026-08-27: "adapt the owners concept to the friend inspector modal").
 *
 * Same chrome as Friend Inspector / Projects Pro: sticker-mgr-backdrop +
 * ambient-pop compact popup, ↑ into a sticker-mgr-plus jumbo OWNERS+, ×/Esc/
 * backdrop out, GO TO DISCORD in both headers. followers-pop/followers-plus
 * classes ride along so the row voice (Rubik @name + Rubik stats, matching
 * the PRICE leaderboard) applies for free.
 *
 * Triggered from the project page hero stats row — the owners stat. Mounted
 * globally in PriceOSShell; any caller fires useModal().open('collectors').
 *
 * What it answers:
 *   · THE ROOM'S SHAPE — owners · % unique · how much the top three hold
 *     (the whale read), as the headline numbers above the list.
 *   · WHO THEY ARE TO YOU — every row wears the relationship marks the
 *     identity layer already speaks: ⚭ mutual · ⚯ you follow · ⚬ follows you.
 *   · WHAT THEY ACTUALLY HOLD — tap a row and it unfolds IN PLACE, in the
 *     Attributes-dossier frame (fi-dossier): that owner's pieces from this
 *     project as a swipeable art strip (tap a piece to open it), their stake
 *     as a % of the edition, and a FOLLOW/UNFOLLOW door. The modal stays
 *     open through all of it (Rule #-0.55).
 *
 * Rows keep the STANDARD two-half user row (the PriceRank leaderboard
 * anatomy, Brendon's 2026-07-20 lock): top half sprite + @name, bottom half
 * stats. Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { createPortal } from 'react-dom';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useProject, ProjectProvider } from '../lib/state/ProjectContext';
import { useToast } from '../lib/state/ToastContext';
import { lockBodyScroll, unlockBodyScroll } from '../lib/state/bodyScrollLock';
import { getProject } from '../lib/project/registry';
import AsciiId from './hero/AsciiId';
import ArtworkCard from './ArtworkCard';
import { UserTags } from './tags/UserTags';
import { useUserTags } from '../lib/hooks/useUserTags';
import { DISCORD_URL } from '../lib/config/discord';

const VS15 = '︎';
/* Podium medals for the top three — the leaderboard's rank grammar
   (GLYPHS.md §7); shown only on the ranked-by-pieces sort. */
const MEDALS = [`❶${VS15}`, `❷${VS15}`, `❸${VS15}`];
/* Expansion strip cap — a whale's whole wall stays a strip, not a page. */
const STRIP_CAP = 24;

type OwnerSort = 'pieces' | 'listed' | 'az';

interface HolderRow {
    /** Lowercased wallet — the aggregation key. */
    addr: string;
    /** Bare handle (no @) when the wallet has one, else null. */
    handle: string | null;
    /** What the row shows when there's no handle (short address). */
    display: string;
    pieces: number;
    listed: number;
    /** This owner's token ids in the project, ascending. */
    ids: number[];
}

/** The viewer's own graph — powers the ⚭ ⚯ ⚬ marks and the follow door.
 *  One read per open; re-read on any follow change. */
function useMyGraph(isOpen: boolean, siweAddress: string | null | undefined) {
    const [followers, setFollowers] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    useEffect(() => {
        if (!isOpen || !siweAddress) return;
        let dead = false;
        const read = () => {
            fetch(`/api/follows/${siweAddress.toLowerCase()}`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((j: { follower_handles?: string[]; following_handles?: string[] } | null) => {
                    if (dead || !j) return;
                    setFollowers(new Set((j.follower_handles ?? []).map((h) => h.toLowerCase())));
                    setFollowing(new Set((j.following_handles ?? []).map((h) => h.toLowerCase())));
                })
                .catch(() => { /* no graph read → no marks, list still works */ });
        };
        read();
        window.addEventListener('pd:follows-changed', read);
        return () => { dead = true; window.removeEventListener('pd:follows-changed', read); };
    }, [isOpen, siweAddress]);
    return { followers, following };
}

/** ⚭ mutual · ⚯ you follow · ⚬ follows you — the identity layer's own marks. */
export function RelMark({ handle, followers, following }: {
    handle: string | null;
    followers: Set<string>;
    following: Set<string>;
}) {
    if (!handle) return null;
    const h = handle.toLowerCase();
    const f = followers.has(h);
    const g = following.has(h);
    if (!f && !g) return null;
    const glyph = f && g ? '⚭' : g ? '⚯' : '⚬';
    const word = f && g ? 'Mutual' : g ? 'Following' : 'Follows you';
    return <span className="fm-rel-mark" title={word}>{glyph}{VS15}</span>;
}

const SORTS: { key: OwnerSort; label: string }[] = [
    { key: 'pieces', label: 'PIECES' },
    { key: 'listed', label: 'LISTED' },
    { key: 'az', label: 'A–Z' },
];

export default function CollectorsModal() {
    /* Which project this instance shows — the SLUG PASSED AT OPEN, not
       whatever the page happens to be showing. This modal mounts once,
       globally, in PriceOSShell — a SIBLING of the page's own
       <ProjectProvider slug={...}>, not a child of it. Reading useProject()
       directly here (as this used to) silently fell through to the outer
       app-shell default provider (app/layout.tsx's slug-less
       <ProjectProvider>, which defaults to 'prisms') instead of whatever
       project you'd actually clicked the stat on — so it always showed
       Prisms' real collectors no matter which project opened it (2026-09-04
       bug: "Turing's Garden has two collectors but only shows me"). Look up
       the slug the open('collectors', undefined, slug) call stamped on this
       modal's OWN stack entry (not just the top of the stack — this modal
       can sit underneath something else), and re-provide a correctly scoped
       Project context around the real body. */
    const { stack } = useModal();
    const targetSlug = stack.find((m) => m.name === 'collectors')?.slug;
    return (
        <ProjectProvider slug={targetSlug}>
            <CollectorsModalBody />
        </ProjectProvider>
    );
}

function CollectorsModalBody() {
    const { close } = useModal();
    const { outputs, slug } = useProject();
    const { siweAddress, handle: myHandle } = useAuth();
    const { showToast } = useToast();
    const listRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<OwnerSort>('pieces');
    const [openAddr, setOpenAddr] = useState<string | null>(null);
    const [followBusy, setFollowBusy] = useState(false);
    const [full, setFull] = useState(false);

    const { isOpen, isTopStacked } = useModalLayer('collectors');
    const { followers, following } = useMyGraph(isOpen, siweAddress);

    // Reset to compact on every open (matches Friend Inspector / Projects Pro).
    useEffect(() => {
        if (!isOpen) { setFull(false); return; }
        setSort('pieces');
        setOpenAddr(null);
    }, [isOpen]);

    /* Lock the page only in PLUS (full) mode; compact floats and lets the
       page scroll behind it (same rule as the other two inspectors). */
    useEffect(() => {
        if (!isOpen || !full) return;
        lockBodyScroll();
        return () => unlockBodyScroll();
    }, [isOpen, full]);

    // Esc: step out of PLUS first, then close.
    useEffect(() => {
        if (!isOpen) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (full) setFull(false); else close();
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [isOpen, full, close]);

    const scroll = useCallback((dir: -1 | 1) => {
        const el = listRef.current;
        if (!el) return;
        el.scrollBy({ top: dir * 120, behavior: 'smooth' });
    }, []);

    /* Aggregate the page's live per-token ownership into holders — including
       WHICH pieces each one holds, so a row can unfold into its art. */
    const holders = useMemo<HolderRow[]>(() => {
        const byAddr = new Map<string, HolderRow>();
        outputs.forEach((meta, id) => {
            const addr = (meta.ownerFull ?? '').toLowerCase();
            if (!addr) return;
            let row = byAddr.get(addr);
            if (!row) {
                const display = meta.ownerDisplay || `${addr.slice(0, 6)}…${addr.slice(-4)}`;
                row = {
                    addr,
                    handle: display.startsWith('@') ? display.slice(1).toLowerCase() : null,
                    display,
                    pieces: 0,
                    listed: 0,
                    ids: [],
                };
                byAddr.set(addr, row);
            }
            row.pieces += 1;
            row.ids.push(id);
            const p = meta.price != null ? parseFloat(meta.price) : NaN;
            if (Number.isFinite(p) && p > 0) row.listed += 1;
        });
        const rows = Array.from(byAddr.values());
        rows.forEach((r) => r.ids.sort((a, b) => a - b));
        return rows;
    }, [outputs]);

    const sorted = useMemo<HolderRow[]>(() => {
        const name = (r: HolderRow) => (r.handle ?? r.display.replace(/^@/, '')).toLowerCase();
        const rows = [...holders];
        if (sort === 'az') rows.sort((a, b) => name(a).localeCompare(name(b)));
        else if (sort === 'listed') rows.sort((a, b) => b.listed - a.listed || b.pieces - a.pieces || name(a).localeCompare(name(b)));
        else rows.sort((a, b) => b.pieces - a.pieces || b.listed - a.listed || name(a).localeCompare(name(b)));
        return rows;
    }, [holders, sort]);

    /* Profile tags for the holders on screen — one batched read, shared cache.
       Tells you what KIND of room is holding this project, not just how many. */
    const tagSets = useUserTags(sorted.map((r) => r.handle));

    const me = siweAddress?.toLowerCase() ?? null;
    const myH = myHandle?.toLowerCase() ?? null;
    const artistHandle = getProject(slug)?.artistHandle?.toLowerCase() ?? null;
    const minted = outputs.size;
    const uniquePct = minted > 0 ? Math.round((holders.length / minted) * 100) : 0;
    /* The whale read — how much of the edition the three biggest hands hold. */
    const top3Pct = useMemo(() => {
        if (minted === 0 || holders.length < 3) return null;
        const byPieces = [...holders].sort((a, b) => b.pieces - a.pieces);
        const top = byPieces[0].pieces + byPieces[1].pieces + byPieces[2].pieces;
        return Math.round((top / minted) * 100);
    }, [holders, minted]);

    /* Follow / unfollow — the same /api/follows contract the profile
       FollowButton and the Followers dossier use, same toasts, same event. */
    const toggleFollow = useCallback(async (r: HolderRow) => {
        if (!siweAddress) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
        if (!r.handle) { showToast(`@?: NO @NAME YET`); return; }
        const isFollowing = following.has(r.handle);
        setFollowBusy(true);
        try {
            if (isFollowing) {
                const res = await fetch(`/api/follows?target=${r.addr}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast(`@${r.handle}: UNFOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else showToast('Unfollow: FAILED');
            } else {
                const res = await fetch('/api/follows', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ target: r.addr }),
                });
                if (res.status === 201 || res.status === 200) {
                    showToast(`@${r.handle}: FOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else if (res.status === 204) showToast(`@${r.handle}: NO @NAME YET`);
                else showToast('Follow: FAILED');
            }
        } finally {
            setFollowBusy(false);
        }
    }, [siweAddress, following, showToast]);

    /* A row tap unfolds it — unless the tap was a link (the @name, a piece). */
    const onRowClick = useCallback((e: ReactMouseEvent<HTMLDivElement>, addr: string) => {
        if ((e.target as HTMLElement).closest('a,button')) return;
        setOpenAddr((v) => (v === addr ? null : addr));
    }, []);

    if (!isOpen || typeof document === 'undefined') return null;

    const title = (words: string) => (
        <span className="ambient-pop-title-text">
            <span className="smgr-title-ic">{`◨${VS15}`}</span>{' '}<span className="smgr-title-words">{words}</span>
        </span>
    );

    const body = (
        <>
            <div className="collectors-project-name">{getProject(slug)?.title ?? slug}</div>
            <div className="stats-row collectors-stats-top">
                <span className="stat-item" style={{ cursor: 'default' }}>
                    <span className="stat-icon stat-icon-owners">{`\u2726${VS15}`}</span>{' '}
                    <span className="stat-val">{holders.length} {holders.length === 1 ? 'OWNER' : 'OWNERS'}</span>
                </span>
                <span className="stat-item" style={{ cursor: 'default' }}>
                    <span className="stat-icon" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 14 }}>{`\u2302${VS15}`}</span>{' '}
                    <span className="stat-val">{uniquePct}% UNIQUE</span>
                </span>
                {top3Pct !== null && (
                    <span className="stat-item" style={{ cursor: 'default' }} title="Share of the edition held by the three biggest hands">
                        <span className="stat-icon" style={{ fontFamily: "'Courier New', Courier, monospace", fontSize: 14 }}>{`\u25B2${VS15}`}</span>{' '}
                        <span className="stat-val">{top3Pct}% TOP 3</span>
                    </span>
                )}
            </div>

            <div className="fm-sort-rows" role="group" aria-label="Sort">
                <div className="fm-sort-row">
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
            </div>

            <div className="fm-list" ref={listRef}>
                {sorted.length === 0 ? (
                    <div className="fm-empty">No owners yet — the ledger is blank.</div>
                ) : sorted.map((r, i) => {
                    const podium = sort === 'pieces' && i < 3;
                    const isMe = me !== null && r.addr === me;
                    const opened = openAddr === r.addr;
                    const stakePct = minted > 0 ? Math.round((r.pieces / minted) * 100) : 0;
                    const canFollow = !!siweAddress && !!r.handle && !isMe && r.handle !== myH;
                    return (
                        <div className={`fi-row${opened ? ' inspecting' : ''}`} key={r.addr}>
                            <div className="fi-line">
                                <div
                                    className={`fi-line-main fm-row lb-row${podium ? ` lb-podium lb-rank${i + 1}` : ''}${isMe ? ' lb-me' : ''}`}
                                    role="button"
                                    tabIndex={0}
                                    title={opened ? 'Fold their pieces away' : 'See their pieces'}
                                    onClick={(e) => onRowClick(e, r.addr)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            e.preventDefault();
                                            setOpenAddr((v) => (v === r.addr ? null : r.addr));
                                        }
                                    }}
                                >
                                    <span className="lb-pos">{podium ? MEDALS[i] : i + 1}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id">
                                            {r.handle ? (
                                                <AsciiId handle={r.handle} />
                                            ) : (
                                                <span className="collected-pair"><span className="profile-link">{r.display}</span></span>
                                            )}
                                            {artistHandle && r.handle === artistHandle && (
                                                <span className="fm-artist-badge" title="Artist">{`✺${VS15}`}</span>
                                            )}
                                            <RelMark handle={r.handle} followers={followers} following={following} />
                                        </div>
                                        {r.handle && (
                                            <UserTags set={tagSets[r.handle.toLowerCase()]} size="mini" themed />
                                        )}
                                        <div className="fm-row-stats">
                                            <span className="fm-stat" title="Pieces owned">
                                                <span className="fm-stat-ic">{`⬚${VS15}`}</span>
                                                <b>{r.pieces}</b>
                                            </span>
                                            {stakePct >= 1 && (
                                                <span className="fm-stat" title="Share of the minted edition">
                                                    <b>{stakePct}%</b>
                                                </span>
                                            )}
                                            {r.listed > 0 && (
                                                <span className="fm-stat" title="Pieces listed">
                                                    <span className="fm-stat-ic">{`✹${VS15}`}</span>
                                                    <b>{r.listed}</b>
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {opened && (
                                /* The unfold — their pieces from THIS project as a
                                   swipeable strip (the Now Minting track's tiles),
                                   plus the follow door, in the Attributes-dossier
                                   frame the other two inspectors use. The modal
                                   never closes under you (Rule #-0.55). */
                                <div className="fi-dossier" onClick={(e) => e.stopPropagation()}>
                                    <div className="own-expand">
                                        <div className="home-carousel-track own-strip">
                                            <ProjectProvider slug={slug}>
                                                {r.ids.slice(0, STRIP_CAP).map((id) => (
                                                    <ArtworkCard key={`${r.addr}-${id}`} id={id} renderSize={120} />
                                                ))}
                                            </ProjectProvider>
                                        </div>
                                        <div className="own-expand-foot">
                                            {r.ids.length > STRIP_CAP && (
                                                <span className="own-expand-more">+{r.ids.length - STRIP_CAP} more</span>
                                            )}
                                            {canFollow && (
                                                <button
                                                    type="button"
                                                    className="ambient-chip fi-follow"
                                                    disabled={followBusy}
                                                    onClick={() => void toggleFollow(r)}
                                                >
                                                    {r.handle && following.has(r.handle) ? 'UNFOLLOW' : 'FOLLOW'}
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </>
    );

    // ── OWNERS+ — full jumbo panel ──
    if (full) {
        return createPortal(
            <div className="sticker-mgr-plus-backdrop" data-stack-top={isTopStacked || undefined} role="dialog" aria-modal="true" aria-label="Collector Collector" onClick={close}>
                <div className="sticker-mgr-plus followers-plus owners-plus" onClick={(e) => e.stopPropagation()}>
                    <div className="smgr-plus-head">
                        {title('COLLECTOR COLLECTOR+')}
                        <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Discord">
                            DISCORD
                        </button>
                        <button className="smgr-expand" type="button" onClick={() => { setFull(false); showToast('Collector Collector: COMPACT'); }} title="Exit full screen" aria-label="Exit full screen">
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

    // ── OWNERS — compact floating popup ──
    return createPortal(
        <div className="sticker-mgr-backdrop followers-backdrop" data-stack-top={isTopStacked || undefined} role="dialog" aria-modal="true" aria-label="Collector Collector" onClick={close}>
            <div className="ambient-pop followers-pop owners-pop" role="dialog" aria-label="Collector Collector" onClick={(e) => e.stopPropagation()}>
                <span className="ambient-pop-close" role="button" tabIndex={0} title="Close" onClick={close}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}>
                    {`×${VS15}`}
                </span>
                <div className="ambient-pop-title">
                    {title('COLLECTOR COLLECTOR')}
                    <button className="smgr-store" type="button" onClick={() => window.open(DISCORD_URL, '_blank', 'noopener')} title="Discord">
                        DISCORD
                    </button>
                    <button className="smgr-expand" type="button" onClick={() => { setFull(true); showToast('Collector Collector: PLUS'); }} title="Open Collector Collector+" aria-label="Open Collector Collector+">
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
