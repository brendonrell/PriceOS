'use client';

/*
 * TagPeopleModal — tap a Profile Tag, meet the room (Brendon, 2026-07-27;
 * rebuilt 2026-08-02: "start from scratch and make them actually good and
 * useful").
 *
 * A tag stops being decoration the moment you can pull on it: tapping one
 * anywhere it appears opens THIS popup — the people wearing it, what the room
 * is worth, and the doors to act on it. A POPUP over wherever you already
 * are, never a nav away.
 *
 * What it answers now:
 *   · THE ROOM'S WEIGHT — people · ◊ spent · ⬚ owned, summed over exactly
 *     what you're looking at (the CABAL narrow narrows the sums too), as the
 *     headline over the list.
 *   · WHO THEY ARE TO YOU — ⟁ marks your cabal (the shipped mark, kept), and
 *     the identity layer's ⚯ / ⚬ mark one-way follows either direction.
 *   · A DOOR ON EVERY ROW — FOLLOW/UNFOLLOW right on the row, the same
 *     /api/follows contract every other follow control uses. The modal stays
 *     open and the row updates under your finger (Rule #-0.55).
 *
 * Rows keep the STANDARD two-half user row (Brendon's 2026-07-20 lock).
 * Slices: SPENT · OWNED · JOINED (PriceDay) · A–Z, plus the CABAL ⟁ narrow —
 * you + your mutuals — worked out from YOUR circle on the client.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useToast } from '../lib/state/ToastContext';
import { priceDayNumber } from '../lib/priceday/priceday';
import AsciiId from './hero/AsciiId';
import { UserTags } from './tags/UserTags';
import { useUserTags } from '../lib/hooks/useUserTags';
import type { TagMembersResponse, TagMemberRow } from '../app/api/tags/members/route';

const VS15 = '︎';

type TagSort = 'spent' | 'owned' | 'joined' | 'az';

const SORTS: { key: TagSort; label: string }[] = [
    { key: 'spent', label: 'SPENT' },
    { key: 'owned', label: 'OWNED' },
    { key: 'joined', label: 'JOINED' },
    { key: 'az', label: 'A–Z' },
];

export default function TagPeopleModal() {
    const { stack, close } = useModal();
    const { siweAddress, handle: myHandle } = useAuth();
    const { showToast } = useToast();
    const listRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<TagSort>('spent');
    const [cabalOnly, setCabalOnly] = useState(false);
    const [rows, setRows] = useState<TagMemberRow[] | null>(null);
    const [label, setLabel] = useState<string | null>(null);
    const [followers, setFollowers] = useState<Set<string>>(new Set());
    const [following, setFollowing] = useState<Set<string>>(new Set());
    const [followBusy, setFollowBusy] = useState<string | null>(null);

    const { isOpen, isTopStacked } = useModalLayer('tag');
    /* The tag id rides the modal payload — read off the STACK entry, so it
       survives another popup opening on top of this one. */
    const entry = [...stack].reverse().find((m) => m.name === 'tag');
    const tagId = typeof entry?.payload === 'string' ? entry.payload : '';

    const onBackdropClick = useCallback(
        (e: ReactMouseEvent<HTMLDivElement>) => { if (e.target === e.currentTarget) close(); },
        [close],
    );
    const scroll = useCallback((dir: -1 | 1) => {
        listRef.current?.scrollBy({ top: dir * 120, behavior: 'smooth' });
    }, []);

    /* The room, fetched fresh each time the popup opens on a tag. */
    useEffect(() => {
        if (!isOpen || !tagId) return;
        let dead = false;
        setRows(null);
        setLabel(null);
        fetch(`/api/tags/members?tag=${encodeURIComponent(tagId)}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: TagMembersResponse | null) => {
                if (dead || !j) return;
                setRows(j.rows ?? []);
                setLabel(j.label ?? null);
            })
            .catch(() => { if (!dead) setRows([]); });
        return () => { dead = true; };
    }, [isOpen, tagId]);

    /* YOUR graph — powers the ⟁ cabal narrow, the ⚯/⚬ marks and the follow
       doors. Read on open; re-read on any follow change so the doors stay
       honest while the card is up. */
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
                .catch(() => { /* no circle read → marks stay off, list still works */ });
        };
        read();
        window.addEventListener('pd:follows-changed', read);
        return () => { dead = true; window.removeEventListener('pd:follows-changed', read); };
    }, [isOpen, siweAddress]);

    const mutuals = useMemo(() => {
        const out = new Set<string>();
        following.forEach((h) => { if (followers.has(h)) out.add(h); });
        return out;
    }, [followers, following]);

    const shown = useMemo<TagMemberRow[]>(() => {
        const all = rows ?? [];
        const mine = myHandle?.toLowerCase() ?? null;
        const base = cabalOnly
            ? all.filter((r) => mutuals.has(r.handle) || (mine !== null && r.handle === mine))
            : all;
        const out = [...base];
        const az = (a: TagMemberRow, b: TagMemberRow) => a.handle.localeCompare(b.handle);
        if (sort === 'az') out.sort(az);
        else if (sort === 'owned') out.sort((a, b) => b.owned - a.owned || az(a, b));
        else if (sort === 'joined') out.sort((a, b) => (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || az(a, b));
        else out.sort((a, b) => b.spentEth - a.spentEth || b.owned - a.owned || az(a, b));
        return out;
    }, [rows, sort, cabalOnly, mutuals, myHandle]);

    /* The room's weight — summed over exactly what's on screen, so the CABAL
       narrow reads as YOUR room's numbers. */
    const roomSpent = useMemo(() => shown.reduce((s, r) => s + (r.spentEth > 0 ? r.spentEth : 0), 0), [shown]);
    const roomOwned = useMemo(() => shown.reduce((s, r) => s + r.owned, 0), [shown]);

    /* Follow / unfollow straight off the row — the same /api/follows contract
       every other follow control uses; the row updates in place. */
    const toggleFollow = useCallback(async (r: TagMemberRow) => {
        if (!siweAddress) { showToast('Wallet: CONNECT TO FOLLOW'); return; }
        const isFollowing = following.has(r.handle);
        setFollowBusy(r.handle);
        try {
            if (isFollowing) {
                const res = await fetch(`/api/follows?target=${r.address}`, { method: 'DELETE' });
                if (res.ok) {
                    showToast(`@${r.handle}: UNFOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else showToast('Unfollow: FAILED');
            } else {
                const res = await fetch('/api/follows', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ target: r.address }),
                });
                if (res.status === 201 || res.status === 200) {
                    showToast(`@${r.handle}: FOLLOWED`);
                    window.dispatchEvent(new Event('pd:follows-changed'));
                } else if (res.status === 204) showToast(`@${r.handle}: NO @NAME YET`);
                else showToast('Follow: FAILED');
            }
        } finally {
            setFollowBusy(null);
        }
    }, [siweAddress, following, showToast]);

    const tagSets = useUserTags(shown.map((r) => r.handle));
    const me = myHandle?.toLowerCase() ?? null;

    return (
        <div
            id="tagPeopleModal"
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); close(); } }}
                title="Close"
            >
                {'×'}{VS15}
            </div>
            <div className="modal-info" style={{ marginTop: 0, maxWidth: 340 }}>
                <div className="modal-title" style={{ marginBottom: 0 }}>
                    {(label ?? tagId).toUpperCase()}
                </div>
                {/* The room's weight leads — who's here and what they carry,
                    narrowed with the list when CABAL is on. */}
                <div className="collectors-stats-top">
                    <span className="cst-stat"><b>{shown.length}</b> {shown.length === 1 ? 'PERSON' : 'PEOPLE'}</span>
                    <span className="cst-stat" title="ETH spent on mints + buys, all together"><b>◊{parseFloat(roomSpent.toFixed(2))}</b> SPENT</span>
                    <span className="cst-stat" title="Pieces held, all together"><b>{roomOwned}</b> OWNED</span>
                </div>
                <div className="collectors-sort-row" role="tablist" aria-label="Sort people">
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
                    {siweAddress && (
                        <button
                            type="button"
                            className={`pill pill-l2${cabalOnly ? ' active' : ''}`}
                            aria-pressed={cabalOnly}
                            title="Only you and your mutuals"
                            onClick={() => setCabalOnly((v) => !v)}
                        >
                            {`⟁${VS15}`} CABAL
                        </button>
                    )}
                </div>
                <div
                    className="scroll-arrow dark-arrow"
                    role="button"
                    tabIndex={0}
                    onClick={() => scroll(-1)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scroll(-1); } }}
                    title="Scroll Up"
                >
                    {'⇡'}{VS15}
                </div>
                <div className="modal-fields-wrap collectors-list" ref={listRef}>
                    <div className="fm-list collectors-holders">
                        {rows === null && <div className="fm-empty">Reading the room…</div>}
                        {rows !== null && shown.length === 0 && (
                            <div className="fm-empty">
                                {cabalOnly ? 'Nobody in your cabal wears this one.' : 'Nobody wears this one yet.'}
                            </div>
                        )}
                        {shown.map((r, i) => {
                            const isMe = me !== null && r.handle === me;
                            const day = r.createdAt ? priceDayNumber(new Date(r.createdAt)) : null;
                            const inCabal = mutuals.has(r.handle);
                            const oneWay = !inCabal && (following.has(r.handle) || followers.has(r.handle));
                            const isF = following.has(r.handle);
                            return (
                                <div key={r.address} className={`fm-row lb-row${isMe ? ' lb-me' : ''}`}>
                                    <span className="lb-pos">{i + 1}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id">
                                            <AsciiId handle={r.handle} />
                                            {inCabal && (
                                                <span className="id-cartel" aria-label="cabal" title="Your cabal">{`⟁${VS15}`}</span>
                                            )}
                                            {oneWay && (
                                                <span className="fm-rel-mark" title={isF ? 'Following' : 'Follows you'}>
                                                    {isF ? '⚯' : '⚬'}{VS15}
                                                </span>
                                            )}
                                            {siweAddress && !isMe && (
                                                <button
                                                    type="button"
                                                    className="own-follow-mini"
                                                    disabled={followBusy === r.handle}
                                                    title={isF ? 'Unfollow' : 'Follow'}
                                                    onClick={() => void toggleFollow(r)}
                                                >
                                                    {isF ? 'UNFOLLOW' : `⚯${VS15} FOLLOW`}
                                                </button>
                                            )}
                                        </div>
                                        <UserTags set={tagSets[r.handle]} size="row" />
                                        <div className="fm-row-stats">
                                            <span className="fm-stat" title="Spent on mints + buys">
                                                <span className="fm-stat-ic">{`◊${VS15}`}</span>
                                                <b>{r.spentEth > 0 ? parseFloat(r.spentEth.toFixed(3)) : 0}</b>
                                            </span>
                                            <span className="fm-stat" title="Pieces owned">
                                                <span className="fm-stat-ic">{`⬚${VS15}`}</span>
                                                <b>{r.owned}</b>
                                            </span>
                                            {day != null && (
                                                <span className="fm-stat" title="The PriceDay they joined">
                                                    <b>PriceDay #{day}</b>
                                                </span>
                                            )}
                                        </div>
                                    </div>
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
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); scroll(1); } }}
                    title="Scroll Down"
                >
                    {'⇣'}{VS15}
                </div>
            </div>
        </div>
    );
}
