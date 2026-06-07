/*
 * Fate — PD's platform auto-trait. Every Output, on every Project, gets a Fate
 * regardless of whether the artist defined any traits. (Feature name: "Hash
 * Hexagram"; user-facing trait name: "Fate".)
 *
 * Concept (Brendon): at "birth" (mint) we consult the I Ching for the Output
 * and read its fate — distilled to a single dramatic word. A real casting
 * yields a PRIMARY hexagram plus "changing lines" that can transform it into a
 * second hexagram; the Fate TRAIT VALUE is the single word of the primary
 * hexagram, while the changing lines + transformed hexagram are kept on the
 * reading for the richer Output-page "reading" (Discord fodder) later.
 *
 * Determinism: the casting is seeded from the Output's identity so a given
 * Output always reads the same fate. On-chain this seed is the tx hash; in the
 * chainless sim we seed from `${slug}:${tokenId}` via `fateSeed()`.
 *
 * The 64 entries are the canonical King Wen sequence (number, trigram pair,
 * traditional English name) with a single-word Fate distilled from each
 * hexagram's meaning, leaning dramatic per spec.
 */

import { mulberry32, hashString } from '../art/rng';

/* Trigram codes — bit0 = bottom line, 1 = yang (solid), 0 = yin (broken).
   A hexagram's 6-bit code = lower | (upper << 3). */
const QIAN = 0b111; // ☰ heaven
const DUI = 0b011; //  ☱ lake
const LI = 0b101; //   ☲ fire
const ZHEN = 0b001; // ☳ thunder
const XUN = 0b110; //  ☴ wind
const KAN = 0b010; //  ☵ water
const GEN = 0b100; //  ☶ mountain
const KUN = 0b000; //  ☷ earth

export interface Hexagram {
  /** King Wen number, 1–64. */
  n: number;
  /** Lower trigram code (lines 1–3). */
  lower: number;
  /** Upper trigram code (lines 4–6). */
  upper: number;
  /** Traditional English name. */
  name: string;
  /** Distilled single-word Fate (the trait value). */
  fate: string;
}

