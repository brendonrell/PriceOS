// The settlement service's decision layer: the relative 20/40/40 bands
// (Brendon's cuts, 2026-08-03), the ladder's ordering and neutral
// tie-breaks, arrival-order blindness, the canonical entry form, and the
// seal scale (seconds typically, 15-minute hard cap).
import { describe, it, expect } from 'vitest';
import {
    assignBands, compareStanding, BAND_SHARES, type Standing,
} from '@/lib/drops/banding';
import {
    canonicalEntries, sealSecondsFor,
    SEAL_SECONDS_BASE, SEAL_SECONDS_MAX, WINDOW_SECONDS_DEFAULT,
} from '@/lib/drops/settlement';

function wallet(n: number): `0x${string}` {
    return `0x${n.toString(16).padStart(40, '0')}` as `0x${string}`;
}

function standing(n: number, held: number, spent = 0, tenureDays = 0): Standing {
    return { wallet: wallet(n), held, spent, tenureDays };
}

describe('the ladder (holdings → spend → tenure)', () => {
    it('ranks held collection first, then spend, then tenure', () => {
        const deepHolder = standing(1, 10, 0, 0);
        const bigSpender = standing(2, 2, 100, 0);
        const elder = standing(3, 2, 1, 900);
        const sorted = [elder, bigSpender, deepHolder].sort(compareStanding);
        expect(sorted.map((s) => s.wallet)).toEqual([
            deepHolder.wallet, bigSpender.wallet, elder.wallet,
        ]);
    });

    it('breaks exact ties on the wallet address — a fixed, neutral key', () => {
        const a = standing(5, 3, 1, 10);
        const b = standing(9, 3, 1, 10);
        expect(compareStanding(a, b)).toBeLessThan(0);
        expect(compareStanding(b, a)).toBeGreaterThan(0);
    });
});

describe('the relative cuts — top 20% / next 40% / rest', () => {
    it('slices a 10-entrant room 2 / 4 / 4', () => {
        const room = Array.from({ length: 10 }, (_, i) => standing(i + 1, 100 - i));
        const bands = assignBands(room);
        const counts = [0, 0, 0];
        for (const b of bands.values()) counts[b]! += 1;
        expect(counts).toEqual([2, 4, 4]);
    });

    it('gives the strongest standing band 0', () => {
        const room = [standing(1, 1), standing(2, 50), standing(3, 3)];
        const bands = assignBands(room);
        expect(bands.get(wallet(2))).toBe(0);
    });

    it('is blind to input (arrival) order', () => {
        const room = Array.from({ length: 25 }, (_, i) => standing(i + 1, (i * 7) % 13, i % 5));
        const shuffled = [...room].reverse();
        const a = assignBands(room);
        const b = assignBands(shuffled);
        for (const s of room) expect(a.get(s.wallet)).toBe(b.get(s.wallet));
    });

    it('a one-entrant room is band 0', () => {
        expect(assignBands([standing(1, 0)]).get(wallet(1))).toBe(0);
    });

    it('the shares are the approved cuts', () => {
        expect(BAND_SHARES).toEqual([0.2, 0.4]);
    });
});

describe('canonical entries', () => {
    it('orders by band then wallet, regardless of input order', () => {
        const rows = [
            { wallet: wallet(9), seats: 1, band: 1 },
            { wallet: wallet(2), seats: 2, band: 0 },
            { wallet: wallet(7), seats: 1, band: 0 },
        ];
        const canon = canonicalEntries(rows);
        expect(canon.map((e) => e.wallet)).toEqual([wallet(2), wallet(7), wallet(9)]);
        expect(canonicalEntries([...rows].reverse())).toEqual(canon);
    });
});

describe('the timing (Brendon, 2026-08-03)', () => {
    it('the window default is the opening minute', () => {
        expect(WINDOW_SECONDS_DEFAULT).toBe(60);
    });

    it('a typical contested close seals for seconds', () => {
        expect(sealSecondsFor(120, 100)).toBe(SEAL_SECONDS_BASE + 20);
    });

    it('only a thousands-deep battle reaches the 15-minute cap — never past it', () => {
        expect(sealSecondsFor(5000, 1000)).toBe(SEAL_SECONDS_MAX);
        expect(SEAL_SECONDS_MAX).toBe(900);
    });

    it('a quiet-sized room stays at the base', () => {
        expect(sealSecondsFor(50, 100)).toBe(SEAL_SECONDS_BASE);
    });
});
