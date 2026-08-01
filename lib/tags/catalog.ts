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
 * writer ⊟ [Note = writing], minter ✦, artist ✺, og ⌖). Everything else ships
 * colour + label and NO glyph — omitting beats a clash (Trader dropped ⊟ = the
 * Note glyph; Curator dropped ✶ = the Offer glyph; the # tags carry the number
 * in the label, so no # glyph). Colours are first-pass flair, tunable here.
 */

const VS15 = '︎';

export type TagKind = 'team' | 'persona' | 'earned' | 'granted' | 'id';

export interface Tag {
    /** Stable id — persisted in users.profile_tags (personas) / granted_tags. */
    id: string;
    /** The chip label. */
    label: string;
    /** VS-15 glyph, or undefined = colour + label only (never invent one). */
    glyph?: string;
    /** An SVG brand mark drawn in place of a text glyph — currently only the
     *  $PRICE wordmark on the holder tag (Brendon, 2026-07-23). */
    svgGlyph?: 'price';
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
    /** OUTLINED letterforms — the label is drawn hollow, stroked in this colour
     *  (the WTBS headline treatment, Brendon 2026-07-26). Overrides textColor. */
    stroke?: string;
    /** Drop the pill's edge entirely — fill only (Brendon, 2026-07-26). */
    noBorder?: boolean;
    /** TWO-TONE label — the label drawn as coloured runs instead of one colour,
     *  the way the BitVerse wordmark splits "bit" from "Verse" (Brendon,
     *  2026-07-26). Set, it replaces `label` for rendering; `label` stays the
     *  plain-text version for titles and toasts. */
    labelParts?: ReadonlyArray<{ text: string; color: string }>;
    /** Turn the label 180° — @rudxane's upside-down face (Brendon, 2026-07-26).
     *  A real rotation of the real word, not substitute flipped characters. */
    rotate?: boolean;
    /** ON THE MOMENT IT IS EARNED, rather than dark until its owner finds the
     *  picker (Brendon, 2026-07-29 — the PROJECT tags). It is still an ordinary
     *  tag: one tap in the picker turns it off, and that off-switch is
     *  remembered (settings.tagsOff), so a default-on tag never switches itself
     *  back on. Everything without this stays off by default. */
    defaultOn?: boolean;
    /** PROJECT tag only — the slug of the Project this chip stands for. Set,
     *  the chip navigates to that Project instead of opening the tag's room,
     *  and surfaces that show ONLY project tags filter on it. */
    project?: string;
}

/* ── PERSONAS — the pick-your-owns (self-applied) ────────────────────────────
   Locked with Brendon 2026-07-19: his originals + Analyst, Degen, Patron,
   Historian, Host, Critic, Builder, Ambassador. (Photographer + Newcomer cut.)
   Artist is NOT here — it's earned (whitelist-gated). */
const PERSONAS: Tag[] = [
    { id: 'collector',  label: 'Collector',  glyph: '☻' + VS15, color: '#2563EB', kind: 'persona', order: 50, blurb: 'Here for the pieces.' },
    { id: 'curator',    label: 'Curator',    color: '#7C3AED', kind: 'persona', order: 51, blurb: 'Builds the sets worth seeing.' },
    { id: 'trader',     label: 'Trader',     color: '#16A34A', kind: 'persona', order: 52, blurb: 'Lives on the order book.' },
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
    /* ── THE OPEN-FOR-BUSINESS THREE (Brendon, 2026-07-29) ──────────────────
       Say what you're up for right now. Buying and Selling wear the TRANSFER
       star ✸ (Brendon's pick), turning slowly on the pill; Open To Trades
       wears the Exchange's own ⇌ and rocks side to side, so each active state
       reads as alive at a glance rather than as one more flat chip. */
    { id: 'now-buying',     label: 'Now Buying',     glyph: '✶' + VS15, color: '#22C55E', kind: 'persona', order: 66, blurb: 'Wallet open, send offers.' },
    { id: 'now-selling',    label: 'Now Selling',    glyph: '✸' + VS15, color: '#F43F5E', kind: 'persona', order: 67, blurb: 'Pieces on the block.' },
    { id: 'open-to-trades', label: 'Open To Trades', glyph: '⇌' + VS15, color: '#06B6D4', kind: 'persona', order: 68, blurb: 'Bring a swap.' },
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
    { id: 'minter',       label: 'Minter',        glyph: '✦' + VS15, color: '#15803D', kind: 'earned', order: 33 },
    { id: 'veteran',      label: 'Veteran',       color: '#B45309', kind: 'earned', order: 34 },
];

/* ── GRANTED — admin hands these out (a value in users.granted_tags) ─────────
   OG goes to the newpdogs Discord crew as a one-time grant; the influencer
   perks (WTBS…) and the internal marks live here too. */
/* ── MANUAL section (Brendon, 2026-07-22): the admin-granted marks lead the
   carousel + the profile, ordered before Earned + Chosen. WTBS wears Inter. ── */
const GRANTED: Tag[] = [
    { id: 'og',         label: 'OG',        glyph: '⌖' + VS15, color: '#EAB308', kind: 'granted', order: 6 },
    { id: 'influencer', label: 'Influencer', color: '#DB2777', kind: 'granted', order: 8 },
    { id: 'team',       label: 'Team',      color: '#0109FF', kind: 'granted', order: 9 },
    /* Verified / Partner / Featured REMOVED (Brendon, 2026-07-20). A stray
       grant of a removed id is a silent no-op — derive skips unknown ids.
       WTBS LEFT THIS SECTION 2026-07-26 — it is no longer admin-grantable; it
       is reserved to @trinity + @willpop and derives from the handle (derive.ts),
       exactly like CEO derives from the wallet. */
];

/* ── TEAM — the 4th class (Brendon, 2026-07-26). "Works like earned but VIP":
   NEVER chosen, NEVER granted, NEVER in granted_tags — each one derives from a
   single fixed identity (a wallet or a handle) in derive.ts. Orders 1–4 put the
   whole class FIRST, ahead of every other tag a profile carries. ────────────── */

/** WTBS brand palette — pulled from wtbs.show's own stylesheet, not eyeballed
 *  off a screenshot (Brendon, 2026-07-26: "pull them exactly"). Their :root is
 *  exactly three values. The blue is NOT theirs — it is Safari's default control
 *  colour showing through an unstyled button in their nav — but Brendon kept it
 *  in the cycle after that was flagged, so it is a PD-side addition by his call. */
export const WTBS_ACID = '#E8FF00';
export const WTBS_BLACK = '#000000';
export const WTBS_WHITE = '#FFFFFF';
export const WTBS_BLUE = '#3A86F7';

/** One WTBS-family chip treatment. `stroke` set = hollow outlined letters. */
export interface TeamTagStyle {
    /** Pill fill. */
    bg: string;
    /** Solid label colour — ignored when `stroke` is set. */
    text: string;
    /** The glyph's colour. */
    glyph: string;
    /** Hollow letters stroked in this colour (absent = solid letters). */
    stroke?: string;
    /** Keep the pill's edge (default is edgeless). */
    border?: boolean;
}

/* The twelve Brendon locked 2026-07-26, in cycle order. Tapping the chip on your
   own profile advances through them; the pick is public (settings.teamTagStyle).
   Numbers here match the variation sheet he approved (its 13–24). */
export const TEAM_TAG_STYLES: ReadonlyArray<TeamTagStyle> = [
    { bg: WTBS_ACID,  text: WTBS_BLACK, glyph: WTBS_BLACK },                        //  1 · acid, solid black
    { bg: WTBS_BLACK, text: WTBS_ACID,  glyph: WTBS_ACID  },                        //  2 · black, solid acid
    { bg: WTBS_BLUE,  text: WTBS_ACID,  glyph: WTBS_ACID  },                        //  3 · blue, solid acid
    { bg: WTBS_ACID,  text: WTBS_BLACK, glyph: WTBS_BLACK, stroke: WTBS_BLACK },    //  4 · acid, outlined black
    { bg: WTBS_BLACK, text: WTBS_ACID,  glyph: WTBS_ACID,  stroke: WTBS_ACID  },    //  5 · black, outlined acid
    { bg: WTBS_BLACK, text: WTBS_BLUE,  glyph: WTBS_BLUE,  stroke: WTBS_BLUE  },    //  6 · black, outlined blue
    { bg: WTBS_BLUE,  text: WTBS_ACID,  glyph: WTBS_ACID,  stroke: WTBS_ACID  },    //  7 · blue, outlined acid
    { bg: WTBS_BLUE,  text: WTBS_WHITE, glyph: WTBS_WHITE, stroke: WTBS_WHITE },    //  8 · blue, outlined white
    { bg: WTBS_ACID,  text: WTBS_BLUE,  glyph: WTBS_BLUE,  stroke: WTBS_BLUE  },    //  9 · acid, outlined blue
    { bg: WTBS_WHITE, text: WTBS_BLACK, glyph: WTBS_BLACK, stroke: WTBS_BLACK },    // 10 · white, outlined black
    { bg: WTBS_ACID,  text: WTBS_BLACK, glyph: WTBS_BLACK, stroke: WTBS_BLACK, border: true },  // 11 · acid, edge kept
    { bg: WTBS_BLACK, text: WTBS_ACID,  glyph: WTBS_ACID,  stroke: WTBS_ACID,  border: true },  // 12 · black, edge kept
];

/** The chips whose owner cycles their treatment by tapping them. CEO/Deployer
 *  are team-class too but keep their own pinned look — only these cycle. */
export function isTeamStyleTag(id: string): boolean {
    return id === 'wtbs' || id === 'petey' || id === 'bitverse';
}

/* ── BITVERSE — @cspok's chip (Brendon, 2026-07-26) ──────────────────────────
   No glyph, the wordmark as the label, COURIER not Inter, and the logo's
   two-tone split: "bit" in the green, "Verse" in the dark. bitverse.art is a
   parked page with no stylesheet, so these are sampled from the wordmark Brendon
   supplied — the only source that exists. */
export const BITVERSE_GREEN = '#0EAE78';
export const BITVERSE_DARK = '#2C3038';

/** The BitVerse treatments, same cycle contract as the WTBS family. Each is a
 *  fill plus the two runs of the wordmark, so the split survives every look. */
export const BITVERSE_STYLES: ReadonlyArray<{
    bg: string; bit: string; verse: string; border?: boolean;
}> = [
    { bg: WTBS_WHITE,      bit: BITVERSE_GREEN, verse: BITVERSE_DARK  },  // 1 · the wordmark as drawn
    { bg: BITVERSE_DARK,   bit: BITVERSE_GREEN, verse: WTBS_WHITE     },  // 2 · inverted on the dark
    { bg: BITVERSE_GREEN,  bit: BITVERSE_DARK,  verse: WTBS_WHITE     },  // 3 · green field
    { bg: BITVERSE_DARK,   bit: WTBS_WHITE,     verse: BITVERSE_GREEN },  // 4 · dark, runs swapped
    { bg: WTBS_WHITE,      bit: BITVERSE_GREEN, verse: BITVERSE_DARK, border: true }, // 5 · edge kept
    { bg: BITVERSE_DARK,   bit: BITVERSE_GREEN, verse: WTBS_WHITE,    border: true }, // 6 · edge kept
];

/** Build @cspok's BitVerse chip wearing style `n` of its cycle. */
export function bitverseTag(order: number, n: unknown): Tag {
    const s = BITVERSE_STYLES[Math.abs(Math.trunc(Number(n)) || 0) % BITVERSE_STYLES.length];
    return {
        id: 'bitverse',
        label: 'bitVerse',
        labelParts: [{ text: 'bit', color: s.bit }, { text: 'Verse', color: s.verse }],
        color: s.bg,
        textColor: s.verse,
        noBorder: !s.border,
        kind: 'team',
        order,
        lockStyle: true,
    };
}

/* ── RUDXANE — @rudxane's chip (Brendon, 2026-07-26) ─────────────────────────
   The tag IS his name, and it changes every refresh: usually one of the
   contested respellings from the Ode to Rudxane project, sometimes just
   "Rudxane" straight. Light purple tones. The respellings are lifted verbatim
   from the project's own pronunciation table (lib/art/engines/ai/ode-to-rudxane)
   so the chip and the artwork can never drift apart. */
export const RUDXANE_SAYINGS: ReadonlyArray<string> = [
    'ROOD-zayn', 'rudd-SHAHN', 'ROO-dayn', 'RUDD-zuhn', 'rud-ZAHN',
    'roo-DEX-ayn', 'RUDD-jayn', 'roo-ZAHN', 'ruh-JAH-nay', 'ROOD-khayn',
    'roo-KHAH-nay', 'RUD-ksan', 'ruh-DZYNE', 'ROO-juhn', 'rood-ZAH-nuh',
    'ROO-dek-SAYN',
];

/** Light purple tones (Brendon, 2026-07-26). */
/** COMPLETIONISM — @brendon blue, his pick (2026-08-01). */
export const COMPLETIONISM_TAG_COLOR = '#0109FF';

/* ── PRICERANK — one chip, the tier you hold right now (Brendon, 2026-08-01).
   ⛔ ONE RAMP, NOT TEN HUES. The rank is a ladder, so the chip reads as one:
   quiet and cool at the bottom, hot at the top, finishing on the brand's two
   loudest tokens so Apex looks like something. Retuning is this table alone.
   Tiers 1–2 are deliberately absent — everyone reaches Initiate, and a badge
   everybody wears says nothing. The chip starts at Regular. ── */
export const RANK_TIER_COLORS: Readonly<Record<number, string>> = {
    3: '#64748B',   // Regular      — slate, the quiet end
    4: '#0E7490',   // Established  — deep teal
    5: '#1D4ED8',   // Notable      — blue
    6: '#7C3AED',   // Respected    — violet
    7: '#DB2777',   // Authority    — magenta
    8: '#EA580C',   // Luminary     — orange
    9: '#FF0055',   // Legend       — Hothurt
    10: '#FFE600',  // Apex         — Attention, the loudest thing PD owns
};

export const RUDXANE_BG = '#C9B6F0';    // light lilac field
export const RUDXANE_INK = '#3B2A5C';   // deep violet lettering

/** The REAL name's three faces (Brendon, 2026-07-26) — these come up alongside
 *  the respellings, so the chip sometimes just says his name, in one of these
 *  casings. */
export const RUDXANE_PLAIN: ReadonlyArray<RudxaneFace> = [
    { text: 'Rudxane' },
    { text: 'rudxane' },
    { text: 'RUDXANE' },
    /* Upside down (Brendon, 2026-07-26) — the real spelling ROTATED 180°, NOT
       the Unicode flipped-character trick. Turning the actual word keeps the
       letterforms his (same face, same Courier), which the substitute glyphs
       could not. */
    { text: 'Rudxane', rotate: true },
];

/** One face of the chip: the text, and whether it's turned upside down. */
export interface RudxaneFace { text: string; rotate?: boolean }

/** Every face the chip can wear, respellings first. */
export const RUDXANE_FACES: ReadonlyArray<RudxaneFace> = [
    ...RUDXANE_SAYINGS.map((text) => ({ text })),
    ...RUDXANE_PLAIN,
];

/** The face for a given roll. The 16 respellings outnumber the 4 plain faces
 *  4:1, so "usually it's one of those" holds (Brendon). */
export function rudxaneFace(roll: unknown): RudxaneFace {
    const n = Math.abs(Math.trunc(Number(roll)) || 0);
    return RUDXANE_FACES[n % RUDXANE_FACES.length];
}

/** Build @rudxane's chip for this page load's roll. */
export function rudxaneTag(order: number, roll: unknown): Tag {
    const face = rudxaneFace(roll);
    return {
        id: 'rudxane',
        label: face.text,
        rotate: face.rotate,
        color: RUDXANE_BG,
        textColor: RUDXANE_INK,
        kind: 'team',
        order,
        /* lockStyle keeps the paint + @name restyle off it; no `font` means it
           wears the ordinary label face (Courier), same as every other chip
           (Brendon, 2026-07-26). */
        lockStyle: true,
    };
}

/** Wrap a raw style index to a real one (a stale/absent pick lands on style 1). */
export function teamStyleIndex(n: unknown): number {
    const i = Math.trunc(Number(n));
    if (!Number.isFinite(i) || i < 0) return 0;
    return i % TEAM_TAG_STYLES.length;
}

/** Build a WTBS-family chip (WTBS, Petey) wearing style `n` of the cycle. */
export function teamStyleTag(
    id: string, label: string, order: number, n: unknown,
): Tag {
    const s = TEAM_TAG_STYLES[teamStyleIndex(n)];
    return {
        id,
        label,
        glyph: '☊' + VS15,
        color: s.bg,
        textColor: s.text,
        stroke: s.stroke,
        noBorder: !s.border,
        kind: 'team',
        order,
        lockStyle: true,
        font: 'inter',
    };
}

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
    kind: 'team',
    order: 1,
    lockStyle: true,
};

