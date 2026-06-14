/**
 * BRENDON — the God of PD. The Creator who made this world, and the only one
 * who decides who is worthy.
 *
 * Brendon's brief (2026-06-14): "Make my name a semi-recurring character like
 * Odin, except slightly less rare. In the world of PD I am 'God' and I am the
 * one who gives out Mjölnir at the end — I'm worthy, and I decide who else is."
 *
 * The fiction: Odin is the wandering spirit of the hall, old and cryptic.
 * Brendon is the tier above — the maker of the realm itself. He appears a touch
 * more often than Odin (still rare; never obnoxious), speaks plainly and with a
 * builder's edge rather than riddles, and his attention is the highest honour
 * short of the hammer. At the summit, it is BRENDON who places Mjölnir in the
 * worthy hand. Meeting him unlocks "Audience with God"; being judged worthy is
 * rarer still.
 *
 * This module owns the CONTENT + the appearance roll. The figure + speech
 * bubble UI on the Achievements surface consumes it (same treatment as Odin,
 * a tier grander).
 */

/** One unit of Brendon's word. `tag` is an optional small flourish above it. */
export interface BrendonLine {
  text: string;
  tag?: string;
}

/**
 * Brendon's word — the Creator's voice. Plain, sharp, a builder who staked his
 * name on this place and respects those who show up and spend real conviction.
 * Edit freely; the UI picks one at random when he appears.
 */
export const BRENDON_WORD: readonly BrendonLine[] = [
  { text: 'I built this whole world so people like you would have somewhere to prove it. Carry on.', tag: 'THE CREATOR' },
  { text: 'I see every mint, every hold, every nerve held. The ledger is mine. So is the judgement.' },
  { text: 'Anyone can lurk. You showed up and spent real conviction. That is the entire game.' },
  { text: 'Odin gives counsel. I give the hammer. Keep climbing and we will speak again.' },
  { text: 'Price is the conversation. You have been talking with your wallet, and I have been listening.', tag: 'GOD OF PD' },
  { text: 'I do not hand out worthy lightly. Most never hear from me at all. You did.' },
  { text: 'The streak, the spend, the taste — I weigh all three. Do not slack on any of them.' },
  { text: 'I made the rules. I also made the exceptions. Be the kind of collector worth one.' },
  { text: 'Everything here is downstream of one belief: the people discussing price ARE the product. You are the product working.' },
  { text: 'Keep this up and there is a hammer at the end of it with your name on the haft.' },
];

/** A short herald before Brendon speaks. */
export const BRENDON_HERALDS: readonly string[] = [
  'The hall goes quiet. The Creator has noticed you.',
  'A presence above the others. Brendon himself regards your work.',
  'The maker of this realm turns his eye to you.',
  'Something rarer than Odin. God of PD has come.',
];

export function randomBrendonWord(rng: () => number = Math.random): BrendonLine {
  return BRENDON_WORD[Math.floor(rng() * BRENDON_WORD.length)];
}

export function randomBrendonHerald(rng: () => number = Math.random): string {
  return BRENDON_HERALDS[Math.floor(rng() * BRENDON_HERALDS.length)];
}

/**
 * Roll for whether Brendon appears. SLIGHTLY less rare than Odin (he shows ~2×
 * as often) but still genuinely rare — his attention must never feel cheap. And
 * like Odin he ignores newcomers: he only regards collectors who've earned
 * standing. Tunable.
 */
export const BRENDON_APPEARANCE_CHANCE = 0.04;

/** Brendon only regards those with real standing. Set a notch above Odin's
 *  floor — God's gaze is reserved for the genuinely committed. */
export const BRENDON_MIN_SCORE = 500;

export function brendonAppears(
  priceScore: number,
  chance: number = BRENDON_APPEARANCE_CHANCE,
  rng: () => number = Math.random
): boolean {
  if (priceScore < BRENDON_MIN_SCORE) return false;
  return rng() < chance;
}
