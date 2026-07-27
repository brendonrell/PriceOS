'use client';

/*
 * VaultPanel — THE VAULT v2 (+More › Vault). Rebuilt 2026-07-27 on Brendon's
 * order: the sealed-door theatre is GONE ("I just want a clean page —
 * USEFUL"). The Vault is now exactly what he specced: ALBUMS, BUT ONLY FOR
 * PIECES YOU OWN — numbered vaults (VAULT 01, VAULT 02, …) you designate
 * grails into, with a stats block under each vault's pieces reading the real
 * money: est at floor · spent · net · best piece · average hold · top rarity.
 *
 * Anatomy is the Albums surface verbatim (Rule #0): the covers grid, the
 * piece grid, SELECT tools, the app's confirm cards — same classes, same
 * mechanics (lib/pins/vaultStore = albumStore's twin). Differences:
 *   · PUBLIC — every visitor sees the walls (served by /api/vaults/[address],
 *     which also returns the per-piece money facts the stats run on).
 *   · ADD lives IN the panel — a picker of the owner's real holdings, tap to
 *     vault / un-vault. Owned-only is enforced by construction: the picker
 *     offers holdings and nothing else.
 *   · The vault mark is ⧈ (a box locked inside a box — GLYPHS.md §12k).
 */

import { useEffect, useMemo, useState } from 'react';
import OutputThumb from './OutputThumb';
import { useModal } from '../../lib/state/ModalContext';
import { useToast } from '../../lib/state/ToastContext';
import { getProject } from '../../lib/project/registry';
import { pdRarityRank } from '../../lib/output/rarity';
import {
    getVaults,
    subscribeVaults,
    createVault,
    addToVault,
    removeFromVault,
    deleteVault,
    setVaultCover,
    moveToVaultFront,
    type VaultRecord,
} from '../../lib/pins/vaultStore';
import type { Holding } from './profilePageShared';

const VS15 = '︎';
/** The Vault mark — ⧈ (U+29C8, squared square: a piece boxed inside the
    vault). Catalogued in GLYPHS.md §12k. */
const VAULT_GLYPH = `⧈${VS15}`;

interface PieceFact { paid_eth: number | null; acquired_at: string | null }
interface Facts {
    pieces: Record<string, PieceFact>;
    floors: Record<string, number | null>;
}

function parseKey(k: string): { slug: string; id: number } | null {
    const i = k.lastIndexOf(':');
    if (i <= 0) return null;
    const id = Number(k.slice(i + 1));
    if (!Number.isFinite(id)) return null;
    return { slug: k.slice(0, i), id };
}

function pad2(n: number): string {
    return n < 10 ? `0${n}` : String(n);
}

function fmtEth(n: number): string {
    return String(Number(n.toFixed(3)));
}

/* ── Cover tile — the Albums cover mosaic, wearing the vault's label. ────── */
function VaultCoverTile({ vault, number, estEth, onOpen }: {
    vault: VaultRecord; number: number; estEth: number; onOpen: () => void;
}) {
    const coverKey = vault.cover && vault.keys.includes(vault.cover) ? vault.cover : null;
    const cells = coverKey ? [coverKey] : vault.keys.slice(0, 4);
    return (
        <button
            type="button"
            className="album-tile"
            style={{ animationDelay: `${Math.min(number - 1, 8) * 55}ms` }}
            onClick={onOpen}
        >
            <span className={`album-tile-art${coverKey ? ' single' : ''}${cells.length === 0 ? ' empty' : ''}`}>
                {cells.map((k, i) => {
                    const m = parseKey(k);
                    return m ? (
                        <span key={`${i}-${k}`} className="album-cell">
                            <OutputThumb slug={m.slug} id={m.id} size={coverKey ? 170 : 85} crop />
                        </span>
                    ) : null;
                })}
                {!coverKey && cells.length === 0 && <span className="album-tile-empty">{VAULT_GLYPH}</span>}
            </span>
            <span className="album-tile-label">
                <span className="album-tile-name">{VAULT_GLYPH} VAULT {pad2(number)}</span>
                <span className="album-tile-count">
                    {estEth > 0 && <span className="album-tile-worth"><span className="eth-mark">◊</span>{fmtEth(estEth)} · </span>}
                    {vault.keys.length}
                </span>
            </span>
        </button>
    );
}

