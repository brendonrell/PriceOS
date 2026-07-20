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

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react';
import Link from 'next/link';
import { useAuth } from '../../lib/state/AuthContext';
import { hasStudioAccess } from '../../lib/studio/access';
import { StickerStudio } from '../../components/studio/StickerStudio';
import { GodMode } from '../../components/studio/GodMode';
import { StudioAnalytics } from '../../components/studio/StudioAnalytics';
import { VouchCard } from '../../components/studio/VouchCard';
import { ShowcaseEditor } from '../../components/studio/ShowcaseEditor';
import Hero from '../../components/hero/Hero';
import SoundtrackStarButton from '../../components/project/SoundtrackStarButton';
import { deriveSlug } from '../../lib/project/deriveSlug';
import { projectSpriteFaceFor } from '../../lib/project/projectSprite';
import { normalizePlaylistId } from '../../lib/project/soundtrack';
import { PRICE_SPRITE_VIBES, VIBE_LABELS } from '../../lib/sprites/vibes';
import { PLATFORM_TRAIT } from '../../lib/project/registry';
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

const RUN_SIZES = [8, 22, 88, 222] as const;

/** A drafted colorway counts once it's a full hex colour. */
function validHex(v: string | undefined): string | null {
    const s = (v ?? '').trim();
    return /^#[0-9a-fA-F]{6}$/.test(s) ? s.toLowerCase() : null;
}

/* The preview paints with the app's own colorway variables, scoped to the
   preview wrapper — the same derivations ColorwayContext writes at the root
   (YIQ text pick, border/stat washes), so what the artist sees IS what the
   page boot will produce for their colorway. */
function previewVars(bg: string): CSSProperties {
    const hex = bg.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16) || 0;
    const g = parseInt(hex.substring(2, 4), 16) || 0;
    const b = parseInt(hex.substring(4, 6), 16) || 0;
    const isLight = (r * 299 + g * 587 + b * 114) / 1000 >= 128;
    const text = isLight ? '#111111' : '#e0e0e0';
    return {
        '--bg-color': bg,
        '--text-color': text,
        '--accent': text,
        '--border-color': isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)',
        '--stat-bg': isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.18)',
        background: bg,
        color: text,
    } as CSSProperties;
}

