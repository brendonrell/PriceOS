/*
 * Quiet Hours — the Silent Mode pill's second stage (Brendon, 2026-07-20).
 *
 * Pins the contract: the clock parser accepts the quick-add forms, the
 * window math handles overnight wrap in the USER's zone, and every broken
 * input fails OPEN (deliver) — a bad zone or window must never silently
 * kill native push (the 2026-07-18 lesson).
 */

import { describe, expect, it } from 'vitest';
import { parseClockTime, quietWindowActive, type QuietHours } from '../lib/quiet/quietHours';

const q = (start: string, end: string, tz = 'UTC', on = true): QuietHours =>
    ({ on, start, end, tz });

// 2026-07-20, fixed instants (UTC)
const at = (hhmm: string) => new Date(`2026-07-20T${hhmm}:00Z`);

describe('parseClockTime', () => {
    it('accepts the quick-add forms', () => {
        expect(parseClockTime('10pm')).toBe('22:00');
        expect(parseClockTime('10:30 pm')).toBe('22:30');
        expect(parseClockTime('8am')).toBe('08:00');
        expect(parseClockTime('12am')).toBe('00:00');
        expect(parseClockTime('12pm')).toBe('12:00');
        expect(parseClockTime('22:00')).toBe('22:00');
        expect(parseClockTime('8:05')).toBe('08:05');
        expect(parseClockTime('22')).toBe('22:00');
        expect(parseClockTime(' 7 ')).toBe('07:00');
    });
    it('rejects junk', () => {
        expect(parseClockTime('')).toBeNull();
        expect(parseClockTime('25:00')).toBeNull();
        expect(parseClockTime('noon-ish')).toBeNull();
        expect(parseClockTime('13pm')).toBeNull();
    });
});

describe('quietWindowActive', () => {
    it('same-day window: inside quiet, outside loud', () => {
        const w = q('09:00', '17:00');
        expect(quietWindowActive(w, at('12:00'))).toBe(true);
        expect(quietWindowActive(w, at('08:59'))).toBe(false);
        expect(quietWindowActive(w, at('17:00'))).toBe(false); // end is exclusive
        expect(quietWindowActive(w, at('09:00'))).toBe(true); // start inclusive
    });

    it('overnight wrap (22:00–08:00): quiet across midnight', () => {
        const w = q('22:00', '08:00');
        expect(quietWindowActive(w, at('23:30'))).toBe(true);
        expect(quietWindowActive(w, at('03:00'))).toBe(true);
        expect(quietWindowActive(w, at('07:59'))).toBe(true);
        expect(quietWindowActive(w, at('08:00'))).toBe(false);
        expect(quietWindowActive(w, at('12:00'))).toBe(false);
        expect(quietWindowActive(w, at('21:59'))).toBe(false);
    });

    it('evaluates in the USER\'s zone, not UTC', () => {
        // 03:00 UTC = 23:00 the previous evening in Montreal (UTC-4 in July)
        const w = q('22:00', '08:00', 'America/Montreal');
        expect(quietWindowActive(w, at('03:00'))).toBe(true);
        // 15:00 UTC = 11:00 in Montreal — loud
        expect(quietWindowActive(w, at('15:00'))).toBe(false);
    });

    it('fails OPEN: off flag, unset, equal times, bad zone → deliver', () => {
        expect(quietWindowActive(null, at('23:00'))).toBe(false);
        expect(quietWindowActive(undefined, at('23:00'))).toBe(false);
        expect(quietWindowActive(q('22:00', '08:00', 'UTC', false), at('23:00'))).toBe(false);
        expect(quietWindowActive(q('22:00', '22:00'), at('23:00'))).toBe(false);
        expect(quietWindowActive(q('junk', '08:00'), at('23:00'))).toBe(false);
        expect(quietWindowActive(q('22:00', '08:00', 'Not/AZone'), at('23:00'))).toBe(false);
    });
});
