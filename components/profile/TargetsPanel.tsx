'use client';

/*
 * TargetsPanel — profile +More › Targets: this wallet's PRICE TARGET record,
 * the 30-day floor calls it has cast (the Seal system). The seal holds: an
 * open window's number shows only to its owner — everyone else sees the call
 * exists, SEALED, and when it reveals. Closed windows are public record,
 * priced against where the floor stands today — the caller against reality.
 *
 * Anatomy is the character sheet's .attr-group tiles + rows; casting itself
 * stays where it lives (the project page's +More › Sentiment seal card).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '../../lib/project/registry';
import type { TargetsResponse, TargetRow } from '../../app/api/user/[address]/targets/route';

const VS15 = '︎';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function fmtEth(n: number): string {
    return `◊${VS15}${Number(n.toPrecision(4))}`;
}

/* "JUL ’26" from a 'YYYY-MM' window key. */
function fmtWindow(key: string): string {
    const [y, m] = key.split('-').map(Number);
    if (!y || !m) return key;
    return `${MONTHS[m - 1]} ’${String(y).slice(-2)}`;
}

function projectTitle(slug: string): string {
    const t = getProject(slug)?.displayName ?? slug.toUpperCase();
    return `${t.charAt(0)}${t.slice(1).toLowerCase()}`;
}

export default function TargetsPanel({
    address,
    isOwnProfile,
}: {
    address: string;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const [data, setData] = useState<TargetsResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let gone = false;
        setData(null);
        setFailed(false);
        fetch(`/api/user/${address}/targets`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: TargetsResponse) => { if (!gone) setData(j); })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, [address]);

    const rowLine = (r: TargetRow): string => {
        if (r.open) {
            return r.floor_call_eth != null
                ? `your call ${fmtEth(r.floor_call_eth)} · SEALED · reveals ${data?.reveals_on ?? 'next month'}`
                : `SEALED · reveals ${data?.reveals_on ?? 'next month'}`;
        }
        const call = r.floor_call_eth != null ? `call ${fmtEth(r.floor_call_eth)}` : 'call —';
        const floor = r.floor_now_eth != null ? `floor ${fmtEth(r.floor_now_eth)}` : 'floor —';
        const gap = r.gap_pct != null ? `${r.gap_pct > 0 ? '+' : ''}${r.gap_pct}%` : '';
        return `${call} · ${floor}${gap ? ` · ${gap}` : ''}`;
    };

    return (
        <div className="ach-section tgt-section">
            {!data && !failed && <div className="nbhd-note">Opening the record<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The record is unreachable right now.</div>}

            {data && (
                <section className="attr-group" aria-label="Price Targets">
                    <div className="attr-group-head">
                        <span className="attr-group-name">Price Targets · the record</span>
                        <span className="attr-group-count">{data.rows.length}</span>
                    </div>
                    {data.rows.length === 0 ? (
                        <div className="nbhd-note">
                            {isOwnProfile
                                ? 'NO CALLS YET — cast one from any project’s +More › Sentiment.'
                                : 'NO CALLS YET — this wallet hasn’t called a floor.'}
                        </div>
                    ) : (
                        <>
                            <div className="attr-grid tgt-totals">
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Sealed</span>
                                    <span className="attr-tile-value">{data.open_count}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Revealed</span>
                                    <span className="attr-tile-value">{data.revealed_count}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Avg miss</span>
                                    <span className="attr-tile-value">{data.avg_abs_gap_pct != null ? `±${data.avg_abs_gap_pct}%` : '—'}</span>
                                </div>
                            </div>
                            <div className="starred-rows tgt-rows">
                                {data.rows.map((r) => (
                                    <div
                                        key={`${r.project_id}-${r.window_key}`}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        title={`Open ${projectTitle(r.project_id)}`}
                                        onClick={() => router.push(`/art/${r.project_id}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${r.project_id}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            {/* ⬚ = the project glyph — a Price Target is a call on a
                                                project; no invented "target" icon (GLYPHS.md §7). */}
                                            <span className="artist-row-tile-glyph">{`⬚${VS15}`}</span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">
                                                {projectTitle(r.project_id)}
                                                <span className="tgt-window">{fmtWindow(r.window_key)}</span>
                                            </span>
                                            <span className="starred-row-sub">{rowLine(r)}</span>
                                            <span className="starred-row-sub">{r.open ? '30-day floor call' : 'against today’s floor'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </section>
            )}
        </div>
    );
}
