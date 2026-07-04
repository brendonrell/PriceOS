'use client';

/*
 * ProjectContext — the active Project's Outputs, sourced from the registry.
 *
 * One Project is active per provider (slug). The global mount in app/layout.tsx
 * defaults to PRISMS; project/output routes re-provide with their own slug.
 *
 * Static identity (title, supply, colorway) + per-Output traits come from the
 * registry (lib/project/registry.ts) — the Artwork engine is the source of
 * truth for traits, and the platform Fate trait is merged in there. Ownership
 * is seeded deterministically for first paint, then reconciled against the
 * authoritative `holders` rows via /api/project/{slug}/outputs.
 */

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { getProject, outputTraits, renderArtwork, setProjectColorOverride } from '../project/registry';
import type { OutputTraits } from '../project/types';
import type { ProjectStats } from '../../app/api/project/[slug]/outputs/route';

const EMPTY_STATS: ProjectStats = { collectors: 0, volume_eth: '0', floor_eth: null, followers: 0, collected_by_following: [] };

export interface OutputMeta {
    ownerDisplay: string;
    ownerFull: string;
    /** Owner account creation ISO timestamp — null until the /outputs
        reconcile lands (feeds the My Network 'New Wallets' filter). */
    ownerCreatedAt: string | null;
    price: string | null;
    isOwnedByBrendon: boolean;
    /** Full traits (artist traits + Fate), keyed by trait name. */
    traits: OutputTraits;
}

export interface ProjectState {
    slug: string;
    title: string;
    /** Minted count (gallery renders 1..totalOutputs). */
    totalOutputs: number;
    /** Total supply (mint target). */
    maxSupply: number;
    floorEth: number;
    outputs: ReadonlyMap<number, OutputMeta>;
    /** Fixed featured ids for the Project Showcase tab. */
    showcaseIds: readonly number[];
    /** YouTube playlist soundtrack (DB-driven, registry as fallback) or null. */
    soundtrack: { playlistId: string; label: string } | null;
    /** Aggregate hero stats (collectors, volume, floor, recent collectors). */
    stats: ProjectStats;
}

const ProjectCtx = createContext<ProjectState | null>(null);

const DEFAULT_SLUG = 'prisms';
const MOCK_PROJECT_FLOOR_ETH = 0.014;

/* The two demo accounts (match the seeded holders rows). */
const BRENDON_ADDR = '0x65c34afda745c12745db70ffa809311339279395';
const OPUS_ADDR = '0x0000000000000000000000000000000000000046';

function shortAddr(addr: string): string {
    if (!addr || addr.length < 10) return addr || '';
    return '0x' + addr.slice(2, 6) + '…' + addr.slice(-4);
}

/* Deterministic per-id meta. Ownership mirrors the seed rule (odd -> brendon,
   even -> opus4-6); price is a stable placeholder; traits come from the
   Project's Artwork engine + Fate (registry). Exported so the global output
   modal can build meta for any (slug, id) independent of the active route. */
export function buildOutputMetaFor(slug: string, id: number): OutputMeta {
    const isMine = id % 2 === 1;

    // No mock listings: every Output on PD is currently UNLISTED. The real
    // listing price (when one exists) comes from the DB overlay in the reconcile
    // below — the synchronous default is always null so nothing fabricates a
    // price. (Brendon, 2026-06-17 — the old deterministic mock price was showing
    // fake ETH on grail pins, which never reconcile with the DB.)
    return {
        ownerDisplay: isMine ? '@brendon' : '@opus4-6',
        ownerFull: isMine ? BRENDON_ADDR : OPUS_ADDR,
        ownerCreatedAt: null,
        price: null,
        isOwnedByBrendon: isMine,
        traits: outputTraits(slug, id),
    };
}

function buildInitial(
    slug: string,
    /* Server-seeded minted count + showcase. The project page (a server
       component) reads projects.minted_count/showcase_ids and hands them in,
       so the gallery renders the REAL minted cards in the very first paint
       instead of booting at 0 and waiting on a client fetch to fill in (the
       old ghost→art flip + visible "appear late" gap). Omitted (0 / []) for
       the global layout provider, which still reconciles client-side. */
    initialTotal = 0,
    initialShowcaseIds: readonly number[] = [],
): ProjectState {
    const def = getProject(slug);
    const supply = def?.outputs ?? 0;
    // Build metas for the seeded minted set (1..initialTotal) so those cards
    // render immediately. This is trait-cast only (cheap, deterministic, no
    // canvas paint — the canvas is painted by the gallery's eager/lazy
    // virtualizer), so it's safe on mount even at full supply. Owner + price
    // are placeholders here and get overlaid by the client reconcile below.
    const outputs = new Map<number, OutputMeta>();
    for (let id = 1; id <= initialTotal; id++) {
        outputs.set(id, buildOutputMetaFor(slug, id));
    }
    return {
        slug,
        title: def?.displayName ?? slug.toUpperCase(),
        // Seeded minted count. 0 (no seed) → ghosts render until the reconcile;
        // a real seed → real cards from frame one. Never starts at supply, so
        // no sold-out flash.
        totalOutputs: initialTotal,
        maxSupply: supply,
        floorEth: MOCK_PROJECT_FLOOR_ETH,
        outputs,
        showcaseIds: initialShowcaseIds,
        // Registry value is the synchronous fallback; the DB reconcile below is
        // the source of truth and overrides it once /outputs lands.
        soundtrack: def?.soundtrack ?? null,
        stats: EMPTY_STATS,
    };
}