/* King Wen order. (lower, upper) trigrams + traditional name + distilled Fate. */
const HEXAGRAMS: readonly Hexagram[] = [
  { n: 1, lower: QIAN, upper: QIAN, name: 'The Creative', fate: 'Ascendance' },
  { n: 2, lower: KUN, upper: KUN, name: 'The Receptive', fate: 'Surrender' },
  { n: 3, lower: ZHEN, upper: KAN, name: 'Difficulty at the Beginning', fate: 'Genesis' },
  { n: 4, lower: KAN, upper: GEN, name: 'Youthful Folly', fate: 'Folly' },
  { n: 5, lower: QIAN, upper: KAN, name: 'Waiting', fate: 'Patience' },
  { n: 6, lower: KAN, upper: QIAN, name: 'Conflict', fate: 'Conflict' },
  { n: 7, lower: KAN, upper: KUN, name: 'The Army', fate: 'Conquest' },
  { n: 8, lower: KUN, upper: KAN, name: 'Holding Together', fate: 'Union' },
  { n: 9, lower: QIAN, upper: XUN, name: 'Small Taming', fate: 'Restraint' },
  { n: 10, lower: DUI, upper: QIAN, name: 'Treading', fate: 'Peril' },
  { n: 11, lower: QIAN, upper: KUN, name: 'Peace', fate: 'Harmony' },
  { n: 12, lower: KUN, upper: QIAN, name: 'Standstill', fate: 'Stagnation' },
  { n: 13, lower: LI, upper: QIAN, name: 'Fellowship', fate: 'Communion' },
  { n: 14, lower: QIAN, upper: LI, name: 'Great Possession', fate: 'Abundance' },
  { n: 15, lower: GEN, upper: KUN, name: 'Modesty', fate: 'Humility' },
  { n: 16, lower: KUN, upper: ZHEN, name: 'Enthusiasm', fate: 'Rapture' },
  { n: 17, lower: ZHEN, upper: DUI, name: 'Following', fate: 'Pursuit' },
  { n: 18, lower: XUN, upper: GEN, name: 'Work on the Decayed', fate: 'Corruption' },
  { n: 19, lower: DUI, upper: KUN, name: 'Approach', fate: 'Advent' },
  { n: 20, lower: KUN, upper: XUN, name: 'Contemplation', fate: 'Vigil' },
  { n: 21, lower: ZHEN, upper: LI, name: 'Biting Through', fate: 'Reckoning' },
  { n: 22, lower: LI, upper: GEN, name: 'Grace', fate: 'Grace' },
  { n: 23, lower: KUN, upper: GEN, name: 'Splitting Apart', fate: 'Ruin' },
  { n: 24, lower: ZHEN, upper: KUN, name: 'Return', fate: 'Return' },
  { n: 25, lower: ZHEN, upper: QIAN, name: 'Innocence', fate: 'Providence' },
  { n: 26, lower: QIAN, upper: GEN, name: 'Great Taming', fate: 'Mastery' },
  { n: 27, lower: ZHEN, upper: GEN, name: 'Nourishment', fate: 'Sustenance' },
  { n: 28, lower: XUN, upper: DUI, name: 'Great Excess', fate: 'Excess' },
  { n: 29, lower: KAN, upper: KAN, name: 'The Abysmal', fate: 'Tribulation' },
  { n: 30, lower: LI, upper: LI, name: 'The Clinging Fire', fate: 'Brilliance' },
  { n: 31, lower: GEN, upper: DUI, name: 'Influence', fate: 'Allure' },
  { n: 32, lower: XUN, upper: ZHEN, name: 'Duration', fate: 'Endurance' },
  { n: 33, lower: GEN, upper: QIAN, name: 'Retreat', fate: 'Retreat' },
  { n: 34, lower: QIAN, upper: ZHEN, name: 'Great Power', fate: 'Dominion' },
  { n: 35, lower: KUN, upper: LI, name: 'Progress', fate: 'Renown' },
  { n: 36, lower: LI, upper: KUN, name: 'Darkening of the Light', fate: 'Obscurity' },
  { n: 37, lower: LI, upper: XUN, name: 'The Family', fate: 'Kinship' },
  { n: 38, lower: DUI, upper: LI, name: 'Opposition', fate: 'Discord' },
  { n: 39, lower: GEN, upper: KAN, name: 'Obstruction', fate: 'Impasse' },
  { n: 40, lower: KAN, upper: ZHEN, name: 'Deliverance', fate: 'Deliverance' },
  { n: 41, lower: DUI, upper: GEN, name: 'Decrease', fate: 'Sacrifice' },
  { n: 42, lower: ZHEN, upper: XUN, name: 'Increase', fate: 'Windfall' },
  { n: 43, lower: QIAN, upper: DUI, name: 'Breakthrough', fate: 'Breakthrough' },
  { n: 44, lower: XUN, upper: QIAN, name: 'Coming to Meet', fate: 'Temptation' },
  { n: 45, lower: KUN, upper: DUI, name: 'Gathering Together', fate: 'Gathering' },
  { n: 46, lower: XUN, upper: KUN, name: 'Pushing Upward', fate: 'Ascension' },
  { n: 47, lower: KAN, upper: DUI, name: 'Oppression', fate: 'Adversity' },
  { n: 48, lower: XUN, upper: KAN, name: 'The Well', fate: 'Renewal' },
  { n: 49, lower: LI, upper: DUI, name: 'Revolution', fate: 'Revolution' },
  { n: 50, lower: XUN, upper: LI, name: 'The Cauldron', fate: 'Alchemy' },
  { n: 51, lower: ZHEN, upper: ZHEN, name: 'The Arousing Thunder', fate: 'Upheaval' },
  { n: 52, lower: GEN, upper: GEN, name: 'Keeping Still', fate: 'Repose' },
  { n: 53, lower: GEN, upper: XUN, name: 'Development', fate: 'Pilgrimage' },
  { n: 54, lower: DUI, upper: ZHEN, name: 'The Marrying Maiden', fate: 'Betrothal' },
  { n: 55, lower: LI, upper: ZHEN, name: 'Abundance', fate: 'Zenith' },
  { n: 56, lower: GEN, upper: LI, name: 'The Wanderer', fate: 'Exile' },
  { n: 57, lower: XUN, upper: XUN, name: 'The Gentle Wind', fate: 'Persuasion' },
  { n: 58, lower: DUI, upper: DUI, name: 'The Joyous Lake', fate: 'Joy' },
  { n: 59, lower: KAN, upper: XUN, name: 'Dispersion', fate: 'Dissolution' },
  { n: 60, lower: DUI, upper: KAN, name: 'Limitation', fate: 'Confinement' },
  { n: 61, lower: DUI, upper: XUN, name: 'Inner Truth', fate: 'Truth' },
  { n: 62, lower: GEN, upper: ZHEN, name: 'Small Excess', fate: 'Caution' },
  { n: 63, lower: LI, upper: KAN, name: 'After Completion', fate: 'Completion' },
  { n: 64, lower: KAN, upper: LI, name: 'Before Completion', fate: 'Threshold' },
];

