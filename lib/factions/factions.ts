/*
 * FACTIONS — allegiance = colour. The shared registry (client + server).
 *
 * Working spec v3.1 (Atlas → KING MODE → "FACTIONS (Sigil · Marginalia ·
 * Quadrants)", settled 2026-07-12): NO new faction set — the current
 * blank-bubble Profile Logo colours ARE the factions, exactly as they ship in
 * lib/profile/profileLogos.ts. In-app a faction is only ever its COLOUR; the
 * Discord names the tribes organically. This module derives the faction set
 * from the very same hue math the blank logos use, so the two can never drift.
 *
 * Faction identity = the colour's NAME from the app's own hue ring (the same
 * name the logo picker already shows: "Bubble — Gold"). Neighbouring shades
 * that share a name (the 27-hue ring reuses some of the 21 ring names) are ONE
 * faction with shade variants — the exact grouping the LIVE DISTRIBUTION read
 * used ("Blue 18 · Grey 7 · …") and the natural base for the deferred 6-vs-12
 * rollup call. The classic Hothurt-red blank is its own faction: HOTHURT.
 *
 * Enlistment surface (settled #4 — innocent discovery): ONLY the blank
 * bubbles enlist (and Sigil options when they ship). NOT the holo blank, not
 * solids, not Petey, not $PRICE — those stay silent and neutral.
 *
 * Oath rules (spec §2 + open call #5 rec, built as recommended):
 *   - The flag flies until you raise another: switching to a NON-faction logo
 *     (solid / Petey / $PRICE / holo / off) does NOT break the oath — war UI
 *     just hides while neutral. Only selecting a DIFFERENT faction colour is
 *     defection.
 *   - Defection: accrued time resets, 30-day cooldown before the new flag
 *     counts, scar permanent (faction_oaths.defections).
 */

const PRICE_RED = '#FF0055';

/* ── The exact hue math from lib/profile/profileLogos.ts (do not drift) ──── */

function hslHex(h: number, s: number, l: number): string {
    const sat = s / 100, lig = l / 100;
    const a = sat * Math.min(lig, 1 - lig);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        return lig - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    };
    const hx = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
    return `#${hx(f(0))}${hx(f(8))}${hx(f(4))}`.toUpperCase();
}

const NAME_RING: [number, string][] = [
    [0, 'Red'], [18, 'Scarlet'], [33, 'Orange'], [45, 'Amber'], [55, 'Gold'],
    [70, 'Lime'], [90, 'Chartreuse'], [120, 'Green'], [150, 'Emerald'], [168, 'Teal'],
    [182, 'Cyan'], [197, 'Sky'], [212, 'Azure'], [228, 'Blue'], [244, 'Indigo'],
    [258, 'Violet'], [275, 'Purple'], [290, 'Magenta'], [312, 'Fuchsia'], [332, 'Pink'], [348, 'Rose'],
];
function hueName(h: number): string {
    let best = NAME_RING[0]!, bestD = 999;
    for (const e of NAME_RING) {
        const d = Math.min(Math.abs(e[0] - h), 360 - Math.abs(e[0] - h));
        if (d < bestD) { bestD = d; best = e; }
    }
    return best[1];
}

/* The blank ring: plogo-blank-hot + plogo-blank-pg0..pg26 (27 hues, sat 88,
   lights [52,62,44], phase 6 — the genHues call in profileLogos.ts). */
interface BlankShade { logoId: string; hex: string; name: string }

const BLANK_SHADES: BlankShade[] = (() => {
    const out: BlankShade[] = [{ logoId: 'plogo-blank-hot', hex: PRICE_RED, name: 'Hothurt' }];
    const lights = [52, 62, 44];
    for (let i = 0; i < 27; i++) {
        const h = (6 + (i * 360) / 27) % 360;
        out.push({
            logoId: `plogo-blank-pg${i}`,
            hex: hslHex(h, 88, lights[i % 3]!),
            name: hueName(h),
        });
    }
    return out;
})();

/* ── The faction set ─────────────────────────────────────────────────────── */

export interface Faction {
    /** Stable key — UPPERCASE colour name (the toast word, the DB value). */
    key: string;
    /** Display name = the key (the faction IS the colour; casing per toast rule). */
    name: string;
    /** Canonical banner hex (the first shade wearing this name). */
    hex: string;
    /** Every blank-logo id that flies this faction's colour. */
    logoIds: string[];
    /** Every shade hex under this name (banner first). */
    shades: string[];
}

export const FACTIONS: readonly Faction[] = (() => {
    const byName = new Map<string, Faction>();
    for (const s of BLANK_SHADES) {
        const key = s.name.toUpperCase();
        const f = byName.get(key);
        if (f) {
            f.logoIds.push(s.logoId);
            f.shades.push(s.hex);
        } else {
            byName.set(key, { key, name: key, hex: s.hex, logoIds: [s.logoId], shades: [s.hex] });
        }
    }
    return Array.from(byName.values());
})();

const FACTION_BY_KEY = new Map(FACTIONS.map((f) => [f.key, f]));
const FACTION_BY_LOGO = new Map<string, Faction>();
for (const f of FACTIONS) for (const id of f.logoIds) FACTION_BY_LOGO.set(id, f);

/** The faction a Profile Logo pick enlists in, or null for every neutral
 *  logo (solids, Petey, $PRICE, holo — including the holo blank — and off).
 *  Sigil ids join this map when the Sigil ships (build order #6). */
export function factionForLogo(logoId: string | null | undefined): Faction | null {
    if (!logoId) return null;
    return FACTION_BY_LOGO.get(logoId) ?? null;
}

export function factionByKey(key: string | null | undefined): Faction | null {
    if (!key) return null;
    return FACTION_BY_KEY.get(key.toUpperCase()) ?? null;
}

/* ── Constitution constants (open calls #1–#3, built to the recs) ────────── */

/** Defection cooldown — days before a defector's new flag counts (rec 30d). */
export const DEFECTION_COOLDOWN_DAYS = 30;
/** Siege window — hours a challenger must hold the line (rec 72h). */
export const SIEGE_WINDOW_HOURS = 72;
/** Whale damping — full weight up to this many held pieces per collection,
 *  square-root taper beyond (rec: "a handful"). */
export const WHALE_FULL_WEIGHT_PIECES = 5;
/** Margin slot cap — a full margin is a Relic; the next hand strikes the
 *  oldest to the crypt ("struck from the stone"). */
export const MARGIN_SLOTS = 12;
/** A challenger opens a Siege at this share of the leader's grip. */
export const SIEGE_THRESHOLD = 0.85;
/** Leader share of total grip required for Stronghold (plus durability). */
export const STRONGHOLD_SHARE = 0.6;
/** Days a lead must stand before Held hardens into Stronghold. */
export const STRONGHOLD_DAYS = 7;

/* ── War glyphs (docs/GLYPHS.md §13 — fixed vocabulary, VS-15) ───────────── */

export const WAR_GLYPHS = {
    corner: '▟︎',
    siege: '▞︎',
    banner: '⚐︎',
    book: '≣︎',
    struck: '‡︎',
} as const;