/* DEPLOYER — @pricediscussion's chip (Brendon, 2026-07-26). The treasury wallet
   used to wear CEO too; CEO is Brendon's personal one-of-one, so the treasury
   now says what it actually is. Identical treatment, different word. */
export const DEPLOYER_TAG: Tag = {
    ...CEO_TAG,
    id: 'deployer',
    label: 'Deployer',
    order: 2,
};

/** PriceDay-join tag colour — a distinct purple (Brendon, 2026-07-22). */
export const PRICEDAY_TAG_COLOR = '#9333EA';

/** $PRICE holder-rank tag — the default tier (Top 25/50/75/100): white fill +
 *  Hothurt lettering, a fixed treatment (lockStyle) (Brendon, 2026-07-23). */
export const PRICE_HOLD_TAG_BG = '#FFFFFF';   // white
export const PRICE_HOLD_TAG_TEXT = '#FF0055'; // Hothurt
/** Top 3 — Attention-yellow fill + Dot-black lettering (Brendon, 2026-07-23). */
export const PRICE_HOLD_TOP3_BG = '#FFE600';   // Attention yellow
export const PRICE_HOLD_TOP3_TEXT = '#111111'; // Dot black (--dot)
/** Top 10 — Dot-black fill + Attention-yellow lettering (Brendon, 2026-07-23). */
export const PRICE_HOLD_TOP10_BG = '#111111';   // Dot black (--dot)
export const PRICE_HOLD_TOP10_TEXT = '#FFE600'; // Attention yellow

