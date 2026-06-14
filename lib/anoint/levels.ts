/**
 * Project Anointment levels — Dormant / The Cult / The Egregore.
 *
 * THE MODEL (from docs/anointment-egregore-spec.md)
 *   • Every account has exactly ONE Anointment (a Pledge of Fealty) — one row
 *     in public.anointments, PK(user_address). It targets a PROJECT through a
 *     chosen OUTPUT conduit.
 *   • A Project's LEVEL is computed on read from the COUNT of anointments that
 *     currently point at it. Zero-sum: when a user moves their pledge away the
 *     old project's count drops, so a project can LOSE Cult/Egregore status.
 *   • Level is prestige + visual only — it NEVER gates platform features.
 *
 * THRESHOLDS ARE TUNABLE. Bump the consts below and the whole app re-levels;
 * nothing else to touch. Mirrors the shape of lib/achievements/tiers.ts.
 * v1 ships UNWEIGHTED — one account = one anointment = one point (the future
 * PriceRank-weighting is an explicit open item, Brendon's call when surfaced).
 */

/** The 60-day lock anchored on `placed_at`. 60 is PD's sacred number (mirrors
 *  the artist cooldown). Until it elapses, a pledge can't MOVE to a different
 *  project (changing only the conduit Output within the same project is free). */
export const ANOINT_LOCK_DAYS = 60;

export interface AnointLevel {
  /** Level number: 0 Dormant · 1 The Cult · 2 The Egregore. */
  level: number;
  /** Minimum anointment count to hold this level. */
  minCount: number;
  /** Display name shown on the Project page. */
  name: string;
}

/**
 * Level 1 → 2 thresholds. Ascending. Level 0 (Dormant) is everything below
 * ANOINT_LEVELS[0].minCount. Placeholders per spec — calibrate vs the live
 * user base (could later go %-of-active rather than absolute).
 */
export const ANOINT_LEVELS: readonly AnointLevel[] = [
  { level: 1, minCount: 100, name: 'The Cult' },
  { level: 2, minCount: 500, name: 'The Egregore' },
] as const;

/** Name for level 0 — the default, sub-threshold state. */
export const DORMANT_NAME = 'Dormant';

/** Map an anointment count to its level number (0 = Dormant). */
export function projectLevel(count: number): number {
  let level = 0;
  for (const l of ANOINT_LEVELS) {
    if (count >= l.minCount) level = l.level;
    else break;
  }
  return level;
}

/** The display name for a count's level. */
export function levelName(count: number): string {
  const n = projectLevel(count);
  return n === 0 ? DORMANT_NAME : ANOINT_LEVELS[n - 1].name;
}

/**
 * Progress toward the next level — for the Project-page progress bar.
 * Returns the count into the current band, the band size, the fraction, and
 * the next threshold (null at max level / The Egregore).
 */
export function levelProgress(count: number): {
  level: number;
  name: string;
  nextThreshold: number | null;
  intoBand: number;
  bandSize: number;
  fraction: number;
} {
  const level = projectLevel(count);
  const floor = level === 0 ? 0 : ANOINT_LEVELS[level - 1].minCount;
  const next = ANOINT_LEVELS[level]; // undefined at max level
  const name = level === 0 ? DORMANT_NAME : ANOINT_LEVELS[level - 1].name;
  if (!next) {
    return {
      level,
      name,
      nextThreshold: null,
      intoBand: count - floor,
      bandSize: 0,
      fraction: 1,
    };
  }
  const bandSize = next.minCount - floor;
  const intoBand = count - floor;
  return {
    level,
    name,
    nextThreshold: next.minCount,
    intoBand,
    bandSize,
    fraction: bandSize > 0 ? Math.min(1, intoBand / bandSize) : 1,
  };
}
