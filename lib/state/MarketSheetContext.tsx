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
import { isVaulted } from '../pins/vaultStore';

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
    | { sheet: 'offer-choice'; items: SheetItem[] }
    | { sheet: 'offer'; items: SheetItem[]; combo?: boolean }
    | { sheet: 'offer-criteria'; target: CriteriaTarget }
    | { sheet: 'offers-panel'; slug: string; id: number }
    | { sheet: 'trait-picker'; slug: string; id: number }
    | null;

interface MarketSheetContextValue {
    state: MarketSheetState;
    openListSheet: (items: SheetItem[]) => void;
    /** Entry point for every "make offer" surface — always lands on the
     *  OUTPUT / COLLECTION / BOTH choice face first (Brendon, 2026-09-13). */
    openOfferSheet: (items: SheetItem[]) => void;
    /** Chosen from the offer-choice face: proceeds straight to the item-offer
     *  sheet, optionally bundling a −20% WETH collection offer alongside. */
    proceedOfferSheet: (items: SheetItem[], combo?: boolean) => void;
    openCriteriaOfferSheet: (target: CriteriaTarget) => void;
    openOffersPanel: (slug: string, id: number) => void;
    /** The general-purpose trait-offer tool: pick a trait off ONE output
     *  (multi-select with exactly one selected — Brendon, 2026-07-02). */
    openTraitPicker: (slug: string, id: number) => void;
    closeSheet: () => void;
}

const Ctx = createContext<MarketSheetContextValue | null>(null);

export function MarketSheetProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<MarketSheetState>(null);

    const openListSheet = useCallback((items: SheetItem[]) => {
        /* Safety net for every List-trigger surface, not just the artwork
           page's own greyed-out button (bulk selects, float bars, card
           previews) — a vaulted piece can never reach the sheet, no
           matter which door it came through (Brendon, 2026-09-17). */
        const sellable = items.filter((it) => !isVaulted(it.slug, it.id));
        if (sellable.length > 0) setState({ sheet: 'list', items: sellable });
    }, []);
    const openOfferSheet = useCallback((items: SheetItem[]) => {
        if (items.length > 0) setState({ sheet: 'offer-choice', items });
    }, []);
    const proceedOfferSheet = useCallback((items: SheetItem[], combo?: boolean) => {
        if (items.length > 0) setState({ sheet: 'offer', items, combo });
    }, []);
    const openCriteriaOfferSheet = useCallback((target: CriteriaTarget) => {
        setState({ sheet: 'offer-criteria', target });
    }, []);
    const openOffersPanel = useCallback((slug: string, id: number) => {
        setState({ sheet: 'offers-panel', slug, id });
    }, []);
    const openTraitPicker = useCallback((slug: string, id: number) => {
        setState({ sheet: 'trait-picker', slug, id });
    }, []);
    const closeSheet = useCallback(() => setState(null), []);

    const value = useMemo(
        () => ({ state, openListSheet, openOfferSheet, proceedOfferSheet, openCriteriaOfferSheet, openOffersPanel, openTraitPicker, closeSheet }),
        [state, openListSheet, openOfferSheet, proceedOfferSheet, openCriteriaOfferSheet, openOffersPanel, openTraitPicker, closeSheet],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useMarketSheet(): MarketSheetContextValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useMarketSheet must be used inside <MarketSheetProvider>');
    return ctx;
}
