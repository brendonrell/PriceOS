/*
 * lib/fx/format.ts — pure fiat money formatting, shared by the inline
 * converter (the Command Stone + Global Search) so ETH↔fiat reads the way its
 * region writes money. Kept separate from FiatContext (a client module) so
 * server/pure code can import it without pulling React in.
 */

import type { FiatCode } from './types';

export const CURRENCY_META: Record<FiatCode, { symbol: string; decimals: number; locale: string }> = {
    USD: { symbol: '$', decimals: 2, locale: 'en-US' },
    CAD: { symbol: '$', decimals: 2, locale: 'en-CA' },
    GBP: { symbol: '£', decimals: 2, locale: 'en-GB' },
    EUR: { symbol: '€', decimals: 2, locale: 'de-DE' },
    AUD: { symbol: '$', decimals: 2, locale: 'en-AU' },
    JPY: { symbol: '¥', decimals: 0, locale: 'ja-JP' },
    PHP: { symbol: '₱', decimals: 2, locale: 'en-PH' },
};

/** "$1,638.00" — a fiat value in its currency's own notation. */
export function formatFiat(value: number, code: FiatCode): string {
    const meta = CURRENCY_META[code];
    if (!meta || !Number.isFinite(value)) return '';
    // Large figures drop the cents — the precision is noise at that scale
    // (matches FiatContext's own rule, Brendon 2026-07-08).
    const dec = value >= 1000 ? 0 : meta.decimals;
    const shown = value.toLocaleString(meta.locale, {
        minimumFractionDigits: dec,
        maximumFractionDigits: dec,
    });
    return `${meta.symbol}${shown}`;
}
