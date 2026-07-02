'use client';

/*
 * MarketSheetContext — opens the secondary-market sheets from any surface.
 *
 * Three sheets, all rendered by <MarketSheets /> in the shell (mounted next
 * to CartPanel, same slide-up shell + two-stage mounted/active pattern):
 *   - LIST  — price-per-piece + duration for 1..n owned pieces (the single
 *             CTA List flow AND the multi-select List/Re-List batch flow are
 *             the same sheet; one signing pass on the chain rail).
 *   - OFFER — per-piece amounts for 1..n pieces, or ONE amount for a
 *             collection / trait criteria offer.
 *   - OFFERS PANEL — the offers on one Output (owner: accept / decline;
 *             bidder: cancel; everyone: read).
 *
 * Same lifecycle reasoning as CartContext: sheets are transient, so plain
 * session state; no persistence.
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

export interface SheetItem {
    slug: string;
    id: number;
    /** Current listing price (re-list prefill), "0.123"-style, when known. */
    currentPriceEth?: string | null;
}

export interface CriteriaTarget {
    kind: 'collection' | 'trait';
    slug: string;
    category?: string;
    value?: string;
}

export type MarketSheetState =
    | { sheet: 'list'; items: SheetItem[] }
    | { sheet: 'offer'; items: SheetItem[] }
    | { sheet: 'offer-criteria'; target: CriteriaTarget }
    | { sheet: 'offers-panel'; slug: string; id: number }
    | null;

interface MarketSheetContextValue {
    state: MarketSheetState;
    openListSheet: (items: SheetItem[]) => void;
    openOfferSheet: (items: SheetItem[]) => void;
    openCriteriaOfferSheet: (target: CriteriaTarget) => void;
    openOffersPanel: (slug: string, id: number) => void;
    closeSheet: () => void;
}

const Ctx = createContext<MarketSheetContextValue | null>(null);

export function MarketSheetProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MarketSheetState>(null);

    const openListSheet = useCallback((items: SheetItem[]) => {
        if (items.length > 0) setState({ sheet: 'list', items });
    }, []);
    const openOfferSheet = useCallback((items: SheetItem[]) => {
        if (items.length > 0) setState({ sheet: 'offer', items });
    }, []);
    const openCriteriaOfferSheet = useCallback((target: CriteriaTarget) => {
        setState({ sheet: 'offer-criteria', target });
    }, []);
    const openOffersPanel = useCallback((slug: string, id: number) => {
        setState({ sheet: 'offers-panel', slug, id });
    }, []);
    const closeSheet = useCallback(() => setState(null), []);

    const value = useMemo(
        () => ({ state, openListSheet, openOfferSheet, openCriteriaOfferSheet, openOffersPanel, closeSheet }),
        [state, openListSheet, openOfferSheet, openCriteriaOfferSheet, openOffersPanel, closeSheet],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarketSheet(): MarketSheetContextValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useMarketSheet must be used inside <MarketSheetProvider>');
    return ctx;
}
