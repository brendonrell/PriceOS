'use client';

/*
 * CallsPanel — profile +More › Calls: this wallet's CONVICTION record (the
 * Call Ledger, approved 2026-07-26). Every call it has posted — public,
 * immutable, settled CROWNED or REKT against the project floor — plus the
 * W–L record chip. Posting lives on the project page (+More › Sentiment ›
 * THE CALL LEDGER); this is the permanent reputation read.
 *
 * Anatomy mirrors TargetsPanel next door (attr-group tiles + starred rows)
 * so the two records read as siblings.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getProject } from '../../lib/project/registry';
import type { CallsResponse, CallOut } from '../../app/api/calls/route';
import { formatEth } from '../../lib/format/eth';

const VS15 = '︎';
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function projectTitle(slug: string): string {
    const t = getProject(slug)?.displayName ?? slug.toUpperCase();
    return `${t.charAt(0)}${t.slice(1).toLowerCase()}`;
}

function fmtDay(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function claimText(c: CallOut): string {
    const dir = c.claim_type === 'floor_gte' ? '≥' : '≤';
    return `floor ${dir} ◊${VS15} ${formatEth(c.target_eth)} by ${fmtDay(c.window_end)}`;
}

export default function CallsPanel({
    address,
    isOwnProfile,
}: {
    address: string;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const [data, setData] = useState<CallsResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let gone = false;
        setData(null);
        setFailed(false);
        fetch(`/api/calls?user=${encodeURIComponent(address.toLowerCase())}`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: CallsResponse) => { if (!gone) setData(j); })
            .catch(() => { if (!gone) setFailed(true); });
        return () => { gone = true; };
    }, [address]);

    const record = data?.record;

    return (
        <div className="ach-section tgt-section">
            {!data && !failed && <div className="nbhd-note">Opening the ledger<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The ledger is unreachable right now.</div>}

            {data && (
                <section className="attr-group" aria-label="Conviction Calls">
                    <div className="attr-group-head">
                        <span className="attr-group-name">Conviction · the call ledger</span>
                        <span className="attr-group-count">{data.calls.length}</span>
                    </div>
                    {data.calls.length === 0 ? (
                        <div className="nbhd-note">
                            {isOwnProfile
                                ? 'NO CALLS YET — post one from any project’s +More › Sentiment › THE CALL LEDGER.'
                                : 'NO CALLS YET — this wallet hasn’t put a call on the record.'}
                        </div>
                    ) : (
                        <>
                            <div className="attr-grid tgt-totals">
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Record</span>
                                    <span className="attr-tile-value">{record ? `${record.crowned}–${record.rekt}` : '—'}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Crowned</span>
                                    <span className="attr-tile-value">{record?.crowned ?? 0}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Open</span>
                                    <span className="attr-tile-value">{record?.open ?? 0}</span>
                                </div>
                            </div>
                            <div className="starred-rows tgt-rows">
                                {data.calls.map((c) => (
                                    <div
                                        key={c.id}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        title={`Open ${projectTitle(c.project_id)}`}
                                        onClick={() => router.push(`/art/${c.project_id}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${c.project_id}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            {/* ⬚ = the project glyph — a call is on a project;
                                                no invented icon (GLYPHS.md §7, the Targets precedent). */}
                                            <span className="artist-row-tile-glyph">{`⬚${VS15}`}</span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">
                                                {projectTitle(c.project_id)}
                                                <span className="tgt-window">
                                                    {c.status === 'open' ? 'OPEN' : c.status === 'crowned' ? 'CROWNED' : 'REKT'}
                                                </span>
                                            </span>
                                            <span className="starred-row-sub">{claimText(c)}</span>
                                            <span className="starred-row-sub">
                                                {c.status === 'open'
                                                    ? `posted ${fmtDay(c.created_at)} · settles on the floor`
                                                    : `posted ${fmtDay(c.created_at)} · settled ${c.resolved_at ? fmtDay(c.resolved_at) : ''}${c.floor_at_resolve != null ? ` at ◊${VS15} ${formatEth(c.floor_at_resolve)}` : ''}`}
                                            </span>
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
