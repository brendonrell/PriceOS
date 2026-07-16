/*
 * The Project Gnome — every Project's guardian, cast at birth.
 *
 * Concept (Brendon, 2026-06-16 / 06-24): PD's Germanic-folklore thread reaches
 * the earth elemental. In Paracelsus a gnome is the subterranean guardian of
 * treasure, ore and gems — kin to dwarves and kobolds, master miner and
 * metalworker. Projects are gems, so every Project gets exactly one Gnome:
 * its keeper. Displayed beside the Genome in +More — the pun is the point
 * ("gnome & genome").
 *
 * This is a small embedded gen-art engine (the SVG direction Brendon leaned
 * to over ASCII): a layered hat / beard / body / keepsake / palette generator.
 * The render surface is components/project/GnomePanel.tsx.
 *
 * Determinism: exactly like True Name (lib/project/trueName.ts) and Fate
 * (lib/project/fate.ts) — the Gnome is a pure function of the Project's
 * identity, seeded from the bare slug via `hashString('gnome:' + slug)`.
 * Stable forever, $0, never fetches. The draw ORDER below is a frozen
 * contract (same rule as the art engines): changing it re-rolls every
 * Gnome on the platform, so never reorder the draws.
 *
 * The look wears the Project's COLORWAY: the hat (and tunic, hue-shifted)
 * derive from `projectColorway()`, passed in at render time so a DB colour
 * change re-dresses the Gnome without re-rolling who it is — name,
 * temperament and features stay put; only the cloth re-dyes.
 */

import { mulberry32, hashString, pick } from '../art/rng';

/* ── Identity pools (frozen — append only, never reorder) ─────────────────── */

/** Gnomish first names — old-Germanic mine-folk. */
const FIRST_NAMES = [
  'BODO', 'GRIMBLE', 'SNORRI', 'TUCK', 'ALWIN', 'PIET', 'ODO', 'BRAM',
  'WILMAR', 'FENN', 'GORM', 'HUPP', 'KNUD', 'LUDDE', 'MOTT', 'NISSE',
  'ORVAR', 'PIM', 'QUIRIN', 'STIG', 'TOBIN', 'ULF', 'WENZEL', 'YORICK',
  'GRETA', 'HILDA', 'YLVA', 'BERTA', 'MINNA', 'SIGRUN', 'EDDA', 'TILDE',
] as const;

/** Surname = ORE + TOOL — what they mine and what they carry. */
const SURNAME_ORE = [
  'FLINT', 'QUARTZ', 'COPPER', 'COBBLE', 'GARNET', 'EMBER', 'GRANITE',
  'PYRITE', 'SILVER', 'IRON', 'AMBER', 'BASALT', 'BERYL', 'OPAL', 'ONYX',
  'MICA',
] as const;
const SURNAME_TOOL = [
  'WHISTLE', 'BEARD', 'BOOT', 'PICK', 'HAMMER', 'CANDLE', 'POCKET',
  'BELLOW', 'BUCKET', 'SPADE', 'LANTERN', 'SOCK', 'BUTTON', 'KETTLE',
  'ANVIL', 'BARROW',
] as const;

/** Temperament — how this keeper takes to visitors (umbrella spec: the
    per-project NPC's disposition). */
export const GNOME_TEMPERAMENTS = [
  'GRUFF', 'KINDLY', 'MERRY', 'WARY', 'STOIC', 'SLY',
  'DOTING', 'GRUMPY', 'HEARTY', 'SOLEMN', 'IMPISH', 'STALWART',
] as const;
export type GnomeTemperament = (typeof GNOME_TEMPERAMENTS)[number];

/* ── Look slots ───────────────────────────────────────────────────────────── */

export type GnomeHat = 'cone' | 'bent' | 'floppy' | 'tall' | 'stumpy';
export type GnomeBeard = 'round' | 'forked' | 'long' | 'braided' | 'curly';
/** The keepsake in hand — the miner's kit. */
export type GnomeKeepsake = 'pickaxe' | 'lantern' | 'gem' | 'spade' | 'pipe' | 'mushroom';

const HATS: readonly GnomeHat[] = ['cone', 'bent', 'floppy', 'tall', 'stumpy'];
const BEARDS: readonly GnomeBeard[] = ['round', 'forked', 'long', 'braided', 'curly'];
const KEEPSAKES: readonly GnomeKeepsake[] = ['pickaxe', 'lantern', 'gem', 'spade', 'pipe', 'mushroom'];

/** Human-readable slot labels for the collectible trait row. */
export const HAT_LABELS: Record<GnomeHat, string> = {
  cone: 'CONE HAT', bent: 'BENT HAT', floppy: 'FLOPPY HAT', tall: 'TALL HAT', stumpy: 'STUMPY HAT',
};
export const BEARD_LABELS: Record<GnomeBeard, string> = {
  round: 'ROUND BEARD', forked: 'FORKED BEARD', long: 'LONG BEARD', braided: 'BRAIDED BEARD', curly: 'CURLY BEARD',
};
export const KEEPSAKE_LABELS: Record<GnomeKeepsake, string> = {
  pickaxe: 'PICKAXE', lantern: 'LANTERN', gem: 'A GEM', spade: 'SPADE', pipe: 'PIPE', mushroom: 'MUSHROOM',
};

