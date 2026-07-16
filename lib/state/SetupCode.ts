/**
 * Setup Code encoder + decoder.
 *
 * Sim refs: 9686-9892 (header + tables), 9796-9978 (encode + decode +
 * applySetupCodeState). Format (sim 9692, post-v1.0.45 short form):
 *
 *   ‰{THEME}-{tokens, alpha-sorted}-{SORT}-{TAPE if non-zero}
 *
 * Examples:
 *   ‰ARTS-IDAS                              — default state, no spells
 *   ‰DARK-AURA-FOG-HMMR-IDAS-TAPB           — dark + 3 spells + bold tape
 *
 * Decoder accepts both new format and the legacy bracketed +V1 form
 * (sim 9846-9852) so existing user data migrates cleanly.
 *
 * The ‰ stamp is U+2030 PER MILLE SIGN. AI tools sometimes mis-render
 * it as the two-character `%∞`; the decoder normalises both.
 *
 * ── Notes on the React port's diverged names ──
 * Sim's pdNotifs uses these mode keys verbatim: zen, sticker, echo,
 * zerocontext, sentiment, asciiId, degen, redacted, autoscroll,
 * stargazing, pricelens, pure_light, pure_dark, anon, priceLogo.
 *
 * The React port's PdNotifs renamed a few during earlier builds:
 *   sim `zen`        → React `zenMode`
 *   sim `sentiment`  → React `sentimentOn`
 *   sim `redacted`   → React `redactedMode`
 *   sim `pricelens`  → React `spell_pricelens` (lives in spell bucket)
 *   sim `stargazing` → React `stargazing` (notif key, F48 corrected)
 *
 * Build 26 added inert pdNotifs flags for the rest (pure_light,
 * pure_dark, sticker, echo, zerocontext, asciiId, degen, autoscroll)
 * so the Setup Code roundtrip preserves them losslessly even though
 * no UI surface listens yet.
 *
 * ── Sort granularity ──
 * Sim's currentSort carries direction (id-asc, feed-time-desc, …).
 * The React port's SortContext stores only the base key (id, price,
 * feed, fog). Encode picks the sim default direction for each base
 * key; decode collapses any direction onto the base key. Roundtrip
 * is therefore lossy on direction — fine, since DefaultSortRow only
 * supports the four base keys today.
 */

import type { PdNotifs, PingToastMode, MenuTapeMode } from './PdNotifsContext';
import type { ColorwayKey } from './ColorwayContext';
import type { SortKey } from './SortContext';

export type DecodedTape = 0 | 1 | 2 | 3 | 4;

/** Map of pdNotifs flag-key → bool patches the decoded code wants applied. */
export interface DecodedState {
    colorway: ColorwayKey | null;
    sort: SortKey | null;
    tape: DecodedTape;
    /** Patch object — pdNotifs key → true. Always-truthy by construction. */
    flags: Partial<Record<keyof PdNotifs, true>>;
    /** Multi-value settings, present only when their token is in the code. */
    watchMetric?: number;
    pingToasts?: PingToastMode;
    menutape?: MenuTapeMode;
    audience?: boolean;
}

export interface DecodeResult {
    ok: boolean;
    state?: DecodedState;
    unknown?: string[];
    error?: string;
}

// ── Colorway tokens ───────────────────────────────────────────────
// Sim 9713-9716. Order matters only for the "fall back to ARTS"
// behaviour at sim 9807 — never to the encoded output, which always
// places exactly one colorway token at slot 0.
const COLORWAY_TO_TOKEN: Record<NonNullable<ColorwayKey>, string> = {
    // The Custom colorway was renamed from "Artist" long ago; its Setup Code
    // token reads CSTM to match (Brendon, 2026-06-20).
    custom:  'CSTM',
    light:   'LITE',
    dark:    'DARK',
    orange:  'ORNG',
    hashsyn: 'HASH',
    blue:    'BLUE',
    red:     'REDD',
    haze:    'HAZE',
};

const TOKEN_TO_COLORWAY: Record<string, ColorwayKey> = {
    ...Object.fromEntries(
        Object.entries(COLORWAY_TO_TOKEN).map(([k, v]) => [v, k as ColorwayKey])
    ),
    /* Legacy: ARTS was Custom's token before the 2026-06-20 rename. Pasted
       old codes (and the OLD_DEFAULT_CODES forms) must still decode to the
       right colorway instead of falling into `unknown` (share-accuracy
       pass, 2026-07-16). Decode-only — encode always emits CSTM. */
    ARTS: 'custom',
};

