'use client';

/*
 * CounterpartiesPanel — profile +More › Counterparties: the wallets this
 * profile has ACTUALLY dealt with, straight from the ledger (sales, transfers,
 * Exchange trades — mints have no counterparty). Ranked by deals then volume,
 * podium medals on the top three (the leaderboard convention). THE NEMESIS
 * sits on top: one declared rival (yours to declare from any row on your own
 * profile), with both sides' honest floor-value read — the delta is real.
 *
 * Anatomy is all reuse: the character sheet's .attr-group/.attr-grid tiles for
 * the summary + nemesis plate (Discord wide-tile precedent), the Starred list's
 * .starred-row grammar for the ranked rows.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '../../lib/state/ToastContext';
import { usePdNotifs } from '../../lib/state/PdNotifsContext';
import { shortAddress } from '../../lib/project/projectAddress';
import type { CounterpartiesResponse, CounterpartyRow } from '../../app/api/user/[address]/counterparties/route';

const VS15 = '︎';
/* Podium medals — the canonical top-3 rank glyphs (GLYPHS.md §7). */
const MEDALS = ['❶', '❷', '❸'];

function nameOf(r: { handle: string | null; address: string }): string {
    return r.handle ? `@${r.handle}` : shortAddress(r.address);
}

function fmtEth(n: number): string {
    return `◊${VS15}${Number(n.toPrecision(4))}`;
}

