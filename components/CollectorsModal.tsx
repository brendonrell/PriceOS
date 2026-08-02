'use client';

/*
 * CollectorsModal — OWNERS, rebuilt (Brendon, 2026-08-02: "start from scratch
 * and make them actually good and useful").
 *
 * Triggered from the project page hero stats row — the owners stat. Mounted
 * globally in PriceOSShell; any caller fires useModal().open('collectors').
 *
 * What it answers now, beyond who-holds-how-many:
 *   · THE ROOM'S SHAPE — owners · % unique · how much the top three hold
 *     (the whale read), as the headline numbers above the list.
 *   · WHO THEY ARE TO YOU — every row wears the relationship marks the
 *     identity layer already speaks: ⚭ mutual · ⚯ you follow · ⚬ follows you.
 *   · WHAT THEY ACTUALLY HOLD — tap a row and it unfolds IN PLACE: that
 *     owner's pieces from this project as a swipeable art strip (tap a piece
 *     to open it), their stake as a % of the edition, and a FOLLOW/UNFOLLOW
 *     door. The modal stays open through all of it (Rule #-0.55).
 *
 * Rows keep the STANDARD two-half user row (the PriceRank leaderboard
 * anatomy, Brendon's 2026-07-20 lock): top half sprite + @name, bottom half
 * stats. Hooks discipline: all hooks at the top, internals gate on isOpen.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useProject, ProjectProvider } from '../lib/state/ProjectContext';
import { useToast } from '../lib/state/ToastContext';
import { getProject } from '../lib/project/registry';
import AsciiId from './hero/AsciiId';
import ArtworkCard from './ArtworkCard';
import { UserTags } from './tags/UserTags';
import { useUserTags } from '../lib/hooks/useUserTags';

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

export default function CollectorsModal() {
    const { close } = useModal();
    const { outputs, slug } = useProject();
    const { siweAddress, handle: myHandle } = useAuth();
    const { showToast } = useToast();
    const listRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<OwnerSort>('pieces');
    const [openAddr, setOpenAddr] = useState<string | null>(null);
    const [followBusy, setFollowBusy] = useState(false);

    const { isOpen, isTopStacked } = useModalLayer('collectors');
    const { followers, following } = useMyGraph(isOpen, siweAddress);

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => {
            if (e.target === e.currentTarget) close();
        },
        [close]
    );

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

    const SORTS: { key: OwnerSort; label: string }[] = [
        { key: 'pieces', label: 'PIECES' },
        { key: 'listed', label: 'LISTED' },
        { key: 'az', label: 'A–Z' },
    ];

    return (
        <div
            id="collectorsModal"
            className={`platform-modal${isOpen ? ' active' : ''}`}
            role="dialog"
            aria-modal="true"
            data-stack-top={isTopStacked || undefined}
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
                {'×'}
                {VS15}
            </div>
            <div className="modal-info collectors-info">
                <div className="modal-title" style={{ marginBottom: 0 }}>
                    OWNERS
                </div>
                {/* The headline numbers of the list you're about to read — the
                    count, the spread, and the whale read (Brendon, 2026-08-01 +
                    the 2026-08-02 rebuild). */}
                <div className="collectors-stats-top">
                    <span className="cst-stat"><b>{holders.length}</b> {holders.length === 1 ? 'OWNER' : 'OWNERS'}</span>
                    <span className="cst-stat"><b>{uniquePct}%</b> UNIQUE</span>
                    {top3Pct !== null && (
                        <span className="cst-stat" title="Share of the edition held by the three biggest hands"><b>{top3Pct}%</b> TOP 3</span>
                    )}
                </div>
                <div className="collectors-sort-row" role="tablist" aria-label="Sort owners">
                    {SORTS.map((s) => (
                        <button
                            key={s.key}
                            type="button"
                            role="tab"
                            aria-selected={sort === s.key}
                            className={`pill pill-l2${sort === s.key ? ' active' : ''}`}
                            onClick={() => setSort(s.key)}
                        >
                            {s.label}
                        </button>
                    ))}
                </div>
                <div
                    className="scroll-arrow dark-arrow"
                    role="button"
                    tabIndex={0}
                    onClick={() => scroll(-1)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            scroll(-1);
                        }
                    }}
                    title="Scroll Up"
                >
                    {'⇡'}
                    {VS15}
                </div>
                <div
                    className="modal-fields-wrap collectors-list"
                    id="collectorsList"
                    ref={listRef}
                >
                    <div className="fm-list collectors-holders">
                        {sorted.length === 0 && (
                            <div className="fm-empty">No owners yet — the ledger is blank.</div>
                        )}
                        {sorted.map((r, i) => {
                            const podium = sort === 'pieces' && i < 3;
                            const isMe = me !== null && r.addr === me;
                            const opened = openAddr === r.addr;
                            const stakePct = minted > 0 ? Math.round((r.pieces / minted) * 100) : 0;
                            const canFollow = !!siweAddress && !!r.handle && !isMe && r.handle !== myH;
                            return (
                                <div key={r.addr}>
                                    <div
                                        className={`fm-row lb-row${podium ? ` lb-podium lb-rank${i + 1}` : ''}${isMe ? ' lb-me' : ''}${opened ? ' fm-row-open' : ''}`}
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
                                    {opened && (
                                        /* The unfold — their pieces from THIS project as a
                                           swipeable strip (the Now Minting track's tiles),
                                           plus the follow door. Everything in place; the
                                           modal never closes under you (Rule #-0.55). */
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
                                                        className="pill pill-l2 own-follow"
                                                        disabled={followBusy}
                                                        onClick={() => void toggleFollow(r)}
                                                    >
                                                        {`⚯${VS15}`} {r.handle && following.has(r.handle) ? 'UNFOLLOW' : 'FOLLOW'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div
                    className="scroll-arrow dark-arrow"
                    role="button"
                    tabIndex={0}
                    onClick={() => scroll(1)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            scroll(1);
                        }
                    }}
                    title="Scroll Down"
                >
                    {'⇣'}
                    {VS15}
                </div>
            </div>
        </div>
    );
}
