/*
 * lib/tags/derive.ts — resolve a profile's FULL active tag set for display.
 *
 * Pure (server + client). Combines the four sources into one ordered list:
 *   • personas  — the ids the user picked (users.profile_tags), validated.
 *   • earned    — derived from real data. Artist (whitelist) + Veteran (tenure)
 *                 are wired now. Whale / Diamond Hands / Minter are DELIBERATELY
 *                 not derived yet: they need the right on-chain signal + Brendon's
 *                 thresholds, and faking them from a guess would paint wrong
 *                 badges on real profiles. They light up the moment that data +
 *                 those cuts are set — the catalog entries already exist.
 *   • granted   — the ids an admin handed out (users.granted_tags), validated.
 *   • id        — one tag from the user's platform number (#1–22, then ranges).
 */

import {
    type Tag, tagById, isPersonaId, GRANTED_IDS,
    ID_TAG_STYLE, ID_RANGES, CEO_TAG, DEPLOYER_TAG, teamStyleTag,
    bitverseTag, rudxaneTag, PRICEDAY_TAG_COLOR, COMPLETIONISM_TAG_COLOR,
    RANK_TIER_COLORS,
    PRICE_HOLD_TAG_BG, PRICE_HOLD_TAG_TEXT,
    PRICE_HOLD_TOP3_BG, PRICE_HOLD_TOP3_TEXT,
    PRICE_HOLD_TOP10_BG, PRICE_HOLD_TOP10_TEXT,
    PRICE_HELD_1M_BG, PRICE_HELD_1M_TEXT, PRICE_HELD_100K_BG, PRICE_HELD_100K_TEXT,
    FORMULA_TAG_BG, FORMULA_TAG_TEXT,
} from './catalog';
import { priceDayNumber } from '../priceday/priceday';
import { tierFor } from '../achievements/tiers';
import { cleanFormulas, drawFormula, formulaBlurb } from './formula';

/** Provisional Veteran cut (Brendon to confirm the real tenure). */
export const VETERAN_DAYS = 180;

/** Brendon's wallets — the ONLY holder of the CEO tag. His @brendon profile
 *  plus the pricediscussion.eth treasury (both are him). */
const CEO_ADDRESSES: ReadonlySet<string> = new Set([
    '0x65c34afda745c12745db70ffa809311339279395', // @brendon
]);

/** The treasury wallet — wears DEPLOYER, not CEO (Brendon, 2026-07-26). Both
 *  wallets are Brendon; the chip now says which hat the wallet is wearing. */
const DEPLOYER_ADDRESSES: ReadonlySet<string> = new Set([
    '0x146034ec25c277f30f63933b151297689e15b9b8', // pricediscussion.eth
]);

/* ── The handle-reserved TEAM tags (Brendon, 2026-07-26) ─────────────────────
   Not grantable and not in the catalog's GRANTED set: a tag appears here or it
   does not exist. An account that later renames itself to one of these handles
   inherits the tag — that is deliberate, the handles are reserved platform-side
   (lib/reserved-handles.ts). */

/** WTBS — the two hosts of Waiting To Be Signed, nobody else. */
const WTBS_HANDLES: ReadonlySet<string> = new Set(['trinity', 'willpop']);

/** Petey — same treatment + palette as WTBS, one account. */
const PETEY_HANDLES: ReadonlySet<string> = new Set(['petey']);

/** BitVerse — @cspok. Courier wordmark, two-tone, no glyph. */
const BITVERSE_HANDLES: ReadonlySet<string> = new Set(['cspok']);

/** Rudxane — @rudxane. The label re-rolls every page load. */
const RUDXANE_HANDLES: ReadonlySet<string> = new Set(['rudxane']);

