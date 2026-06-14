/**
 * PriceRank tiers + PriceScore→PriceRank mapping.
 *
 * THE MODEL (locked 2026-06-14)
 *   • PriceScore is your number (sum of unlocked achievement points — catalog.ts).
 *   • PriceRank is your TIER. Score crossing a threshold levels you up, RPG-style.
 *   • There are 10 tiers. Tier 0 = unranked (default; everyone starts here).
 *
 * WHY THESE THRESHOLDS (the "streak stays junior" guarantee)
 *   A player who never spends — pure PriceStreak + social + curation + identity —
 *   maxes out around the mid tiers by design. The big tiers require primary spend,
 *   trading volume, and artist/whale achievements that cost real money. So a maxed
 *   free grinder out-ranks a casual spender but can never reach the top tiers a
 *   serious spender does. The cap is structural (one-shot achievements), not policed.
 *
 * Thresholds are tunable — bump them here and the whole app re-tiers. Nothing
 * else to touch.
 */

export interface RankTier {
  /** Tier number, 1–10. (Tier 0 is "unranked", below tier 1's threshold.) */
  tier: number;
  /** Minimum PriceScore to hold this tier. */
  minScore: number;
  /** Short title shown next to the tier glyph. */
  title: string;
}

/**
 * Tier 1 → 10 thresholds. Ascending. Tier 0 (unranked) is everything below
 * RANK_TIERS[0].minScore.
 */
export const RANK_TIERS: readonly RankTier[] = [
  { tier: 1, minScore: 100, title: 'Initiate' },
  { tier: 2, minScore: 300, title: 'Participant' },
  { tier: 3, minScore: 700, title: 'Regular' },
  { tier: 4, minScore: 1400, title: 'Established' },
  { tier: 5, minScore: 2500, title: 'Notable' },
  { tier: 6, minScore: 4000, title: 'Respected' },
  { tier: 7, minScore: 6000, title: 'Authority' },
  { tier: 8, minScore: 8500, title: 'Luminary' },
  { tier: 9, minScore: 11000, title: 'Legend' },
  { tier: 10, minScore: 12000, title: 'Apex' },
] as const;

/** Map a PriceScore to its PriceRank tier number (0 = unranked). */
export function scoreToRank(score: number): number {
  let tier = 0;
  for (const t of RANK_TIERS) {
    if (score >= t.minScore) tier = t.tier;
    else break;
  }
  return tier;
}

/** The tier object for a score, or null if unranked (tier 0). */
export function tierFor(score: number): RankTier | null {
  const n = scoreToRank(score);
  return n === 0 ? null : RANK_TIERS[n - 1];
}

/**
 * Progress toward the next tier — for the "rank X · ## / ## XP" bar in the
 * PriceSprite modal (which currently shows "-- / -- XP" placeholders).
 * Returns the score into the current band, the band size, and the fraction.
 * At max tier, returns fraction 1 and nextTier null.
 */
export function rankProgress(score: number): {
  tier: number;
  nextTier: number | null;
  intoBand: number;
  bandSize: number;
  fraction: number;
} {
  const tier = scoreToRank(score);
  const floor = tier === 0 ? 0 : RANK_TIERS[tier - 1].minScore;
  const next = RANK_TIERS[tier]; // undefined at max
  if (!next) {
    return { tier, nextTier: null, intoBand: score - floor, bandSize: 0, fraction: 1 };
  }
  const bandSize = next.minScore - floor;
  const intoBand = score - floor;
  return {
    tier,
    nextTier: next.tier,
    intoBand,
    bandSize,
    fraction: bandSize > 0 ? Math.min(1, intoBand / bandSize) : 1,
  };
}

// ── PriceStreak constants (locked 2026-06-14) ───────────────────────────────
//   • Activates at 60 days — contributes 0 to PriceScore before then (the
//     "Devoted" achievement at 60 is the surprise level-up).
//   • Break = over. One missed day resets to 0. No grace day, no banked credit
//     (Brendon: "the entire point of streaks").
//   • Day boundary is the USER'S LOCAL midnight, not server time.
export const STREAK_ACTIVATION_DAYS = 60;
