'use client';

/*
 * TagPeopleModal — tap a Profile Tag, meet the room (Brendon, 2026-07-27).
 *
 * A tag stops being decoration the moment you can pull on it: tapping one
 * anywhere it appears opens THIS popup — the people wearing it, and the numbers
 * to slice them by. It is a POPUP over wherever you already are, never a nav
 * away, so you come straight back to what you were reading.
 *
 * Built on the OWNERS modal's anatomy verbatim (Rule #0 — reuse, never
 * reinvent): the platform-modal shell, the same sort pills, the same two-half
 * user rows with sprite + @name + tags + stats.
 *
 * Slices: SPENT (ETH paid on mints + buys) · OWNED (pieces held) · JOINED (the
 * PriceDay they arrived) · A–Z, plus the CABAL ⟁ narrow — you + your mutuals —
 * which is worked out from YOUR circle here on the client, never on the server.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal, useModalLayer } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
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
    const listRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<TagSort>('spent');
    const [cabalOnly, setCabalOnly] = useState(false);
    const [rows, setRows] = useState<TagMemberRow[] | null>(null);
    const [label, setLabel] = useState<string | null>(null);
    const [mutuals, setMutuals] = useState<Set<string>>(new Set());

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

    /* YOUR cabal — the people you and they follow each other. Read once per
       open; without a signed-in wallet the narrow simply isn't offered. */
    useEffect(() => {
        if (!isOpen || !siweAddress) return;
        let dead = false;
        fetch(`/api/follows/${siweAddress}`)
            .then((r) => (r.ok ? r.json() : null))
            .then((j: { follower_handles?: string[]; following_handles?: string[] } | null) => {
                if (dead || !j) return;
                const followers = new Set((j.follower_handles ?? []).map((h) => h.toLowerCase()));
                setMutuals(new Set((j.following_handles ?? []).map((h) => h.toLowerCase()).filter((h) => followers.has(h))));
            })
            .catch(() => { /* no circle read → the narrow just finds nobody */ });
        return () => { dead = true; };
    }, [isOpen, siweAddress]);

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
                            return (
                                <div key={r.address} className={`fm-row lb-row${isMe ? ' lb-me' : ''}`}>
                                    <span className="lb-pos">{i + 1}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id">
                                            <AsciiId handle={r.handle} />
                                            {mutuals.has(r.handle) && (
                                                <span className="id-cartel" aria-label="cabal" title="Your cabal">{`⟁${VS15}`}</span>
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
                <div className="modal-stats-bottom">
                    {shown.length} {shown.length === 1 ? 'PERSON' : 'PEOPLE'}
                    {cabalOnly ? ' · CABAL' : ''}
                </div>
            </div>
        </div>
    );
}
