'use client';

/*
 * CollectionContext
 *
 * Single source of truth for the active collection's tokens. Sim's
 * `metaCache` (sim.html line 7138) is a flat object keyed by token id;
 * every surface — modal, gallery cards, Calc Sheet, filter logic —
 * reads from it. The React port mirrors that shape with a frozen
 * `ReadonlyMap<number, TokenMeta>` populated once at provider mount.
 *
 * Today the provider seeds the map with the same deterministic LCG math
 * the prototype has been running inside ArtworkModal, so visual state
 * is byte-for-byte identical. When the on-chain indexer ships, only
 * the seeding block changes — every consumer (`useTokenMeta(id)`,
 * future gallery, future Calc) keeps its existing API.
 *
 * Sim refs:
 *   metaCache shape ........ sim.html 7138, 7968–8003
 *   _brendonOwned set ...... sim.html 7967–7968
 *   id-keyed lookup pattern  sim.html 8725–8788, 11598–11599
 */

import {
    createContext,
    useContext,
    useMemo,
    type ReactNode,
} from 'react';

export interface TokenMeta {
    ownerDisplay: string;
    price: string | null;
    isOwnedByBrendon: boolean;
}

export interface CollectionState {
    title: string;
    totalEditions: number;
    floorEth: number;
    tokens: ReadonlyMap<number, TokenMeta>;
}

const CollectionCtx = createContext<CollectionState | null>(null);

const COLLECTION_TITLE = 'PRISMS';
const TOTAL_EDITIONS = 222;

/* Mock collection floor — sim reads this from the BUY button's
   .mint-price element on the collection page. The Collection Page
   isn't ported yet, so the prototype Calc uses a constant in the
   listed-price range. Replace with an indexer-derived value once
   that surface lands. */
const MOCK_COLLECTION_FLOOR_ETH = 0.014;

/* Sim seeds 8 deterministic Brendon-owned tokens across the grid so the
   "Me" Network filter has meaningful output without stomping all listings.
   Sim source: line 7967 — `_brendonOwned = new Set([1,2,3,22,67,112,158,201])`. */
const BRENDON_OWNED: ReadonlySet<number> = new Set([
    1, 2, 3, 22, 67, 112, 158, 201,
]);

/**
 * Deterministic mock metadata for one token id. Same id → same shape on
 * every refresh — matches sim's behavior where Math.random() draws are
 * cached in metaCache and reused for the session.
 *
 * Lifted verbatim from ArtworkModal's previous inline `getTokenMeta()`
 * (the LCG constants, the `0x____…____` hex tail formula, the listed
 * threshold, the price formatting). Real metadata comes from the
 * on-chain indexer once that workstream lands; this seeding is the
 * throwaway placeholder.
 */
function buildTokenMeta(id: number): TokenMeta {
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

    return { ownerDisplay, price, isOwnedByBrendon: isMine };
}

export function CollectionProvider({ children }: { children: ReactNode }) {
    /* Build the full 222-entry map once at mount. Cheap (low hundreds
       of entries, pure arithmetic) and stable across re-renders, so
       every useTokenMeta() consumer reads from the same Map reference
       and Map.get(id) is O(1). */
    const value = useMemo<CollectionState>(() => {
        const tokens = new Map<number, TokenMeta>();
        for (let id = 1; id <= TOTAL_EDITIONS; id++) {
            tokens.set(id, buildTokenMeta(id));
        }
        return {
            title: COLLECTION_TITLE,
            totalEditions: TOTAL_EDITIONS,
            floorEth: MOCK_COLLECTION_FLOOR_ETH,
            tokens,
        };
    }, []);

    return (
        <CollectionCtx.Provider value={value}>{children}</CollectionCtx.Provider>
    );
}

export function useCollection(): CollectionState {
    const ctx = useContext(CollectionCtx);
    if (!ctx) {
        throw new Error('useCollection must be used inside <CollectionProvider>');
    }
    return ctx;
}
