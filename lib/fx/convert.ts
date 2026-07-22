/*
 * lib/fx/convert.ts — the inline ETH↔fiat converter's PURE grammar.
 *
 * "1 eth", "0.5 eth in gbp", "2 eth to jpy", and the reverse "500 usd to eth",
 * "$500 in eth". At least one side is ETH (this is an ETH converter, not a
 * fiat-cross tool). Parsing is pure + testable; the actual number needs live
 * rates (convertValue), which the surfaces fetch via lib/fx/rates.
 */

import type { FiatCode, FxResponse } from './types';
import { formatFiat } from './format';
import { FIAT_CODES } from './types';

export type Unit = 'ETH' | FiatCode;

export interface ConvertPlan {
    amount: number;
    from: Unit;
    /** null = caller picks the default target (selected currency, else USD). */
    to: Unit | null;
}

const ETH_WORDS = new Set(['eth', 'ether', 'ethereum', 'ξ', '◊', 'Ξ']);
const SYMBOLS: Record<string, FiatCode> = { '£': 'GBP', '€': 'EUR', '¥': 'JPY', '₱': 'PHP' };
const CODES = new Set<string>(FIAT_CODES.map((c) => c.toLowerCase()));

/** Map a unit word/symbol to a canonical Unit, or null. `$` is ambiguous
 *  (USD/CAD/AUD) → USD by default. */
function toUnit(raw: string): Unit | null {
    const w = raw.trim().toLowerCase();
    if (!w) return null;
    if (ETH_WORDS.has(w) || ETH_WORDS.has(raw.trim())) return 'ETH';
    if (w === '$' || w === 'usd') return 'USD';
    if (SYMBOLS[raw.trim()]) return SYMBOLS[raw.trim()];
    if (CODES.has(w)) return w.toUpperCase() as FiatCode;
    return null;
}

/* number, allowing a leading currency symbol and thousands separators. */
const NUM = String.raw`(\d[\d,]*(?:\.\d+)?|\.\d+)`;
const UNIT = String.raw`([a-zA-Z]{2,8}|[£€¥₱$Ξξ◊])`;

/** Parse a typed line into a conversion plan, or null. */
export function parseConvert(line: string): ConvertPlan | null {
    const s = line.trim();
    if (!s || s.length > 48) return null;

    // Form A: "$500 to eth" / "£20 in eth" — symbol-prefixed amount.
    let m = new RegExp(`^([£€¥₱$])\\s*${NUM}\\s*(?:(?:to|in|=|->)\\s*${UNIT})?$`, 'i').exec(s);
    if (m) {
        const from = toUnit(m[1]);
        const amount = parseFloat(m[2].replace(/,/g, ''));
        const to = m[3] ? toUnit(m[3]) : 'ETH';
        if (from && Number.isFinite(amount)) return finish(amount, from, to);
    }

    // Form B: "<amount> <unit> [to|in <unit>]".
    m = new RegExp(`^${NUM}\\s*${UNIT}(?:\\s*(?:to|in|=|->)\\s*${UNIT})?$`, 'i').exec(s);
    if (m) {
        const amount = parseFloat(m[1].replace(/,/g, ''));
        const from = toUnit(m[2]);
        const to = m[3] ? toUnit(m[3]) : null;
        if (from && Number.isFinite(amount)) return finish(amount, from, to);
    }

    return null;
}

/** Enforce the ETH-on-one-side rule + a sane default target. */
function finish(amount: number, from: Unit, to: Unit | null): ConvertPlan | null {
    if (amount < 0) return null;
    if (to && to === from) return null;
    // one side must be ETH
    if (from !== 'ETH' && to !== 'ETH') {
        // "500 usd" with no target → convert to ETH; an explicit fiat→fiat is out.
        if (to == null) return { amount, from, to: 'ETH' };
        return null;
    }
    return { amount, from, to };
}

/** The converted numeric value, or null when rates are missing/untrusted. */
export function convertValue(plan: ConvertPlan, fx: FxResponse | null, fallbackFiat: FiatCode = 'USD'): {
    value: number; from: Unit; to: Unit;
} | null {
    if (!fx || !fx.trusted) return null;
    const to = plan.to ?? (plan.from === 'ETH' ? fallbackFiat : 'ETH');
    const from = plan.from;
    if (from === to) return null;

    if (from === 'ETH') {
        const rate = fx.rates?.[to as FiatCode];
        if (typeof rate !== 'number') return null;
        return { value: plan.amount * rate, from, to };
    }
    if (to === 'ETH') {
        const rate = fx.rates?.[from as FiatCode];
        if (typeof rate !== 'number' || rate <= 0) return null;
        return { value: plan.amount / rate, from, to };
    }
    // fiat → fiat (via ETH) — supported when both rates exist
    const rf = fx.rates?.[from as FiatCode];
    const rt = fx.rates?.[to as FiatCode];
    if (typeof rf !== 'number' || rf <= 0 || typeof rt !== 'number') return null;
    return { value: (plan.amount / rf) * rt, from, to };
}

/** Render a converted amount in its unit's notation. ETH → "◊0.4213". */
export function formatUnit(value: number, unit: Unit): string {
    if (unit === 'ETH') {
        if (!Number.isFinite(value)) return '—';
        // up to 6 dp for ETH, trimmed
        const r = Math.round(value * 1e6) / 1e6;
        return `◊${r.toLocaleString('en-US', { maximumFractionDigits: 6 })}`;
    }
    return formatFiat(value, unit);
}

/** "1 ETH" / "500 USD" — the source label. */
export function formatSource(amount: number, unit: Unit): string {
    const n = amount.toLocaleString('en-US', { maximumFractionDigits: 6 });
    return unit === 'ETH' ? `◊${n} ETH` : `${n} ${unit}`;
}