// ── Sort tokens (sim 9717-9732) ────────────────────────────────
// Encode side — base key + sim's default direction:
//   id    → IDAS  (id-asc, sim default at top of table)
//   price → PRAS  (price-asc)
//   feed  → FDTD  (feed-time-desc, the sim's default feed sort)
//   fog   → FOG   (no direction)
const SORT_TO_TOKEN: Record<SortKey, string> = {
    id:    'IDAS',
    price: 'PRAS',
    feed:  'FDTD',
    fog:   'FOG',
    // 'az' is a transient Collected-only sort, never persisted/shared; token
    // exists only to satisfy the map. Decodes back to id (below).
    az:    'AZAS',
};

// Decode side — every sim sort token collapses onto a base SortKey.
// Direction bits are dropped; epoch-* falls back to id (no React equiv).
const TOKEN_TO_SORT: Record<string, SortKey> = {
    IDAS: 'id',    IDDS: 'id',
    AZAS: 'id',
    PRAS: 'price', PRDS: 'price',
    FDTD: 'feed',  FDTA: 'feed',  FDPD: 'feed',  FDPA: 'feed',
    EPAS: 'id',    EPDS: 'id',
    FOG:  'fog',
};

// ── Tape tokens (sim 9733-9739) ────────────────────────────────
// 0 (off) is omitted from the code entirely on encode.
const TAPE_TO_TOKEN: Record<1 | 2 | 3 | 4, string> = {
    1: 'TAPF', // Faded
    2: 'TAPS', // Standard
    3: 'TAPB', // Bold
    4: 'TAPX', // Framed
};

const TOKEN_TO_TAPE: Record<string, DecodedTape> = {
    TAPF: 1, TAPS: 2, TAPB: 3, TAPX: 4,
};

// ── Mode tokens (sim 9746-9764) ────────────────────────────────
// Map: token → React PdNotifs key. Values are typed as keyof PdNotifs so
// the encode iteration below is type-safe against name drift in PdNotifs.
const MODE_TOKEN_TO_KEY: Record<string, keyof PdNotifs> = {
    PURL: 'pure_light',
    PURD: 'pure_dark',
    PLGO: 'priceLogo',
    ANON: 'anon',
    ZNMD: 'zenMode',           // sim `zen`        → React `zenMode`
    NSTK: 'sticker',           // negative — active means stickers hidden
    ECHO: 'echo',
    ZRCX: 'zerocontext',
    LENS: 'spell_pricelens',   // sim mode → React spell bucket
    SNTM: 'sentimentOn',       // sim `sentiment`  → React `sentimentOn`
    NASC: 'asciiId',           // negative — active means ASCII-ID hidden
    DGEN: 'degen',
    RDCT: 'redactedMode',      // sim `redacted`   → React `redactedMode`
    ASCR: 'autoscroll',
    /* F48 — STAR token maps to the `stargazing` notif key (sim 9761).
       Earlier port had it routed into the spell bucket as
       `spell_stargazing`; that field never existed in sim. */
    STAR: 'stargazing',
    /* Newer UI toggles, all default-OFF so the presence/absence model is
       lossless (Brendon 2026-06-19 — Setup Codes catch-up). */
    TBCL: 'topBarCalendar', // Top-bar calendar
    BACK: 'backButton',     // Persistent back button
    AMBS: 'ambientStrip',   // Ambient light strip
    WTCH: 'watch',          // The Watch
    NITE: 'nightmode',      // Night mode
};

const MODE_KEY_TO_TOKEN: Partial<Record<keyof PdNotifs, string>> = Object.fromEntries(
    Object.entries(MODE_TOKEN_TO_KEY).map(([tok, key]) => [key, tok])
);

// ── Spell tokens (sim 9766-9787) ───────────────────────────────
// F48 — ASTR is now wired (was previously omitted from encode/decode).
// The Astral spell pill lives in lib/data/spells.ts; its body-class is
// none (sim 9955-9963 _bodyClassMap omits spell_astral).
const SPELL_TOKEN_TO_KEY: Record<string, keyof PdNotifs> = {
    FMLR: 'spell_familiar',
    CRTL: 'spell_cartel',
    SPIT: 'spell_spitebook',
    GRAV: 'spell_gravitydrop',
    CLST: 'spell_celestial',
    TRBN: 'spell_tribunal',
    PNOP: 'spell_panopticon',
    INVS: 'spell_invisible',
    NPCM: 'spell_npc',
    TROT: 'spell_tarot',
    PGHO: 'spell_priceghost',
    PRTL: 'spell_portal',
    FLAR: 'spell_cme',         // "Solar FLARe"
    SHLD: 'spell_offershield',
    SYBN: 'spell_sybilnet',
    GSSP: 'spell_gossip',
    AURA: 'spell_aura',
    ARBT: 'spell_arbitrage',
    MOOD: 'spell_moodring',
    HMMR: 'spell_hammer',
    ASTR: 'spell_astral',
};

