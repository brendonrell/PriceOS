'use client';

/*
 * ProjectContext — active project's outputs (PRISMS).
 *
 * Source of truth is the DB: ownership comes from `holders` and the
 * showcase from `projects.showcase_ids`, fetched once on mount via
 * /api/project/prisms/outputs. To keep first paint instant (no loading
 * flash), the map is seeded synchronously with the SAME ownership rule the
 * seed used — odd token ids -> @brendon, even -> @opus46 — so the gallery is
 * already correct before the fetch lands; the fetch then reconciles against
 * the authoritative rows (and would correct any drift). Per-token price and
 * traits stay deterministic placeholders (listings/trait freezing not
 * modelled yet); only ownership + showcase are DB-backed.
 */

import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from 'react';

export interface OutputMeta {
    ownerDisplay: string;
    ownerFull: string;
    price: string | null;
    isOwnedByBrendon: boolean;
    traits: { Layer: string; Mineral: string; Fate: string };
}

export interface ProjectState {
    title: string;
    totalOutputs: number;
    floorEth: number;
    outputs: ReadonlyMap<number, OutputMeta>;
    /** Fixed featured ids for the Project Showcase tab (from projects.showcase_ids). */
    showcaseIds: readonly number[];
}

const ProjectCtx = createContext<ProjectState | null>(null);

const PROJECT_SLUG = 'prisms';
const PROJECT_TITLE = 'PRISMS';
const TOTAL_OUTPUTS = 500;
const MOCK_PROJECT_FLOOR_ETH = 0.014;

/* The two demo accounts (match the seeded holders rows). */
const BRENDON_ADDR = '0x65c34afda745c12745db70ffa809311339279395';
const OPUS_ADDR = '0x0000000000000000000000000000000000000046';

/* Fixed Project Showcase (matches projects.showcase_ids; chosen once). */
const FIXED_SHOWCASE: readonly number[] = [22, 88, 147, 256, 383, 491];

const LAYER_POOL = ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'] as const;
const MINERAL_POOL = ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'] as const;
const FATE_POOL = [
    'SOVEREIGN', 'ABUNDANT', 'FORTUNE', 'ASCENDANT',
    'BALANCED', 'SHADOW', 'TRIBULATION', 'VOID',
] as const;

function shortAddr(addr: string): string {
    if (!addr || addr.length < 10) return addr || '';
    return '0x' + addr.slice(2, 6) + '\u2026' + addr.slice(-4);
}

/* Deterministic per-id meta. Ownership mirrors the seed rule (odd -> brendon,
   even -> opus46); price + traits are stable placeholders. */
function buildOutputMeta(id: number): OutputMeta {
    const isMine = id % 2 === 1;

    const r1 = ((id * 9301 + 49297) % 233280) / 233280;
    const r2 = ((id * 31 + 1234567) % 233280) / 233280;
    const isListed = r1 < 0.3;
    const price = isListed ? (r2 * 0.5 + 0.01).toFixed(3) + ' ETH' : null;

    const ownerDisplay = isMine ? '@brendon' : '@opus46';
    const ownerFull = isMine ? BRENDON_ADDR : OPUS_ADDR;

    const tLayer = (id * 1103 + 12345) % 65536;
    const tMineral = (id * 2087 + 98765) % 65536;
    const tFate = (id * 3469 + 54321) % 65536;
    const traits = {
        Layer: LAYER_POOL[tLayer % LAYER_POOL.length],
        Mineral: MINERAL_POOL[tMineral % MINERAL_POOL.length],
        Fate: FATE_POOL[tFate % FATE_POOL.length],
    };

    return { ownerDisplay, ownerFull, price, isOwnedByBrendon: isMine, traits };
}

function buildInitial(): ProjectState {
    const outputs = new Map<number, OutputMeta>();
    for (let id = 1; id <= TOTAL_OUTPUTS; id++) outputs.set(id, buildOutputMeta(id));
    return {
        title: PROJECT_TITLE,
        totalOutputs: TOTAL_OUTPUTS,
        floorEth: MOCK_PROJECT_FLOOR_ETH,
        outputs,
        showcaseIds: FIXED_SHOWCASE,
    };
}

interface OutputOwnerDTO {
    token_id: number;
    owner: string;
    owner_handle: string | null;
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ProjectState>(buildInitial);

    /* Reconcile ownership + showcase against the authoritative DB rows. The
       synchronous seed already matches, so this is a no-op visually unless
       the rows differ — but it makes the gallery genuinely DB-sourced. */
    useEffect(() => {
        let cancelled = false;
        fetch(`/api/project/${PROJECT_SLUG}/outputs`)
            .then((r) => (r.ok ? r.json() : null))
            .then((data: { outputs?: OutputOwnerDTO[]; showcase_ids?: number[]; total?: number } | null) => {
                if (cancelled || !data) return;
                setState((prev) => {
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
    }, []);

    return <ProjectCtx.Provider value={state}>{children}</ProjectCtx.Provider>;
}

export function useProject(): ProjectState {
    const ctx = useContext(ProjectCtx);
    if (!ctx) {
        throw new Error('useProject must be used inside <ProjectProvider>');
    }
    return ctx;
}
