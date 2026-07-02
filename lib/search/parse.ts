/*
 * search/parse — Global Search's query-understanding layer. Pure + server-safe.
 *
 * Turns a raw query into structured intent:
 *   - identity refs:   @handle · #token · 0x… address · name.eth · Glagolitic
 *                      true-name letters · bare project/user terms
 *   - visual language: the EXACT vocabularies the app already speaks —
 *       colours     lib/art/outputColor  (the fixed 14-word bucket list)
 *       shapes      lib/art/scene        (circle / square / bar / shape,
 *                                         count words, stripes/field/scatter)
 *       bands+mood  lib/output/derive    (brightness/saturation/complexity
 *                                         bands, tone mood, temperature,
 *                                         orientation, the v2 deep-look bands)
 *   so "looks like two yellow circles" or "dark busy vivid" resolves against
 *   the same words the fingerprint stores — nothing invented, nothing fuzzy.
 *
 * Filler words ("looks", "like", "reads", "as", articles) are dropped so
 * natural phrasing parses the same as bare keywords.
 */

/** Structured read of one search query. */
export interface ParsedQuery {
  /** Trimmed original. */
  raw: string;
  /** @handle with the @ stripped, if the query carried one. */
  handle: string | null;
  /** Token id from `#123` (or a bare number outside visual context). */
  tokenId: string | null;
  /** 0x… hex (4–40 nibbles) — address prefix search. */
  address: string | null;
  /** name.eth query, lowercased. */
  ens: string | null;
  /** Uppercase-Glagolitic letters present (True Name search). */
  trueName: string | null;
  /** Edition digits after the glyphs — an OUTPUT true name (`ⰀⰁⰂⰃ1234`). */
  trueNameToken: string | null;
  /** Canonical colour buckets matched (query word → stored vocabulary). */
  colors: string[];
  /** Scene shape kinds matched, singular ('circle' | 'square' | 'bar' | 'shape'). */
  shapes: string[];
  /** Count words normalised to the scene sentence's words ('two', 'three'…). */
  counts: string[];
  /** Scene pattern, if named (stripes / field / scatter). */
  pattern: string | null;
  /** Column → accepted values, for the fingerprint band/mood columns. */
  bands: Record<string, string[]>;
  /** True when ANY visual signal parsed (colours/shapes/bands/pattern/mood). */
  visual: boolean;
  /** Leftover plain terms (names, titles, soundtracks, descriptions). */
  terms: string[];
}

/* ── Vocabulary maps (query word → stored value(s)) ─────────────────────── */

/* Colour buckets — canonical list from lib/art/outputColor, plus the words a
   human reaches for. Legacy stored values (Pink/Beige, pre-rename rows) are
   kept as extra targets so old rows still match. */
const COLOR_WORDS: Record<string, string[]> = {
  red: ['Red'], crimson: ['Red'], scarlet: ['Red'],
  orange: ['Orange'], amber: ['Orange', 'Yellow'],
  yellow: ['Yellow'], gold: ['Yellow'], golden: ['Yellow'],
  green: ['Green'], teal: ['Green', 'Blue'],
  blue: ['Blue'], navy: ['Blue'], cyan: ['Blue', 'Green'], aqua: ['Blue', 'Green'],
  purple: ['Purple'], violet: ['Purple', 'Moon'],
  lavender: ['Moon', 'Purple'], lilac: ['Moon', 'Purple'], moon: ['Moon'],
  magenta: ['Magenta'], pink: ['Magenta', 'Pink'],
  brown: ['Brown'], tan: ['Brown', 'Cream'], sand: ['Cream', 'Brown'],
  beige: ['Cream', 'Beige'], cream: ['Cream'], ivory: ['Cream', 'White'],
  grey: ['Grey'], gray: ['Grey'], silver: ['Grey', 'Moon'],
  black: ['Black'], white: ['White'],
  hothurt: ['Hothurt'],
};

/* Shape kinds — the scene pass's four reads (lib/art/scene ShapeInfo.kind). */
const SHAPE_WORDS: Record<string, string> = {
  circle: 'circle', circles: 'circle', dot: 'circle', dots: 'circle',
  ring: 'circle', rings: 'circle', orb: 'circle', orbs: 'circle',
  disc: 'circle', discs: 'circle', ball: 'circle', balls: 'circle',
  square: 'square', squares: 'square', box: 'square', boxes: 'square',
  block: 'square', blocks: 'square',
  bar: 'bar', bars: 'bar', line: 'bar', lines: 'bar',
  shape: 'shape', shapes: 'shape', blob: 'shape', blobs: 'shape',
};

