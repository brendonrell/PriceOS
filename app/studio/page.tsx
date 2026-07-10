'use client';

/*
 * PD Studio — the workbench (upload side) + dashboard (management side).
 * docs/pd-studio-spec.md is the plan of record; the public story is
 * content/docs/studio/*.
 *
 * v1: drafts live in localStorage (private to this device), test runs
 * simulate token hashes with the contract's derivation shape and render in
 * the REAL tokenURI envelope (lib/studio/drafts.ts), and publishing hands
 * off to /studio/publish — the bare Sepolia signer page (same family as
 * /deploy and /test).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/state/AuthContext';
import { hasStudioAccess } from '../../lib/studio/access';
import { StickerStudio } from '../../components/studio/StickerStudio';
import { GodMode } from '../../components/studio/GodMode';
import {
    addRun,
    buildEnvelope,
    loadDrafts,
    newDraft,
    saveDrafts,
    simulateRun,
    type StudioDraft,
    type StudioRun,
} from '../../lib/studio/drafts';
import { SUPPLY_MAX, SUPPLY_MIN } from '../../lib/studio/constants';

const RUN_SIZES = [6, 22, 66, 222] as const;

export default function StudioPage() {
    /* Identity comes from the SIWE session (AuthContext) — the app tree
       mounts no wagmi provider (WalletStack is a deferred SIBLING of the
       tree), so wagmi hooks here crash the server render. This was the
       /studio 500. */
    const { siweAddress: address } = useAuth();
    /* Private layers (spec in ClickUp only): resolved client-side after
       mount so the gate reads the device store — invisible to everyone
       not on the list, no greyed buttons, nothing to discover. */
    const [god, setGod] = useState(false);
    useEffect(() => setGod(hasStudioAccess(address ?? undefined)), [address]);

    const [drafts, setDrafts] = useState<StudioDraft[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [run, setRun] = useState<StudioRun | null>(null);
    const [runSize, setRunSize] = useState<number>(22);
    const [full, setFull] = useState<{ hash: `0x${string}`; tokenId: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loaded = loadDrafts();
        setDrafts(loaded);
        if (loaded.length) {
            setActiveId(loaded[0].id);
            setRun(loaded[0].runs[0] ?? null);
        }
    }, []);

    const active = drafts.find((d) => d.id === activeId) ?? null;

    const update = useCallback(
        (patch: Partial<StudioDraft>) => {
            setDrafts((prev) => {
                const next = prev.map((d) =>
                    d.id === activeId ? { ...d, ...patch, updatedAt: Date.now() } : d
                );
                saveDrafts(next);
                return next;
            });
        },
        [activeId]
    );

    const createDraft = () => {
        const d = newDraft();
        setDrafts((prev) => {
            const next = [d, ...prev];
            saveDrafts(next);
            return next;
        });
        setActiveId(d.id);
        setRun(null);
    };

    const pickDraft = (d: StudioDraft) => {
        setActiveId(d.id);
        setRun(d.runs[0] ?? null);
    };

    const onScriptFile = async (f: File | undefined) => {
        if (!f) return;
        update({ script: await f.text() });
    };

    const runTest = () => {
        if (!active || !active.script.trim()) return;
        const r = simulateRun(runSize);
        setRun(r);
        setDrafts((prev) => {
            const next = prev.map((d) => (d.id === active.id ? addRun(d, r) : d));
            saveDrafts(next);
            return next;
        });
    };

    /* Preflight — the local half; the on-chain half (whitelist, cooldown,
       bounds) is the factory simulation on /studio/publish. */
    const preflight: string[] = [];
    if (active) {
        if (!active.name.trim()) preflight.push('Project name is empty');
        if (!active.symbol.trim()) preflight.push('Symbol is empty');
        if (active.supply < SUPPLY_MIN || active.supply > SUPPLY_MAX)
            preflight.push(`Supply must be ${SUPPLY_MIN}–${SUPPLY_MAX}`);
        if (!(Number(active.priceEth) > 0)) preflight.push('Mint price must be set');
        if (!active.script.trim()) preflight.push('No script uploaded');
        if (!active.runs.length) preflight.push('Untested — run at least one test');
    }

    return (
        <div className="pd-studio">
            <div className="pd-studio-title">PD STUDIO</div>
            <div className="pd-studio-sub">upload · test · publish · manage — from your phone</div>

            {/* ── WORKBENCH ── */}
            <div className="pd-studio-section">
                <div className="pd-studio-section-title">Workbench — drafts</div>
                <div className="pd-studio-drafts">
                    <button type="button" className="pd-studio-chip" onClick={createDraft}>
                        + NEW DRAFT
                    </button>
                    {drafts.map((d) => (
                        <button
                            key={d.id}
                            type="button"
                            className={`pd-studio-chip${d.id === activeId ? ' active' : ''}`}
                            onClick={() => pickDraft(d)}
                        >
                            {d.name.trim() || 'UNTITLED'}
                        </button>
                    ))}
                </div>

                {!active && (
                    <p className="pd-studio-note">
                        A draft is your Project before the chain: script, parameters, and as many
                        test runs as it takes. Drafts are private to this device and cost nothing.
                        Start one.
                    </p>
                )}

                {active && (
                    <>
                        <div className="pd-studio-fieldrow">
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioName">Name</label>
                                <input
                                    id="pdStudioName"
                                    className="pd-studio-input"
                                    placeholder="Project name"
                                    value={active.name}
                                    onChange={(e) => update({ name: e.target.value })}
                                />
                            </div>
                            <div style={{ maxWidth: 110 }}>
                                <label className="pd-studio-label" htmlFor="pdStudioSymbol">Symbol</label>
                                <input
                                    id="pdStudioSymbol"
                                    className="pd-studio-input"
                                    placeholder="PDXX"
                                    value={active.symbol}
                                    onChange={(e) => update({ symbol: e.target.value.toUpperCase() })}
                                />
                            </div>
                        </div>
                        <div className="pd-studio-fieldrow">
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioSupply">Supply (22–9,999)</label>
                                <input
                                    id="pdStudioSupply"
                                    className="pd-studio-input"
                                    inputMode="numeric"
                                    value={active.supply}
                                    onChange={(e) => update({ supply: Number(e.target.value.replace(/\D/g, '')) || 0 })}
                                />
                            </div>
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioPrice">Mint price (ETH)</label>
                                <input
                                    id="pdStudioPrice"
                                    className="pd-studio-input"
                                    inputMode="decimal"
                                    value={active.priceEth}
                                    onChange={(e) => update({ priceEth: e.target.value })}
                                />
                            </div>
                        </div>

                        <label className="pd-studio-label" htmlFor="pdStudioScript">
                            Generative script — reads tokenData.hash, renders deterministically
                        </label>
                        <textarea
                            id="pdStudioScript"
                            className="pd-studio-script"
                            placeholder={'// your script runs exactly as tokenURI will serve it\n// var tokenData = { hash: "0x…", tokenId: "1" } is already set'}
                            value={active.script}
                            onChange={(e) => update({ script: e.target.value })}
                        />
                        <input
                            ref={fileRef}
                            type="file"
                            accept=".js,text/javascript,application/javascript"
                            style={{ display: 'none' }}
                            onChange={(e) => onScriptFile(e.target.files?.[0])}
                        />
                        <button type="button" className="pd-studio-btn" onClick={() => fileRef.current?.click()}>
                            UPLOAD SCRIPT FILE
                        </button>
                    </>
                )}
            </div>

            {/* ── TEST RUNS ── */}
            {active && (
                <div className="pd-studio-section">
                    <div className="pd-studio-section-title">
                        Test runs — unlimited, the real envelope
                    </div>
                    <div className="pd-studio-count-row">
                        {RUN_SIZES.map((n) => (
                            <button
                                key={n}
                                type="button"
                                className={`pd-studio-chip${runSize === n ? ' active' : ''}`}
                                onClick={() => setRunSize(n)}
                            >
                                {n}
                            </button>
                        ))}
                    </div>
                    <button
                        type="button"
                        className="pd-studio-btn primary"
                        disabled={!active.script.trim()}
                        onClick={runTest}
                    >
                        {active.script.trim() ? `RUN ${runSize} SIMULATED MINTS` : 'UPLOAD A SCRIPT FIRST'}
                    </button>

                    {run && (
                        <>
                            <div className="pd-studio-grid">
                                {run.hashes.map((h, i) => (
                                    <div
                                        key={h}
                                        className="pd-studio-cell"
                                        onClick={() => setFull({ hash: h, tokenId: i + 1 })}
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') setFull({ hash: h, tokenId: i + 1 });
                                        }}
                                    >
                                        <iframe
                                            sandbox="allow-scripts"
                                            srcDoc={buildEnvelope(active.script, h, i + 1)}
                                            title={`Simulated Output ${i + 1}`}
                                            loading="lazy"
                                        />
                                        <span className="pd-studio-cell-id">#{i + 1}</span>
                                    </div>
                                ))}
                            </div>
                            <div className="pd-studio-runmeta">
                                run {new Date(run.at).toLocaleString()} · {run.hashes.length} Outputs ·
                                minter {run.minter.slice(0, 10)}… · every hash kept — rerun any Output
                                exactly, before and after a script revision
                            </div>
                        </>
                    )}

                    {active.runs.length > 1 && (
                        <>
                            <label className="pd-studio-label">Past runs (tap to reload)</label>
                            <div className="pd-studio-drafts">
                                {active.runs.map((r) => (
                                    <button
                                        key={r.id}
                                        type="button"
                                        className={`pd-studio-chip${run?.id === r.id ? ' active' : ''}`}
                                        onClick={() => setRun(r)}
                                    >
                                        {r.hashes.length} @ {new Date(r.at).toLocaleTimeString()}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* ── STICKER STUDIO — private layer, upload side ── */}
            {god && <StickerStudio />}

            {/* ── PUBLISH ── */}
            {active && (
                <div className="pd-studio-section">
                    <div className="pd-studio-section-title">Publish — from a tested draft</div>
                    {active.deployed ? (
                        <p className="pd-studio-note">
                            LIVE — deployed{' '}
                            {new Date(active.deployed.at).toLocaleDateString()} · project{' '}
                            {active.deployed.project}
                        </p>
                    ) : preflight.length > 0 ? (
                        <>
                            <p className="pd-studio-note">Before this draft can go on-chain:</p>
                            {preflight.map((p) => (
                                <div key={p} className="pd-studio-row">
                                    <span className="pd-studio-row-stat">✕</span>
                                    <span className="pd-studio-row-name">{p}</span>
                                </div>
                            ))}
                        </>
                    ) : (
                        <>
                            <p className="pd-studio-note">
                                Preflight clean. The chain-side checks (whitelist, cooldown, bounds)
                                run on the signer page — you deploy from your own wallet.
                            </p>
                            <Link href="/studio/publish" className="pd-studio-btn primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>
                                CONTINUE TO SIGN &amp; DEPLOY
                            </Link>
                        </>
                    )}
                </div>
            )}

            {/* ── DASHBOARD ── */}
            <div className="pd-studio-section">
                <div className="pd-studio-section-title">Dashboard — your Projects</div>
                {drafts.length === 0 ? (
                    <p className="pd-studio-note">Nothing here yet — your drafts and deployed Projects will live here.</p>
                ) : (
                    drafts.map((d) => (
                        <div key={d.id} className="pd-studio-row">
                            <span className="pd-studio-row-name">{d.name.trim() || 'Untitled'}</span>
                            <span className="pd-studio-row-stat">
                                {d.deployed
                                    ? 'LIVE'
                                    : `${d.runs.length} run${d.runs.length === 1 ? '' : 's'} · ${d.runs.reduce((n, r) => n + r.hashes.length, 0)} outputs`}
                            </span>
                        </div>
                    ))
                )}
            </div>

            {/* ── GOD MODE — private layer, analytics side ── */}
            {god && <GodMode />}

            {/* ── Fullscreen live render ── */}
            {full && active && (
                <div className="pd-studio-full">
                    <iframe
                        sandbox="allow-scripts"
                        srcDoc={buildEnvelope(active.script, full.hash, full.tokenId)}
                        title={`Simulated Output ${full.tokenId} fullscreen`}
                    />
                    <button type="button" className="pd-studio-full-close" onClick={() => setFull(null)}>
                        CLOSE
                    </button>
                    <div className="pd-studio-full-hash">
                        #{full.tokenId} · {full.hash}
                    </div>
                </div>
            )}
        </div>
    );
}