/** $PRICE holding-amount tags (100K+, 1M+) — starting colours, Brendon to tune
 *  (Brendon, 2026-07-23). */
export const PRICE_HELD_1M_BG = '#FFE600';    // Attention yellow
export const PRICE_HELD_1M_TEXT = '#111111';  // Dot black
export const PRICE_HELD_100K_BG = '#111111';  // Dot black
export const PRICE_HELD_100K_TEXT = '#FFE600';// Attention yellow (--dot)

/** FORMULA tags (Brendon, 2026-07-29) — the owner's own generative Unicode
 *  art. Dot fill, Matrix lettering: the brand's two neutrals, so the ARTWORK is
 *  the only thing with a colour opinion on the pill. */
export const FORMULA_TAG_BG = '#111111';    // Dot
export const FORMULA_TAG_TEXT = '#E0E0E0';  // Matrix

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
    /* The two brand neutrals, named for what they are (Brendon, 2026-07-26):
       Dot and Matrix, at the brand token values — not raw black/white. */
    { id: 'black',     label: 'All Dot',            hex: '#111111' },
    { id: 'white',     label: 'All Matrix',         hex: '#E0E0E0' },
    { id: 'hothurt',   label: 'All Hothurt',        hex: '#FF0055' },
    { id: 'attention', label: 'All Attention',      hex: '#FFE600' },
    { id: 'blue',      label: 'All @brendon blue',  hex: '#0109FF' },
];

const PAINT_BY_ID = new Map(TAG_PAINTS.map((p) => [p.id, p]));

/** A free-chosen colour from the picker at the end of the paint row
 *  (Brendon, 2026-07-26) — stored as the raw hex, alongside the named ids. */
const CUSTOM_PAINT_RE = /^#[0-9a-f]{6}$/i;

export function isValidTagPaint(id: unknown): id is string {
    return typeof id === 'string' && (PAINT_BY_ID.has(id) || CUSTOM_PAINT_RE.test(id));
}

/** The paint's pill colour, or null for unknown/absent (own colours). */
export function tagPaintHex(id: string | null | undefined): string | null {
    if (!id) return null;
    if (CUSTOM_PAINT_RE.test(id)) return id.toUpperCase();
    return PAINT_BY_ID.get(id)?.hex ?? null;
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
