'use client';

/*
 * Sticker Studio — PD Studio's private upload-side layer. Renders ONLY for
 * allowlisted wallets (lib/studio/access.ts); spec lives in ClickUp only.
 * Two intake paths → one Package → preview grid → approve with wallet.
 */

import { useRef, useState } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
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

export function StickerStudio() {
    const { address } = useAccount();
    const { signMessageAsync } = useSignMessage();

    const [pkg, setPkg] = useState<StickerPackage | null>(null);
    const [pkgName, setPkgName] = useState('');
    const [approved, setApproved] = useState<ApprovedPackage[]>(() => loadPackages());
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const jsonRef = useRef<HTMLInputElement>(null);
    const svgRef = useRef<HTMLInputElement>(null);

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
        setBusy(true);
        setError(null);
        try {
            const signature = (await signMessageAsync({ message: approvalMessage(pkg) })) as Hex;
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
                                {/* eslint-disable-next-line @next/next/no-img-element */}
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
        </div>
    );
}
