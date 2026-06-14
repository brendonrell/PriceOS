/**
 * Social-row relevance ranking (Brendon 2026-06-14): which faces to surface in
 * the hero's "Collected by …" (projects) / "Followed by …" (profiles) line.
 *
 * The pick is driven by three things, in priority:
 *   1. CONNECTION STRENGTH — a mutual (they follow you back) outranks a one-way
 *      follow. Strongest tie shows first.
 *   2. PRICERANK — within the same strength, higher PriceScore surfaces (a nod
 *      from a heavyweight collector means more).
 *   3. A LITTLE RANDOMNESS — jitter *within* a relevancy band only, so the two
 *      faces rotate between page loads and it never feels static, without ever
 *      bumping a weaker tie above a stronger one.
 *
 * Pure + cheap: no network, no per-candidate lookups. Callers pass the small
 * candidate set they already have (handles + scores) and get back the handful
 * to show plus the "& N others" count.
 */

export interface SocialCandidate {
  /** @name (with or without a leading '@' — preserved on output). */
  handle: string;
  /** The candidate's PriceScore (0 if unknown). */
  priceScore: number;
  /** True when this is a mutual tie (strongest connection). */
  mutual: boolean;
}

export interface RankedSocial {
  /** The handles to show, in order (length ≤ shownN). */
  shown: string[];
  /** How many relevant candidates are NOT shown ("& N others you follow"). */
  othersCount: number;
}

// Band widths. A mutual tie is always above a one-way tie; within a strength,
// a higher PriceScore band is always above a lower one; the jitter only ever
// reshuffles candidates sitting in the SAME (strength, score-band) cell.
const STRENGTH_WEIGHT = 1_000_000;
const BAND_WEIGHT = 1_000;
const SCORE_PER_BAND = 100; // every 100 PriceScore = one band up
const JITTER_MAX = BAND_WEIGHT; // stays inside one band

function relevance(c: SocialCandidate, rng: () => number): number {
  const strength = c.mutual ? 1 : 0;
  const band = Math.floor(Math.max(0, c.priceScore) / SCORE_PER_BAND);
  return strength * STRENGTH_WEIGHT + band * BAND_WEIGHT + rng() * JITTER_MAX;
}

/**
 * Rank a candidate set and split into the few to show + the rest as a count.
 * `rng` is injectable for SSR determinism / tests; defaults to Math.random.
 */
export function rankSocialCandidates(
  candidates: SocialCandidate[],
  shownN = 2,
  rng: () => number = Math.random
): RankedSocial {
  // De-dupe on the bare (lowercased, @-stripped) handle, keeping the strongest.
  const byKey = new Map<string, SocialCandidate>();
  for (const c of candidates) {
    const key = c.handle.toLowerCase().replace(/^@/, '');
    const prev = byKey.get(key);
    if (!prev || (c.mutual && !prev.mutual) || c.priceScore > prev.priceScore) {
      byKey.set(key, c);
    }
  }
  const ranked = [...byKey.values()]
    .map((c) => ({ c, r: relevance(c, rng) }))
    .sort((a, b) => b.r - a.r)
    .map((x) => x.c.handle);

  return {
    shown: ranked.slice(0, shownN),
    othersCount: Math.max(0, ranked.length - shownN),
  };
}
