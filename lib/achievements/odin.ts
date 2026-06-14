/**
 * ODIN — the Wanderer who turns up in the Achievements hall with sage counsel.
 *
 * Brendon's brief (2026-06-14): "Odin appears randomly in achievements and is
 * a little wizard who gives you sage advice, using the name as storytelling."
 *
 * The fiction: Odin the Allfather wandered the nine realms as a one-eyed old
 * man in a wide hat — the original wandering-wizard archetype (Tolkien lifted
 * Gandalf straight from him). He traded an eye at Mimir's well for a sip of
 * wisdom, and his ravens Huginn (Thought) and Muninn (Memory) fly the world
 * each day and whisper back what they saw. On PD he is the spirit of the
 * Achievements hall — he appears now and then, drops a line of counsel that
 * blends old-world wisdom with the discipline of collecting and price, and
 * vanishes. Meeting him the first time unlocks "The Wanderer".
 *
 * This module owns the CONTENT + the appearance roll. The little wizard UI
 * (the figure + speech bubble) consumes it on the Achievements surface.
 */

/** One unit of Odin's counsel. `runes` is an optional cold-open flourish. */
export interface OdinLine {
  text: string;
  /** Rare cryptic tag shown small above the line, for flavour. */
  runes?: string;
}

/**
 * Odin's counsel. Wisdom in his voice — patient, a little cryptic, always
 * about the long game: value, memory, the climb, holding your nerve. Edit
 * freely; the UI picks one at random when he appears.
 */
export const ODIN_COUNSEL: readonly OdinLine[] = [
  { text: 'A score is not won in a day. The patient wolf eats; the hasty one starves.', runes: 'ᚹᛁᛋᛞᛟᛗ' },
  { text: 'I gave an eye for wisdom. You need only give attention. It is the cheaper price, and the dearer one.' },
  { text: 'My ravens flew over every project on this realm. They remember who was early, and who only claimed to be.', runes: 'ᚺᚢᚷᛁᚾᚾ' },
  { text: 'The streak is a vow. Keep it and the gods notice. Break it and they only shrug.' },
  { text: 'Wealth dies. Kin die. But a name well-earned never dies. Mind which one you are building.' },
  { text: 'Do not chase the floor like a hound chases its tail. Decide what a thing is worth, then act.' },
  { text: 'The loudest in the hall is rarely the wisest. Watch who the high-ranked quietly follow.' },
  { text: 'Anoint with care. Your blessing is worth more when you do not spend it on everything.' },
  { text: 'Memory is the second raven. Keep your own ledger; the chain forgets nothing, and neither should you.', runes: 'ᛗᚢᚾᛁᚾᚾ' },
  { text: 'Every legend in this hall began at zero, as you did. The difference was the returning.' },
  { text: 'Spend where it builds something — a maker fed, a realm grown. That coin comes back wearing a crown.' },
  { text: 'A whale makes waves. A wise one makes weather. Be patient enough to become the second.' },
  { text: 'The hall remembers the founders. Long after the price is forgotten, the order of arrival is not.' },
  { text: 'You hunt the hidden marks? Good. The best treasures are the ones no map names.' },
  { text: 'Fortune favours the bold — but Odin favours the bold who also showed up the next morning.' },
  { text: 'Nine realms I walked to learn one thing: nothing of worth is given. It is earned, then guarded.' },
];

/** A short greeting Odin opens with before the counsel. */
export const ODIN_GREETINGS: readonly string[] = [
  'A traveller pauses beside you…',
  'An old man in a wide hat leans on his staff.',
  'The ravens settle. The Wanderer speaks.',
  'You feel a single eye upon your work.',
];

/** Pick a random line of counsel. */
export function randomCounsel(rng: () => number = Math.random): OdinLine {
  return ODIN_COUNSEL[Math.floor(rng() * ODIN_COUNSEL.length)];
}

/** Pick a random greeting. */
export function randomGreeting(rng: () => number = Math.random): string {
  return ODIN_GREETINGS[Math.floor(rng() * ODIN_GREETINGS.length)];
}

/**
 * Roll for whether Odin appears. He is RARE — by Brendon's order (2026-06-14):
 * "Odin needs to be way rarer… we can't make easter eggs feel ordinary." He is
 * NOT a guaranteed meet-and-greet. He surfaces maybe ~1-in-50 on an eligible
 * Achievements-hall view, and ONLY once the collector has real standing
 * (ODIN_MIN_SCORE) — so the very act of meeting him is an earned, talked-about
 * moment, and "The Wanderer" is a genuinely rare unlock. Anything Odin GIVES or
 * triggers should feel like a once-in-a-journey event, never routine.
 */
export const ODIN_APPEARANCE_CHANCE = 0.02;

/** Odin ignores newcomers. He only wanders to collectors who've earned some
 *  standing — keeps the encounter meaningful. (Tunable.) */
export const ODIN_MIN_SCORE = 300;

export function odinAppears(
  priceScore: number,
  chance: number = ODIN_APPEARANCE_CHANCE,
  rng: () => number = Math.random
): boolean {
  if (priceScore < ODIN_MIN_SCORE) return false;
  return rng() < chance;
}