export interface DeriveInput {
    /** Personas the user picked (users.profile_tags). */
    profileTags?: string[] | null;
    /** Admin-granted tag ids (users.granted_tags). */
    grantedTags?: string[] | null;
    /** The user's sequential platform number (users.user_number). */
    userNumber?: number | null;
    /** Whitelisted artist (drives the Artist earned tag). */
    isArtist?: boolean;
    /** Account creation timestamp (drives Veteran + the PriceDay-join tag). */
    createdAt?: string | null;
    /** The profile owner's wallet — gates the one-of-one CEO + Deployer tags. */
    address?: string | null;
    /** The profile owner's @handle — gates the handle-reserved TEAM tags (WTBS,
     *  Petey). Case-insensitive; absent = no handle-reserved tag. */
    handle?: string | null;
    /** Which of the 12 WTBS-family treatments the owner cycled to
     *  (settings.teamTagStyle). Out-of-range/absent wraps to the first. */
    teamTagStyle?: number | null;
    /** This page load's roll for @rudxane's chip, whose label changes every
     *  refresh (usually an Ode to Rudxane respelling, sometimes the plain
     *  name). Absent = the plain name, which is also what the server renders
     *  so hydration never mismatches. */
    rudxaneRoll?: number | null;
    /** The owner's $PRICE holder rank (users.price_hold_rank) — drives the
     *  "$PRICE Top N · #r" earned tag; null/absent = unranked (no tag). */
    priceHoldRank?: number | null;
    /** The owner's $PRICE balance in whole tokens (users.price_held) — drives
     *  the 100K+ / 1M+ holding tags. */
    priceHeld?: number | string | null;
    /** The Projects this person MADE — one chip each, in that Project's own
     *  colour. Handed IN as facts (the registry is never imported here: this
     *  module is pulled into every surface that lists people, and reaching for
     *  the project registry would drag the whole art-engine graph along with
     *  it). Absent = no project tags. */
    projects?: ReadonlyArray<{ slug: string; name: string; color: string }> | null;
    /** The owner's FORMULA shelf (users.formulas) — their own generative
     *  Unicode art, one tag per Formula they are wearing. Position IS the
     *  number: Formula #1 … #22, like Albums. */
    formulas?: unknown[] | null;
    /** This page load's roll for the Formula tags, whose glyphs REDRAW every
     *  refresh (Brendon, 2026-07-29). Absent = roll 0, which is also what the
     *  server renders, so hydration never mismatches. Same contract as
     *  `rudxaneRoll` above. */
    formulaRoll?: number | null;
    /** The owner's PriceScore (users.price_score) — drives the single
     *  PriceRank tier chip. Below the Regular threshold there is no chip. */
    priceScore?: number | null;
    /** Months this person CLEARED, as `YYYY-MM` keys — one "SEP '26 100%" chip
     *  each. Handed in as facts like `projects`: working out which months are
     *  complete needs the project table and the holder rows, and neither may be
     *  reached from this module. Absent = no completionism chips. */
    clearedMonths?: string[] | null;
    /** Tag ids the owner switched OFF — the opt-out list, and the ONLY thing
     *  that can dark a default-on tag (the PROJECT tags, Brendon 2026-07-29).
     *  Separate from `shownTags` on purpose: absence from the shown list means
     *  "not switched on yet", which must never be read as "turned off". */
    tagsOff?: string[] | null;
    /** Tag ids the owner switched ON. ⛔ TAGS ARE OFF BY DEFAULT (Brendon,
     *  2026-07-26): an automatic tag stays dark until its owner finds the picker
     *  and lights it. Personas are exempt — picking one already turns it on.
     *  Pass `undefined` (the picker does) to get the FULL set back, so the
     *  owner has something to switch on. */
    shownTags?: string[] | null;
}

/** The PriceDay-of-join tag — everyone gets one; the PriceDay number of the day
 *  they joined (Brendon, 2026-07-22). Purple, sits in the Earned section. */
