'use client';

/*
 * Sticker Studio — PD Studio's private upload-side layer. Renders ONLY for
 * allowlisted wallets (lib/studio/access.ts); spec lives in ClickUp only.
 * Two intake paths → one Package → preview grid → approve with wallet.
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/state/AuthContext';
import { getWalletSignMessage, openConnectModal } from '../../lib/wallet/walletBus';
import type { Hex } from 'viem';
import {
    approvalMessage,
    loadPackages,
    packageHash,
    parsePackage,
    savePackage,
    type ApprovedPackage,
    type StickerPackage,
} from '../../lib/studio/stickerPackages';
import { SHEETS } from '../../lib/stickers/catalog';

/* Collector collabs — a sheet with a collab pays that user the 3% creator
   share of every secondary trade (platform keeps its 2%; no collab → the 3%
   defaults to Brendon's wallet). Brendon, 2026-07-16. */
interface SheetCollab {
    sheet_id: string;
    collab_address: string;
    collab_handle: string | null;
}

export function StickerStudio() {
    /* Identity from the SIWE session — no wagmi hooks in the app tree (the
       wallet stack is a deferred sibling; see WalletProviders). Signing rides
       the walletBus seam, registered by the stack while a wallet is connected. */
    const { siweAddress: address } = useAuth();

    const [pkg, setPkg] = useState<StickerPackage | null>(null);
    const [pkgName, setPkgName] = useState('');
    const [approved, setApproved] = useState<ApprovedPackage[]>(() => loadPackages());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const jsonRef = useRef<HTMLInputElement>(null);
    const svgRef = useRef<HTMLInputElement>(null);

    /* Collector collabs (3% share routing) — server-backed, sheet-keyed. */
    const [collabs, setCollabs] = useState<SheetCollab[]>([]);
    const [collabSheet, setCollabSheet] = useState('');
    const [collabUser, setCollabUser] = useState('');
    const [collabBusy, setCollabBusy] = useState(false);
    const [collabErr, setCollabErr] = useState<string | null>(null);
    useEffect(() => {
        if (!address) return;
        fetch('/api/studio/sticker-collabs', { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (d?.collabs) setCollabs(d.collabs as SheetCollab[]); })
            .catch(() => {});
    }, [address]);
    const postCollab = async (body: Record<string, unknown>) => {
        setCollabBusy(true);
        setCollabErr(null);
        try {
            const r = await fetch('/api/studio/sticker-collabs', {
                method: 'POST',
                headers: { 'content-type': 'application/json' },
                body: JSON.stringify(body),
            });
            const j = (await r.json().catch(() => ({}))) as { error?: string; collabs?: SheetCollab[] };
            if (!r.ok) throw new Error(j?.error ? String(j.error) : 'Failed');
            const fresh = await fetch('/api/studio/sticker-collabs', { cache: 'no-store' });
            const fd = (await fresh.json().catch(() => null)) as { collabs?: SheetCollab[] } | null;
            if (fd?.collabs) setCollabs(fd.collabs);
            setCollabUser('');
        } catch (e) {
            setCollabErr(e instanceof Error ? e.message : String(e));
        } finally {
            setCollabBusy(false);
        }
    };

    const intakeJson = (raw: string) => {
        setError(null);
        try {
            setPkg(parsePackage(raw));
        } catch (e) {
            setError(e instanceof Error ? e.message : String(e));
        }
    };

    const intakeSvgs = async (files: FileList | null) => {
        if (!files?.length) return;
        setError(null);
        const stickers = await Promise.all(
            Array.from(files).map(async (f) => ({
                name: f.name.replace(/\.svg$/i, ''),
                svg: await f.text(),
            }))
        );
        const bad = stickers.find((s) => !s.svg.includes('<svg'));
        if (bad) {
            setError(`"${bad.name}" is not an SVG`);
            return;
        }
        setPkg({ name: pkgName.trim() || 'Untitled Package', stickers });
    };

    const approve = async () => {
        if (!pkg || !address) return;
        const sign = getWalletSignMessage();
        if (!sign) {
            /* SIWE identity is sticky but the wallet connection is ephemeral —
               signing needs a live wallet, so prompt a reconnect (the
               sanctioned flow for wallet-bound actions). */
            openConnectModal();
            setError('Connect your wallet to sign the approval.');
            return;
        }
        setBusy(true);
        setError(null);
        try {
            const signature = (await sign(approvalMessage(pkg))) as Hex;
            const entry: ApprovedPackage = {
                ...pkg,
                id: `p${Date.now().toString(36)}`,
                hash: packageHash(pkg),
                approvedBy: address,
                signature,
                approvedAt: Date.now(),
            };
            setApproved(savePackage(entry));
            setPkg(null);
        } catch (e) {
            setError((e instanceof Error ? e.message : String(e)).split('\n')[0].slice(0, 160));
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="pd-studio-section">
            <div className="pd-studio-section-title">Sticker Studio</div>

            <label className="pd-studio-label">Package name (Figma path)</label>
            <input
                className="pd-studio-input"
                placeholder="e.g. Genesis Extras"
                value={pkgName}
                onChange={(e) => setPkgName(e.target.value)}
            />
            <input
                ref={svgRef}
                type="file"
                accept=".svg,image/svg+xml"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => intakeSvgs(e.target.files)}
            />
            <input
                ref={jsonRef}
                type="file"
                accept=".json,application/json"
                style={{ display: 'none' }}
                onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (f) intakeJson(await f.text());
                }}
            />
            <div className="pd-studio-fieldrow">
                <button type="button" className="pd-studio-btn" onClick={() => svgRef.current?.click()}>
                    ADD SVGS (FIGMA)
                </button>
                <button type="button" className="pd-studio-btn" onClick={() => jsonRef.current?.click()}>
                    IMPORT PACKAGE JSON
                </button>
            </div>
            <label className="pd-studio-label">…or paste a Package (Claude path)</label>
            <textarea
                className="pd-studio-script"
                style={{ minHeight: 80 }}
                placeholder='{"name":"…","stickers":[{"name":"…","svg":"<svg…>"}]}'
                onChange={(e) => e.target.value.trim() && intakeJson(e.target.value)}
            />

            {error && <div className="pd-studio-err">{error}</div>}

            {pkg && (
                <>
                    <label className="pd-studio-label">
                        {pkg.name} — {pkg.stickers.length} sticker{pkg.stickers.length === 1 ? '' : 's'}
                    </label>
                    <div className="pd-studio-grid">
                        {pkg.stickers.map((s, i) => (
                            <div key={`${s.name}${i}`} className="pd-studio-cell" style={{ cursor: 'default' }}>
                                {/* img sandboxes the SVG — no scripts execute */}
                                { }
                                <img
                                    src={`data:image/svg+xml;utf8,${encodeURIComponent(s.svg)}`}
                                    alt={s.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                                <span className="pd-studio-cell-id">{s.name}</span>
                            </div>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="pd-studio-btn primary"
                        disabled={busy || !address}
                        onClick={approve}
                    >
                        {busy ? 'CONFIRM IN WALLET…' : 'APPROVE PACKAGE WITH WALLET'}
                    </button>
                </>
            )}

            {approved.length > 0 && (
                <>
                    <label className="pd-studio-label">Approved packages</label>
                    {approved.map((p) => (
                        <div key={p.id} className="pd-studio-row">
                            <span className="pd-studio-row-name">{p.name}</span>
                            <span className="pd-studio-row-stat">
                                {p.stickers.length} · signed {new Date(p.approvedAt).toLocaleDateString()}
                            </span>
                        </div>
                    ))}
                </>
            )}

            {/* Collector collabs — route a sheet's 3% creator share to a user.
                No collab on a sheet → the 3% defaults to Brendon's wallet;
                the 2% platform share never moves. */}
            <label className="pd-studio-label">Collector collabs — the sheet&apos;s 3% trade share</label>
            <div className="pd-studio-fieldrow">
                <select
                    className="pd-studio-input"
                    value={collabSheet}
                    onChange={(e) => setCollabSheet(e.target.value)}
                >
                    <option value="">sheet…</option>
                    {SHEETS.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
                <input
                    className="pd-studio-input"
                    placeholder="@user (existing)"
                    value={collabUser}
                    onChange={(e) => setCollabUser(e.target.value)}
                />
                <button
                    type="button"
                    className="pd-studio-btn"
                    disabled={collabBusy || !collabSheet || !collabUser.trim()}
                    onClick={() => void postCollab({ action: 'set', sheet: collabSheet, user: collabUser.trim() })}
                >
                    {collabBusy ? 'SAVING…' : 'SET COLLAB'}
                </button>
            </div>
            {collabErr && <div className="pd-studio-err">{collabErr}</div>}
            {collabs.length > 0 && (
                <>
                    {collabs.map((c) => (
                        <div key={c.sheet_id} className="pd-studio-row">
                            <span className="pd-studio-row-name">
                                {SHEETS.find((s) => s.id === c.sheet_id)?.name ?? c.sheet_id}
                            </span>
                            <span className="pd-studio-row-stat">
                                3% → {c.collab_handle ? `@${c.collab_handle}` : `${c.collab_address.slice(0, 6)}…${c.collab_address.slice(-4)}`}
                            </span>
                            <button
                                type="button"
                                className="pd-studio-btn"
                                disabled={collabBusy}
                                onClick={() => void postCollab({ action: 'remove', sheet: c.sheet_id })}
                            >
                                REMOVE
                            </button>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}
