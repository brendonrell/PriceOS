/**
 * ════════════════════════════════════════════════════════════════════════
 *  PriceOS — TENURE ACHIEVEMENTS  (the calendar spine of the two-year climb)
 * ════════════════════════════════════════════════════════════════════════
 *
 * Time on PD is un-fakeable (server-side join date) and scores in FULL —
 * these rows are the mathematical guarantee behind "the summit takes two
 * years": their points cannot exist in any wallet before the calendar grants
 * them, no matter how hard someone spends. Mjölnir's threshold is set above
 * what is reachable without the 730-day block (see tools/achievements/
 * verify.js, which proves the wall on every catalog edit).
 *
 * CONVENTIONS
 *   • ids prefixed `t_`, unique, never reused. Category `og`.
 *   • Points grow with days; the 730-day oath is the flagship block.
 *   • Nothing ≥ 1000 (Mjölnir owns 1000). No 666 anywhere.
 */

import type { Achievement } from '../catalog';

const day = (
  n: number,
  name: string,
  blurb: string,
  points: number
): Achievement => ({
  id: `t_days_${n}`,
  name,
  blurb,
  points,
  category: 'og',
  trigger: `tenure.days>=${n}`,
});

export const TENURE_ACHIEVEMENTS: readonly Achievement[] = [
  // ── The first year · showing up ───────────────────────────────────────
  day(180, 'Half a Year Here', 'Six months on PD.', 60),
  day(240, 'Eight Months', 'Two hundred and forty days on PD.', 70),
  day(270, 'Three Seasons', 'Two hundred and seventy days on PD.', 80),
  day(300, 'Three Hundred Days', 'Three hundred days on PD.', 90),
  day(330, 'Eleven Months', 'Three hundred and thirty days. The anniversary is visible from here.', 100),

  // ── The second year · the long middle ─────────────────────────────────
  day(400, 'Past the Year Mark', 'Four hundred days on PD. Year two is where the tourists thin out.', 130),
  day(450, 'Fifteen Months', 'Four hundred and fifty days on PD.', 150),
  day(600, 'Six Hundred Days', 'Six hundred days on PD.', 220),
  day(650, 'The Long Middle', 'Six hundred and fifty days. Nobody claps in the middle. Odin sees it anyway.', 240),
  day(700, 'Approaching Two', 'Seven hundred days on PD. Thirty to the oath.', 280),

  // ── THE TWO-YEAR OATH · the flagship block (the Mjölnir wall) ─────────
  day(730, 'The Two-Year Oath', 'Two full years on PD, to the day. This is the block the hammer is forged on — no wallet on earth can buy this row early.', 850),

  // ── Beyond the oath · the elders ──────────────────────────────────────
  day(800, 'Beyond the Oath', 'Eight hundred days on PD.', 300),
  day(900, 'Nine Hundred Days', 'Nine hundred days on PD.', 340),
  day(950, 'Almost a Thousand', 'Nine hundred and fifty days on PD.', 360),
  day(1150, 'Past a Thousand', 'Eleven hundred and fifty days on PD.', 420),
  day(1200, 'Twelve Hundred Days', 'Twelve hundred days on PD.', 440),
  day(1300, 'The Long Faith', 'Thirteen hundred days on PD.', 480),
  day(1400, 'Fourteen Hundred Days', 'Fourteen hundred days on PD.', 520),
  day(1460, 'Four Years to the Day', 'Four full years on PD.', 560),
  day(1550, 'Still Here', 'Fifteen hundred and fifty days. Platforms have died in less. You haven’t.', 580),
  day(1650, 'The Old Guard', 'Sixteen hundred and fifty days on PD.', 620),
  day(1750, 'Seventeen Fifty', 'Seventeen hundred and fifty days on PD.', 650),
  day(1825, 'Five Years to the Day', 'Five full years on PD. You and the platform grew up together.', 700),

  // ── Year milestones · filling the core's gaps (1, 2, 3, 5 exist) ─────
  { id: 't_years_4', name: 'Four Years On', blurb: 'Four years since you joined PD.', points: 350, category: 'og', trigger: 'tenure.years>=4' },
  { id: 't_years_6', name: 'Six Years Deep', blurb: 'Six years since you joined PD.', points: 500, category: 'og', trigger: 'tenure.years>=6' },
  { id: 't_years_7', name: 'The Seven-Year Itch, Resisted', blurb: 'Seven years since you joined PD. Never even wavered.', points: 550, category: 'og', trigger: 'tenure.years>=7' },
  { id: 't_years_8', name: 'Eight Years Standing', blurb: 'Eight years since you joined PD.', points: 600, category: 'og', trigger: 'tenure.years>=8' },
  { id: 't_years_9', name: 'Nine Years Deep', blurb: 'Nine years since you joined PD.', points: 650, category: 'og', trigger: 'tenure.years>=9' },
  { id: 't_years_10', name: 'The Decade', blurb: 'Ten years on PD. There should be a statue. This is the statue.', points: 900, category: 'og', trigger: 'tenure.years>=10' },
] as const;
