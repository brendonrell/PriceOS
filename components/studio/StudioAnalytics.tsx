'use client';

/*
 * StudioAnalytics — the analytics side of PD Studio (docs/pd-studio-spec.md
 * locked decision #2), v1. One card per LIVE Project of the signed-in
 * artist, read from the same indexer-fed pipeline the whole app runs on
 * (events / holders / listings via the public project API): minted count,
 * collectors, floor, live listings, sales + volume, followers, a 14-day
 * mint-pace strip, and the last ledger moments.
 *
 * Access-list wallets with no Projects of their own get the PLATFORM VIEW —
 * the whole catalog — consistent with God Mode owning the analytics side's
 * platform lens (spec #5). Everyone else sees exactly their own work.
 *
 * Phase 2 (docs/briefs/studio-phase2.md, Opus-able): artist pings,
 * cross-device drafts. (Royalty accounting + soundtrack management landed
 * 2026-07-13 — the artist batch.)
 */

import { useEffect, useState } from 'react';
import { allProjects, getProject } from '../../lib/project/registry';
import { formatEth } from '../../lib/format/eth';
import { shareLink } from '../../lib/pwa/share';
import { useToast } from '../../lib/state/ToastContext';
import { ArtistPush } from './ArtistPush';
import { SoundtrackManager } from './SoundtrackManager';

/* The artist's take, straight from the deployed contracts: 95% of every
   mint (PDFactory primary split) and 60% of the 5% secondary royalty
   (PaymentSplitter ARTIST_PCT) = 3% of every sale. */
const PRIMARY_TAKE = 0.95;
const SECONDARY_TAKE = 0.05 * 0.6;

interface FeedEvent {
    type: string;
    price_eth: string | null;
    timestamp: string;
}

interface ProjectAna {
    slug: string;
    name: string;
    supply: number;
    minted: number;
    collectors: number;
    floorEth: string | null;
    listed: number;
    volumeEth: string;
    followers: number;
    sales: number;
    /** Mints per day, oldest → newest, exactly 14 entries. */
    pace: number[];
    recent: FeedEvent[];
    /** The artist's earnings: 95% of primary + 3% of secondary volume. */
    earnedEth: number;
}

const DAY_MS = 86_400_000;

function fmtAgo(iso: string): string {
    const d = Date.now() - new Date(iso).getTime();
    if (d < 3_600_000) return `${Math.max(1, Math.round(d / 60_000))}m ago`;
    if (d < DAY_MS) return `${Math.round(d / 3_600_000)}h ago`;
    return `${Math.round(d / DAY_MS)}d ago`;
}

