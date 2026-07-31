/*
 * Sound layer — recipe + renderer integrity.
 *
 * The five locked blips (Brendon, 2026-07-20) are pure data rendered by
 * one deterministic function; these tests pin the contract: exactly five
 * sounds, sane voice data, deterministic output, and a renderer that
 * produces real, normalized, finite audio.
 */

import { describe, expect, it } from 'vitest';
import { renderRecipe, SOUND_RECIPES } from '../lib/sound/recipes';

const NAMES = [
    'chime', 'sparkle', 'tick', 'coin', 'seal', 'nudge', 'clunk', 'tuck',
    /* The Depanneur's machine sounds (2026-07-31). */
    'slot', 'crank', 'capsule', 'pop',
] as const;

describe('sound recipes', () => {
    it('ships exactly the locked sounds', () => {
        expect(Object.keys(SOUND_RECIPES).sort()).toEqual([...NAMES].sort());
    });

    it('every voice is finite, positive-length, and inside its recipe', () => {
        for (const name of NAMES) {
            const r = SOUND_RECIPES[name];
            expect(r.dur).toBeGreaterThan(0);
            expect(r.voices.length).toBeGreaterThan(0);
            for (const v of r.voices) {
                expect(v.at).toBeGreaterThanOrEqual(0);
                expect(v.dur).toBeGreaterThan(0);
                expect(v.f0).toBeGreaterThan(0);
                expect(v.gain).toBeGreaterThan(0);
                expect(v.at).toBeLessThan(r.dur);
                for (const [mult, amp] of v.partials) {
                    expect(mult).toBeGreaterThan(0);
                    expect(amp).toBeGreaterThan(0);
                }
            }
        }
    });

    it('the tick stays a short dry click; nothing outruns the crank', () => {
        expect(SOUND_RECIPES.tick.dur).toBeLessThanOrEqual(0.1);
        /* The crank is the longest by design — it is a mechanism turning, not
           a blip. Every other sound stays under the sparkle's bloom. */
        for (const name of NAMES) {
            if (name === 'crank') continue;
            expect(SOUND_RECIPES[name].dur).toBeLessThanOrEqual(SOUND_RECIPES.sparkle.dur);
        }
        expect(SOUND_RECIPES.crank.dur).toBeLessThanOrEqual(1.0);
    });

    it('renders real normalized audio — finite samples, peak at -3dB', () => {
        for (const name of NAMES) {
            const buf = renderRecipe(SOUND_RECIPES[name], 44100);
            expect(buf.length).toBe(Math.ceil(SOUND_RECIPES[name].dur * 44100));
            /* Scan in plain code — an expect() per sample is millions of
               assertions and pushes this past the timeout. */
            let peak = 0;
            let bad = 0;
            for (const s of buf) {
                if (!Number.isFinite(s)) bad += 1;
                else peak = Math.max(peak, Math.abs(s));
            }
            expect(bad).toBe(0);
            expect(peak).toBeGreaterThan(0.7);
            expect(peak).toBeLessThanOrEqual(0.708);
        }
    });

    it('rendering is deterministic — the glitter clouds are seeded', () => {
        const a = renderRecipe(SOUND_RECIPES.coin, 44100);
        const b = renderRecipe(SOUND_RECIPES.coin, 44100);
        expect(a).toEqual(b);
    });
});