function priceDayJoinTag(createdAt: string | null | undefined): Tag | null {
    if (!createdAt) return null;
    const d = new Date(createdAt);
    if (Number.isNaN(d.getTime())) return null;
    return {
        id: 'priceday-join',
        label: `PriceDay #${priceDayNumber(d)}`,
        color: PRICEDAY_TAG_COLOR,
        kind: 'earned',
        order: 21,
    };
}

/* ── PROJECT TAGS (Brendon, 2026-07-29) ─────────────────────────────────────
   One chip per Project the artist made, worn in their Earned section, painted
   in that Project's own colorway, and tapping it goes to the Project. ONLY the
   artist of a Project has its tag — nobody else can earn, pick or be granted
   one.
   ⛔ OFF BY DEFAULT, like every other tag (Brendon, 2026-07-30). They used to
   be the one default-on exception; now nothing wears itself without its owner
   lighting it in the picker. Otherwise unchanged. */
function projectTagsFor(projects: DeriveInput['projects']): Tag[] {
    return (projects ?? []).map((p, i) => ({
        id: `project-${p.slug}`,
        label: p.name,
        /* ⬚ — PD's Project mark (docs/GLYPHS.md), the same dotted square the
           stats row and the project ping wear (Brendon, 2026-07-29). */
        glyph: '\u2B1A\uFE0E',
        color: p.color,
        kind: 'earned' as const,
        /* After PriceDay #N (21), before the rest of Earned. */
        order: 22 + i / 100,
        project: p.slug,
    }));
}

/** The single id tag a platform number earns, or null (no number / past 1000). */
export function idTagFor(userNumber: number | null | undefined): Tag | null {
    if (!userNumber || userNumber < 1) return null;
    // Order 20 → the id tag opens the EARNED section (Brendon, 2026-07-22).
    if (userNumber <= 22) {
        return {
            id: `id-${userNumber}`,
            label: `User #${userNumber}`,
            color: ID_TAG_STYLE.color,
            kind: 'id',
            order: 20,
        };
    }
    for (const range of ID_RANGES) {
        if (userNumber <= range.max) {
            return {
                id: range.id,
                label: range.label,
                color: ID_TAG_STYLE.color,
                kind: 'id',
                order: 20,
            };
        }
    }
    return null;
}

/** $PRICE holder-rank tiers — the label shows the TIGHTEST Top-N the rank falls
 *  in, and the number is the live rank (Brendon, 2026-07-23). */
const PRICE_HOLD_TIERS = [3, 10, 25, 50, 75, 100] as const;

/** The $PRICE holder-rank tag, or null past #100 / unranked (it vanishes on its
 *  own). Attention-yellow fill + Hothurt lettering, fixed treatment (lockStyle),
 *  sitting in the Earned section. */
export function priceHoldTag(rank: number | null | undefined): Tag | null {
    if (!rank || rank < 1) return null;
    const tier = PRICE_HOLD_TIERS.find((t) => rank <= t);
    if (!tier) return null;
    // Per-tier treatment: Top 3 = white / Hothurt; Top 10 = Attention / Dot
    // black; the rest = black / Attention yellow (Brendon, 2026-07-23).
    const color = tier === 3 ? PRICE_HOLD_TOP3_BG : tier === 10 ? PRICE_HOLD_TOP10_BG : PRICE_HOLD_TAG_BG;
    const textColor = tier === 3 ? PRICE_HOLD_TOP3_TEXT : tier === 10 ? PRICE_HOLD_TOP10_TEXT : PRICE_HOLD_TAG_TEXT;
    return {
        id: 'price-hold',
        label: `$PRICE Top ${tier} · #${rank}`,
        svgGlyph: 'price',
        color,
        textColor,
        kind: 'earned',
        order: 22,
        lockStyle: true,
    };
}

/** $PRICE holding-amount tiers — the highest threshold met shows (Brendon,
 *  2026-07-23). Starting colours; Brendon tunes. */
