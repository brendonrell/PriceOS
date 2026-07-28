/*
 * The Sigil anatomy guarantee: sigilAnatomy replays sigilFor's exact draw
 * sequence, so its recomposed mark must be BYTE-IDENTICAL to the forged
 * tattoo for every address — forever. If a pool or the grammar ever shifts
 * (they are LOCKED, append-only), this is the tripwire.
 */
import { describe, expect, it } from 'vitest';
import { sigilFor, sigilAnatomy, SIGIL_FORM_NAMES } from '../lib/sigil/sigil';

/** Deterministic pseudo-addresses — plenty to hit all four forms + both
    coin-flip branches many times over. */
function addr(i: number): string {
    let h = (0x9e3779b9 ^ i) >>> 0;
    let out = '0x';
    for (let k = 0; k < 40; k++) {
        h = (Math.imul(h, 0x01000193) ^ (h >>> 13)) >>> 0;
        out += (h & 0xf).toString(16);
    }
    return out;
}

describe('sigilAnatomy', () => {
    it('recomposes byte-identical to sigilFor for 2000 addresses', () => {
        for (let i = 0; i < 2000; i++) {
            const a = addr(i);
            expect(sigilAnatomy(a).mark).toBe(sigilFor(a));
        }
    });

    it('reads coherent parts per form', () => {
        const seenForms = new Set<number>();
        for (let i = 0; i < 400; i++) {
            const an = sigilAnatomy(addr(i));
            seenForms.add(an.form);
            expect(SIGIL_FORM_NAMES[an.form]).toBe(an.formName);
            expect(an.core.length).toBeGreaterThan(0);
            if (an.form === 0) {
                expect(an.edges).not.toBeNull();
                expect(an.side).toBeNull();
                expect(an.core2).toBeNull();
            }
            if (an.form === 1) {
                expect(an.edges).not.toBeNull();
                expect(an.side).not.toBeNull();
            }
            if (an.form === 2) {
                expect(an.edges).toBeNull();
                expect(an.side).not.toBeNull();
            }
            if (an.form === 3) {
                expect(an.core2).not.toBeNull();
                expect(an.side).not.toBeNull();
            }
        }
        // All four locked recipes must appear across the sample.
        expect(seenForms.size).toBe(4);
    });

    it('is case-insensitive on the address like sigilFor', () => {
        const a = addr(7);
        expect(sigilAnatomy(a.toUpperCase()).mark).toBe(sigilFor(a));
    });
});
