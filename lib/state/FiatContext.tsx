'use client';

/*
 * FiatContext — the app-wide fiat-conversion layer.
 *
 * OFF by default. A user opts in from the Wallet settings row (the $ picker),
 * choosing one of USD · CAD · GBP · EUR · JPY (USD is the first pick). It's a
 * set-and-forget preference, remembered in localStorage.
 *
 * While a currency is selected we poll /api/fx (one globally-shared, edge-cached
 * rate set — free at any scale) and expose ethToFiat() for the mint/floor CTAs.
 * The number is only ever shown when the source is TRUSTED (see /api/fx) — a
 * blind buyer must never read a figure we can't stand behind, so an untrusted or
 * missing rate returns null and the ~fiat simply doesn't render.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import type { FiatCode, FxResponse } from '../fx/types';

const STORAGE_KEY = 'pd_fiat_currency';
const POLL_MS = 5 * 60_000; // rates move slowly; a display price doesn't need tighter

/* Symbol + fractional digits + the number LOCALE per currency, so each reads the
   way its region writes money — EUR uses a comma decimal (22,34), JPY has no
   decimals, etc. (Brendon 2026-07-08). */
const CURRENCY_META: Record<FiatCode, { symbol: string; decimals: number; locale: string }> = {
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
    CAD: { symbol: '$', decimals: 2, locale: 'en-CA' },
    GBP: { symbol: '£', decimals: 2, locale: 'en-GB' },
    EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
    JPY: { symbol: '¥', decimals: 0, locale: 'ja-JP' },
};

export const FIAT_OPTIONS: FiatCode[] = ['USD', 'CAD', 'GBP', 'EUR', 'JPY'];

/** The picker glyph: the chosen currency's symbol, or a neutral $ when off. */
export function fiatSymbol(code: FiatCode | null): string {
    return code ? CURRENCY_META[code].symbol : '$';
}

function formatFiat(eth: number, code: FiatCode, rate: number): string {
    const { symbol, decimals, locale } = CURRENCY_META[code];
    const value = eth * rate;
    if (!isFinite(value) || value < 0) return '';
    // A non-zero amount that would round to 0.00 reads as "free" — say <min instead.
    const floorUnit = decimals === 0 ? 1 : Math.pow(10, -decimals);
    if (value > 0 && value < floorUnit) {
        return `~${symbol}<${floorUnit.toLocaleString(locale, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
    }
    const shown = value.toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    });
    return `~${symbol}${shown}`;
}

interface FiatContextValue {
    currency: FiatCode | null;
    setCurrency: (next: FiatCode | null) => void;
    /** Formatted "~C$0.74" for an ETH amount, or null when it must not render. */
    ethToFiat: (eth: number) => string | null;
    /** The raw numeric fiat value for an ETH amount (null when off/untrusted). */
    ethToFiatValue: (eth: number) => number | null;
    ready: boolean;
}

const FX_KEY = 'pd_fiat_fx';

/** Saved currency, read synchronously (SSR-safe → null on the server). */
function readStoredCurrency(): FiatCode | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw && (FIAT_OPTIONS as string[]).includes(raw) ? (raw as FiatCode) : null;
    } catch {
        return null;
    }
}

/** Last-known rates, read synchronously so the ~fiat shows on first paint. */
function readStoredFx(): FxResponse | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(FX_KEY);
        if (!raw) return null;
        const j = JSON.parse(raw) as FxResponse;
        return j && j.rates && typeof j.trusted === 'boolean' ? j : null;
    } catch {
        return null;
    }
}

const FiatContext = createContext<FiatContextValue | null>(null);

export function FiatProvider({ children }: { children: ReactNode }) {
    // Read the saved preference + last rates SYNCHRONOUSLY on first render so the
    // fiat readout is present on the very first paint — fiat mode is a stored
    // switch, it must NOT flash in after load (Brendon 2026-07-08).
    const [currency, setCurrencyState] = useState<FiatCode | null>(readStoredCurrency);
    const [fx, setFx] = useState<FxResponse | null>(readStoredFx);
    const currencyRef = useRef<FiatCode | null>(null);
    currencyRef.current = currency;

    const setCurrency = useCallback((next: FiatCode | null) => {
        setCurrencyState(next);
        try {
            if (next) localStorage.setItem(STORAGE_KEY, next);
            else localStorage.removeItem(STORAGE_KEY);
        } catch {
            /* ignore */
        }
    }, []);

    // Poll /api/fx only while a currency is selected + the tab is visible.
    useEffect(() => {
        if (!currency) {
            setFx(null);
            return;
        }
        let cancelled = false;
        const tick = async () => {
            if (typeof document !== 'undefined' && document.hidden) return;
            try {
                const res = await fetch('/api/fx');
                if (!res.ok) return;
                const json = (await res.json()) as FxResponse;
                if (cancelled) return;
                setFx(json);
                try { localStorage.setItem(FX_KEY, JSON.stringify(json)); } catch { /* ignore */ }
            } catch {
                /* transient — keep the last good rates */
            }
        };
        tick();
        const id = setInterval(tick, POLL_MS);
        const onVis = () => { if (!document.hidden) tick(); };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            cancelled = true;
            clearInterval(id);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [currency]);

    const ethToFiat = useCallback(
        (eth: number): string | null => {
            if (!currency || !fx || !fx.trusted) return null;
            const rate = fx.rates?.[currency];
            if (typeof rate !== 'number' || !isFinite(eth)) return null;
            const out = formatFiat(eth, currency, rate);
            return out || null;
        },
        [currency, fx],
    );

    const ethToFiatValue = useCallback(
        (eth: number): number | null => {
            if (!currency || !fx || !fx.trusted) return null;
            const rate = fx.rates?.[currency];
            if (typeof rate !== 'number' || !isFinite(eth)) return null;
            return eth * rate;
        },
        [currency, fx],
    );

    const value = useMemo<FiatContextValue>(
        () => ({ currency, setCurrency, ethToFiat, ethToFiatValue, ready: !!fx }),
        [currency, setCurrency, ethToFiat, ethToFiatValue, fx],
    );

    return <FiatContext.Provider value={value}>{children}</FiatContext.Provider>;
}

export function useFiat(): FiatContextValue {
    const ctx = useContext(FiatContext);
    if (!ctx) {
        // Safe no-op outside the provider (e.g. isolated renders) — fiat just stays off.
        return { currency: null, setCurrency: () => {}, ethToFiat: () => null, ethToFiatValue: () => null, ready: false };
    }
    return ctx;
}
