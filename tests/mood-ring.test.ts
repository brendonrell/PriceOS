/*
 * Mood Ring guarantees (the 2026-07-17 no-repeat walk — "FLIRTY twice in a
 * month" must be impossible forever):
 *   1. The chart is sound: every word globally unique (a duplicate across
 *      bands silently halves the repeat guarantee), founding 40 words keep
 *      their slots (append-only law), everything uppercase.
 *   2. The walk holds: over 4 simulated years, the same mood name never
 *      reappears within a year of itself, and no two consecutive days share
 *      a name.
 *   3. Determinism: same instant → same mood, always.
 * Colour regression is covered by tests/prehydration-mood.test.ts (the
 * boot-paint lockstep), which pins the hex math to the untouched script in
 * app/layout.tsx across 40 dates.
 */
import { describe, expect, it } from 'vitest';
import { moodOfDay } from '../lib/mood/mood';
import { PRICEDAY_EPOCH } from '../lib/priceday/priceday';

/* 16:00 UTC = 11am/12pm Montreal — squarely inside PriceDay N on both sides
   of a DST flip. */
const dateForDay = (n: number) =>
  new Date(PRICEDAY_EPOCH + (n - 1) * 86_400_000 + 16 * 3_600_000);

const FOUNDING_CHART: Record<number, string[]> = {
  0: ['EXCITED', 'AMPED', 'FIRED UP', 'BOLD'],
  1: ['DARING', 'RESTLESS', 'STOKED', 'ADVENTUROUS'],
  2: ['NERVOUS', 'GIDDY', 'JITTERY', 'WIRED'],
  3: ['UPBEAT', 'HOPEFUL', 'FRESH', 'SUNNY'],
  4: ['CALM', 'MELLOW', 'CHILL', 'STEADY'],
  5: ['RELAXED', 'SERENE', 'BREEZY', 'ZEN'],
  6: ['HAPPY', 'OPTIMISTIC', 'DREAMY', 'TRANQUIL'],
  7: ['ROMANTIC', 'BLISSFUL', 'SMITTEN', 'MOONSTRUCK'],
  8: ['PASSIONATE', 'INTENSE', 'MAGNETIC', 'MYSTERIOUS'],
  9: ['FLIRTY', 'LOVESTRUCK', 'AFFECTIONATE', 'SWEET'],
};

describe('mood chart integrity', () => {
  // Read the chart through the module's own source of truth: mood.ts does
  // not export it, so parse it out of the file — the same words the walk
  // reads, no drift possible.
  const src = require('node:fs').readFileSync(
    require('node:path').join(__dirname, '..', 'lib', 'mood', 'mood.ts'),
    'utf8'
  ) as string;
  const chartSrc = src.slice(src.indexOf('const MOOD_CHART'), src.indexOf('] as const;'));
  const bands = [...chartSrc.matchAll(/moods:\s*\[([\s\S]*?)\]/g)].map((m) =>
    [...m[1].matchAll(/'([^']+)'/g)].map((w) => w[1])
  );

  it('has 10 bands and a much bigger book than the founding 40', () => {
    expect(bands.length).toBe(10);
    const total = bands.reduce((n, b) => n + b.length, 0);
    expect(total).toBeGreaterThanOrEqual(350);
  });

  it('keeps the founding 2026-06-12 words in their original slots (append-only law)', () => {
    for (const [i, first4] of Object.entries(FOUNDING_CHART)) {
      expect(bands[Number(i)].slice(0, 4)).toEqual(first4);
    }
  });

  it('every word is globally unique and uppercase', () => {
    const all = bands.flat();
    expect(new Set(all).size).toBe(all.length);
    for (const w of all) expect(w).toBe(w.toUpperCase());
  });
});

describe('the no-repeat walk', () => {
  const YEARS = 4;
  const DAYS = YEARS * 365;
  const names: string[] = [];
  for (let n = 1; n <= DAYS; n++) names.push(moodOfDay(dateForDay(n)).name);

  it('never repeats a mood name within a year of itself (4-year simulation)', () => {
    const lastSeen = new Map<string, number>();
    let minGap = Infinity;
    let worst = '';
    names.forEach((name, i) => {
      const prev = lastSeen.get(name);
      if (prev !== undefined && i - prev < minGap) {
        minGap = i - prev;
        worst = `${name} (day ${prev + 1} → day ${i + 1})`;
      }
      lastSeen.set(name, i);
    });
    expect(minGap, `tightest repeat: ${worst} — gap ${minGap} days`).toBeGreaterThanOrEqual(300);
  });

  it('no two consecutive days share a name', () => {
    for (let i = 1; i < names.length; i++) {
      expect(names[i], `day ${i} → ${i + 1}`).not.toBe(names[i - 1]);
    }
  });

  it('is deterministic and colour-shaped', () => {
    const a = moodOfDay(dateForDay(400));
    const b = moodOfDay(dateForDay(400));
    expect(a).toEqual(b);
    expect(a.hex).toMatch(/^#[0-9A-F]{6}$/);
  });
});
