'use client';

/*
 * PriceHoldersBoard — the $PRICE TOP HOLDERS list, extracted from
 * PriceLeaderboardModal so it can render TWICE: inside that modal's popup
 * shell, and inline on the @price profile's Holders tab (Brendon,
 * 2026-08-13). Same fm-row / lb-row anatomy either place — position ·
 * sprite · @name, amount held on the right, top three medalled, your own
 * row highlighted. The modal keeps the backdrop/close/Etherscan chrome
 * around it; this component is just the fetch + the rows.
 */

import { useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import AsciiId from '../hero/AsciiId';
import { UserTags } from '../tags/UserTags';
import { useUserTags } from '../../lib/hooks/useUserTags';
import type { PriceHolderRow } from '../../app/api/leaderboard/price/route';

const VS15 = '︎';
/* Podium medals for the top three (GLYPHS.md §7); ranks 4+ stay plain. */
const MEDALS = [`❶${VS15}`, `❷${VS15}`, `❸${VS15}`];

/* Whole-token amount → readable string. Under 1,000 keeps two decimals; larger
   holdings round to whole tokens so the number stays glanceable. */
function fmtHeld(n: number): string {
    return n.toLocaleString(undefined, { maximumFractionDigits: n >= 1000 ? 0 : 2 });
}

export default function PriceHoldersBoard() {
    const { siweAddress } = useAuth();
    const [rows, setRows] = useState<PriceHolderRow[]>([]);
    const [loading, setLoading] = useState(true);

    /* Top 100 — fetched fresh on mount (holdings move). */
    useEffect(() => {
        let alive = true;
        setLoading(true);
        fetch('/api/leaderboard/price', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { rows?: PriceHolderRow[] } | null) => {
                if (!alive) return;
                setRows(Array.isArray(d?.rows) ? d.rows : []);
            })
            .catch(() => { if (alive) setRows([]); })
            .finally(() => { if (alive) setLoading(false); });
        return () => { alive = false; };
    }, []);

    /* Profile tags for the charted holders — one batched read, shared cache. */
    const tagSets = useUserTags(rows.map((r) => r.handle));
    const me = siweAddress?.toLowerCase() ?? null;

    return (
        <div className="fm-list price-holders-board">
            {loading && rows.length === 0 ? (
                <div className="fm-empty fm-loading">Loading…</div>
            ) : rows.length === 0 ? (
                <div className="fm-empty">No ranked holders yet — the board is wide open.</div>
            ) : (
                rows.map((r, i) => (
                    <div className={`fm-row lb-row${i < 3 ? ` lb-podium lb-rank${i + 1}` : ''}${me === r.address ? ' lb-me' : ''}`} key={r.address}>
                        <span className="lb-pos">{i < 3 ? MEDALS[i] : i + 1}</span>
                        <div className="fm-row-main">
                            <div className="fm-row-id">
                                <AsciiId handle={r.handle} />
                            </div>
                            <UserTags set={tagSets[r.handle.toLowerCase()]} size="row" />
                            <div className="fm-row-stats">
                                <span className="fm-stat" title="$PRICE held">
                                    <b className="lb-score-num">{fmtHeld(r.priceHeld)}</b>
                                    <span className="lb-price-unit">PRICE</span>
                                </span>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );
}