/* Scene patterns (lib/art/scene PatternKind). */
const PATTERN_WORDS: Record<string, string> = {
  stripes: 'stripes', stripe: 'stripes', striped: 'stripes',
  field: 'field',
  scatter: 'scatter', scattered: 'scatter', confetti: 'scatter',
};

/* Count words — the scene sentence's own number words (lib/art/scene). */
const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];

/* Band vocab — column → (query word → stored value(s)). Values are the exact
   outputs of lib/output/derive's band functions; synonyms fold in on the query
   side only, so nothing new is ever stored. */
const BAND_WORDS: Record<string, Record<string, string[]>> = {
  brightness_band: {
    dark: ['Dark', 'Dim'], dim: ['Dim'], shadowy: ['Dark', 'Dim'],
    bright: ['Bright', 'Luminous'], luminous: ['Luminous'], glowing: ['Luminous'],
  },
  saturation_band: {
    muted: ['Muted'], soft: ['Soft'], pastel: ['Soft', 'Muted'],
    rich: ['Rich'], vivid: ['Vivid', 'Rich'], vibrant: ['Vivid', 'Rich'],
    saturated: ['Vivid', 'Rich'], colorful: ['Vivid', 'Rich'], colourful: ['Vivid', 'Rich'],
  },
  complexity_band: {
    minimal: ['Minimal', 'Calm'], simple: ['Minimal', 'Calm'], clean: ['Minimal'],
    sparse: ['Minimal', 'Calm'], calm: ['Calm'], detailed: ['Detailed'],
    busy: ['Busy', 'Detailed'], complex: ['Busy', 'Detailed'],
    chaotic: ['Busy'], dense: ['Busy', 'Detailed'],
  },
  tone_mood: {
    brooding: ['Brooding'], sombre: ['Sombre'], somber: ['Sombre'],
    moody: ['Moody'], electric: ['Electric'], serene: ['Serene'],
    airy: ['Airy'], bold: ['Bold'], hushed: ['Hushed'],
  },
  color_temperature: {
    warm: ['Warm'], cool: ['Cool'], neutral: ['Neutral'],
  },
  orientation: {
    portrait: ['Portrait'], tall: ['Portrait'], vertical: ['Portrait'],
    landscape: ['Landscape'], wide: ['Landscape'], horizontal: ['Landscape'],
    // 'square' is contextual — handled in parse() (shape vs orientation).
  },
  /* The v2 deep look (populates as pieces are viewed post-deploy). */
  palette_band: {
    monochrome: ['Monochrome'], duotone: ['Duotone'], polychrome: ['Polychrome'],
  },
  contrast_band: {
    flat: ['Flat'], crisp: ['Crisp'], stark: ['Stark'],
  },
  symmetry_band: {
    mirrored: ['Mirrored'], symmetric: ['Mirrored'], symmetrical: ['Mirrored'], askew: ['Askew'],
  },
  air_band: {
    vast: ['Vast'], open: ['Open'], packed: ['Packed'],
  },
  texture_band: {
    smooth: ['Smooth'], grainy: ['Grainy'], textured: ['Textured'],
  },
  /* Mint-moment traits (lib/output/derive vocab — natal sky + calendar). */
  natal_sun: {
    aries: ['Aries'], taurus: ['Taurus'], gemini: ['Gemini'], cancer: ['Cancer'],
    leo: ['Leo'], virgo: ['Virgo'], libra: ['Libra'], scorpio: ['Scorpio'],
    sagittarius: ['Sagittarius'], capricorn: ['Capricorn'],
    aquarius: ['Aquarius'], pisces: ['Pisces'],
  },
  birth_weekday: {
    monday: ['Monday'], tuesday: ['Tuesday'], wednesday: ['Wednesday'],
    thursday: ['Thursday'], friday: ['Friday'], saturday: ['Saturday'], sunday: ['Sunday'],
  },
  birth_season: {
    winter: ['Winter'], spring: ['Spring'], summer: ['Summer'],
    autumn: ['Autumn'], fall: ['Autumn'],
  },
  birth_time_of_day: {
    dawn: ['Dawn'], morning: ['Morning'], midday: ['Midday'],
    afternoon: ['Afternoon'], dusk: ['Dusk'], night: ['Night'],
  },
};

/* Natural-phrase filler dropped before matching. */
const FILLER = new Set([
  'a', 'an', 'the', 'of', 'and', 'with', 'in', 'on', 'that', 'this', 'some',
  'looks', 'look', 'looking', 'like', 'reads', 'read', 'as',
  'piece', 'pieces', 'art', 'artwork', 'artworks', 'output', 'outputs',
  'token', 'tokens', 'something', 'show', 'me', 'find',
]);

const ADDRESS_RE = /^0x[a-f0-9]{4,40}$/;
const GLAGOLITIC_RE = /[Ⰰ-Ⱞ]/u;

