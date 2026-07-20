'use client';

/*
 * CollectorsModal — OWNERS, real (Brendon, 2026-07-20; replaced the sim's
 * static mock list, sim.html 5418–5444).
 *
 * Triggered from the project page hero stats row — the "67 PPL" stat.
 * Mounted globally in PriceOSShell; any caller fires
 * useModal().open('collectors').
 *
 * A glanceable TOP HOLDERS list built from the page's live ownership read
 * (ProjectContext — the same holders the gallery paints): ranked by pieces
 * owned, with sort pills (PIECES · LISTED · A–Z) and YOUR row highlighted
 * the leaderboard's own way (lb-me) so you can see where you sit. Rows
 * wear the STANDARD two-half user row (the PriceRank leaderboard anatomy,
 * Brendon's 2026-07-20 lock): top half sprite + @name, bottom half stats.
 *
 * Hooks discipline: all hooks at the top, internals gate on isOpen,
 * no early return. Same rule OutputPreview follows.
 */

import { useCallback, useMemo, useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { useModal } from '../lib/state/ModalContext';
import { useAuth } from '../lib/state/AuthContext';
import { useProject } from '../lib/state/ProjectContext';
import { getProject } from '../lib/project/registry';
import CollectedPair from './hero/CollectedPair';

const VS15 = '︎';
/* Podium medals for the top three — the leaderboard's rank grammar
   (GLYPHS.md §7); shown only on the ranked-by-pieces sort. */
const MEDALS = [`❶${VS15}`, `❷${VS15}`, `❸${VS15}`];

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
}

export default function CollectorsModal() {
    const { openModal, close } = useModal();
    const { outputs, slug } = useProject();
    const { siweAddress } = useAuth();
    const listRef = useRef<HTMLDivElement>(null);
    const [sort, setSort] = useState<OwnerSort>('pieces');

    const isOpen = openModal?.name === 'collectors';

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

    /* Aggregate the page's live per-token ownership into holders. */
    const holders = useMemo<HolderRow[]>(() => {
        const byAddr = new Map<string, HolderRow>();
        outputs.forEach((meta) => {
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
                };
                byAddr.set(addr, row);
            }
            row.pieces += 1;
            const p = meta.price != null ? parseFloat(meta.price) : NaN;
            if (Number.isFinite(p) && p > 0) row.listed += 1;
        });
        return Array.from(byAddr.values());
    }, [outputs]);

    const sorted = useMemo<HolderRow[]>(() => {
        const name = (r: HolderRow) => (r.handle ?? r.display.replace(/^@/, '')).toLowerCase();
        const rows = [...holders];
        if (sort === 'az') rows.sort((a, b) => name(a).localeCompare(name(b)));
        else if (sort === 'listed') rows.sort((a, b) => b.listed - a.listed || b.pieces - a.pieces || name(a).localeCompare(name(b)));
        else rows.sort((a, b) => b.pieces - a.pieces || b.listed - a.listed || name(a).localeCompare(name(b)));
        return rows;
    }, [holders, sort]);

    const me = siweAddress?.toLowerCase() ?? null;
    const artistHandle = getProject(slug)?.artistHandle?.toLowerCase() ?? null;
    const minted = outputs.size;
    const uniquePct = minted > 0 ? Math.round((holders.length / minted) * 100) : 0;

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
            <div
                className="modal-info"
                style={{ marginTop: 0, maxWidth: 340 }}
            >
                <div className="modal-title" style={{ marginBottom: 0 }}>
                    OWNERS
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
                            return (
                                <div
                                    key={r.addr}
                                    className={`fm-row lb-row${podium ? ` lb-podium lb-rank${i + 1}` : ''}${isMe ? ' lb-me' : ''}`}
                                >
                                    <span className="lb-pos">{podium ? MEDALS[i] : i + 1}</span>
                                    <div className="fm-row-main">
                                        <div className="fm-row-id">
                                            {r.handle ? (
                                                <CollectedPair handle={r.handle} />
                                            ) : (
                                                <span className="collected-pair"><span className="profile-link">{r.display}</span></span>
                                            )}
                                            {artistHandle && r.handle === artistHandle && (
                                                <span className="fm-artist-badge" title="Artist">{`✺${VS15}`}</span>
                                            )}
                                        </div>
                                        <div className="fm-row-stats">
                                            <span className="fm-stat" title="Pieces owned">
                                                <span className="fm-stat-ic">{`⬚${VS15}`}</span>
                                                <b>{r.pieces}</b>
                                            </span>
                                            {r.listed > 0 && (
                                                <span className="fm-stat" title="Pieces listed">
                                                    <span className="fm-stat-ic">{`✹${VS15}`}</span>
                                                    <b>{r.listed}</b>
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
                <div className="modal-stats-bottom">
                    {holders.length} {holders.length === 1 ? 'OWNER' : 'OWNERS'} · UNIQUE: {uniquePct}%
                </div>
            </div>
        </div>
    );
}
