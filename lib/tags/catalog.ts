/*
 * lib/tags/catalog.ts — PROFILE TAGS, the canonical vocabulary.
 *
 * Tags are the identity chips that ride a user's profile (above their stickers)
 * and, later, become filters across the site. Every tag belongs to ONE of four
 * classes — but the class is BOOKKEEPING ONLY (Brendon, 2026-07-19): users never
 * see or filter by class, only by the tag itself. The class governs HOW a tag is
 * applied:
 *
 *   • persona  — the user PICKS these on themselves (the pick-your-owns).
 *   • earned   — auto-derived from real account data (never chosen, never granted).
 *   • granted  — an admin hands these out (OG to the Discord crew, WTBS, Team…).
 *   • id       — auto from the user's platform number (#1–22 each their own,
 *                then ranges). Generated in derive.ts, styled by ID_TAG_STYLE.
 *
 * Glyph picks (Brendon, 2026-07-20): ⚲ (mic-on-a-stem) = Podcaster AND WTBS,
 * his call, one mark for both; ⚔ = Degen (the Degen workspace's own mark —
 * same concept, same glyph).
 *
 * Glyphs: assigned ONLY where an existing PD glyph EXACTLY matches the concept
 * AND carries no more-prominent clashing meaning (docs/GLYPHS.md — collector ☻,
 * writer ⊟ [Note = writing], minter ✶, artist ✺, og ⌖). Everything else ships
 * colour + label and NO glyph — omitting beats a clash (Trader dropped ⊟ = the
 * Note glyph; Curator dropped ✦ = the Offer glyph; the # tags carry the number
 * in the label, so no # glyph). Colours are first-pass flair, tunable here.
 */

const VS15 = '︎';

export type TagKind = 'persona' | 'earned' | 'granted' | 'id';

export interface Tag {
    /** Stable id — persisted in users.profile_tags (personas) / granted_tags. */
    id: string;
    /** The chip label. */
    label: string;
    /** VS-15 glyph, or undefined = colour + label only (never invent one). */
    glyph?: string;
    /** Flair colour (#RRGGBB) — the chip's accent (border + glyph), full-strength. */
    color: string;
    kind: TagKind;
    /** Hero display order (lower first): ceo → id → granted → earned → personas. */
    order: number;
    /** One-line meaning, shown in the toast when a persona is toggled on. */
    blurb?: string;
    /** Explicit label colour — overrides the auto-contrast (tagTextOn). Used by
     *  the fixed-style tags (the CEO chip's Attention-yellow lettering). */
    textColor?: string;
    /** Locked style: this chip ignores the all-tags paint AND the owner's @name
     *  font, always wearing its own fixed treatment (the CEO tag: Rubik, no
     *  paint, no font — Brendon 2026-07-22). */
    lockStyle?: boolean;
    /** Fixed label font — renders the label plain (no @name Unicode restyle) in
     *  this face. 'inter' = the WTBS tag (Brendon 2026-07-22). */
    font?: 'inter';
}

/* ── PERSONAS — the pick-your-owns (self-applied) ────────────────────────────
   Locked with Brendon 2026-07-19: his originals + Analyst, Degen, Patron,
   Historian, Host, Critic, Builder, Ambassador. (Photographer + Newcomer cut.)
   Artist is NOT here — it's earned (whitelist-gated). */