/* "MMM DD ’YY" — viewer-local, the feed convention. */
function fmtDay(ts: number): string {
    const d = new Date(ts * 1000);
    if (Number.isNaN(d.getTime())) return '—';
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    return `${month} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}

export default function CounterpartiesPanel({
    address,
    handle,
    isOwnProfile,
    isAuthed,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
    isAuthed: boolean;
}) {
    const router = useRouter();
    const { showToast } = useToast();
    const { notifs, update } = usePdNotifs();
    const [data, setData] = useState<CounterpartiesResponse | null>(null);
    const [failed, setFailed] = useState(false);
    const [busy, setBusy] = useState(false);

    const load = useCallback(() => {
        fetch(`/api/user/${address}/counterparties`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: CounterpartiesResponse) => setData(j))
            .catch(() => setFailed(true));
    }, [address]);
    useEffect(() => { setData(null); setFailed(false); load(); }, [load]);

    const declare = async (target: CounterpartyRow) => {
        if (!isAuthed || busy) return;
        setBusy(true);
        try {
            const r = await fetch('/api/user/nemesis', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify({ address: target.address }),
            });
            if (r.ok) {
                showToast(`Nemesis: ${nameOf(target).toUpperCase()}`);
                load();
                window.dispatchEvent(new Event('pd:nemesis-changed'));
            }
            else showToast('Nemesis: FAILED');
        } finally { setBusy(false); }
    };
    const renounce = async () => {
        if (!isAuthed || busy) return;
        setBusy(true);
        try {
            const r = await fetch('/api/user/nemesis', { method: 'DELETE' });
            if (r.ok) {
                showToast('Nemesis: RENOUNCED');
                load();
                window.dispatchEvent(new Event('pd:nemesis-changed'));
            }
            else showToast('Nemesis: FAILED');
        } finally { setBusy(false); }
    };
    /* The HUD door (Brendon, 2026-07-20 — all Nemesis doors live HERE).
       Summon + dismiss the top-bar delta pill; default OFF. */
    const toggleHud = () => {
        const next = !notifs.nemesisHud;
        update({ nemesisHud: next });
        showToast(next ? 'Nemesis HUD: ON' : 'Nemesis HUD: OFF');
        window.dispatchEvent(new Event('pd:nemesis-changed'));
    };

    const nem = data?.nemesis ?? null;
    const ahead = nem ? nem.mine.floor_value_eth - nem.theirs.floor_value_eth : 0;

    return (
        <div className="ach-section cp-section">
            {!data && !failed && <div className="nbhd-note">Reading the ledger<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The ledger is unreachable right now.</div>}

            {data && (
                <>
                    {/* THE NEMESIS — the declared rival, above everything. */}
                    {nem && (
                        <section className="attr-group" aria-label="Nemesis">
                            <div className="attr-group-head">
                                <span className="attr-group-name">Nemesis · the declared rival</span>
                                {isOwnProfile && (
                                    <span className="cp-nem-doors">
                                        <span
                                            className="attr-group-count cp-nem-renounce"
                                            role="button"
                                            tabIndex={0}
                                            title="Summon / dismiss the top-bar Nemesis HUD"
                                            onClick={toggleHud}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleHud(); } }}
                                        >
                                            ☍{VS15} HUD: {notifs.nemesisHud ? 'ON' : 'OFF'}
                                        </span>
                                        <span
                                            className="attr-group-count cp-nem-renounce"
                                            role="button"
                                            tabIndex={0}
                                            onClick={renounce}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); void renounce(); } }}
                                        >
                                            RENOUNCE ✕{VS15}
                                        </span>
                                    </span>
                                )}
                            </div>
                            <div className="attr-grid">
                                <div
                                    className="attr-tile attr-tile-tap cp-nem-tile pd-discord-tile-wide"
                                    role="button"
                                    tabIndex={0}
                                    title={`Open ${nameOf(nem)}`}
                                    onClick={() => router.push(`/${nem.handle ?? nem.address}`)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${nem.handle ?? nem.address}`); } }}
                                >
                                    <span className="attr-tile-label">Nemesis</span>
                                    <span className="attr-tile-value">{nameOf(nem)}</span>
                                    <span className="cp-nem-delta">
                                        {`${isOwnProfile ? 'YOU' : `@${handle}`.toUpperCase()} ${fmtEth(nem.mine.floor_value_eth)} · ${nem.mine.held} HELD`}
                                        {'  —  '}
                                        {`THEM ${fmtEth(nem.theirs.floor_value_eth)} · ${nem.theirs.held} HELD`}
                                    </span>
                                    <span className={`cp-nem-verdict${ahead >= 0 ? ' is-ahead' : ''}`}>
                                        {ahead >= 0 ? `AHEAD BY ${fmtEth(Math.abs(ahead))}` : `BEHIND BY ${fmtEth(Math.abs(ahead))}`}
                                        {' — at today’s floors'}
                                    </span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* THE TABLE — who this wallet has dealt with. */}
                    <section className="attr-group" aria-label="Counterparties">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Counterparties · across the table</span>
                            <span className="attr-group-count">{data.totals.counterparties}</span>
                        </div>
                        {data.rows.length === 0 ? (
                            <div className="nbhd-note">
                                NO DEALS YET — a counterparty appears the first time a piece changes hands.
                            </div>
                        ) : (
                            <>
                                <div className="attr-grid cp-totals">
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Deals</span>
                                        <span className="attr-tile-value">{data.totals.deals}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Volume</span>
                                        <span className="attr-tile-value">{fmtEth(data.totals.volume_eth)}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Top</span>
                                        <span className="attr-tile-value">{nameOf(data.rows[0])}</span>
                                    </div>
                                </div>
                                <div className="starred-rows cp-rows">
                                    {data.rows.map((r, i) => (
                                        <div
                                            key={r.address}
                                            className="starred-row has-actions-abs"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/${r.handle ?? r.address}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${r.handle ?? r.address}`); } }}
                                        >
                                            <div className="trait-row-tile artist-tile">
                                                <span className="artist-row-tile-glyph">
                                                    {i < 3 ? `${MEDALS[i]}${VS15}` : `☻${VS15}`}
                                                </span>
                                            </div>
                                            <div className="starred-row-meta">
                                                <span className="starred-row-id">{nameOf(r)}</span>
                                                <span className="starred-row-sub">
                                                    {r.deals} {r.deals === 1 ? 'deal' : 'deals'}
                                                    <em>{` · bought ${r.bought} · sold ${r.sold}`}{r.trades > 0 ? ` · ⇌${VS15} ${r.trades}` : ''}</em>
                                                </span>
                                                <span className="starred-row-sub">
                                                    {r.volume_eth > 0 ? `${fmtEth(r.volume_eth)} · ` : ''}last {fmtDay(r.last_ts)}
                                                </span>
                                            </div>
                                            {isOwnProfile && (
                                                <div className="starred-row-actions">
                                                    {/* Two-line label — the Project Offer CTA treatment, so the
                                                        button clears the row text like every other starred row. */}
                                                    <span
                                                        className={`starred-row-cta project-offer-cta cp-nem-cta${nem?.address === r.address ? ' is-on' : ''}`}
                                                        role="button"
                                                        tabIndex={0}
                                                        title={nem?.address === r.address ? 'Your declared nemesis' : `Declare ${nameOf(r)} your nemesis`}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (nem?.address === r.address) void renounce();
                                                            else void declare(r);
                                                        }}
                                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); if (nem?.address === r.address) void renounce(); else void declare(r); } }}
                                                    >
                                                        {nem?.address === r.address ? 'NEMESIS' : <>DECLARE<br />NEMESIS</>}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </section>
                </>
            )}
        </div>
    );
}
