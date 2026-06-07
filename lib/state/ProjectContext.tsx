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
    totalOutputs: number;
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

/* Six evenly-spread featured ids within the supply (valid for any count). */
function deriveShowcase(total: number): number[] {
    if (total <= 0) return [];
    const out: number[] = [];
    for (let k = 1; k <= 6; k++) {
        const id = Math.max(1, Math.min(total, Math.round((total * k) / 7)));
        if (!out.includes(id)) out.push(id);
    }
    return out;
}

/* Deterministic per-id meta. Ownership mirrors the seed rule (odd -> brendon,
   even -> opus4-6); price is a stable placeholder; traits come from the
   Project's Artwork engine + Fate (registry). */
function buildOutputMeta(slug: string, id: number): OutputMeta {
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
    const total = def?.outputs ?? 0;
    const outputs = new Map<number, OutputMeta>();
    for (let id = 1; id <= total; id++) outputs.set(id, buildOutputMeta(slug, id));
    return {
        slug,
        title: def?.displayName ?? slug.toUpperCase(),
        totalOutputs: total,
        floorEth: MOCK_PROJECT_FLOOR_ETH,
        outputs,
        showcaseIds: deriveShowcase(total),
    };
}

interface OutputOwnerDTO {
    token_id: number;
    owner: string;
    owner_handle: string | null;
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

    /* Reconcile ownership + showcase against the authoritative DB rows. */
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/project/${lower}/outputs`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { outputs?: OutputOwnerDTO[]; showcase_ids?: number[]; total?: number } | null) => {
                if (cancelled || !data) return;
                setState((prev) => {
                    if (prev.slug !== lower) return prev;
                    const outputs = new Map(prev.outputs);
                    for (const o of data.outputs ?? []) {
                        const meta = outputs.get(o.token_id);
                        if (!meta) continue;
                        const addr = (o.owner ?? '').toLowerCase();
                        const isMine = addr === BRENDON_ADDR;
                        const ownerDisplay = o.owner_handle ? '@' + o.owner_handle : shortAddr(o.owner ?? '');
                        outputs.set(o.token_id, {
                            ...meta,
                            ownerDisplay,
                            ownerFull: o.owner ?? meta.ownerFull,
                            isOwnedByBrendon: isMine,
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
        return () => {
            cancelled = true;
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