async function loadProject(slug: string, name: string, supply: number, mintPriceEth: number): Promise<ProjectAna | null> {
    try {
        const [oRes, fRes] = await Promise.all([
            fetch(`/api/project/${slug}/outputs`).then((r) => (r.ok ? r.json() : null)),
            fetch(`/api/project/${slug}/feed?limit=100`).then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!oRes) return null;
        const outputs = (oRes.outputs ?? []) as { list_price_eth: string | null }[];
        const events = ((fRes?.events ?? []) as FeedEvent[]);
        const pace = new Array<number>(14).fill(0);
        const midnight = new Date(); midnight.setHours(0, 0, 0, 0);
        for (const e of events) {
            if (e.type !== 'MINT') continue;
            const days = Math.floor((midnight.getTime() + DAY_MS - new Date(e.timestamp).getTime()) / DAY_MS);
            if (days >= 0 && days < 14) pace[13 - days]++;
        }
        const minted = Number(oRes.total ?? 0);
        const secondaryVol = Number(oRes.stats?.volume_eth ?? 0);
        return {
            slug,
            name,
            supply,
            earnedEth:
                minted * mintPriceEth * PRIMARY_TAKE
                + (Number.isFinite(secondaryVol) ? secondaryVol : 0) * SECONDARY_TAKE,
            minted,
            collectors: Number(oRes.stats?.collectors ?? 0),
            floorEth: oRes.stats?.floor_eth ?? null,
            listed: outputs.filter((o) => o.list_price_eth != null).length,
            volumeEth: String(oRes.stats?.volume_eth ?? '0'),
            followers: Number(oRes.stats?.followers ?? 0),
            sales: events.filter((e) => e.type === 'SALE').length,
            pace,
            recent: events.slice(0, 3),
        };
    } catch {
        return null;
    }
}

export function StudioAnalytics({ handle, god }: { handle: string | null; god: boolean }) {
    const [cards, setCards] = useState<ProjectAna[] | null>(null);
    const [platformView, setPlatformView] = useState(false);
    const { showToast } = useToast();

    /* DROP KIT — the one-tap share pack (Brendon's artist batch,
       2026-07-13): the project link (which now unfurls art-first) plus a
       ready-to-post line, handed to the OS share sheet; desktop falls back
       to a clipboard copy of the whole pack. */
    const dropKit = async (c: ProjectAna) => {
        const artist = getProject(c.slug)?.artistHandle;
        const url = `${window.location.origin}/art/${c.slug}`;
        const bits = [
            `${c.name}${artist ? ` by @${artist}` : ''} — ${c.supply} pieces of live generative art on Price Discussion.`,
            c.minted > 0 ? `${c.minted}/${c.supply} minted.` : 'Minting now.',
            c.floorEth != null ? `Floor ◊${c.floorEth}.` : null,
        ].filter(Boolean).join(' ');
        if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
            await shareLink({ url, title: `${c.name} on Price Discussion`, text: bits });
            return;
        }
        // Desktop: the whole pack lands on the clipboard, paste-ready.
        try {
            await navigator.clipboard.writeText(`${bits}\n${url}`);
            showToast('Drop Kit: COPIED — PASTE ANYWHERE');
        } catch {
            showToast('Drop Kit: UNAVAILABLE');
        }
    };

    useEffect(() => {
        let cancelled = false;
        const h = (handle ?? '').toLowerCase();
        let mine = allProjects().filter((p) => p.artistHandle.toLowerCase() === h);
        const platform = mine.length === 0 && god;
        if (platform) mine = [...allProjects()];
        setPlatformView(platform);
        if (mine.length === 0) { setCards([]); return; }
        setCards(null);
        Promise.all(mine.map((p) => loadProject(p.slug, p.displayName, p.outputs, p.mintPriceEth ?? 0))).then((rows) => {
            if (cancelled) return;
            setCards(rows.filter((r): r is ProjectAna => r !== null));
        });
        return () => { cancelled = true; };
    }, [handle, god]);

    if (cards == null) {
        return <p className="pd-studio-note">Reading the ledger…</p>;
    }
    if (cards.length === 0) {
        return (
            <p className="pd-studio-note">
                No live Projects yet — analytics light up here the moment one deploys.
            </p>
        );
    }
    const paceMax = (c: ProjectAna) => Math.max(1, ...c.pace);
    return (
        <>
            {platformView && <p className="pd-studio-note">PLATFORM VIEW — the whole catalog.</p>}
            {cards.map((c) => (
                <div key={c.slug} className="pd-studio-ana">
                    <div className="pd-studio-row">
                        <span className="pd-studio-row-name">{c.name}</span>
                        <span className="pd-studio-row-stat">{c.minted}/{c.supply} MINTED</span>
                    </div>
                    <div className="pd-studio-ana-stats">
                        <span>{c.collectors} COLLECTORS</span>
                        <span>{c.followers} FOLLOWERS</span>
                        <span>{c.listed} LISTED{c.floorEth != null ? ` · FLOOR ${c.floorEth}` : ''}</span>
                        <span>{c.sales} SALES · {c.volumeEth} VOL</span>
                        <span>EARNED ≈ ◊{formatEth(c.earnedEth)} — YOUR 95% OF MINTS + 3% OF SALES</span>
                    </div>
                    {/* 14-day mint pace — one bar per day, today rightmost. */}
                    <div className="pd-studio-pace" aria-label="Mints per day, last 14 days">
                        {c.pace.map((n, i) => (
                            <span
                                key={i}
                                className={`pd-studio-pace-bar${n > 0 ? ' has' : ''}`}
                                style={{ height: `${Math.max(8, Math.round((n / paceMax(c)) * 100))}%` }}
                                title={`${n} mint${n === 1 ? '' : 's'}`}
                            />
                        ))}
                        <span className="pd-studio-pace-label">14-DAY MINT PACE</span>
                    </div>
                    {c.recent.length > 0 && (
                        <div className="pd-studio-ana-recent">
                            {c.recent.map((e, i) => (
                                <div key={i} className="pd-studio-ana-event">
                                    {e.type.toUpperCase()}{e.price_eth != null ? ` · ${e.price_eth} ETH` : ''} · {fmtAgo(e.timestamp)}
                                </div>
                            ))}
                        </div>
                    )}
                    {/* Artist Push — the once-a-month all-holders ping perk.
                        Renders only for the project's own artist (the status
                        endpoint 403s anyone else and the control stays hidden). */}
                    {!platformView && <ArtistPush slug={c.slug} />}
                    {/* Soundtrack management — the mutable off-chain surround,
                        artist-wallet-gated server-side. */}
                    {!platformView && <SoundtrackManager slug={c.slug} />}
                    {!platformView && (
                        <button
                            type="button"
                            className="pd-studio-btn pd-studio-dropkit"
                            onClick={() => { void dropKit(c); }}
                        >
                            DROP KIT — SHARE THIS PROJECT
                        </button>
                    )}
                </div>
            ))}
        </>
    );
}