const PRICE_HELD_TIERS: ReadonlyArray<{ min: number; label: string; bg: string; text: string }> = [
    { min: 1_000_000, label: '1M $PRICE',   bg: PRICE_HELD_1M_BG,   text: PRICE_HELD_1M_TEXT },
    { min: 100_000,   label: '100k $PRICE', bg: PRICE_HELD_100K_BG, text: PRICE_HELD_100K_TEXT },
];

/** The $PRICE holding-amount tag (100K+ / 1M+) — the highest threshold held, or
 *  null below 100K. Wears the $PRICE logo glyph, fixed treatment, Earned. */
export function priceHeldTag(held: number | string | null | undefined): Tag | null {
    const n = Number(held);
    if (!Number.isFinite(n) || n <= 0) return null;
    for (const t of PRICE_HELD_TIERS) {
        if (n >= t.min) {
            return {
                id: 'price-held',
                label: t.label,
                svgGlyph: 'price',
                color: t.bg,
                textColor: t.text,
                kind: 'earned',
                order: 23,
                lockStyle: true,
            };
        }
    }
    return null;
}

/* ── PRICERANK — the tier you hold RIGHT NOW (Brendon, 2026-08-01) ──────────
   ONE chip, never a shelf: the tier replaces itself as you climb, so nobody
   keeps a rank they fell out of and a row can't fill up with old trophies.
   Tiers 1–2 get nothing — everyone reaches Initiate, so a chip for it says
   nothing about anybody. The titles and thresholds are read from the rank
   ladder itself (lib/achievements/tiers), never restated here. ── */
const RANK_TAG_FLOOR = 3;

export function rankTag(score: number | null | undefined): Tag | null {
    const n = Number(score);
    if (!Number.isFinite(n) || n <= 0) return null;
    const t = tierFor(n);
    if (!t || t.tier < RANK_TAG_FLOOR) return null;
    const color = RANK_TIER_COLORS[t.tier];
    if (!color) return null;
    return {
        id: 'pricerank',
        label: t.title,
        color,
        kind: 'earned',
        order: 20.5,
        blurb: `PriceRank ${t.tier} — ${t.title}.`,
    };
}

/* ── COMPLETIONISM — one chip per month you cleared (Brendon: a tag per month
   collected, "SEP '26 100%"). A month is CLEARED when you hold at least one
   output of every project uploaded in it — the same cut the Completionism
   sheet itself uses, handed in here as facts so this module never reaches for
   the project registry (that ban is why every tag fact arrives pre-resolved).
   Colour: @brendon blue (his pick, 2026-08-01). ── */
const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
    'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

/** '2026-09' → "SEP '26 100%". Returns null for anything malformed. */
export function completionismLabel(key: string): string | null {
    const m = /^(\d{4})-(\d{2})$/.exec(key);
    if (!m) return null;
    const month = Number(m[2]);
    if (month < 1 || month > 12) return null;
    return `${MONTH_ABBR[month - 1]} '${m[1]!.slice(2)} 100%`;
}

/** One earned chip per cleared month, newest first. */
function completionismTags(keys: readonly string[] | null | undefined): Tag[] {
    if (!keys?.length) return [];
    const seen = new Set<string>();
    const out: Tag[] = [];
    for (const key of [...keys].sort().reverse()) {
        const label = completionismLabel(key);
        if (!label || seen.has(key)) continue;
        seen.add(key);
        out.push({
            id: `completionism-${key}`,
            label,
            color: COMPLETIONISM_TAG_COLOR,
            kind: 'earned',
            order: 24 + out.length / 100,
            blurb: 'Collected every release of that month.',
        });
    }
    return out;
}

function daysSince(iso: string): number {
    const then = new Date(iso).getTime();
    if (Number.isNaN(then)) return 0;
    return (Date.now() - then) / 86_400_000;
}

