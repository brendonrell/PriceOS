/*
 * Magic quick-add TIME parsing (Brendon, 2026-07-20 — "natural language
 * adding needs to incorporate time including 3PM etc").
 */

import { describe, it, expect } from 'vitest';
import { parseTodo } from '../lib/todos/parse';

function todayIso(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const da = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${da}`;
}

describe('quick-add time parsing', () => {
    it('"3pm" → 15:00, bare time lands today, text cleaned', () => {
        const p = parseTodo('call the framer 3pm');
        expect(p.dueTime).toBe('15:00');
        expect(p.due).toBe(todayIso());
        expect(p.text).toBe('call the framer');
    });

    it('"3PM" / "3 pm" / "at 3pm" all read', () => {
        expect(parseTodo('x 3PM').dueTime).toBe('15:00');
        expect(parseTodo('x 3 pm').dueTime).toBe('15:00');
        const at = parseTodo('gallery run at 3pm');
        expect(at.dueTime).toBe('15:00');
        expect(at.text).toBe('gallery run');
    });

    it('minutes + am forms: "3:30pm" → 15:30 · "11am" → 11:00 · "12:05am" → 00:05', () => {
        expect(parseTodo('x 3:30pm').dueTime).toBe('15:30');
        expect(parseTodo('x 11am').dueTime).toBe('11:00');
        expect(parseTodo('x 12:05am').dueTime).toBe('00:05');
        expect(parseTodo('x 12pm').dueTime).toBe('12:00');
    });

    it('24h "15:30" reads; time composes with a date word', () => {
        expect(parseTodo('x 15:30').dueTime).toBe('15:30');
        const p = parseTodo('list prisms fri 9am');
        expect(p.dueTime).toBe('09:00');
        expect(p.due).not.toBeNull();
        expect(p.due).not.toBe(todayIso()); // fri wins over the bare-time today rule
    });

    it('never eats prices or output ids: "buy prisms 22 under .4 fri 3pm"', () => {
        const p = parseTodo('buy prisms 22 under .4 fri 3pm');
        expect(p.output).toEqual({ slug: 'prisms', tokenId: 22, verb: 'BUY' });
        expect(p.priceEth).toBe(0.4);
        expect(p.dueTime).toBe('15:00');
    });

    it('no time stays null — plain adds unchanged', () => {
        const p = parseTodo('renew ens every month p1');
        expect(p.dueTime).toBeNull();
        expect(p.recurrence).toBe('monthly');
        expect(p.priority).toBe(1);
    });
});