export default function StudioPage() {
    /* Identity comes from the SIWE session (AuthContext) — the app tree
       mounts no wagmi provider (WalletStack is a deferred SIBLING of the
       tree), so wagmi hooks here crash the server render. This was the
       /studio 500. */
    const { siweAddress: address, handle } = useAuth();
    /* Private layers (spec in ClickUp only): resolved client-side after
       mount so the gate reads the device store — invisible to everyone
       not on the list, no greyed buttons, nothing to discover. */
    const [god, setGod] = useState(false);
    useEffect(() => setGod(hasStudioAccess(address ?? undefined)), [address]);

    /* Who is at the bench? (Brendon, 2026-07-13 — "sort out what the studio
       link does for logged-out and non-whitelisted users.") The workbench
       itself is OPEN to everyone — drafts are device-local and free, and
       letting any artist play IS the pitch. What changes by visitor:
         signed out        → one honest line up top (drafts stay on device;
                             connect to publish)
         in, not whitelisted → publish section states the filter plainly with
                             the application path
         in, whitelisted   → publish flows as before (chain re-checks anyway)
       Whitelist status via the existing /api/me/artist self-read. */
    const [artist, setArtist] = useState<'unknown' | 'yes' | 'no'>('unknown');
    useEffect(() => {
        if (!address) { setArtist('unknown'); return; }
        let live = true;
        fetch('/api/me/artist')
            .then((r) => (r.ok ? r.json() : null))
            .then((d) => { if (live && d) setArtist(d.is_artist ? 'yes' : 'no'); })
            .catch(() => {});
        return () => { live = false; };
    }, [address]);

    const [drafts, setDrafts] = useState<StudioDraft[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [run, setRun] = useState<StudioRun | null>(null);
    const [runSize, setRunSize] = useState<number>(22);
    const [full, setFull] = useState<{ hash: `0x${string}`; tokenId: number } | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    /* Soundtrack public check — fail-soft (lib/project/soundtrack.ts is the
       contract): a definitive "not public" blocks preflight; the check
       itself failing never does. */
    const [playlistCheck, setPlaylistCheck] = useState<'idle' | 'checking' | 'public' | 'bad'>('idle');
    const activeForCheck = drafts.find((d) => d.id === activeId) ?? null;
    const playlistId = normalizePlaylistId(activeForCheck?.playlist);
    useEffect(() => {
        if (!playlistId) { setPlaylistCheck('idle'); return; }
        let cancel = false;
        setPlaylistCheck('checking');
        const t = window.setTimeout(() => {
            fetch(`/api/studio/playlist?list=${encodeURIComponent(playlistId)}`)
                .then((r) => (r.ok ? r.json() : null))
                .then((d) => {
                    if (cancel) return;
                    setPlaylistCheck(d?.public === true ? 'public' : d?.public === false ? 'bad' : 'idle');
                })
                .catch(() => { if (!cancel) setPlaylistCheck('idle'); });
        }, 600);
        return () => { cancel = true; window.clearTimeout(t); };
    }, [playlistId]);

    /* The Studio opens AT ITS TOP, always (Brendon — "loads slightly scrolled
       down" bug, present since the prototype). A cold load starts at 0, but
       revisit paths (iOS restoring a prior visit's position before our manual
       scrollRestoration takes hold, standalone-PWA returns) landed the page a
       nudge down. Pin to the top after first paint — unless the URL carries a
       hash (#analytics / #stickers deep links keep their jump). */
    useEffect(() => {
        if (typeof window === 'undefined' || window.location.hash) return;
        window.scrollTo(0, 0);
        // A second pin on the next frame beats late restores that fire after
        // hydration (the "often, not always" flavour of the bug).
        const raf = requestAnimationFrame(() => {
            if (!document.body.classList.contains('modal-open')) window.scrollTo(0, 0);
        });
        return () => cancelAnimationFrame(raf);
    }, []);

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
        if (!active.vibe) preflight.push("Pick the Project's PriceSprite");
        if (!validHex(active.colorway)) preflight.push('Custom colorway is not set');
        if (!playlistId) preflight.push('Soundtrack YouTube playlist is missing');
        else if (playlistCheck === 'bad') preflight.push('YouTube playlist is not public');
        if (!active.script.trim()) preflight.push('No script uploaded');
        if (!active.runs.length) preflight.push('Untested — run at least one test');
    }

    return (
        <div className="pd-studio">
            <div className="pd-studio-title">PD STUDIO</div>
            <div className="pd-studio-sub">
                Upload · Test · Publish · Manage —{' '}
                <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>From your phone or desktop</span>
            </div>

            {/* Signed-out visitors get the whole workbench — and one honest
                line about where their work lives. */}
            {!address && (
                <p className="pd-studio-note pd-studio-gate-note">
                    You&apos;re at the bench signed out — drafts and test runs work fully and
                    stay on this device. Connect your wallet to publish.
                </p>
            )}

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

                        <label className="pd-studio-label">
                            Project PriceSprite — pick a vibe, like your own account (permanent)
                        </label>
                        <div
                            className="account-create-modal-sprite-grid"
                            role="radiogroup"
                            aria-label="Pick the Project's PriceSprite vibe"
                        >
                            {PRICE_SPRITE_VIBES.map((vibe) => {
                                const isSelected = active.vibe === vibe;
                                const glyph = projectSpriteFaceFor(deriveSlug(active.name) || 'untitled', vibe);
                                return (
                                    <button
                                        key={vibe}
                                        type="button"
                                        role="radio"
                                        aria-checked={isSelected}
                                        aria-label={`${VIBE_LABELS[vibe]} vibe`}
                                        className={
                                            'account-create-modal-sprite-cell'
                                            + (isSelected ? ' account-create-modal-sprite-cell-selected' : '')
                                        }
                                        onClick={() => update({ vibe })}
                                    >
                                        <span className="account-create-modal-sprite-glyph">{glyph}</span>
                                        <span className="account-create-modal-sprite-label">{VIBE_LABELS[vibe]}</span>
                                    </button>
                                );
                            })}
                        </div>

                        <div className="pd-studio-fieldrow">
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioColorway">Custom colorway</label>
                                <div className="pd-studio-colorway-row">
                                    <input
                                        id="pdStudioColorway"
                                        className="pd-studio-input"
                                        placeholder="#C4902A"
                                        value={active.colorway ?? ''}
                                        onChange={(e) => update({ colorway: e.target.value })}
                                    />
                                    <input
                                        type="color"
                                        className="pd-studio-swatch"
                                        aria-label="Pick the custom colorway"
                                        value={validHex(active.colorway) ?? '#c4902a'}
                                        onChange={(e) => update({ colorway: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pd-studio-fieldrow">
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioPlaylist">
                                    Soundtrack — public YouTube playlist
                                </label>
                                <input
                                    id="pdStudioPlaylist"
                                    className="pd-studio-input"
                                    placeholder="youtube.com/playlist?list=…"
                                    inputMode="url"
                                    value={active.playlist ?? ''}
                                    onChange={(e) => update({ playlist: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="pd-studio-label" htmlFor="pdStudioPlaylistLabel">Soundtrack label</label>
                                <input
                                    id="pdStudioPlaylistLabel"
                                    className="pd-studio-input"
                                    placeholder="Artist — Album"
                                    value={active.playlistLabel ?? ''}
                                    onChange={(e) => update({ playlistLabel: e.target.value })}
                                />
                            </div>
                        </div>
                        {playlistId && playlistCheck !== 'idle' && (
                            <p className="pd-studio-note" role="status">
                                {playlistCheck === 'checking' && 'Playlist: checking…'}
                                {playlistCheck === 'public' && 'Playlist: PUBLIC ✓'}
                                {playlistCheck === 'bad' && 'Playlist: NOT PUBLIC — make it public on YouTube'}
                            </p>
                        )}

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
                        <p className="pd-studio-note">
                            Traits are optional — every Output carries PD&apos;s platform traits
                            regardless. If your script defines traits, consider <b>Subtraits</b>,
                            unique to PD: named buckets that group one trait&apos;s values into a
                            middle layer (Trait → Subtrait → Value). They live in the schema, not
                            per-token data — so the grouping can evolve without re-minting.
                        </p>
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

            {/* ── PREVIEW — the would-be Project page, faithful: the REAL hero
                   component + the app's own colorway variable derivations,
                   scoped to this full-width wrapper. Change the colorway, the
                   page repaints; add a soundtrack, the button appears — what
                   shows here is what the page boot produces after upload. ── */}
            {active && (
                <div className="pd-studio-section pd-studio-preview-head">
                    <div className="pd-studio-section-title">Preview — your Project page</div>
                    {!validHex(active.colorway) ? (
                        <p className="pd-studio-note">Set the custom colorway and the full page preview paints below.</p>
                    ) : (
                        <p className="pd-studio-note">
                            Full width, live, in your colorway — hero plus the page beneath with
                            the chosen run amount. What you see is what uploads.
                        </p>
                    )}
                </div>
            )}
            {active && validHex(active.colorway) && (
                <div className="pd-studio-preview" style={previewVars(validHex(active.colorway)!)}>
                    <Hero
                        ariaLabel="Project page preview"
                        titleRow={
                            <h1 className="project-title">
                                {/* Title text wrapped so the app's title→date gap rule
                                    (.project-title > span:first-child) lands here too. */}
                                <span>{(active.name.trim() || 'UNTITLED').toUpperCase()}</span>
                                <span className="project-date-wrap">
                                    <span className="project-date">
                                        {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).replace(',', '').toUpperCase()}
                                    </span>
                                </span>
                            </h1>
                        }
                        identityRow={
                            <div className="hero-line project-custom">
                                <span className="by-text">By</span>{' '}
                                <div className="artist-lockup">
                                    <span className="artist-name-wrap">
                                        <a>@{handle ?? 'you'}</a>
                                        <span className="artist-tag" aria-label="artist">{'✺︎'}</span>
                                    </span>
                                </div>
                            </div>
                        }
                        statsRow={
                            <div className="hero-line stats-row">
                                <span className="stat-item">
                                    <span className="stat-icon stat-icon-box">⬚&#xFE0E;</span>{' '}
                                    <span className="stat-val">0/{active.supply}</span>
                                </span>
                                <span className="stat-item stat-item-vol">
                                    <span className="stat-icon-eth">⟠&#xFE0E;</span>{' '}
                                    <span className="stat-val stat-val-vol">0 VOL</span>
                                </span>
                            </div>
                        }
                    >
                        <div className="action-row">
                            <button className="btn-mint" type="button" style={{ cursor: 'default' }}>
                                <span className="mint-lbl">MINT</span>
                                <span className="mint-price">({active.priceEth || '—'} ETH)</span>
                            </button>
                            {playlistId && (
                                <SoundtrackStarButton
                                    slug={deriveSlug(active.name) || 'untitled'}
                                    playlistId={playlistId}
                                    label={active.playlistLabel?.trim() || active.name.trim() || 'Soundtrack'}
                                    title={`${active.name.trim() || 'Untitled'} by @${handle ?? 'you'} Soundtrack`}
                                />
                            )}
                        </div>

                        {/* The page's tab pills, as they will ship: Showcase ·
                            Artworks (live) · an empty + More. Static here —
                            the preview shows the page, it doesn't run it. */}
                        <div className="profile-tabs-row">
                            <div className="pill pill-l1"><span className="stat-name">Showcase</span></div>
                            <div className="pill pill-l1 active"><span className="stat-name">Artworks</span></div>
                            <div className="pill pill-l1"><span className="stat-name">+ More</span></div>
                        </div>

                        {/* Trait pills — the platform traits EVERY Project
                            carries from mint one (artist traits + Subtraits
                            join them from your script's trait schema). */}
                        <div className="traits-ui">
                            <div className="traits-header-bar">
                                <div className="stats-container">
                                    {Object.values(PLATFORM_TRAIT).map((t) => (
                                        <div key={t} className="pill pill-l1"><span className="stat-name">{t}</span></div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </Hero>
                    {run ? (
                        <div className="pd-studio-grid pd-studio-preview-grid">
                            {run.hashes.slice(0, runSize).map((h, i) => (
                                <div key={h} className="pd-studio-cell">
                                    <iframe
                                        sandbox="allow-scripts"
                                        srcDoc={buildEnvelope(active.script, h, i + 1)}
                                        title={`Preview Output ${i + 1}`}
                                        loading="lazy"
                                    />
                                    <span className="pd-studio-cell-id">#{i + 1}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="pd-studio-note" style={{ padding: '0 16px 18px' }}>
                            Run a test and the page fills with your Outputs.
                        </p>
                    )}
                </div>
            )}

            {/* ── STICKER STUDIO — private layer, upload side ── */}
            {god && <div id="stickers"><StickerStudio /></div>}

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
                    ) : !address ? (
                        <p className="pd-studio-note">
                            Preflight clean. Connect your wallet to continue — publishing is
                            signed from your own wallet, and the artist whitelist is checked
                            on-chain at the door.
                        </p>
                    ) : artist === 'no' ? (
                        <p className="pd-studio-note">
                            Preflight clean — but this wallet isn&apos;t on the artist whitelist
                            yet. PD is filtered: a quality floor every project passes, not a
                            taste gate. To apply, write price@pricediscussion.com with your
                            work — drafts and test runs here are yours regardless.
                        </p>
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

            {/* ── DASHBOARD · ANALYTICS — the indexer-fed side (spec #2).
                   Live per-Project reads: mints, collectors, floor, listings,
                   sales, volume, followers, 14-day mint pace, last moments. ── */}
            <div className="pd-studio-section" id="analytics">
                <div className="pd-studio-section-title">Dashboard — analytics</div>
                <StudioAnalytics handle={handle ?? null} god={god} />
            </div>

            {/* ── DASHBOARD · DRAFTS ── */}
            <div className="pd-studio-section">
                <div className="pd-studio-section-title">Dashboard — your drafts</div>
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

            {/* ── VOUCH — whitelisted artists' two forward-an-artist slots;
                   renders nothing for everyone else. Sits at the bottom of the
                   dashboard (Brendon, 2026-07-18). ── */}
            {/* ── SHOWCASE — per-project artist customization (Brendon,
                   2026-07-20): manual placement first-class, turnkey second.
                   Renders only for artists with minted releases. ── */}
            <ShowcaseEditor address={address ?? null} />

            <VouchCard address={address ?? null} />

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