export default function VaultPanel({
    address,
    handle,
    isOwnProfile,
    holdings,
}: {
    address: string;
    handle: string;
    isOwnProfile: boolean;
    holdings: Holding[];
}) {
    const { open: openModal } = useModal();
    const { showToast } = useToast();

    /* Structure: the owner reads the live local store (instant edits); a
       visitor reads the served walls. */
    const [ownVaults, setOwnVaults] = useState<ReadonlyArray<VaultRecord>>([]);
    const [remoteVaults, setRemoteVaults] = useState<VaultRecord[] | null>(null);
    useEffect(() => {
        if (!isOwnProfile) return;
        setOwnVaults(getVaults());
        return subscribeVaults(setOwnVaults);
    }, [isOwnProfile]);

    /* Money facts (both viewers) + the visitor's vault walls — one read. */
    const [facts, setFacts] = useState<Facts | null>(null);
    useEffect(() => {
        const addr = address?.toLowerCase();
        if (!addr) return;
        let cancelled = false;
        fetch(`/api/vaults/${addr}`, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: { vaults?: VaultRecord[]; pieces?: Record<string, PieceFact>; floors?: Record<string, number | null> } | null) => {
                if (cancelled || !d) return;
                setFacts({ pieces: d.pieces ?? {}, floors: d.floors ?? {} });
                if (!isOwnProfile) setRemoteVaults(Array.isArray(d.vaults) ? d.vaults : []);
            })
            .catch(() => {});
        return () => { cancelled = true; };
    }, [address, isOwnProfile]);

    const vaults: ReadonlyArray<VaultRecord> = isOwnProfile ? ownVaults : (remoteVaults ?? []);

    const [openId, setOpenId] = useState<string | null>(null);
    const [selecting, setSelecting] = useState(false);
    const [adding, setAdding] = useState(false);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [confirm, setConfirm] = useState<{ question: string; ok: string; onConfirm: () => void } | null>(null);

    const openIdx = vaults.findIndex((v) => v.id === openId);
    const openVault = openIdx >= 0 ? vaults[openIdx] : null;
    const openNumber = openIdx + 1;

    /* Est value of a vault at floor — the tile worth + the stats EST. */
    const estOf = (v: VaultRecord): number => {
        if (!facts) return 0;
        let sum = 0;
        for (const k of v.keys) {
            const m = parseKey(k);
            const f = m ? facts.floors[m.slug] : null;
            if (f != null && f > 0) sum += f;
        }
        return sum;
    };

    /* THE STATS BLOCK — the vault read as money + taste, all real data. */
    const stats = useMemo(() => {
        if (!openVault || openVault.keys.length === 0) return null;
        const members = openVault.keys.map(parseKey).filter((m): m is { slug: string; id: number } => !!m);
        let est = 0;
        let spent = 0;
        let traced = 0;
        let holdSumMs = 0;
        let holdN = 0;
        let best: { gain: number; slug: string; id: number } | null = null;
        let rare: { rank: number; total: number; slug: string; id: number } | null = null;
        for (const m of members) {
            const k = `${m.slug}:${m.id}`;
            const floor = facts?.floors[m.slug] ?? null;
            const fact = facts?.pieces[k];
            if (floor != null) est += floor;
            if (fact?.paid_eth != null) { spent += fact.paid_eth; traced++; }
            if (fact?.acquired_at) {
                const t = Date.parse(fact.acquired_at);
                if (!Number.isNaN(t)) { holdSumMs += Math.max(0, Date.now() - t); holdN++; }
            }
            if (floor != null && fact?.paid_eth != null) {
                const gain = floor - fact.paid_eth;
                if (!best || gain > best.gain) best = { gain, slug: m.slug, id: m.id };
            }
            const r = pdRarityRank(m.slug, m.id);
            if (r && (!rare || r.rank < rare.rank)) rare = { rank: r.rank, total: r.total, slug: m.slug, id: m.id };
        }
        const net = est - spent;
        const avgHoldDays = holdN > 0 ? Math.round(holdSumMs / holdN / 86_400_000) : null;
        return { pieces: members.length, est, spent, traced, net, avgHoldDays, best, rare };
    }, [openVault, facts]);

    /* ── Covers grid ─────────────────────────────────────────────────────── */
    if (!openVault) {
        return (
            <div className="albums-wrap vault-wrap">
                {vaults.length === 0 && (
                    <p className="album-empty-note">
                        {isOwnProfile
                            ? 'No vaults yet — start your first and designate your grails.'
                            : `@${handle} has nothing vaulted yet.`}
                    </p>
                )}
                <div className="albums-covers">
                    {vaults.map((v, i) => (
                        <VaultCoverTile
                            key={v.id}
                            vault={v}
                            number={i + 1}
                            estEth={estOf(v)}
                            onOpen={() => { setOpenId(v.id); setSelecting(false); setAdding(false); setSelected(new Set()); }}
                        />
                    ))}
                    {isOwnProfile && (
                        <button
                            type="button"
                            className="album-tile album-tile-new"
                            onClick={() => {
                                const rec = createVault();
                                showToast(`Vault #${vaults.length + 1}: CREATED`);
                                setOpenId(rec.id);
                                setAdding(true);
                            }}
                        >
                            <span className="album-tile-art album-tile-plus">＋</span>
                            <span className="album-tile-label"><span className="album-tile-name">NEW VAULT</span></span>
                        </button>
                    )}
                </div>
            </div>
        );
    }

    /* ── One vault ───────────────────────────────────────────────────────── */
    const members = openVault.keys.map(parseKey).filter((m): m is { slug: string; id: number } => !!m);
    const inVault = new Set(openVault.keys);
    const selKeys = Array.from(selected);

    const toggleSel = (k: string) => {
        setSelected((s) => {
            const n = new Set(s);
            if (n.has(k)) n.delete(k); else n.add(k);
            return n;
        });
    };

    const doRemove = () => {
        setConfirm({
            question: `Remove ${selKeys.length} piece${selKeys.length === 1 ? '' : 's'} from Vault #${openNumber}? The pieces stay yours.`,
            ok: 'Remove',
            onConfirm: () => {
                const n = removeFromVault(openVault.id, selKeys) ?? 0;
                showToast(`Vault #${openNumber}: REMOVED ${n}`);
                setSelected(new Set());
            },
        });
    };
    const doFront = () => {
        if (moveToVaultFront(openVault.id, selKeys)) {
            showToast(`Vault #${openNumber}: MOVED TO FRONT`);
            setSelected(new Set());
        }
    };
    const doCover = () => {
        if (selKeys.length === 1 && setVaultCover(openVault.id, selKeys[0])) {
            showToast('Cover: SET');
            setSelected(new Set());
            setSelecting(false);
        }
    };
    const doDelete = () => {
        setConfirm({
            question: `Delete Vault #${openNumber}? Its ${openVault.keys.length} piece${openVault.keys.length === 1 ? '' : 's'} stay yours.`,
            ok: 'Delete',
            onConfirm: () => {
                deleteVault(openVault.id);
                showToast(`Vault #${openNumber}: DELETED`);
                setOpenId(null);
            },
        });
    };

    return (
        <div className="albums-wrap vault-wrap">
            <div className="album-head">
                <button
                    type="button"
                    className="album-back"
                    onClick={() => { setOpenId(null); setSelecting(false); setAdding(false); setSelected(new Set()); }}
                >
                    ‹ VAULTS
                </button>
                <span className="album-title">{VAULT_GLYPH} VAULT {pad2(openNumber)} · {openVault.keys.length}</span>
                {isOwnProfile && (
                    <span className="album-head-actions">
                        <button
                            type="button"
                            className={`album-head-btn vault-add-btn${adding ? ' on' : ''}`}
                            title="Designate pieces you own into this vault"
                            onClick={() => { setAdding((v) => !v); setSelecting(false); setSelected(new Set()); }}
                        >
                            {adding ? 'DONE' : '+ ADD'}
                        </button>
                        {!adding && (
                            <button
                                type="button"
                                className={`album-head-btn album-select-btn${selecting ? ' on' : ''}`}
                                onClick={() => { setSelecting((v) => !v); setSelected(new Set()); }}
                            >
                                {selecting ? 'DONE' : 'SELECT'}
                            </button>
                        )}
                    </span>
                )}
            </div>

            {adding ? (
                <>
                    {/* THE ADD DOOR — your real holdings, nothing else (owned-only
                        by construction). Tap vaults a piece; tap again un-vaults. */}
                    <p className="album-empty-note">Tap your pieces to vault them. Tap again to take them back out.</p>
                    <div className="album-pieces">
                        {holdings.map((h, i) => {
                            const k = `${h.slug}:${h.token_id}`;
                            const isIn = inVault.has(k);
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    className={`album-piece${isIn ? ' selected' : ''}`}
                                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                                    onClick={() => {
                                        if (isIn) removeFromVault(openVault.id, [k]);
                                        else addToVault(openVault.id, [{ slug: h.slug, id: h.token_id }]);
                                    }}
                                >
                                    <OutputThumb slug={h.slug} id={h.token_id} size={130} crop />
                                    <span className="album-check">{isIn ? '▣' : '❐'}{VS15}</span>
                                </button>
                            );
                        })}
                    </div>
                    {holdings.length === 0 && (
                        <p className="album-empty-note">Nothing collected yet — a vault holds pieces you own.</p>
                    )}
                </>
            ) : (
                <>
                    {members.length === 0 && (
                        <p className="album-empty-note">
                            {isOwnProfile ? 'Empty — tap + ADD to designate your grails.' : 'Empty vault.'}
                        </p>
                    )}

                    <div className="album-pieces">
                        {members.map((m, i) => {
                            const k = `${m.slug}:${m.id}`;
                            const isSel = selected.has(k);
                            return (
                                <button
                                    key={k}
                                    type="button"
                                    className={`album-piece${isSel ? ' selected' : ''}`}
                                    style={{ animationDelay: `${Math.min(i, 8) * 45}ms` }}
                                    onClick={() => (selecting ? toggleSel(k) : openModal('output', m.id, m.slug))}
                                >
                                    <OutputThumb slug={m.slug} id={m.id} size={130} crop />
                                    {selecting && <span className="album-check">{isSel ? '▣' : '❐'}{VS15}</span>}
                                </button>
                            );
                        })}
                    </div>

                    {/* THE STATS BLOCK — below the artworks (Brendon's call):
                        the vault read as money + taste, every number real. */}
                    {stats && (
                        <div className="vault-stats">
                            <div className="cpl-tiles vault-stat-tiles">
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{VAULT_GLYPH} PIECES</span>
                                    <span className="cpl-tile-value">{stats.pieces}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`✹${VS15}`} EST</span>
                                    <span className="cpl-tile-value"><span className="eth-mark">◊</span>{fmtEth(stats.est)}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`◊${VS15}`} SPENT</span>
                                    <span className="cpl-tile-value"><span className="eth-mark">◊</span>{fmtEth(stats.spent)}</span>
                                </div>
                                <div className="cpl-tile">
                                    <span className="cpl-tile-label">{`ƒ${VS15}`} NET</span>
                                    <span className="cpl-tile-value">{`${stats.net >= 0 ? '+' : '−'}${fmtEth(Math.abs(stats.net))}`}</span>
                                </div>
                            </div>
                            <div className="vault-stat-lines">
                                {stats.best && (
                                    <div className="vault-stat-line">
                                        BEST · {(getProject(stats.best.slug)?.displayName ?? stats.best.slug).toUpperCase()} #{stats.best.id} · {stats.best.gain >= 0 ? '+' : '−'}<span className="eth-mark">◊</span>{fmtEth(Math.abs(stats.best.gain))}
                                    </div>
                                )}
                                {stats.avgHoldDays != null && (
                                    <div className="vault-stat-line">AVG HOLD · {stats.avgHoldDays}D</div>
                                )}
                                {stats.rare && (
                                    <div className="vault-stat-line">
                                        TOP RARITY · {(getProject(stats.rare.slug)?.displayName ?? stats.rare.slug).toUpperCase()} #{stats.rare.id} · #{stats.rare.rank} OF {stats.rare.total}
                                    </div>
                                )}
                                {stats.traced < stats.pieces && (
                                    <div className="vault-stat-line vault-stat-note">SPENT COVERS {stats.traced}/{stats.pieces} PIECES</div>
                                )}
                            </div>
                        </div>
                    )}

                    {selecting && (
                        <div className="album-tools">
                            <button type="button" className="album-tool" disabled={selKeys.length === 0} onClick={doRemove}>REMOVE</button>
                            <button type="button" className="album-tool" disabled={selKeys.length === 0} onClick={doFront}>FRONT</button>
                            <button type="button" className="album-tool" disabled={selKeys.length !== 1} onClick={doCover}>COVER</button>
                            <button type="button" className="album-tool album-tool-danger" onClick={doDelete}>DELETE VAULT</button>
                        </div>
                    )}
                </>
            )}

            {confirm && (
                <div className="starred-confirm-overlay" role="dialog" aria-modal="true" onClick={() => setConfirm(null)}>
                    <div className="ms-confirm-card is-centered" onClick={(e) => e.stopPropagation()}>
                        <div className="ms-confirm-question">{confirm.question}</div>
                        <div className="ms-confirm-btns">
                            <button className="ms-confirm-btn ms-confirm-btn--cancel" onClick={() => setConfirm(null)}>Cancel</button>
                            <button className="ms-confirm-btn ms-confirm-btn--ok" onClick={() => { confirm.onConfirm(); setConfirm(null); }}>{confirm.ok}</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
