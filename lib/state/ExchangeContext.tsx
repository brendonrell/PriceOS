'use client';

/*
 * ExchangeContext — opens THE EXCHANGE ⇌ (head-to-head trade window) from any
 * surface. Rendered by <ExchangeModal /> in the shell, next to MarketSheets
 * (same cart-panel slide-up shell + two-stage pattern).
 *
 * Two entries:
 *   openExchange — compose a new proposal against a counterparty (optionally
 *                  seeded with one of their pieces — the artwork-page entry).
 *   openTrade    — view one existing trade (ping deep-link / ?trade= URL).
 *
 * The ?trade=<id> URL param (a ping's href — the share-any-view precedent)
 * opens that trade on boot, then strips itself from the URL.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { TradeItem } from '../market/tradeTypes';

export type ExchangeState =
    | { view: 'compose'; counterparty: string; counterpartyHandle: string | null; seed?: TradeItem }
    | { view: 'trade'; tradeId: string }
    | null;

interface ExchangeContextValue {
    state: ExchangeState;
    openExchange: (counterparty: string, counterpartyHandle: string | null, seed?: TradeItem) => void;
    openTrade: (tradeId: string) => void;
    closeExchange: () => void;
}

const Ctx = createContext<ExchangeContextValue | null>(null);

export function ExchangeProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<ExchangeState>(null);

    const openExchange = useCallback((counterparty: string, counterpartyHandle: string | null, seed?: TradeItem) => {
        setState({ view: 'compose', counterparty: counterparty.toLowerCase(), counterpartyHandle, seed });
    }, []);
    const openTrade = useCallback((tradeId: string) => {
        setState({ view: 'trade', tradeId });
    }, []);
    const closeExchange = useCallback(() => setState(null), []);

    /* Ping deep-link: /?trade=<id> opens that trade, then cleans the URL. */
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const url = new URL(window.location.href);
        const tradeId = url.searchParams.get('trade');
        if (!tradeId) return;
        setState({ view: 'trade', tradeId });
        url.searchParams.delete('trade');
        window.history.replaceState(null, '', url.pathname + url.search + url.hash);
    }, []);

    const value = useMemo(
        () => ({ state, openExchange, openTrade, closeExchange }),
        [state, openExchange, openTrade, closeExchange],
    );
    return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useExchange(): ExchangeContextValue {
    const ctx = useContext(Ctx);
    if (!ctx) throw new Error('useExchange must be used inside <ExchangeProvider>');
    return ctx;
}
