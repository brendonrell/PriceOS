'use client';

/*
 * SigilPanel — profile +More › Sigil: the forged mark, read apart, and the
 * war record around it.
 *   THE MARK — the tattoo large, decomposed into its named parts (form ·
 *     core · edges · companion) with the rarity read against every forged
 *     mark on the platform.
 *   KIN — the closest marks (shared cores, forms, fences), each wearing its
 *     own sigil; tap through to the kin's profile.
 *   THE FLAG / THE BOOK / THE OLD GUARD — the wallet's faction: standing,
 *     conquests, the Book's lines where the flag stood on either side, and
 *     the longest-sworn comrades. IYKYK: the war sections render only for a
 *     viewer flying a flag themselves (the useFaction law) — civilians see
 *     the mark and its kin, nothing of the war.
 *
 * Anatomy is all reuse: .attr-group/.attr-grid tiles (character sheet),
 * .starred-row grammar for the rows, SigilArt for every mark, WAR_GLYPHS for
 * the Book kinds. sigil_hidden stays a render-time gate — a hidden mark
 * shows only to its owner.
 */

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import SigilArt from '../SigilArt';
import { getProject } from '../../lib/project/registry';
import { sigilAnatomy } from '../../lib/sigil/sigil';
import { factionByKey, WAR_GLYPHS } from '../../lib/factions/factions';
import { useFaction } from '../../lib/factions/useFaction';
import { shortAddress } from '../../lib/project/projectAddress';
import type { SigilTabResponse } from '../../app/api/user/[address]/sigil/route';

const VS15 = '︎';

function nameOf(r: { handle: string | null; address: string }): string {
    return r.handle ? `@${r.handle}` : shortAddress(r.address);
}

/* "MMM DD ’YY" — viewer-local, the feed convention. */
function fmtDay(iso: string | null): string {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    const month = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
    const day = d.toLocaleDateString('en-US', { day: '2-digit' });
    return `${month} ${day} ’${String(d.getFullYear()).slice(-2)}`;
}

function pct(share: number): string {
    const p = share * 100;
    return p >= 10 ? `${Math.round(p)}%` : `${Number(p.toPrecision(2))}%`;
}

/* 1st · 2nd · 3rd · 4th — the forge order reads as a place in line. */
function ordinal(n: number): string {
    const t = n % 100;
    if (t >= 11 && t <= 13) return `${n}TH`;
    return `${n}${['TH', 'ST', 'ND', 'RD'][n % 10] ?? 'TH'}`;
}

/* Book kinds wear the war vocabulary (GLYPHS.md §13); everything else the
   Book's own ledger mark. */
function bookGlyph(kind: string): string {
    if (kind === 'CONQUEST') return WAR_GLYPHS.banner;
    if (kind.startsWith('SIEGE')) return WAR_GLYPHS.siege;
    if (kind === 'STRUCK') return WAR_GLYPHS.struck;
    return WAR_GLYPHS.book;
}

