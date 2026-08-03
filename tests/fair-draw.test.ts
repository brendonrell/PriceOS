// The fair draw engine — the provably-fair core a stranger must be able to
// check. Determinism, band strictness, in-band equal odds, the cascade, and
// the commitment's tamper evidence.
import { describe, it, expect } from 'vitest';
import {
    runDraw, verifyDraw, drawCommitment, entriesRoot, drawSeed,
    type DrawEntry, type DrawTranscript,
} from '@/lib/drops/draw';

const PROJECT = '0x00000000000000000000000000000000000000aa' as const;
const BEACON = '0x59d85dd5d504cd2df57d5cd60d0d1feccfb74c1a1a9ab5b5b5b0b6e5f6a7c8d9' as const;

function wallet(n: number): `0x${string}` {
    return `0x${n.toString(16).padStart(40, '0')}` as `0x${string}`;
}

function entry(n: number, band = 0, seats = 1): DrawEntry {
    return { wallet: wallet(n), band, seats };
}

function transcript(entries: DrawEntry[], supply = 3): DrawTranscript {
    return { algo: 'pd-draw-v1', project: PROJECT, supply, beaconBlock: 23_456_789, beaconHash: BEACON, entries };
}

describe('the fair draw', () => {
    it('is deterministic — same transcript, same result, forever', () => {
        const t = transcript([entry(1), entry(2), entry(3), entry(4), entry(5)]);
        const a = runDraw(t);
        const b = runDraw(t);
        expect(a.order).toEqual(b.order);
        expect(a.winners).toEqual(b.winners);
        expect(a.commitment).toEqual(b.commitment);
    });

    it('a different beacon reshuffles everything', () => {
        const t = transcript([entry(1), entry(2), entry(3), entry(4), entry(5), entry(6), entry(7), entry(8)]);
        const other = { ...t, beaconHash: BEACON.replace('9', '8') as `0x${string}` };
        expect(runDraw(t).order).not.toEqual(runDraw(other).order);
        expect(runDraw(t).commitment).not.toEqual(runDraw(other).commitment);
    });

    it('band 0 outranks band 1 outranks band 2, always, whole-band', () => {
        const entries = [entry(1, 2), entry(2, 0), entry(3, 1), entry(4, 0), entry(5, 1), entry(6, 2)];
        const { order } = runDraw(transcript(entries, 6));
        const bandOf = new Map(entries.map((e) => [e.wallet, e.band]));
        const drawnBands = order.map((w) => bandOf.get(w)!);
        expect(drawnBands).toEqual([...drawnBands].sort((a, b) => a - b));
    });

    it('the result is a full permutation — every entrant appears exactly once', () => {
        const entries = Array.from({ length: 40 }, (_, i) => entry(i + 1, i % 3));
        const { order } = runDraw(transcript(entries, 5));
        expect(order.length).toBe(40);
        expect(new Set(order).size).toBe(40);
    });

    it('within a band the odds are equal — no positional favoritism', () => {
        // Rotate the beacon across many draws; first place inside one band
        // should land on everyone at roughly equal rates. Loose bounds — this
        // is a smoke alarm for bias, not a statistics paper.
        const entries = Array.from({ length: 8 }, (_, i) => entry(i + 1));
        const firsts = new Map<string, number>();
        const runs = 400;
        for (let r = 0; r < runs; ++r) {
            const beacon = drawSeed(entriesRoot(entries), `0x${r.toString(16).padStart(64, '0')}` as `0x${string}`);
            const { order } = runDraw({ ...transcript(entries, 1), beaconHash: beacon });
            firsts.set(order[0]!, (firsts.get(order[0]!) ?? 0) + 1);
        }
        const expected = runs / entries.length; // 50
        for (const n of firsts.values()) {
            expect(n).toBeGreaterThan(expected * 0.5);
            expect(n).toBeLessThan(expected * 1.7);
        }
        expect(firsts.size).toBe(entries.length);
    });

    it('winners fill supply by seats; the tail is the cascade', () => {
        const entries = [entry(1, 0, 2), entry(2, 0, 2), entry(3, 0, 2), entry(4, 0, 2)];
        const { order, winners } = runDraw(transcript(entries, 5));
        const total = winners.reduce((s, w) => s + w.seats, 0);
        expect(total).toBe(5); // never over supply — the boundary order is clipped
        expect(winners.map((w) => w.wallet)).toEqual(order.slice(0, winners.length));
    });

    it('verifies the real result and rejects a doctored transcript', () => {
        const t = transcript([entry(1), entry(2), entry(3), entry(4), entry(5)]);
        const { commitment, winners } = runDraw(t);
        expect(verifyDraw(t, commitment, winners).ok).toBe(true);

        // Swap one entrant after the fact → commitment breaks.
        const doctored = { ...t, entries: [entry(9), ...t.entries.slice(1)] };
        expect(verifyDraw(doctored, commitment, winners).ok).toBe(false);

        // Claim different winners → replay breaks.
        const fake = [...winners];
        fake[0] = { ...fake[0]!, wallet: wallet(99) };
        expect(verifyDraw(t, commitment, fake).ok).toBe(false);
    });

    it('refuses duplicate wallets, junk addresses, and bad seats', () => {
        expect(() => runDraw(transcript([entry(1), entry(1)]))).toThrow(/duplicate/);
        expect(() => runDraw(transcript([{ ...entry(1), wallet: '0xabc' as `0x${string}` }]))).toThrow(/bad wallet/);
        expect(() => runDraw(transcript([{ ...entry(1), wallet: wallet(1).toUpperCase() as `0x${string}` }]))).toThrow(/not lowercase/);
        expect(() => runDraw(transcript([{ ...entry(1), seats: 0 }]))).toThrow(/bad seats/);
        expect(() => runDraw(transcript([entry(1)], 0))).toThrow(/bad supply/);
    });

    it('the commitment covers supply and the beacon, not just entries', () => {
        const t = transcript([entry(1), entry(2)]);
        expect(drawCommitment({ ...t, supply: t.supply + 1 })).not.toEqual(drawCommitment(t));
        expect(drawCommitment({ ...t, beaconBlock: t.beaconBlock + 1 })).not.toEqual(drawCommitment(t));
    });
});
