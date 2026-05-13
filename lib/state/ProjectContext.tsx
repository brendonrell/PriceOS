'use client';

/*
 * ProjectContext
 *
 * Single source of truth for the active project's outputs. Sim's
 * `metaCache` (sim.html line 7138) is a flat object keyed by token id;
 * every surface — modal, gallery cards, Calc Sheet, filter logic —
 * reads from it. The React port mirrors that shape with a frozen
 * `ReadonlyMap<number, OutputMeta>` populated once at provider mount.
 *
 * Today the provider seeds the map with the same deterministic LCG math
 * the prototype has been running inside OutputPreview, so visual state
 * is byte-for-byte identical. When the on-chain indexer ships, only
 * the seeding block changes — every consumer (`useOutputMeta(id)`,
 * future gallery, future Calc) keeps its existing API.
 *
 * Sim refs:
 *   metaCache shape ........ sim.html 7138, 7968–8003
 *   _brendonOwned set ...... sim.html 7967–7968
 *   id-keyed lookup pattern  sim.html 8725–8788, 11598–11599
 *
 * Build 19: added `traits` to OutputMeta so the gallery wiring
 * (TraitsContext → ArtworkCard render) can predicate on Layer / Mineral /
 * Fate. Sim assigns these per token in renderFeed (sim 7986–8002) using
 * Math.random() seeded once at init; we mirror with a deterministic
 * id-based LCG so traits are stable across reloads. Pools match the
 * STRATA-rebrand strings in TraitsUI's VALUE_POOLS (Crust/Mantle/… for
 * Layer, Quartz/Schist/… for Mineral). Fate pool comes from sim's
 * OMEN_TRAITS array (sim ~7999) — TraitsUI VALUE_POOLS.Fate is empty
 * for v0, so no L2 pill toggles a Fate value yet, but the data exists
 * for the day Fate L2 lands.
 */

import {
    createContext,
    useContext,
    useMemo,
    type ReactNode,
} from 'react';

export interface OutputMeta {
    ownerDisplay: string;
    price: string | null;
    isOwnedByBrendon: boolean;
    /* Build 19: deterministic mock traits for Layer / Mineral / Fate.
       Pools match TraitsUI.VALUE_POOLS verbatim for Layer + Mineral so
       a value the user toggles in the L2 row maps 1:1 to this string.
       Fate uses sim's 8 OMEN_TRAITS (sim ~7999); TraitsUI's Fate pool
       is empty in v0, so this field is read-but-not-yet-filtered until
       Fate L2 pills land. */
    traits: {
        Layer: string;
        Mineral: string;
        Fate: string;
    };
}

export interface ProjectState {
    title: string;
    totalOutputs: number;
    floorEth: number;
    outputs: ReadonlyMap<number, OutputMeta>;
}

const ProjectCtx = createContext<ProjectState | null>(null);

const PROJECT_TITLE = 'PRISMS';
const TOTAL_OUTPUTS = 222;

/* Mock project floor — sim reads this from the BUY button's
   .mint-price element on the project page. The Project Page
   isn't ported yet, so the prototype Calc uses a constant in the
   listed-price range. Replace with an indexer-derived value once
   that surface lands. */
const MOCK_PROJECT_FLOOR_ETH = 0.014;

/* Sim seeds 8 deterministic Brendon-owned tokens across the grid so the
   "Me" Network filter has meaningful output without stomping all listings.
   Sim source: line 7967 — `_brendonOwned = new Set([1,2,3,22,67,112,158,201])`. */
const BRENDON_OWNED: ReadonlySet<number> = new Set([
    1, 2, 3, 22, 67, 112, 158, 201,
]);

/* Build 19: trait pools. Layer + Mineral mirror TraitsUI.VALUE_POOLS so
   the L2 value pills the user can toggle line up byte-for-byte with the
   strings stored on OutputMeta.traits. Fate is sim's OMEN_TRAITS (sim
   ~7999) — kept here even though TraitsUI doesn't surface a Fate L2 pool
   yet, so the field is populated and ready when that build lands. Pools
   are typed `as const` to keep the index types happy without a cast. */
const LAYER_POOL = ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'] as const;
const MINERAL_POOL = ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'] as const;
const FATE_POOL = [
    'SOVEREIGN',
    'ABUNDANT',
    'FORTUNE',
    'ASCENDANT',
    'BALANCED',
    'SHADOW',
    'TRIBULATION',
    'VOID',
] as const;

/**
 * Deterministic mock metadata for one token id. Same id → same shape on
 * every refresh — matches sim's behavior where Math.random() draws are
 * cached in metaCache and reused for the session.
 *
 * Lifted verbatim from OutputPreview's previous inline `getOutputMeta()`
 * (the LCG constants, the `0x____…____` hex tail formula, the listed
 * threshold, the price formatting). Real metadata comes from the
 * on-chain indexer once that workstream lands; this seeding is the
 * throwaway placeholder.
 */
function buildOutputMeta(id: number): OutputMeta {
    const isMine = BRENDON_OWNED.has(id);

    // Two independent LCG-style draws from the id keep listed-ness and
    // price uncoupled (matches sim's two Math.random() calls in init).
    const r1 = ((id * 9301 + 49297) % 233280) / 233280;
    const r2 = ((id * 31 + 1234567) % 233280) / 233280;
    const isListed = r1 < 0.3;
    const price = isListed
        ? (r2 * 0.5 + 0.01).toFixed(3) + ' ETH'
        : null;

    let ownerDisplay: string;
    if (isMine) {
        ownerDisplay = '@Brendon';
    } else {
        const hex = ((id * 2654435761) >>> 0).toString(16).padStart(8, '0');
        const tail = ((id * 31 + (id % 17) * 13) % 0xffff)
            .toString(16)
            .padStart(4, '0');
        ownerDisplay = '0x' + hex.slice(0, 4) + '\u2026' + tail;
    }

    /* Build 19: three independent LCG-style draws — distinct multipliers
       so Layer/Mineral/Fate aren't correlated by id. Modulo each pool's
       length to pick a value. Stable across reloads since the only input
       is the id. */
    const tLayer = (id * 1103 + 12345) % 65536;
    const tMineral = (id * 2087 + 98765) % 65536;
    const tFate = (id * 3469 + 54321) % 65536;
    const traits = {
        Layer: LAYER_POOL[tLayer % LAYER_POOL.length],
        Mineral: MINERAL_POOL[tMineral % MINERAL_POOL.length],
        Fate: FATE_POOL[tFate % FATE_POOL.length],
    };

    return { ownerDisplay, price, isOwnedByBrendon: isMine, traits };
}

export function ProjectProvider({ children }: { children: ReactNode }) {
    /* Build the full 222-entry map once at mount. Cheap (low hundreds
       of entries, pure arithmetic) and stable across re-renders, so
       every useOutputMeta() consumer reads from the same Map reference
       and Map.get(id) is O(1). */
    const value = useMemo<ProjectState>(() => {
        const outputs = new Map<number, OutputMeta>();
        for (let id = 1; id <= TOTAL_OUTPUTS; id++) {
            outputs.set(id, buildOutputMeta(id));
        }
        return {
            title: PROJECT_TITLE,
            totalOutputs: TOTAL_OUTPUTS,
            floorEth: MOCK_PROJECT_FLOOR_ETH,
            outputs,
        };
    }, []);

    return (
        <ProjectCtx.Provider value={value}>{children}</ProjectCtx.Provider>
    );
}

export function useProject(): ProjectState {
    const ctx = useContext(ProjectCtx);
    if (!ctx) {
        throw new Error('useProject must be used inside <ProjectProvider>');
    }
    return ctx;
}