/** Resolve the ordered, de-duplicated tag list a profile should display. */
export function deriveTags(input: DeriveInput): Tag[] {
    const out: Tag[] = [];
    const seen = new Set<string>();
    const add = (t: Tag | undefined | null) => {
        if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
    };

    /* TEAM (order 1–4) — the VIP class, always first. Every one of these is
       pinned to a single wallet or handle and can never be chosen or granted. */
    const addr = input.address?.toLowerCase() ?? null;
    const hdl = input.handle?.toLowerCase().replace(/^@/, '') ?? null;
    if (addr && CEO_ADDRESSES.has(addr)) add(CEO_TAG);
    if (addr && DEPLOYER_ADDRESSES.has(addr)) add(DEPLOYER_TAG);
    if (hdl && WTBS_HANDLES.has(hdl)) add(teamStyleTag('wtbs', 'WTBS', 3, input.teamTagStyle));
    if (hdl && PETEY_HANDLES.has(hdl)) add(teamStyleTag('petey', 'Petey', 4, input.teamTagStyle));
    if (hdl && BITVERSE_HANDLES.has(hdl)) add(bitverseTag(5, input.teamTagStyle));
    if (hdl && RUDXANE_HANDLES.has(hdl)) add(rudxaneTag(6, input.rudxaneRoll));

    // Personas the user chose (validated against the catalog).
    for (const id of input.profileTags ?? []) {
        if (isPersonaId(id)) add(tagById(id));
    }

    // Earned — only what we can derive honestly today.
    add(idTagFor(input.userNumber));           // User #N (opens Earned)
    add(rankTag(input.priceScore));            // PriceRank — the tier held now
    add(priceDayJoinTag(input.createdAt));     // PriceDay #N (join day)
    add(priceHoldTag(input.priceHoldRank));    // $PRICE Top N · #r (holder rank)
    add(priceHeldTag(input.priceHeld));        // $PRICE 100K+ / 1M+ (amount held)
    for (const t of projectTagsFor(input.projects)) add(t);  // one per Project made
    for (const t of completionismTags(input.clearedMonths)) add(t);  // one per month cleared
    if (input.isArtist) add(tagById('artist'));
    if (input.createdAt && daysSince(input.createdAt) >= VETERAN_DAYS) add(tagById('veteran'));

    /* FORMULA — the owner's own generative art, one tag per worn Formula
       (Brendon, 2026-07-29). The glyphs REDRAW each load off `formulaRoll`.
       Numbered by shelf position, exactly like Albums; the number is the
       title for humans (title attribute) while the label IS the artwork. */
    const shelf = cleanFormulas(input.formulas);
    shelf.forEach((f, i) => {
        if (!f.on) return;
        add({
            id: `formula-${i + 1}`,
            label: drawFormula(f, input.formulaRoll ?? 0),
            blurb: `Formula #${i + 1} — ${formulaBlurb(f)}`,
            color: FORMULA_TAG_BG,
            textColor: FORMULA_TAG_TEXT,
            kind: 'earned',
            order: 28 + i / 100,
            lockStyle: true,
            defaultOn: true,
        });
    });

    // Granted — admin-assigned ids (validated).
    for (const id of input.grantedTags ?? []) {
        if (GRANTED_IDS.has(id)) add(tagById(id));
    }

    const ordered = out.sort((a, b) => a.order - b.order);
    /* OFF BY DEFAULT (Brendon, 2026-07-26). `undefined` = the picker asking for
       everything; an ARRAY (even empty) = a real profile, where only the ids the
       owner switched on survive. Personas pass through untouched — choosing one
       is itself the act of switching it on. */
    if (input.shownTags === undefined) return ordered;
    const shown = new Set(input.shownTags ?? []);
    const off = new Set(input.tagsOff ?? []);
    return ordered.filter((t) => {
        if (t.kind === 'persona') return true;
        /* Default-on (the project tags): worn until its owner turns it off. */
        if (t.defaultOn) return !off.has(t.id);
        return shown.has(t.id);
    });
}
