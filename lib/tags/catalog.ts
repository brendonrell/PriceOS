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
 * Glyphs: only assigned where an EXISTING PD glyph EXACTLY matches the concept
 * (docs/GLYPHS.md — collector ☻, trader ⊟, curator ✦, artist ✺, minter ✶,
 * og ⌖, id #). Every other tag ships colour + label and NO glyph — per the glyph
 * rule, omitting beats inventing. Brendon assigns the rest from the vocabulary.
 * Colours are first-pass flair, tunable in one place (here).
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
    /** Hero display order (lower first): id → granted → earned → personas. */
    order: number;
    /** One-line meaning, shown in the toast when a persona is toggled on. */
    blurb?: string;
}

/* ── PERSONAS — the pick-your-owns (self-applied) ────────────────────────────
   Locked with Brendon 2026-07-19: his originals + Analyst, Degen, Patron,
   Historian, Host, Critic, Builder, Ambassador. (Photographer + Newcomer cut.)
   Artist is NOT here — it's earned (whitelist-gated). */
const PERSONAS: Tag[] = [
    { id: 'collector',  label: 'Collector',  glyph: '☻' + VS15, color: '#2563EB', kind: 'persona', order: 50, blurb: 'Here for the pieces.' },
    { id: 'curator',    label: 'Curator',    glyph: '✦' + VS15, color: '#7C3AED', kind: 'persona', order: 51, blurb: 'Builds the sets worth seeing.' },
    { id: 'trader',     label: 'Trader',     glyph: '⊟' + VS15, color: '#16A34A', kind: 'persona', order: 52, blurb: 'Lives on the order book.' },
    { id: 'writer',     label: 'Writer',     color: '#0EA5E9', kind: 'persona', order: 53, blurb: 'Says it in words.' },
    { id: 'podcaster',  label: 'Podcaster',  color: '#DB2777', kind: 'persona', order: 54, blurb: 'Says it out loud.' },
    { id: 'media',      label: 'Media',      color: '#EA580C', kind: 'persona', order: 55, blurb: 'Covers the scene.' },
    { id: 'host',       label: 'Host',       color: '#E11D48', kind: 'persona', order: 56, blurb: 'Runs the room.' },
    { id: 'critic',     label: 'Critic',     color: '#4F46E5', kind: 'persona', order: 57, blurb: 'Has takes, shares them.' },
    { id: 'analyst',    label: 'Analyst',    color: '#0891B2', kind: 'persona', order: 58, blurb: 'Reads the prices.' },
    { id: 'patron',     label: 'Patron',     color: '#CA8A04', kind: 'persona', order: 59, blurb: 'Backs the artists.' },
    { id: 'historian',  label: 'Historian',  color: '#9A3412', kind: 'persona', order: 60, blurb: 'Keeps the lore.' },
    { id: 'builder',    label: 'Builder',    color: '#475569', kind: 'persona', order: 61, blurb: 'Ships the tools.' },
    { id: 'ambassador', label: 'Ambassador', color: '#0D9488', kind: 'persona', order: 62, blurb: 'Brings people in.' },
    { id: 'degen',      label: 'Degen',      color: '#DC2626', kind: 'persona', order: 63, blurb: 'Sends it.' },
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
const GRANTED: Tag[] = [
    { id: 'og',         label: 'OG',        glyph: '⌖' + VS15, color: '#EAB308', kind: 'granted', order: 20 },
    { id: 'wtbs',       label: 'WTBS',      color: '#FF0055', kind: 'granted', order: 21 },
    { id: 'influencer', label: 'Influencer', color: '#DB2777', kind: 'granted', order: 22 },
    { id: 'team',       label: 'Team',      color: '#0109FF', kind: 'granted', order: 23 },
    { id: 'verified',   label: 'Verified',  color: '#0EA5E9', kind: 'granted', order: 24 },
    { id: 'partner',    label: 'Partner',   color: '#14B8A6', kind: 'granted', order: 25 },
    { id: 'featured',   label: 'Featured',  color: '#F97316', kind: 'granted', order: 26 },
];

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
   gold prestige colour + the numerology # glyph. Brendon can name/recolour the
   individual low numbers later. */
export const ID_TAG_STYLE = { color: '#EAB308', glyph: '#' + VS15 } as const;

/** Range buckets past #22 (first-pass cuts, Brendon 2026-07-19). id = the tag id,
 *  label = the chip, max = the inclusive upper bound of the range. */
export const ID_RANGES: ReadonlyArray<{ id: string; label: string; max: number }> = [
    { id: 'id-first-100',  label: 'First 100',  max: 100 },
    { id: 'id-first-500',  label: 'First 500',  max: 500 },
    { id: 'id-first-1000', label: 'First 1000', max: 1000 },
];

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
