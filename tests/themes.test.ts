/*
 * Theme music — the eight locked pieces (Brendon, 2026-07-31).
 *
 * These pin the decisions that cost the most rounds to reach, so a later
 * session can't quietly undo them:
 *   · the Output Page theme has NO TUNE (a melody drags the ear off the art)
 *   · the Busy Mint theme is NOTHING but the tick, in every section
 *   · every piece is long enough not to nag, and renders real finite audio
 */

import { describe, expect, it } from 'vitest';
import { renderRaw } from '../lib/sound/recipes';
import { THEMES, THEME_LABELS, type ThemeName } from '../lib/sound/themes';

const NAMES = Object.keys(THEMES) as ThemeName[];

/* The tune sits well above the backing; the bass and the hat are the two
   things that live outside that band. */
const LEAD_LO = 400;
const HAT_HZ = 6000;

describe('theme music', () => {
    it('every surface has a name for the UI', () => {
        for (const n of NAMES) {
            expect(THEME_LABELS[n]).toMatch(/Theme$/);
        }
    });

    it('every voice is finite, positive-length and inside its piece', () => {
        for (const n of NAMES) {
            const t = THEMES[n];
            expect(t.dur).toBeGreaterThan(0);
            expect(t.bar).toBeGreaterThan(0);
            expect(t.bars).toBeGreaterThan(0);
            expect(t.form.length).toBeGreaterThan(0);
            for (const v of t.voices) {
                expect(v.at).toBeGreaterThanOrEqual(0);
                expect(v.dur).toBeGreaterThan(0);
                expect(v.f0).toBeGreaterThan(0);
                expect(v.gain).toBeGreaterThan(0);
                expect(v.at).toBeLessThan(t.dur);
            }
        }
    });

    it('runs long enough that a surface is not repeating a phrase at you', () => {
        for (const n of NAMES) {
            expect(THEMES[n].dur).toBeGreaterThan(40);
        }
    });

    it('every piece has a middle section — not one block on repeat', () => {
        for (const n of NAMES) {
            expect(new Set(THEMES[n].form).size).toBeGreaterThan(1);
        }
    });

    it('⛔ the Output Page theme carries NO TUNE', () => {
        /* Its energy is all groove. Anything sustained up in melody range
           would be exactly the thing Brendon rejected twice. */
        const lead = THEMES.output.voices.filter(
            (v) => v.f0 > LEAD_LO && v.f0 < HAT_HZ && v.dur > 0.5
        );
        expect(lead).toEqual([]);
    });

    it('⛔ the Busy Mint theme is nothing but the tick, in every section', () => {
        /* No pad, no arpeggio, no tune — the middle once brought music in and
           it landed as a patch pasted into the ticking. Only the pitch moves.
           Everything left is short: the dry pulse, the hat, the thud. */
        for (const v of THEMES.busyMint.voices) {
            expect(v.dur).toBeLessThanOrEqual(0.25);
        }
        /* And it does change pitch across the piece, or it's a metronome. */
        const roots = new Set(
            THEMES.busyMint.voices.filter((v) => v.f0 < LEAD_LO).map((v) => Math.round(v.f0))
        );
        expect(roots.size).toBeGreaterThan(1);
    });

    it('renders real, finite audio', () => {
        for (const n of NAMES) {
            const t = THEMES[n];
            /* One block's worth is enough to prove the math — rendering all
               eight in full would make this suite crawl. */
            const span = Math.min(t.bar * 2, t.dur);
            const buf = renderRaw(
                { dur: span, voices: t.voices.filter((v) => v.at < span) },
                22050
            );
            /* Scan in plain code — an expect() per sample is millions of
               assertions and takes minutes. */
            let peak = 0;
            let bad = 0;
            for (const s of buf) {
                if (!Number.isFinite(s)) bad += 1;
                else peak = Math.max(peak, Math.abs(s));
            }
            expect(bad).toBe(0);
            expect(peak).toBeGreaterThan(0);
        }
    });
});