export default function SigilPanel({
    address,
    handle,
    isOwnProfile,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
}) {
    const router = useRouter();
    const viewerFaction = useFaction();
    const [data, setData] = useState<SigilTabResponse | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        setData(null);
        setFailed(false);
        fetch(`/api/user/${address}/sigil`)
            .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
            .then((j: SigilTabResponse) => setData(j))
            .catch(() => setFailed(true));
    }, [address]);

    const anatomy = useMemo(() => sigilAnatomy(address), [address]);
    const who = `@${handle}`;

    /* The hide is platform-wide except to the owner (the after-name rule). */
    const markVisible = data?.forged === true && (isOwnProfile || !data.hidden);
    const profileFaction = data?.faction ? factionByKey(data.faction.key) : null;
    const ink = profileFaction?.hex ?? 'var(--text-color)';
    /* IYKYK — war sections only for a viewer flying a flag (useFaction law). */
    const warVisible = data?.faction != null && viewerFaction != null;

    return (
        <div className="ach-section cp-section sig-section">
            {!data && !failed && <div className="nbhd-note">Reading the mark<span className="nbhd-ellipsis">…</span></div>}
            {failed && <div className="nbhd-note">The mark is unreachable right now.</div>}

            {data && (
                <>
                    {/* THE MARK — the tattoo, read apart. */}
                    {!data.forged && (
                        <div className="nbhd-note">
                            {isOwnProfile
                                ? 'UNFORGED — the Forge waits at the end of your logo carousel.'
                                : `UNFORGED — ${who} has not struck a mark.`}
                        </div>
                    )}
                    {data.forged && !markVisible && (
                        <div className="nbhd-note">{`${who} keeps the mark hidden.`}</div>
                    )}
                    {markVisible && (
                        <section className="attr-group" aria-label="The mark">
                            <div className="attr-group-head">
                                <span className="attr-group-name">The mark · forged, permanent</span>
                                {isOwnProfile && data.hidden
                                    ? <span className="attr-group-count">HIDDEN</span>
                                    : data.forge_number != null && <span className="attr-group-count">{ordinal(data.forge_number)} EVER FORGED</span>}
                            </div>
                            <div className="attr-grid">
                                <div className="attr-tile pd-discord-tile-wide sig-mark-tile">
                                    <SigilArt address={address} hex={ink} fill title="Sigil" />
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Form</span>
                                    <span className="attr-tile-value">{anatomy.formName}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Core</span>
                                    <span className="attr-tile-value">
                                        {anatomy.core}{anatomy.core2 ? ` · ${anatomy.core2}` : ''}
                                        {data.core_share != null ? ` — ${pct(data.core_share)} OF MARKS` : ''}
                                    </span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Edges</span>
                                    <span className="attr-tile-value">{anatomy.edges ? `${anatomy.edges[0]} ${anatomy.edges[1]}` : 'OPEN'}</span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Companion</span>
                                    <span className="attr-tile-value">{anatomy.side ?? 'NONE'}</span>
                                </div>
                                {/* Accents — the combining marks that ride the core.
                                    Shown on the dotted circle ◌, the standard base for
                                    displaying a combining mark on its own. */}
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Accents</span>
                                    <span className="attr-tile-value">
                                        {anatomy.above || anatomy.below
                                            ? `${anatomy.above ? `◌${anatomy.above}` : ''}${anatomy.above && anatomy.below ? ' · ' : ''}${anatomy.below ? `◌${anatomy.below}` : ''}`
                                            : 'BARE'}
                                    </span>
                                </div>
                                <div className="attr-tile">
                                    <span className="attr-tile-label">Struck</span>
                                    <span className="attr-tile-value">{fmtDay(data.forged_at)}</span>
                                </div>
                            </div>
                        </section>
                    )}

                    {/* KIN — the closest marks on the platform. */}
                    {markVisible && (
                        <section className="attr-group" aria-label="Kin">
                            <div className="attr-group-head">
                                <span className="attr-group-name">{`≍${VS15} Kin · the marks closest to ${isOwnProfile ? 'yours' : 'this one'}`}</span>
                                <span className="attr-group-count">{data.forged_total} FORGED</span>
                            </div>
                            {data.kin.length === 0 ? (
                                <div className="nbhd-note">
                                    NO KIN YET — every new forge redraws the field.
                                </div>
                            ) : (
                                <div className="starred-rows loy-rows">
                                    {data.kin.map((k) => (
                                        <div
                                            key={k.address}
                                            className="starred-row"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/${k.handle ?? k.address}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${k.handle ?? k.address}`); } }}
                                        >
                                            <div className="trait-row-tile sig-kin-tile">
                                                <SigilArt address={k.address} hex="var(--text-color)" fill />
                                            </div>
                                            <div className="starred-row-meta">
                                                <span className="starred-row-id">{nameOf(k)}</span>
                                                <span className="starred-row-sub">
                                                    shares <em>{k.shared.join(' · ')}</em>
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {/* THE FLAG — the faction record (IYKYK-gated). */}
                    {warVisible && data.faction && (
                        <>
                            <section className="attr-group" aria-label="The flag">
                                <div className="attr-group-head">
                                    <span className="attr-group-name">{`${WAR_GLYPHS.banner} The flag · ${isOwnProfile ? 'your faction' : `${who}’s faction`}`}</span>
                                    {data.faction.defections > 0 && <span className="attr-group-count">{data.faction.defections} {data.faction.defections === 1 ? 'SCAR' : 'SCARS'}</span>}
                                </div>
                                <div className="attr-grid">
                                    <div className="attr-tile pd-discord-tile-wide sig-flag-tile">
                                        <span className="attr-tile-label">Sworn to</span>
                                        <span className="attr-tile-value">
                                            <span className="sig-flag-swatch" style={{ background: profileFaction?.hex }} aria-hidden="true" />
                                            {data.faction.key}
                                            {data.faction.sworn_at ? ` · since ${fmtDay(data.faction.sworn_at)}` : ''}
                                        </span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Comrades</span>
                                        <span className="attr-tile-value">{data.faction.members}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Held</span>
                                        <span className="attr-tile-value">{data.faction.held}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Strongholds</span>
                                        <span className="attr-tile-value">{data.faction.strongholds}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Sieges</span>
                                        <span className="attr-tile-value">{data.faction.sieges}</span>
                                    </div>
                                    <div className="attr-tile">
                                        <span className="attr-tile-label">Conquests</span>
                                        <span className="attr-tile-value">{data.faction.conquests}</span>
                                    </div>
                                </div>
                            </section>

                            {/* THE GROUND — where the flag actually flies. */}
                            {data.faction.ground.length > 0 && (
                                <section className="attr-group" aria-label="The ground">
                                    <div className="attr-group-head">
                                        <span className="attr-group-name">{`${WAR_GLYPHS.corner} The ground · where the flag flies`}</span>
                                        <span className="attr-group-count">{data.faction.ground.length}</span>
                                    </div>
                                    <div className="starred-rows loy-rows">
                                        {data.faction.ground.map((g) => {
                                            const title = getProject(g.slug)?.displayName ?? g.slug.toUpperCase();
                                            return (
                                                <div
                                                    key={`${g.slug}:${g.role}`}
                                                    className="starred-row"
                                                    role="button"
                                                    tabIndex={0}
                                                    onClick={() => router.push(`/art/${g.slug}`)}
                                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/art/${g.slug}`); } }}
                                                >
                                                    <div className="trait-row-tile sig-kin-tile">
                                                        <span className="artist-row-tile-glyph">
                                                            {g.role === 'BESIEGING' ? WAR_GLYPHS.siege : g.status === 'STRONGHOLD' ? WAR_GLYPHS.banner : WAR_GLYPHS.corner}
                                                        </span>
                                                    </div>
                                                    <div className="starred-row-meta">
                                                        <span className="starred-row-id">{title}</span>
                                                        <span className="starred-row-sub">
                                                            <em>{g.role === 'BESIEGING' ? 'BESIEGING' : g.status}</em>
                                                            {g.since ? ` · since ${fmtDay(g.since)}` : ''}
                                                        </span>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </section>
                            )}

                            {/* THE BOOK — what the comrades have been doing. */}
                            <section className="attr-group" aria-label="Faction activity">
                                <div className="attr-group-head">
                                    <span className="attr-group-name">{`${WAR_GLYPHS.book} The Book · where the flag stood`}</span>
                                    <span className="attr-group-count">{data.faction.book.length}</span>
                                </div>
                                {data.faction.book.length === 0 ? (
                                    <div className="nbhd-note">
                                        NO LINES YET — the Book writes itself when the flag moves.
                                    </div>
                                ) : (
                                    <div className="starred-rows loy-rows">
                                        {data.faction.book.map((b, i) => (
                                            <div key={`${b.ts}:${i}`} className="starred-row sig-book-row">
                                                <div className="trait-row-tile sig-kin-tile">
                                                    <span className="artist-row-tile-glyph">{bookGlyph(b.kind)}</span>
                                                </div>
                                                <div className="starred-row-meta">
                                                    <span className="starred-row-id sig-book-line">{b.line}</span>
                                                    <span className="starred-row-sub">{fmtDay(b.ts)}{b.project ? ` · ${b.project.toUpperCase()}` : ''}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </section>

                            {/* THE OLD GUARD — longest sworn. */}
                            <section className="attr-group" aria-label="The old guard">
                                <div className="attr-group-head">
                                    <span className="attr-group-name">The old guard · longest sworn</span>
                                    <span className="attr-group-count">{data.faction.comrades.length} OF {data.faction.members}</span>
                                </div>
                                <div className="starred-rows loy-rows">
                                    {data.faction.comrades.map((c) => (
                                        <div
                                            key={c.address}
                                            className="starred-row"
                                            role="button"
                                            tabIndex={0}
                                            onClick={() => router.push(`/${c.handle ?? c.address}`)}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); router.push(`/${c.handle ?? c.address}`); } }}
                                        >
                                            <div className="trait-row-tile sig-kin-tile">
                                                {c.forged
                                                    ? <SigilArt address={c.address} hex={profileFaction?.hex ?? 'var(--text-color)'} fill />
                                                    : <span className="artist-row-tile-glyph">{`☻${VS15}`}</span>}
                                            </div>
                                            <div className="starred-row-meta">
                                                <span className="starred-row-id">{nameOf(c)}{c.address === address.toLowerCase() ? ' — HERE' : ''}</span>
                                                <span className="starred-row-sub">sworn {fmtDay(c.sworn_at)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    )}
                </>
            )}
        </div>
    );
}
