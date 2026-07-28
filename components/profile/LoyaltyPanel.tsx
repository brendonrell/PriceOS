'use client';

/*
 * LoyaltyPanel — profile +More › Loyalty: the long game, read whole. Four
 * sections, all derived from ledgers that already exist (no writes):
 *   THE LONG GAME — member-since · user number · streak · average hold.
 *   LONGEST HELD — the pieces that stayed, oldest bond first.
 *   ARTISTS YOU BACK — patronage ranked by pieces held.
 *   PURITY — the clean-hands read: kept vs let go, unlisted, tenure.
 *
 * Anatomy is all reuse (the Counterparties precedent): the character sheet's
 * .attr-group/.attr-grid tiles for the stat blocks, the Starred list's
 * .starred-row grammar + OutputThumb for the ranked rows, podium medals on
 * the top three.
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import OutputThumb from './OutputThumb';
import { getProject } from '../../lib/project/registry';
import { formatMemberSince } from './profilePageShared';
import type { LoyaltyResponse } from '../../app/api/user/[address]/loyalty/route';

const VS15 = '︎';
/* Podium medals — the canonical top-3 rank glyphs (GLYPHS.md §7). */
const MEDALS = ['❶', '❷', '❸'];

/* "MMM DD ’YY" — viewer-local, the feed convention. */
function fmtDay(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    return `${month} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}

function fmtDays(n: number): string {
    if (n < 1) return 'TODAY';
    return n === 1 ? '1 DAY' : `${n} DAYS`;
}

/* The purity verdict, spelled for the reader (the changed thing screams —
   the verdict word itself is the ALLCAPS). */
const VERDICT_LINES: Record<string, string> = {
    DIAMOND: 'nothing leaves this wallet',
    STEADFAST: 'holds long, sells rarely',
    TEMPERED: 'keeps more than it lets go',
    RESTLESS: 'the door swings both ways',
    MERCENARY: 'everything has a price',
};

export default function LoyaltyPanel({
    address,
    handle,
    isOwnProfile,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const [data, setData] = useState<LoyaltyResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setData(null);
        setFailed(false);
        fetch(`/api/user/${address}/loyalty`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: LoyaltyResponse) => setData(j))
            .catch(() => setFailed(true));
    }, [address]);

    const who = `@${handle}`;

    return (
        <div className="ach-section cp-section loy-section">
            {!data && !failed && <div className="nbhd-note">Reading the ledger<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The ledger is unreachable right now.</div>}

            {data && (
                <>
                    {/* THE LONG GAME — the standing facts. */}
                    <section className="attr-group" aria-label="The long game">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Loyalty · the long game</span>
                            {data.user_number != null && <span className="attr-group-count">USER #{data.user_number}</span>}
                        </div>
                        <div className="attr-grid">
                            <div className="attr-tile">
                                <span className="attr-tile-label">Member since</span>
                                <span className="attr-tile-value">{data.member_since ? formatMemberSince(data.member_since) : '—'}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Streak</span>
                                <span className="attr-tile-value">{`◈${VS15} ${data.streak}${data.streak_best > data.streak ? ` · BEST ${data.streak_best}` : ''}`}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Held</span>
                                <span className="attr-tile-value">{data.held}</span>
                            </div>
                            <div className="attr-tile">
                                <span className="attr-tile-label">Avg hold</span>
                                <span className="attr-tile-value">{data.avg_hold_days != null ? fmtDays(data.avg_hold_days) : '—'}</span>
                            </div>
                        </div>
                    </section>

                    {/* LONGEST HELD — the old bonds. */}
                    <section className="attr-group" aria-label="Longest held">
                        <div className="attr-group-head">
                            <span className="attr-group-name">Longest held · the pieces that stayed</span>
                            <span className="attr-group-count">{data.oldest.length}</span>
                        </div>
                        {data.oldest.length === 0 ? (
                            <div className="nbhd-note">
                                NOTHING HELD YET — the bond starts the day a piece arrives.
                            </div>
                        ) : (
                            <div className="starred-rows loy-rows">
                                {data.oldest.map((r, i) => {
                                    const title = getProject(r.slug)?.displayName ?? r.slug.toUpperCase();
                                    return (
                                        <div
                                            key={`${r.slug}:${r.token_id}`}
                                            className="starred-row"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/art/${r.slug}/${r.token_id}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${r.slug}/${r.token_id}`); } }}
                                        >
                                            <OutputThumb slug={r.slug} id={r.token_id} />
                                            <div className="starred-row-meta">
                                                <span className="starred-row-id is-split">
                                                    <span className="srl-handle">{title}</span>
                                                    <span className="srl-suffix">#{r.token_id}</span>
                                                    {i < 3 && <span className="loy-medal">{`${MEDALS[i]}${VS15}`}</span>}
                                                </span>
                                                <span className="starred-row-sub">
                                                    held <em>{fmtDays(r.held_days)}</em> · since {fmtDay(r.acquired_at)}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </section>

                    {/* ARTISTS YOU BACK — patronage. */}
                    <section className="attr-group" aria-label="Artists backed">
                        <div className="attr-group-head">
                            <span className="attr-group-name">{isOwnProfile ? 'Artists you back · patronage' : `Artists ${who} backs · patronage`}</span>
                            <span className="attr-group-count">{data.artists.length}</span>
                        </div>
                        {data.artists.length === 0 ? (
                            <div className="nbhd-note">
                                NO PATRONAGE YET — backing an artist starts with holding their work.
                            </div>
                        ) : (
                            <div className="starred-rows loy-rows">
                                {data.artists.map((a, i) => (
                                    <div
                                        key={a.handle}
                                        className="starred-row"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => router.push(`/${a.handle}`)}
                                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${a.handle}`); } }}
                                    >
                                        <div className="trait-row-tile artist-tile">
                                            <span className="artist-row-tile-glyph">
                                                {i < 3 ? `${MEDALS[i]}${VS15}` : `✺${VS15}`}
                                            </span>
                                        </div>
                                        <div className="starred-row-meta">
                                            <span className="starred-row-id">@{a.handle}</span>
                                            <span className="starred-row-sub">
                                                {a.pieces} {a.pieces === 1 ? 'piece' : 'pieces'}
                                                <em>{` · ${a.projects} ${a.projects === 1 ? 'project' : 'projects'}`}</em>
                                                {a.since ? ` · ${fmtDay(a.since)}` : ''}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* PURITY — the clean-hands read. */}
                    {data.purity && (
                        <section className="attr-group" aria-label="Purity">
                            <div className="attr-group-head">
                                <span className="attr-group-name">Purity · the clean-hands read</span>
                                <span className="attr-group-count">{data.purity.score}/100</span>
                            </div>
                            <div className="attr-grid">
                                <div className="attr-tile pd-discord-tile-wide loy-verdict-tile">
                                    <span className="attr-tile-label">Verdict</span>
                                    <span className="attr-tile-value loy-verdict">{data.purity.verdict}</span>
                                    <span className="loy-verdict-line">{VERDICT_LINES[data.purity.verdict]}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Kept</span>
                                    <span className="attr-tile-value">{data.purity.kept} OF {data.purity.kept + data.purity.let_go}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Let go</span>
                                    <span className="attr-tile-value">{data.purity.let_go}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Listed now</span>
                                    <span className="attr-tile-value">{data.purity.listed_now} OF {data.purity.kept}</span>
                                </div>
                            </div>
                        </section>
                    )}
                </>
            )}
        </div>
    );
}