interface OutputOwnerDTO {
    token_id: number;
    owner: string;
    owner_handle: string | null;
    owner_created_at?: string | null;
    list_price_eth: string | null;
}

export function ProjectProvider({
    slug = DEFAULT_SLUG,
    initialTotal = 0,
    initialShowcaseIds = [],
    children,
}: {
    slug?: string;
    /** Server-seeded minted count (projects.minted_count) for first-paint. */
    initialTotal?: number;
    /** Server-seeded curated showcase ids (projects.showcase_ids). */
    initialShowcaseIds?: readonly number[];
    children: ReactNode;
}) {
    const lower = slug.toLowerCase();
    const [state, setState] = useState<ProjectState>(() =>
        buildInitial(lower, initialTotal, initialShowcaseIds)
    );

    /* Rebuild when the active Project changes (route → different slug). Skip
       the first run: useState already seeded the initial slug's state (with
       the server seed), and resetting it here on mount would wipe that seed
       and reintroduce the empty-gallery flash before the reconcile lands. */
    const firstRun = useRef(true);
    useEffect(() => {
        if (firstRun.current) {
            firstRun.current = false;
            return;
        }
        setState(buildInitial(lower));
    }, [lower]);

    /* Reconcile ownership + listing prices + showcase against the DB. Re-runs
       on a 'pd:project-refresh' window event (fired after mint / buy / list)
       so the gallery reflects market changes without a full reload. */
    useEffect(() => {
        let cancelled = false;
        const load = () => {
            fetch(`/api/project/${lower}/outputs`, { cache: 'no-store' })
                .then((r) => (r.ok ? r.json() : null))
                .then((data: { outputs?: OutputOwnerDTO[]; showcase_ids?: number[]; total?: number; stats?: ProjectStats; soundtrack?: string | null; colorway?: string | null } | null) => {
                    if (cancelled || !data) return;
                    // DB colorway (projects.custom_color) overrides the registry
                    // fallback; repaint the page bg if it's currently showing the
                    // project's colour (same event the Custom slot uses).
                    setProjectColorOverride(lower, data.colorway);
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('pd:custom-color-changed'));
                    }
                    setState((prev) => {
                        if (prev.slug !== lower) return prev;
                        const outputs = new Map(prev.outputs);
                        for (const o of data.outputs ?? []) {
                            // Build meta lazily for minted Outputs (deterministic
                            // art/traits/Fate), then overlay live owner + price.
                            const meta = outputs.get(o.token_id) ?? buildOutputMetaFor(lower, o.token_id);
                            const addr = (o.owner ?? '').toLowerCase();
                            const ownerDisplay = o.owner_handle ? '@' + o.owner_handle : shortAddr(o.owner ?? '');
                            outputs.set(o.token_id, {
                                ...meta,
                                ownerDisplay,
                                ownerFull: o.owner ?? meta.ownerFull,
                                ownerCreatedAt: o.owner_created_at ?? null,
                                isOwnedByBrendon: addr === BRENDON_ADDR,
                                price: o.list_price_eth ? `${o.list_price_eth} ETH` : null,
                            });
                        }
                        const showcaseIds =
                            Array.isArray(data.showcase_ids) && data.showcase_ids.length
                                ? data.showcase_ids
                                : prev.showcaseIds;
                        // DB soundtrack wins; keep the label from the registry
                        // (DB stores only the playlist id), else a generic one.
                        const soundtrack = data.soundtrack
                            ? { playlistId: data.soundtrack, label: prev.soundtrack?.label ?? 'Project Soundtrack' }
                            : null;
                        return {
                            ...prev,
                            outputs,
                            showcaseIds,
                            soundtrack,
                            totalOutputs: data.total ?? prev.totalOutputs,
                            stats: data.stats ?? prev.stats,
                        };
                    });
                })
                .catch(() => {
                    /* offline / 5xx — the synchronous seed remains in place */
                });
        };
        load();
        const onRefresh = () => load();
        if (typeof window !== 'undefined') window.addEventListener('pd:project-refresh', onRefresh);
        return () => {
            cancelled = true;
            if (typeof window !== 'undefined') window.removeEventListener('pd:project-refresh', onRefresh);
        };
    }, [lower]);

    return <ProjectCtx.Provider value={state}>{children}</ProjectCtx.Provider>;
}

export function useProject(): ProjectState {
    const ctx = useContext(ProjectCtx);
    if (!ctx) {
        throw new Error('useProject must be used inside <ProjectProvider>');
    }
    return ctx;
}

/** Paint an Output's Artwork for the active Project. Returns the aspect ratio. */
export function paintOutput(
    canvas: HTMLCanvasElement,
    slug: string,
    id: number,
    width: number,
    live = false,
): number {
    return renderArtwork(canvas, slug, id, width, live).aspect;
}
