/*
 * The boot-paint script in app/layout.tsx re-implements the Mood Ring colour
 * (and must, so home paints before React) — its math has to stay draw-for-draw
 * identical to lib/mood/mood.ts or home flashes two different colours on every
 * load. This test pins the two implementations together: it extracts the REAL
 * script string from layout.tsx source, runs it in a stubbed DOM sandbox on
 * the home path with no saved colorway (the Mood Ring boot case), and asserts
 * the painted --bg-color equals moodOfDay().hex — across 40 dates spanning a
 * year, including DST transitions. If either side ever drifts, this fails
 * with the exact date.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { moodOfDay } from '../lib/mood/mood';

function extractPrehydrationScript(): string {
  const src = readFileSync(join(__dirname, '..', 'app', 'layout.tsx'), 'utf8');
  const m = src.match(/const PREHYDRATION_SCRIPT = `([\s\S]*?)`\.trim\(\)/);
  if (!m) throw new Error('PREHYDRATION_SCRIPT not found in app/layout.tsx');
  // Re-evaluate the raw source segment as a template literal so escape
  // sequences (\\/ → \/ etc.) are processed exactly as the browser receives
  // them — the raw file text is NOT the runtime string. Safe: the script
  // contains no backticks and no ${} (guarded below).
  if (m[1].includes('${')) throw new Error('unexpected interpolation in PREHYDRATION_SCRIPT');
  return new Function(`return \`${m[1]}\`;`)() as string;
}

/** Run the boot script against stubs and capture every CSS var it paints. */
function runBootPaint(pathname: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const windowStub = {
    location: { pathname },
    matchMedia: () => ({ matches: false }),
  };
  const documentStub = {
    documentElement: {
      style: { setProperty: (k: string, v: string) => { vars[k] = v; } },
    },
    getElementById: () => null,
    body: { classList: { add: () => {} } },
  };
  const localStorageStub = { getItem: () => null };
  const navigatorStub = {};
  // Bare identifiers inside the script resolve to these parameters; the
  // script's own try/catch would swallow a missing stub, which surfaces here
  // as a missing --bg-color assertion — a loud failure either way.
  const run = new Function(
    'window', 'document', 'localStorage', 'navigator',
    extractPrehydrationScript()
  );
  run(windowStub, documentStub, localStorageStub, navigatorStub);
  return vars;
}

describe('prehydration boot paint stays in lockstep with lib/mood', () => {
  afterEach(() => vi.useRealTimers());

  it('home Mood Ring colour matches moodOfDay().hex across a year of dates', () => {
    // 15:00Z ≈ 10–11am Montreal on every date — safely inside one Montreal
    // day on both sides of a DST flip, so both implementations resolve the
    // same PriceDay.
    const start = Date.UTC(2026, 5, 12, 15, 0, 0); // PriceDay epoch
    for (let offset = 0; offset < 400; offset += 10) {
      const at = new Date(start + offset * 86_400_000);
      vi.useFakeTimers();
      vi.setSystemTime(at);
      const painted = runBootPaint('/');
      const expected = moodOfDay().hex;
      expect(painted['--bg-color'], `boot paint missing on ${at.toISOString()}`).toBeTruthy();
      expect(
        painted['--bg-color'].toUpperCase(),
        `Mood Ring drift on ${at.toISOString()}`
      ).toBe(expected.toUpperCase());
      vi.useRealTimers();
    }
  });

  it('derives matching text ink for the mood colour (YIQ side)', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 6, 17, 15, 0, 0)));
    const painted = runBootPaint('/');
    expect(['#111111', '#e0e0e0']).toContain(painted['--text-color']);
  });
});