const PERSONAS: Tag[] = [
    { id: 'collector',  label: 'Collector',  glyph: '☻' + VS15, color: '#2563EB', kind: 'persona', order: 50, blurb: 'Here for the pieces.' },
    { id: 'curator',    label: 'Curator',    color: '#7C3AED', kind: 'persona', order: 51, blurb: 'Builds the sets worth seeing.' },
    { id: 'trader',     label: 'Trader',     color: '#16A34A', kind: 'persona', order: 52, blurb: 'Lives on the order book.' },
    { id: 'writer',     label: 'Writer',     glyph: '⊟' + VS15, color: '#0EA5E9', kind: 'persona', order: 53, blurb: 'Says it in words.' },
    { id: 'podcaster',  label: 'Podcaster',  glyph: '⚲' + VS15, color: '#DB2777', kind: 'persona', order: 54, blurb: 'Says it out loud.' },
    { id: 'media',      label: 'Media',      color: '#EA580C', kind: 'persona', order: 55, blurb: 'Covers the scene.' },
    { id: 'host',       label: 'Host',       color: '#E11D48', kind: 'persona', order: 56, blurb: 'Runs the room.' },
    { id: 'critic',     label: 'Critic',     color: '#4F46E5', kind: 'persona', order: 57, blurb: 'Has takes, shares them.' },
    { id: 'analyst',    label: 'Analyst',    color: '#0891B2', kind: 'persona', order: 58, blurb: 'Reads the prices.' },
    { id: 'patron',     label: 'Patron',     color: '#CA8A04', kind: 'persona', order: 59, blurb: 'Backs the artists.' },
    { id: 'historian',  label: 'Historian',  color: '#9A3412', kind: 'persona', order: 60, blurb: 'Keeps the lore.' },
    { id: 'builder',    label: 'Builder',    color: '#475569', kind: 'persona', order: 61, blurb: 'Ships the tools.' },
    { id: 'ambassador', label: 'Ambassador', color: '#0D9488', kind: 'persona', order: 62, blurb: 'Brings people in.' },
    { id: 'degen',      label: 'Degen',      glyph: '⚔' + VS15, color: '#DC2626', kind: 'persona', order: 63, blurb: 'Sends it.' },
    { id: 'shitposter', label: 'Shitposter', color: '#F59E0B', kind: 'persona', order: 64, blurb: 'You know the one.' },
    { id: 'lurker',     label: 'Lurker',     color: '#6D28D9', kind: 'persona', order: 65, blurb: 'Watching. Always watching.' },
];

/* ── EARNED — auto from real account data (never chosen) ─────────────────────
   Artist + Veteran + the id tags are wired now (data on hand). Whale /
   Diamond Hands / Minter are CATALOGUED but NOT lit yet — they need the right
   on-chain signal + Brendon's thresholds; deriving them from a guess would show
   wrong badges on real profiles (see derive.ts). */
const EARNED: Tag[] = [
    { id: 'artist',       label: 'Artist',        glyph: '✺' + VS15, color: '#C026D3', kind: 'earned', order: 30 },
    { id: 'whale',        label: 'Whale',         color: '#1D4ED8', kind: 'earned', order: 31 },
    { id: 'diamondhands', label: 'Diamond Hands', color: '#06B6D4', kind: 'earned', order: 32 },
    { id: 'minter',       label: 'Minter',        glyph: '✶' + VS15, color: '#15803D', kind: 'earned', order: 33 },
    { id: 'veteran',      label: 'Veteran',       color: '#B45309', kind: 'earned', order: 34 },
];

/* ── GRANTED — admin hands these out (a value in users.granted_tags) ─────────
   OG goes to the newpdogs Discord crew as a one-time grant; the influencer
   perks (WTBS…) and the internal marks live here too. */
/* ── MANUAL section (Brendon, 2026-07-22): the admin-granted marks lead the
   carousel + the profile, ordered before Earned + Chosen. WTBS wears Inter. ── */
const GRANTED: Tag[] = [
    { id: 'og',         label: 'OG',        glyph: '⌖' + VS15, color: '#EAB308', kind: 'granted', order: 6 },
    { id: 'wtbs',       label: 'WTBS',      glyph: '⚲' + VS15, color: '#FF0055', kind: 'granted', order: 7, font: 'inter' },
    { id: 'influencer', label: 'Influencer', color: '#DB2777', kind: 'granted', order: 8 },
    { id: 'team',       label: 'Team',      color: '#0109FF', kind: 'granted', order: 9 },
    /* Verified / Partner / Featured REMOVED (Brendon, 2026-07-20). A stray
       grant of a removed id is a silent no-op — derive skips unknown ids. */
];

/* ── CEO — Brendon's own, one of one (Brendon, 2026-07-22). NOT grantable to
   anyone: derived only for his wallet in derive.ts, never a value in
   granted_tags. Hothurt fill, Attention-yellow lettering, no glyph, and it
   wears RUBIK — the all-tags paint and the custom @name font can't touch it
   (lockStyle). Order 5 → it always leads the row. ── */
