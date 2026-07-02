/**
 * PriceRank tiers + PriceScore→PriceRank mapping.
 *
 * THE MODEL (locked 2026-06-14)
 *   • PriceScore is your number (sum of unlocked achievement points — catalog.ts).
 *   • PriceRank is your TIER. Score crossing a threshold levels you up, RPG-style.
 *   • There are 10 tiers. Tier 0 = unranked (default; everyone starts here).
 *
 * WHY THESE THRESHOLDS (the "free actions mean nothing" guarantee — Brendon,
 * 2026-06-14)
 *   Rank comes ONLY from un-fakeable on-chain truth (primary spend, trading
 *   volume, holdings, tenure, artist activity). Every free/off-chain/sybil
 *   action — stars, wishlist, albums, follows, anoints, streak, easter eggs —
 *   still unlocks for feedback, but its COMBINED score is hard-capped at
 *   GAMEABLE_SCORE_CAP (engine.ts), i.e. ~10 of this ~12,000 scale. So a pure
 *   free grinder never even reaches tier 1: farming is pointless by design, not
 *   by policing. The big tiers require real money on-chain.
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
  // Re-tiered 2026-07-02 for the 1,000-achievement economy (points total grew
  // ~20×; the wall math lives in tools/achievements/verify.js). Same 10-tier
  // shape, same philosophy: the big tiers require real money on-chain, and
  // Apex sits deep in year-two territory — below Mjölnir's 186,000 summit.
  { tier: 1, minScore: 100, title: 'Initiate' },
  { tier: 2, minScore: 400, title: 'Participant' },
  { tier: 3, minScore: 1000, title: 'Regular' },
  { tier: 4, minScore: 2500, title: 'Established' },
  { tier: 5, minScore: 5000, title: 'Notable' },
  { tier: 6, minScore: 10000, title: 'Respected' },
  { tier: 7, minScore: 20000, title: 'Authority' },
  { tier: 8, minScore: 40000, title: 'Luminary' },
  { tier: 9, minScore: 75000, title: 'Legend' },
  { tier: 10, minScore: 120000, title: 'Apex' },
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