const SPELL_KEY_TO_TOKEN: Partial<Record<keyof PdNotifs, string>> = Object.fromEntries(
    Object.entries(SPELL_TOKEN_TO_KEY).map(([tok, key]) => [key, tok])
);

// ── Multi-value tokens (Brendon 2026-06-19 — Setup Codes catch-up) ──────
// Only the NON-default value is encoded; absence restores the default on apply.
//   watchMetric: 0 (default) omitted; 1-3 → WMT1..3
//   pingToasts:  'off' (default) omitted; on/3d/combo → PTON/PT3D/PTCO
//   menutape:    0 (default) omitted; 3/4 → MNT3/MNT4
//   audience:    true (default) omitted; false → NAUD
const TOKEN_TO_WATCHMETRIC: Record<string, number> = { WMT1: 1, WMT2: 2, WMT3: 3 };
const PINGTOAST_TO_TOKEN: Record<PingToastMode, string> = { off: 'PTOF', on: 'PTON', '3d': 'PT3D', combo: 'PTCO' };
// Decode includes legacy tokens (PTMN/PTSO/PTAL, the old money/social/all cycle)
// → they all popped toasts, so they map onto the regular "on" state.
const TOKEN_TO_PINGTOAST: Record<string, PingToastMode> = {
    PTOF: 'off', PTON: 'on', PT3D: '3d', PTCO: 'combo',
    PTMN: 'on', PTSO: 'on', PTAL: 'on',
};
const TOKEN_TO_MENUTAPE: Record<string, MenuTapeMode> = { MNT3: 3, MNT4: 4 };

/** All flag keys that participate in the Setup Code envelope. */
export const SETUP_CODE_FLAG_KEYS: ReadonlyArray<keyof PdNotifs> = [
    ...Object.values(MODE_TOKEN_TO_KEY),
    ...Object.values(SPELL_TOKEN_TO_KEY),
];

/* ────────────────────────────────────────────────────────────── */
/*  ENCODE                                                         */
/* ────────────────────────────────────────────────────────────── */

/**
 * Build the Setup Code from current state. Pure function — no
 * side effects, safe to call inside a React render. Sim 9796-9829.
 */
export function encodeSetupCode(
    colorway: ColorwayKey,
    sort: SortKey,
    notifs: PdNotifs
): string {
    // Colorway — fall back to ARTS if the active colorway key is the null Dot
    // default or otherwise unmapped (sim 9807).
    const colorwayTok = (colorway && COLORWAY_TO_TOKEN[colorway]) || COLORWAY_TO_TOKEN.custom;

    // Sort — fall back to IDAS if currentSort isn't in the table (sim 9810).
    const sortTok = SORT_TO_TOKEN[sort] || SORT_TO_TOKEN.id;

    // Active modes + spells, alpha-sorted by token for deterministic
    // encoding (sim 9820).
    const activeTokens: string[] = [];
    for (const [tok, key] of Object.entries(MODE_TOKEN_TO_KEY)) {
        if (notifs[key]) activeTokens.push(tok);
    }
    for (const [tok, key] of Object.entries(SPELL_TOKEN_TO_KEY)) {
        if (notifs[key]) activeTokens.push(tok);
    }
    // Multi-value settings — only the non-default value is encoded.
    if (notifs.watchMetric >= 1 && notifs.watchMetric <= 3) activeTokens.push(`WMT${notifs.watchMetric}`);
    if (notifs.pingToasts && notifs.pingToasts !== 'off') activeTokens.push(PINGTOAST_TO_TOKEN[notifs.pingToasts]);
    if (notifs.menutape === 3 || notifs.menutape === 4) activeTokens.push(`MNT${notifs.menutape}`);
    if (!notifs.audience) activeTokens.push('NAUD');
    activeTokens.sort();

    // Tape — only included if non-zero (sim 9822-9824).
    const tape = notifs.tape;
    const tapeTok = (tape >= 1 && tape <= 4) ? TAPE_TO_TOKEN[tape as 1 | 2 | 3 | 4] : undefined;

    const parts = [colorwayTok, ...activeTokens, sortTok];
    if (tapeTok) parts.push(tapeTok);
    return '\u2030' + parts.join('-');
}