export const CEO_TAG: Tag = {
    id: 'ceo',
    label: 'CEO',
    color: '#FF0055',      // Hothurt background
    textColor: '#FFE600',  // Attention-yellow lettering
    kind: 'granted',
    order: 5,
    lockStyle: true,
};

/** PriceDay-join tag colour — a distinct purple (Brendon, 2026-07-22). */
export const PRICEDAY_TAG_COLOR = '#9333EA';

/** $PRICE holder-rank tag — Attention-yellow fill + Hothurt lettering, a fixed
 *  treatment (lockStyle), the inverse of the CEO chip (Brendon, 2026-07-23). */
export const PRICE_HOLD_TAG_BG = '#FFE600';   // Attention yellow
export const PRICE_HOLD_TAG_TEXT = '#FF0055'; // Hothurt

export const TAGS: Tag[] = [...PERSONAS, ...EARNED, ...GRANTED];

const BY_ID = new Map<string, Tag>(TAGS.map((t) => [t.id, t]));

export function tagById(id: string): Tag | undefined {
    return BY_ID.get(id);
}

/** The pick-your-own set, in display order — drives the profile Tags picker. */
export const PERSONA_TAGS: Tag[] = PERSONAS.slice();

/** Valid persona ids — the whitelist the picker + the API write path enforce
 *  (a user may only ever self-apply a persona). */
export const PERSONA_IDS: ReadonlySet<string> = new Set(PERSONAS.map((t) => t.id));

/** Valid granted ids — the set an admin grant is checked against. */
export const GRANTED_IDS: ReadonlySet<string> = new Set(GRANTED.map((t) => t.id));

export function isPersonaId(id: unknown): id is string {
    return typeof id === 'string' && PERSONA_IDS.has(id);
}

/* ── ID TAGS — auto from users.user_number (built in derive.ts) ──────────────
   #1–22 are each their own tag; past that they bucket into ranges. All wear the
   gold prestige colour; the number lives in the LABEL ("#1"), so there is NO
   separate # glyph (that read as "# #1"). Brendon can name/recolour lows later. */
export const ID_TAG_STYLE = { color: '#EAB308' } as const;

/** Range buckets past #22 (first-pass cuts, Brendon 2026-07-19). id = the tag id,
 *  label = the chip, max = the inclusive upper bound of the range. */
export const ID_RANGES: ReadonlyArray<{ id: string; label: string; max: number }> = [
    { id: 'id-first-100',  label: 'First 100',  max: 100 },
    { id: 'id-first-500',  label: 'First 500',  max: 500 },
    { id: 'id-first-1000', label: 'First 1000', max: 1000 },
];

/* ── TAG PAINT — the all-tags override (Brendon, 2026-07-20): the profile
   owner can paint EVERY tag one colour from the end of the tags picker.
   Black / White / the brand primaries; lettering flips by contrast
   (tagTextOn). null = each tag wears its own colour. ── */
export const TAG_PAINTS: ReadonlyArray<{ id: string; label: string; hex: string }> = [
    { id: 'black',     label: 'All Black',     hex: '#000000' },
    { id: 'white',     label: 'All White',     hex: '#FFFFFF' },
    { id: 'hothurt',   label: 'All Hothurt',   hex: '#FF0055' },
    { id: 'attention', label: 'All Attention', hex: '#FFE600' },
    { id: 'blue',      label: 'All Blue',      hex: '#0109FF' },
];

const PAINT_BY_ID = new Map(TAG_PAINTS.map((p) => [p.id, p]));

export function isValidTagPaint(id: unknown): id is string {
    return typeof id === 'string' && PAINT_BY_ID.has(id);
}

/** The paint's pill colour, or null for unknown/absent (own colours). */
export function tagPaintHex(id: string | null | undefined): string | null {
    return (id && PAINT_BY_ID.get(id)?.hex) || null;
}

/** Label colour (near-black or white) that reads on a SOLID pill of `hex` —
 *  the tag chips fill with their colour, so the label must contrast it. */
export function tagTextOn(hex: string): string {
    const h = hex.replace('#', '');
    if (h.length < 6) return '#ffffff';
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    return lum > 0.6 ? '#111111' : '#ffffff';
}
