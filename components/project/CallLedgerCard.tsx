'use client';

/*
 * CallLedgerCard — THE CONVICTION / CALL LEDGER, project side (approved
 * 2026-07-26). Post a signed, PUBLIC, IMMUTABLE call on this project's floor
 * — bull (reaches ≥ X) or bear (sits ≤ X) by a fixed deadline (24H/7D/30D) —
 * and it settles CROWNED or REKT against the floor, permanently. The recent
 * ledger renders below the composer; a wallet's full record lives on its
 * profile (the Calls panel).
 *
 * Deliberately the OPPOSITE of the Price Targets seal card above it: Targets
 * is sealed, retargetable, monthly, aggregate. A Call is public bravado with
 * receipts forever. Neither touches the other.
 */

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { useToast } from '../../lib/state/ToastContext';
import { formatEth } from '../../lib/format/eth';
import type { CallsResponse, CallOut } from '../../app/api/calls/route';
import { CALL_WINDOWS, type CallWindowKey } from '../../lib/calls/resolve';

const VS15 = '︎';

function shortAddr(addr: string): string {
    return addr.length > 10 ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : addr;
}

function whoOf(c: CallOut): string {
    return c.handle ? `@${c.handle}` : shortAddr(c.address);
}

/* "by JUL 30" deadline read, viewer-local like every clock on the site. */
function fmtDeadline(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
    return `${M[d.getMonth()]} ${d.getDate()}`;
}

export function callLine(c: CallOut): string {
    const dir = c.claim_type === 'floor_gte' ? '≥' : '≤';
    return `floor ${dir} ◊${VS15} ${formatEth(c.target_eth)} by ${fmtDeadline(c.window_end)}`;
}

export default function CallLedgerCard({ slug }: { slug: string }) {
    const { siweAddress } = useAuth();
    const { showToast } = useToast();

    const [calls, setCalls] = useState<CallOut[] | null>(null);
    const [claim, setClaim] = useState<'floor_gte' | 'floor_lte'>('floor_gte');
    const [target, setTarget] = useState('');
    const [win, setWin] = useState<CallWindowKey>('7D');
    const [posting, setPosting] = useState(false);

    const load = useCallback(() => {
        fetch(`/api/calls?project=${encodeURIComponent(slug)}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: CallsResponse | null) => { if (d) setCalls(d.calls); })
            .catch(() => {});
    }, [slug]);
    useEffect(() => { setCalls(null); load(); }, [load]);

    const post = async () => {
        const eth = Number(target);
        if (!Number.isFinite(eth) || eth <= 0) {
            showToast('Conviction: SET A TARGET');
            return;
        }
        if (posting) return;
        setPosting(true);
        try {
            const r = await fetch('/api/calls', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project: slug, claim_type: claim, target_eth: eth, window: win }),
            });
            if (r.ok) {
                setTarget('');
                showToast('Conviction: POSTED — RIGHT FOREVER OR WRONG FOREVER');
                load();
            } else {
                const j = (await r.json().catch(() => null)) as { error?: string } | null;
                showToast(j?.error ? `Conviction: ${j.error.toUpperCase()}` : 'Conviction: TRY AGAIN');
            }
        } catch {
            showToast('Conviction: TRY AGAIN');
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="more-box-wrap">
            <div className="call-card">
                <div className="call-card-label">CALL IT · THE FLOOR SETTLES IT</div>

                {siweAddress ? (
                    <>
                        <div className="call-compose">
                            <button
                                type="button"
                                className={`pill pill-l1${claim === 'floor_gte' ? ' active' : ''}`}
                                onClick={() => setClaim('floor_gte')}
                            >
                                <span className="stat-name">BULL ≥</span>
                            </button>
                            <button
                                type="button"
                                className={`pill pill-l1${claim === 'floor_lte' ? ' active' : ''}`}
                                onClick={() => setClaim('floor_lte')}
                            >
                                <span className="stat-name">BEAR ≤</span>
                            </button>
                            <input
                                className="call-compose-input"
                                type="number"
                                inputMode="decimal"
                                min="0"
                                step="any"
                                placeholder="◊ ETH"
                                value={target}
                                onChange={(e) => setTarget(e.target.value)}
                            />
                            {CALL_WINDOWS.map((w) => (
                                <button
                                    key={w.key}
                                    type="button"
                                    className={`pill pill-l1${win === w.key ? ' active' : ''}`}
                                    onClick={() => setWin(w.key)}
                                >
                                    <span className="stat-name">{w.key}</span>
                                </button>
                            ))}
                            <button type="button" className="call-post-btn" disabled={posting} onClick={() => { void post(); }}>
                                {posting ? 'POSTING…' : 'POST CALL'}
                            </button>
                        </div>
                        <div className="call-fine-print">
                            Signed · public · UN-EDITABLE. A cross settles it CROWNED early; the deadline settles it REKT.
                        </div>
                    </>
                ) : (
                    <div className="call-fine-print">
                        CONNECT TO POST — a call is signed, public and permanent. Right forever, or wrong forever.
                    </div>
                )}

                {calls == null ? (
                    <div className="call-fine-print">Opening the ledger<span className="nbhd-ellipsis">…</span></div>
                ) : calls.length === 0 ? (
                    <div className="call-fine-print">NO CALLS YET — the first name in this ledger is remembered.</div>
                ) : (
                    <div>
                        {calls.map((c) => (
                            <div key={c.id} className="call-row">
                                <span className="call-row-main">
                                    {whoOf(c)} · {callLine(c)}
                                </span>
                                {c.status === 'open' ? (
                                    <span className="call-verdict">OPEN</span>
                                ) : (
                                    <span className={`call-verdict ${c.status}`}>{c.status === 'crowned' ? 'CROWNED' : 'REKT'}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
