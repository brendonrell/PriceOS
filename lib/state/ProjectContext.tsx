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
    useState,
    type ReactNode,
} from 'react';
import { getProject, outputTraits, renderArtwork } from '../project/registry';
import type { OutputTraits } from '../project/types';

export interface OutputMeta {
    ownerDisplay: string;
    ownerFull: string;
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

    const r1 = ((id * 9301 + 49297) % 233280) / 233280;
    const r2 = ((id * 31 + 1234567) % 233280) / 233280;
    const isListed = r1 < 0.3;
    const price = isListed ? (r2 * 0.5 + 0.01).toFixed(3) + ' ETH' : null;

    return {
        ownerDisplay: isMine ? '@brendon' : '@opus4-6',
        ownerFull: isMine ? BRENDON_ADDR : OPUS_ADDR,
        price,
        isOwnedByBrendon: isMine,
        traits: outputTraits(slug, id),
    };
}

function buildInitial(slug: string): ProjectState {
    const def = getProject(slug);
    const supply = def?.outputs ?? 0;
    // Start empty — metas are built lazily for the minted Outputs the DB
    // reconcile returns. (Eagerly building every possible Output's meta —
    // art + Fate cast — on mount blocked first paint, esp. mobile Safari.)
    // `totalOutputs` (minted count) starts at 0 and is filled by the reconcile;
    // starting it at supply would flash a sold-out state before the fetch lands.
    return {
        slug,
        title: def?.displayName ?? slug.toUpperCase(),
        totalOutputs: 0,
        maxSupply: supply,
        floorEth: MOCK_PROJECT_FLOOR_ETH,
        outputs: new Map<number, OutputMeta>(),
        showcaseIds: [],
    };
}

interface OutputOwnerDTO {
    token_id: number;
    owner: string;
    owner_handle: string | null;
    list_price_eth: string | null;
}

export function ProjectProvider({
    slug = DEFAULT_SLUG,
    children,
}: {
    slug?: string;
    children: ReactNode;
}) {
    const lower = slug.toLowerCase();
    const [state, setState] = useState<ProjectState>(() => buildInitial(lower));

    /* Rebuild when the active Project changes (route → different slug). */
    useEffect(() => {
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
                .then((data: { outputs?: OutputOwnerDTO[]; showcase_ids?: number[]; total?: number } | null) => {
                    if (cancelled || !data) return;
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
                                isOwnedByBrendon: addr === BRENDON_ADDR,
                                price: o.list_price_eth ? `${o.list_price_eth} ETH` : null,
                            });
                        }
                        const showcaseIds =
                            Array.isArray(data.showcase_ids) && data.showcase_ids.length
                                ? data.showcase_ids
                                : prev.showcaseIds;
                        return {
                            ...prev,
                            outputs,
                            showcaseIds,
                            totalOutputs: data.total ?? prev.totalOutputs,
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
): number {
    return renderArtwork(canvas, slug, id, width).aspect;
}
