/**
 * PriceStreak — pure date math.
 *
 * The streak day boundary is the USER'S LOCAL midnight (tiers.ts comments).
 * The client sends its own local YYYY-MM-DD; this module never reads a clock,
 * so it's fully deterministic and unit-testable. Date math is done by parsing
 * the YYYY-MM-DD strings as UTC midnight — using UTC for BOTH the parse and the
 * +1-day step cancels out any timezone drift, so "yesterday + 1" is exact
 * regardless of the server's TZ.
 *
 * Rules (LOCKED 2026-06-14, tiers.ts):
 *   • todayLocal === lastActive            → already counted today, no change.
 *   • todayLocal === lastActive + 1 day    → consecutive day, streak + 1.
 *   • gap > 1 day, or lastActive null/bad  → streak resets to 1.
 *   • break = HARD reset (no grace day, no banked credit).
 *   • best = max(best, streak).
 *
 * Examples:
 *   ({ lastActive: '2026-06-13', currentStreak: 4, best: 9, today: '2026-06-14' })
 *     → { streak: 5, best: 9, changed: true,  isNewDay: true  }  // consecutive
 *   ({ lastActive: '2026-06-14', currentStreak: 5, best: 9, today: '2026-06-14' })
 *     → { streak: 5, best: 9, changed: false, isNewDay: false }  // same day
 *   ({ lastActive: '2026-06-10', currentStreak: 5, best: 9, today: '2026-06-14' })
 *     → { streak: 1, best: 9, changed: true,  isNewDay: true  }  // gap → reset
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface StreakUpdateInput {
  /** users.streak_last_active — the last qualifying LOCAL date, or null. */
  lastActive: string | null;
  /** users.price_streak — the current streak day count. */
  currentStreak: number;
  /** users.streak_best — the longest streak ever reached. */
  bestStreak: number;
  /** The caller's LOCAL date as YYYY-MM-DD (client-supplied). */
  todayLocal: string;
}

export interface StreakUpdateResult {
  /** The new current streak day count to persist. */
  streak: number;
  /** The new best (longest-ever) to persist. */
  best: number;
  /** True if anything changed (streak and/or best) — i.e. worth a DB write. */
  changed: boolean;
  /** True when todayLocal is a NEW day vs lastActive (the streak ticked). */
  isNewDay: boolean;
}

/** Parse a YYYY-MM-DD string to a UTC-midnight epoch (ms), or NaN if malformed. */
function utcMidnight(date: string): number {
  if (!DATE_RE.test(date)) return NaN;
  // Date.UTC ignores local TZ entirely — both sides of the diff are UTC, so the
  // day delta is exact.
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Compute the next streak state from the stored fields + today's local date.
 * Pure: no clock, no I/O. The caller persists the result.
 */
export function computeStreakUpdate(input: StreakUpdateInput): StreakUpdateResult {
  const { lastActive, currentStreak, bestStreak, todayLocal } = input;

  const today = utcMidnight(todayLocal);
  // A malformed client date is a no-op — never corrupt the streak off bad input.
  if (Number.isNaN(today)) {
    return { streak: currentStreak, best: bestStreak, changed: false, isNewDay: false };
  }

  const prev = lastActive ? utcMidnight(lastActive) : NaN;

  let streak: number;
  let isNewDay: boolean;

  if (!Number.isNaN(prev) && today === prev) {
    // Same local day — already counted. No tick.
    streak = currentStreak;
    isNewDay = false;
  } else if (!Number.isNaN(prev) && today - prev === ONE_DAY_MS) {
    // Consecutive day — the streak advances.
    streak = currentStreak + 1;
    isNewDay = true;
  } else {
    // Gap > 1 day, a date BEHIND lastActive (clock skew), null, or bad → reset.
    // Hard reset to 1: today itself is a qualifying day.
    streak = 1;
    isNewDay = true;
  }

  const best = Math.max(bestStreak, streak);
  const changed = streak !== currentStreak || best !== bestStreak;

  return { streak, best, changed, isNewDay };
}
