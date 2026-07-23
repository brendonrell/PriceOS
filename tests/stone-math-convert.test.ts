import { describe, it, expect } from 'vitest';
import { evalMath, formatMathValue, pdNumberNote } from '../lib/stone/mathEval';
import { parseConvert, convertValue, convertAll } from '../lib/fx/convert';
import type { FxResponse } from '../lib/fx/types';
import { parseWidget } from '../lib/stone/widgets';

describe('evalMath', () => {
    it('evaluates a basic product', () => {
        expect(evalMath('3*546')?.value).toBe(1638);
    });
    it('honours precedence and parens', () => {
        expect(evalMath('2+3*4')?.value).toBe(14);
        expect(evalMath('(2+3)*4')?.value).toBe(20);
    });
    it('handles pretty operators and spaces', () => {
        expect(evalMath('6 × 7')?.value).toBe(42);
        expect(evalMath('100 ÷ 4')?.value).toBe(25);
    });
    it('does division, power, unary minus', () => {
        expect(evalMath('10/4')?.value).toBe(2.5);
        expect(evalMath('2^10')?.value).toBe(1024);
        expect(evalMath('-3+5')?.value).toBe(2);
        expect(evalMath('2*-3')?.value).toBe(-6);
    });
    it('rejects a bare number (no operator)', () => {
        expect(evalMath('22')).toBeNull();
        expect(evalMath('546')).toBeNull();
    });
    it('rejects words / handles / division by zero', () => {
        expect(evalMath('prisms')).toBeNull();
        expect(evalMath('@gmoney')).toBeNull();
        expect(evalMath('5/0')).toBeNull();
        expect(evalMath('1 eth')).toBeNull();
    });
    it('formats results with thousands + trims float dust', () => {
        expect(formatMathValue(1638)).toBe('1,638');
        expect(formatMathValue(0.1 + 0.2)).toBe('0.3');
    });
    it('flags PD-relevant results only on exact integers', () => {
        expect(pdNumberNote(1000)).toContain('per-mille');
        expect(pdNumberNote(22)).toContain('mint');
        expect(pdNumberNote(42)).toContain('42');
        expect(pdNumberNote(1637)).toBeNull();
        expect(pdNumberNote(1000.5)).toBeNull();
    });
});

const FX: FxResponse = {
    rates: { USD: 4000, EUR: 3600, GBP: 3200, JPY: 600000 },
    trusted: true,
    source: 'test',
    fetchedAt: Date.now(),
};

describe('parseConvert + convertValue', () => {
    it('parses "1 eth" with a default target', () => {
        const p = parseConvert('1 eth');
        expect(p).toEqual({ amount: 1, from: 'ETH', to: null });
        expect(convertValue(p!, FX, 'USD')?.value).toBe(4000);
    });
    it('parses an explicit target', () => {
        const p = parseConvert('0.5 eth in gbp');
        expect(p).toEqual({ amount: 0.5, from: 'ETH', to: 'GBP' });
        expect(convertValue(p!, FX)?.value).toBe(1600);
    });
    it('parses reverse fiat→eth', () => {
        const p = parseConvert('4000 usd to eth');
        expect(p).toEqual({ amount: 4000, from: 'USD', to: 'ETH' });
        expect(convertValue(p!, FX)?.value).toBe(1);
    });
    it('parses a symbol-prefixed amount', () => {
        const p = parseConvert('$8000 to eth');
        expect(p?.from).toBe('USD');
        expect(convertValue(p!, FX)?.value).toBe(2);
    });
    it('a bare fiat amount converts to eth', () => {
        expect(parseConvert('3200 gbp')).toEqual({ amount: 3200, from: 'GBP', to: 'ETH' });
    });
    it('a dangling "to" / "in" reads as an all-currencies preview', () => {
        expect(parseConvert('3 eth to')).toEqual({ amount: 3, from: 'ETH', to: null });
        expect(parseConvert('3 eth in')).toEqual({ amount: 3, from: 'ETH', to: null });
    });
    it('strips a leading "convert"', () => {
        expect(parseConvert('convert 3 eth to')).toEqual({ amount: 3, from: 'ETH', to: null });
        expect(parseConvert('convert 3 eth to gbp')).toEqual({ amount: 3, from: 'ETH', to: 'GBP' });
    });
    it('convertAll maps every currency in the given order', () => {
        const rows = convertAll(1, ['USD', 'EUR', 'GBP'], FX);
        expect(rows).toEqual([
            { code: 'USD', value: 4000 },
            { code: 'EUR', value: 3600 },
            { code: 'GBP', value: 3200 },
        ]);
        expect(convertAll(1, ['USD'], { ...FX, trusted: false })).toEqual([]);
    });
    it('rejects non-conversions', () => {
        expect(parseConvert('3*546')).toBeNull();
        expect(parseConvert('prisms')).toBeNull();
        expect(parseConvert('floor')).toBeNull();
    });
    it('returns null when rates are untrusted', () => {
        expect(convertValue(parseConvert('1 eth')!, { ...FX, trusted: false })).toBeNull();
    });
});

describe('parseWidget routes math + convert', () => {
    it('routes an arithmetic line to the math widget', () => {
        expect(parseWidget('3*546')).toEqual({ kind: 'math', expr: '3*546', value: 1638 });
    });
    it('routes a conversion line to the convert widget', () => {
        const w = parseWidget('1 eth');
        expect(w?.kind).toBe('convert');
    });
    it('leaves ordinary searches alone', () => {
        expect(parseWidget('prisms')).toBeNull();
    });
});