/* ────────────────────────────────────────────────────────────── */
/*  DECODE                                                         */
/* ────────────────────────────────────────────────────────────── */

/** Strip whitespace, brackets, and the AI-misrendered `%∞` form. */
function normalize(raw: string): string {
    let s = String(raw || '').trim().toUpperCase();
    if (s.startsWith('[')) s = s.slice(1);
    if (s.endsWith(']'))   s = s.slice(0, -1);
    // `%∞` (two characters) → `‰`. Both forms valid on input (sim 9837).
    s = s.replace(/%\u221E/g, '\u2030');
    return s;
}

/**
 * Decode a Setup Code string into a state object. Does NOT apply state —
 * caller decides via the workspace store / confirmation flow. Sim 9842-9892.
 */
export function decodeSetupCode(raw: string): DecodeResult {
    let s = normalize(raw);

    // Strip leading ‰ stamp (legacy used `‰-`, new uses bare `‰`).
    if (s.startsWith('\u2030-'))      s = s.slice(2);
    else if (s.startsWith('\u2030')) s = s.slice(1);
    else                              return { ok: false, error: 'Missing ‰ stamp' };

    const tokens = s.split('-').filter(Boolean);
    // Strip trailing Vx if present (legacy V1 + future-proof).
    if (tokens.length > 0 && /^V\d+$/i.test(tokens[tokens.length - 1])) {
        tokens.pop();
    }
    if (tokens.length < 1) return { ok: false, error: 'Code too short' };

    const state: DecodedState = {
        colorway: null,
        sort: null,
        tape: 0,
        flags: {},
    };
    const unknown: string[] = [];

    for (const t of tokens) {
        if (t in TOKEN_TO_COLORWAY) {
            state.colorway = TOKEN_TO_COLORWAY[t];
        } else if (t in TOKEN_TO_SORT) {
            state.sort = TOKEN_TO_SORT[t];
        } else if (t in TOKEN_TO_TAPE) {
            state.tape = TOKEN_TO_TAPE[t];
        } else if (t in MODE_TOKEN_TO_KEY) {
            state.flags[MODE_TOKEN_TO_KEY[t]] = true;
        } else if (t in SPELL_TOKEN_TO_KEY) {
            state.flags[SPELL_TOKEN_TO_KEY[t]] = true;
        } else if (t in TOKEN_TO_WATCHMETRIC) {
            state.watchMetric = TOKEN_TO_WATCHMETRIC[t];
        } else if (t in TOKEN_TO_PINGTOAST) {
            state.pingToasts = TOKEN_TO_PINGTOAST[t];
        } else if (t in TOKEN_TO_MENUTAPE) {
            state.menutape = TOKEN_TO_MENUTAPE[t];
        } else if (t === 'NAUD') {
            state.audience = false;
        } else {
            unknown.push(t);
        }
    }

    return { ok: true, state, unknown };
}

/* ────────────────────────────────────────────────────────────── */
/*  HELPERS                                                        */
/* ────────────────────────────────────────────────────────────── */

/**
 * Compute the pdNotifs patch object for `applySetupCodeState`. Resets
 * every Setup-Code-tracked flag to false, then sets the flags from the
 * decoded state. This drives sim 9900-9907's "reset before apply" rule:
 * switching from a code with {AURA, FOG} to a code with {HMMR} must NOT
 * leave AURA + FOG on. Tape resets to 0 too.
 */
export function notifsPatchFromDecodedState(state: DecodedState): Partial<PdNotifs> {
    const patch: Partial<PdNotifs> = { tape: state.tape };
    for (const key of SETUP_CODE_FLAG_KEYS) {
         
        (patch as any)[key] = !!state.flags[key];
    }
    // Multi-value settings reset to their DEFAULT when the code omits them.
    patch.watchMetric = state.watchMetric ?? 0;
    patch.pingToasts = state.pingToasts ?? 'off';
    patch.menutape = state.menutape ?? 0;
    patch.audience = state.audience ?? true;
    return patch;
}

// Re-exports for tests / debug usage from outside the workspaces module.
export const _internal = {
    COLORWAY_TO_TOKEN, TOKEN_TO_COLORWAY,
    SORT_TO_TOKEN, TOKEN_TO_SORT,
    TAPE_TO_TOKEN, TOKEN_TO_TAPE,
    MODE_TOKEN_TO_KEY, MODE_KEY_TO_TOKEN,
    SPELL_TOKEN_TO_KEY, SPELL_KEY_TO_TOKEN,
};