/* code (lower | upper<<3) → hexagram, for casting lookup. */
const BY_CODE = new Map<number, Hexagram>();
for (const h of HEXAGRAMS) BY_CODE.set(h.lower | (h.upper << 3), h);

/** Unicode hexagram glyph (䷀…䷿) for a King Wen number. */
export function hexagramGlyph(n: number): string {
  return String.fromCodePoint(0x4dbf + n); // 0x4DC0 is hexagram 1
}

/** All 64 distilled Fate words — the trait's value pool, in King Wen order. */
export const FATE_VALUES: readonly string[] = HEXAGRAMS.map((h) => h.fate);

/** Stable per-Output seed for the casting (chainless stand-in for tx hash). */
export function fateSeed(slug: string, tokenId: number): number {
  return hashString(`${slug}:${tokenId}`);
}

export interface FateReading {
  /** The primary hexagram cast. */
  primary: Hexagram;
  /** 1-based positions (bottom = 1) of changing lines, ascending. */
  changingLines: number[];
  /** Hexagram after the changing lines flip, or null if none changed. */
  transformed: Hexagram | null;
  /** The trait value — the primary hexagram's distilled Fate word. */
  fate: string;
  /** Glyph for the primary hexagram. */
  glyph: string;
}

/**
 * Cast a full I Ching reading from a seed. Faithful three-coin method: each of
 * the six lines is three coin tosses (yin = 2, yang = 3) summing 6–9, giving
 * the canonical 1/8 · 3/8 · 3/8 · 1/8 distribution. 6 = old yin and 9 = old
 * yang are the "changing" lines that flip in the transformed hexagram.
 */
export function castFate(seed: number): FateReading {
  const r = mulberry32(seed >>> 0 || 1);
  const yang: boolean[] = []; // current state, line 1..6 (bottom→top)
  const changing: boolean[] = [];
  for (let i = 0; i < 6; i++) {
    const sum =
      (r() < 0.5 ? 2 : 3) + (r() < 0.5 ? 2 : 3) + (r() < 0.5 ? 2 : 3);
    yang.push(sum % 2 === 1); // 7 or 9 → yang
    changing.push(sum === 6 || sum === 9); // old yin / old yang
  }

  const lower = (yang[0] ? 1 : 0) | (yang[1] ? 2 : 0) | (yang[2] ? 4 : 0);
  const upper = (yang[3] ? 1 : 0) | (yang[4] ? 2 : 0) | (yang[5] ? 4 : 0);
  const primary = BY_CODE.get(lower | (upper << 3)) ?? HEXAGRAMS[0];

  const changingLines: number[] = [];
  for (let i = 0; i < 6; i++) if (changing[i]) changingLines.push(i + 1);

  let transformed: Hexagram | null = null;
  if (changingLines.length > 0) {
    const t = yang.map((v, i) => (changing[i] ? !v : v));
    const tl = (t[0] ? 1 : 0) | (t[1] ? 2 : 0) | (t[2] ? 4 : 0);
    const tu = (t[3] ? 1 : 0) | (t[4] ? 2 : 0) | (t[5] ? 4 : 0);
    transformed = BY_CODE.get(tl | (tu << 3)) ?? null;
  }

  return {
    primary,
    changingLines,
    transformed,
    fate: primary.fate,
    glyph: hexagramGlyph(primary.n),
  };
}

/** Convenience: the full reading for an Output identified by (slug, tokenId). */
export function readOutputFate(slug: string, tokenId: number): FateReading {
  return castFate(fateSeed(slug, tokenId));
}

/** Just the Fate trait value for an Output (slug, tokenId). */
export function outputFate(slug: string, tokenId: number): string {
  return readOutputFate(slug, tokenId).fate;
}