/** Parse one raw query into structured intent. */
export function parseQuery(raw: string): ParsedQuery {
  const trimmed = raw.trim();
  const out: ParsedQuery = {
    raw: trimmed, handle: null, tokenId: null, address: null, ens: null,
    trueName: null, trueNameToken: null, colors: [], shapes: [], counts: [],
    pattern: null, bands: {}, visual: false, terms: [],
  };

  // True Name glyphs pass through as-is (they never tokenize as [a-z0-9]).
  // Trailing digits after the glyphs = an OUTPUT true name (edition number).
  const tn = trimmed.match(/([Ⰰ-Ⱞ]+)\s*(\d{1,4})?/u);
  if (tn && tn[1]) {
    out.trueName = tn[1];
    if (tn[2]) out.trueNameToken = String(Number(tn[2]));
  }

  // Keep @ # . - inside tokens (@handle, #7, name.eth, opus4-8); strip any
  // trailing sentence punctuation so "circles." still reads as a shape.
  const tokens = trimmed
    .toLowerCase()
    .split(/[^a-z0-9@#.\-]+/)
    .map((t) => (t.endsWith('.eth') ? t : t.replace(/[.\-]+$/, '').replace(/^[.\-]+/, '')))
    .filter(Boolean);

  const numbers: string[] = [];
  const colorSet = new Set<string>();
  let sawSquareWord = false;

  for (const t of tokens) {
    if (FILLER.has(t)) continue;

    if (t.startsWith('@') && t.length > 1) { out.handle = t.slice(1); continue; }
    if (t.startsWith('#') && /^\#\d+$/.test(t)) { out.tokenId = String(Number(t.slice(1))); continue; }
    if (ADDRESS_RE.test(t)) { out.address = t; continue; }
    if (t.endsWith('.eth') && t.length > 4) { out.ens = t; continue; }

    if (/^\d+$/.test(t)) { numbers.push(t); continue; }

    const numIdx = NUM_WORDS.indexOf(t);
    if (numIdx >= 0) { out.counts.push(t); continue; }

    if (COLOR_WORDS[t]) { COLOR_WORDS[t].forEach((c) => colorSet.add(c)); continue; }

    if (t === 'square') { sawSquareWord = true; continue; }
    if (SHAPE_WORDS[t]) { out.shapes.push(SHAPE_WORDS[t]); continue; }
    if (PATTERN_WORDS[t]) { out.pattern = PATTERN_WORDS[t]; continue; }

    // Band/mood/trait words are DUAL-PURPOSE: they filter the fingerprint AND
    // stay a plain term, so "leo" still finds @leo and "bold" a project named
    // Bold. Name lanes returning nothing costs little; missing a person would.
    for (const [col, words] of Object.entries(BAND_WORDS)) {
      const vals = words[t];
      if (vals) {
        out.bands[col] = Array.from(new Set([...(out.bands[col] ?? []), ...vals]));
        break;
      }
    }

    out.terms.push(t);
  }

  out.colors = Array.from(colorSet);

  // 'square' is a shape beside counts/colours/other shapes ("two yellow
  // squares"), an orientation on its own ("square serene").
  if (sawSquareWord) {
    const shapeContext =
      out.shapes.length > 0 || out.colors.length > 0 || out.counts.length > 0 || numbers.length > 0;
    if (shapeContext) out.shapes.push('square');
    else out.bands.orientation = Array.from(new Set([...(out.bands.orientation ?? []), 'Square']));
  }

  // Bare numbers: counts when shapes give them meaning, otherwise a token id.
  if (numbers.length > 0) {
    if (out.shapes.length > 0 || out.pattern) {
      for (const n of numbers) {
        const v = Number(n);
        out.counts.push(v < NUM_WORDS.length ? NUM_WORDS[v] : n);
      }
    } else if (!out.tokenId) {
      out.tokenId = String(Number(numbers[0]));
      // Extra numbers stay as plain terms so "1000 club"-style text still hits.
      numbers.slice(1).forEach((n) => out.terms.push(n));
    } else {
      numbers.forEach((n) => out.terms.push(n));
    }
  }

  out.shapes = Array.from(new Set(out.shapes));
  out.counts = Array.from(new Set(out.counts));

  out.visual =
    out.colors.length > 0 || out.shapes.length > 0 || out.counts.length > 0 ||
    out.pattern !== null || Object.keys(out.bands).length > 0;

  return out;
}

/** How a colour bucket sounds inside the stored scene sentence (mirrors
    lib/art/scene sceneColorWord — 'Moon' reads as "moon-grey"). */
export function sceneWordForBucket(bucket: string): string {
  if (bucket === 'Hothurt') return 'Hothurt';
  if (bucket === 'Moon') return 'moon-grey';
  return bucket.toLowerCase();
}