/* Beard tones — the art carries its own colors (like the stored previews);
   only the CLOTH comes from the colorway. */
const BEARD_TONES = ['#f5f2ea', '#d9d3c6', '#b9bec4', '#a8622f', '#6b655c'] as const;
const SKIN_TONES = ['#f2c9a0', '#e8b48c', '#d9a06f', '#c98d5e'] as const;

export interface GnomePalette {
  /** Hat cloth — the Project's colorway, clamped legible. */
  hat: string;
  /** Tunic cloth — the colorway's hue-shifted cousin. */
  tunic: string;
  beard: string;
  skin: string;
  /** Boots + belt leather. */
  leather: string;
  /** Tool handles + pipe — a lighter wood, so tools read on dark pages. */
  wood: string;
  /** Cartoon outline ink (fixed — self-contained art, readable on any card). */
  ink: string;
  /** Gem / lantern-glow accent. */
  gem: string;
}

export interface ProjectGnome {
  /** e.g. "GRIMBLE PYRITEBUTTON" */
  name: string;
  temperament: GnomeTemperament;
  hat: GnomeHat;
  /** 30% of hats carry a patch (a hard-working hat). */
  hatPatch: boolean;
  beard: GnomeBeard;
  keepsake: GnomeKeepsake;
  /** 0–3 gems at the feet — the start of the hoard it guards. */
  hoard: number;
  /** Nose radius px (the great gnomish nose), 11–15. */
  nose: number;
  /** Belly width factor 0.9–1.1 — every gnome carries itself differently. */
  girth: number;
  /** Indices into the fixed tone pools (palette resolves at render time). */
  beardTone: number;
  skinTone: number;
}

/** Cast a Project's Gnome from its slug. Pure + deterministic — the same
    Project always meets the same keeper. Draw order is FROZEN. */
export function projectGnome(slug: string): ProjectGnome {
  const r = mulberry32(hashString(`gnome:${slug.toLowerCase()}`) || 1);
  // Draws, in contract order:
  const first = pick(FIRST_NAMES, r);          // 1. first name
  const ore = pick(SURNAME_ORE, r);            // 2. surname ore
  const tool = pick(SURNAME_TOOL, r);          // 3. surname tool
  const temperament = pick(GNOME_TEMPERAMENTS, r); // 4. temperament
  const hat = pick(HATS, r);                   // 5. hat
  const hatPatch = r() < 0.3;                  // 6. hat patch
  const beard = pick(BEARDS, r);               // 7. beard
  const keepsake = pick(KEEPSAKES, r);         // 8. keepsake
  const hoard = Math.floor(r() * 4);           // 9. gems at the feet (0–3)
  const nose = 11 + Math.round(r() * 4);       // 10. nose
  const girth = 0.9 + r() * 0.2;               // 11. girth
  const beardTone = Math.floor(r() * BEARD_TONES.length); // 12. beard tone
  const skinTone = Math.floor(r() * SKIN_TONES.length);   // 13. skin tone
  return {
    name: `${first} ${ore}${tool}`,
    temperament, hat, hatPatch, beard, keepsake, hoard, nose, girth,
    beardTone, skinTone,
  };
}

/* ── Palette from the colorway ────────────────────────────────────────────── */

function hexToHsl(hex: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return [0, 0, l];
  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
  let h: number;
  if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
  else if (max === g) h = ((b - r) / d + 2) / 6;
  else h = ((r - g) / d + 4) / 6;
  return [h * 360, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const hue = ((h % 360) + 360) % 360 / 360;
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const f = (t: number) => {
    let x = t;
    if (x < 0) x += 1;
    if (x > 1) x -= 1;
    if (x < 1 / 6) return p + (q - p) * 6 * x;
    if (x < 1 / 2) return q;
    if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6;
    return p;
  };
  const to = (v: number) => Math.round(v * 255).toString(16).padStart(2, '0');
  return `#${to(f(hue + 1 / 3))}${to(f(hue))}${to(f(hue - 1 / 3))}`;
}

/** Dress the Gnome in the Project's colorway. `accent` is the live
    `projectColorway()` hex (nullable → a sturdy folk red). The cloth follows
    the colour; the creature itself (skin, beard, leather, ink) is fixed by
    the casting, so a colorway change re-dyes the outfit only. */
export function gnomePalette(g: ProjectGnome, accent: string | null): GnomePalette {
  const base = (accent && hexToHsl(accent)) || hexToHsl('#b03434')!;
  const [h, s] = base;
  // Clamp the cloth legible: real saturation, mid lightness — a dyed felt.
  const sat = Math.min(0.85, Math.max(0.35, s));
  const hatL = Math.min(0.58, Math.max(0.34, base[2]));
  return {
    hat: hslToHex(h, sat, hatL),
    tunic: hslToHex(h + 26, sat * 0.75, Math.min(0.66, hatL + 0.14)),
    beard: BEARD_TONES[g.beardTone],
    skin: SKIN_TONES[g.skinTone],
    leather: '#4a3526',
    wood: '#8a6238',
    ink: '#2a2622',
    gem: hslToHex(h + 180, Math.max(0.45, sat), 0.62),
  };
}
