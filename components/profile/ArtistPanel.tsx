'use client';

/*
 * ArtistPanel — profile +More › Artist: the case for this artist, told
 * entirely through numbers that already exist. No new integrations, no
 * self-reported anything. Three sections, all derived (no writes):
 *   THE RECORD — volume · collectors · projects · sold out · days active.
 *   THE ARC — mint price → current floor, ranked by gain, podium medals.
 *   SOLD OUT — time to sellout, fastest first.
 *   A VERDICT — one word, always a compliment (quieter for less, never a
 *   knock — Brendon, 2026-09-13).
 *
 * Anatomy is the Loyalty precedent, reused wholesale: .attr-group/.attr-grid
 * tiles, .starred-rows + .loy-medal for ranked rows, .loy-verdict-tile for
 * the verdict.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatEth } from '../../lib/format/eth';
import type { ArtistResponse } from '../../app/api/user/[address]/artist/route';

const VS15 = '︎';
const MEDALS = ['❶', '❷', '❸'];

const VERDICT_LINES: Record<string, string> = {
    'LEGENDARY': 'sells out, holds value, no exceptions',
    'IN DEMAND': "collectors don't wait around for these",
    'RISING': 'the floor keeps climbing',
    'STEADY': 'an artist collectors trust',
    'ONE TO WATCH': 'early days — worth paying attention',
};

function fmtPct(n: number): string {
    const pct = Math.round(n * 100);
    return `${pct >= 0 ? '+' : ''}${pct}%`;
}

function fmtDay(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    return `${month} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}

export default function ArtistPanel({
    address,
    handle,
    isOwnProfile,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const [data, setData] = useState<ArtistResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setData(null);
        setFailed(false);
        fetch(`/api/user/${address}/artist`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: ArtistResponse) => setData(j))
            .catch(() => setFailed(true));
    }, [address]);

    const who = `@${handle}`;

    return (
        <div className="ach-section cp-section art-section">
            {!data && !failed && <div className="nbhd-note">Reading the ledger<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The ledger is unreachable right now.</div>}

            {data && (
                <>
                    {/* THE RECORD — the standing facts. */}
                    <section className="attr-group" aria-label="The record">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Artist · the record</span>
                        </div>
                        <div className="attr-grid">
                            <div className="attr-tile">
                                <span className="attr-tile-label">Volume</span>
                                <span className="attr-tile-value">{`${formatEth(data.total_volume_eth)}Ξ`}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Collectors</span>
                                <span className="attr-tile-value">{data.total_collectors}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Projects</span>
                                <span className="attr-tile-value">{data.projects_count}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Sold out</span>
                                <span className="attr-tile-value">{`${data.sold_out_count} OF ${data.projects_count}`}</span>
                            </div>
                        </div>
                    </section>

                    {/* THE ARC — mint price to current floor. */}
                    <section className="attr-group" aria-label="The arc">
                        <div className="attr-group-head">
                            <span className="attr-group-name">The arc · mint to floor</span>
                            <span className="attr-group-count">{data.arc.length}</span>
                        </div>
                        {data.arc.length === 0 ? (
                            <div className="nbhd-note">
                                NO ACTIVE FLOOR YET — the arc fills in once a listing goes live.
                            </div>
                        ) : (
                            <div className="starred-rows loy-rows">
                                {data.arc.map((r, i) => (
                                    <div
                                        key={r.slug}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => router.push(`/${r.slug}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${r.slug}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            <span className="artist-row-tile-glyph">
                                                {i < 3 ? `${MEDALS[i]}${VS15}` : `✺${VS15}`}
                                            </span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">{r.title}</span>
                                            <span className="starred-row-sub">
                                                MINT {formatEth(r.mint_price_eth)}Ξ → FLOOR {formatEth(r.floor_eth)}Ξ
                                                <em>{` · ${fmtPct(r.gain)}`}</em>
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* SOLD OUT — momentum, fastest first. */}
                    <section className="attr-group" aria-label="Sold out">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Sold out · fastest first</span>
                            <span className="attr-group-count">{data.sellout.length}</span>
                        </div>
                        {data.sellout.length === 0 ? (
                            <div className="nbhd-note">
                                STILL MINTING — nothing&apos;s sold out yet, the run isn&apos;t over.
                            </div>
                        ) : (
                            <div className="starred-rows loy-rows">
                                {data.sellout.map((r, i) => (
                                    <div
                                        key={r.slug}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => router.push(`/${r.slug}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${r.slug}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            <span className="artist-row-tile-glyph">
                                                {i < 3 ? `${MEDALS[i]}${VS15}` : `✺${VS15}`}
                                            </span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">{r.title}</span>
                                            <span className="starred-row-sub">
                                                sold out in <em>{r.days_to_sellout === 0 ? 'under a day' : `${r.days_to_sellout} ${r.days_to_sellout === 1 ? 'day' : 'days'}`}</em> · {fmtDay(r.sold_out_at)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* A VERDICT — always a compliment. */}
                    {data.verdict && (
                        <section className="attr-group" aria-label="Verdict">
                            <div className="attr-group-head">
                                <span className="attr-group-name">{isOwnProfile ? 'Your read' : `${who} · the read`}</span>
                                <span className="attr-group-count">{data.verdict.score}/100</span>
                            </div>
                            <div className="attr-grid">
                                <div className="attr-tile pd-discord-tile-wide loy-verdict-tile">
                                    <span className="attr-tile-label">Verdict</span>
                                    <span className="attr-tile-value loy-verdict">{data.verdict.verdict}</span>
                                    <span className="loy-verdict-line">{VERDICT_LINES[data.verdict.verdict]}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Sold out</span>
                                    <span className="attr-tile-value">{`${data.verdict.sold_out} OF ${data.verdict.projects}`}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Avg arc</span>
                                    <span className="attr-tile-value">{data.verdict.avg_gain != null ? fmtPct(data.verdict.avg_gain) : '—'}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Days active</span>
                                    <span className="attr-tile-value">{data.days_active != null ? data.days_active : '—'}</span>
                                </div>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
