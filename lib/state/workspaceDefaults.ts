/*
 * workspaceDefaults — the SHIPPED workspace set + the SPACES preset
 * library (pure data, no React).
 *
 * Seven dots out of the box (2026-07-16 wow pass — Brendon: "4 awesome
 * defaults", joining Main; same day he pinned their register: WORK
 * personas — job setups, not moods. The mood sets moved to SPACES below.
 * 2026-07-19: the social pair Socialite + Insider joined by his call).
 * Zen retired 2026-07-18 (Brendon: "remove the Zen one") — existing users'
 * uncustomised Zen is pruned on load via RETIRED_DEFAULT_CODES.
 * Appraiser renamed ORACLE 2026-07-19 (Brendon), and he pinned the persona
 * order: Curator > Scout > Trader > Oracle (Main first, always):
 *
 *   1   · Main      — ‰CSTM-IDAS                                   (clean)
 *   103 · Curator   — ‰LITE-NASC-NSTK-IDAS                    (collection work)
 *   104 · Scout     — ‰HAZE-PTON-WTCH-FDTD-TAPS                    (discovery work)
 *   102 · Trader    — ‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS-TAPB     (market work)
 *   101 · Oracle    — ‰DARK-CLST-LENS-SNTM-IDAS-TAPF               (valuation work)
 *   105 · Socialite — ‰ORNG-AMBS-ECHO-FMLR-NPCM-FDTD-TAPS          (social, fun with friends)
 *   106 · Insider   — ‰DARK-GSSP-LENS-PTON-SNTM-WTCH-FDTD-TAPB     (social, alpha/gossip)
 *   107 · Degen     — ‰DARK-DGEN-ECHO-LENS-SNTM-FDTD-TAPB          (numbers over art)
 *   108 · DJ        — ‰BLUE-AMBS-ASCR-FDTD-TAPF                    (the booth — rides the pd miniplayer)
 *
 * The four work personas, and why each token is there:
 *   ORACLE — the piece-study desk: Price Lens on every card, Sentiment
 *     on, the Celestial Tracker surfacing the full birth-data layer the
 *     character sheet appraises by, faded tape, edition order. Dark.
 *   TRADER — the execution desk: Price Lens, Sentiment, Offer Shield up,
 *     The Watch ticking platform vitals, money pings popping as toasts,
 *     the tape in BOLD, sorted by price. Red.
 *   SOCIALITE (105, 2026-07-19) — the good-times room: warm orange, ambient
 *     glow, your creature beside you, the cast chattering, the feed narrowed
 *     to your mutuals (Echo) — fun with friends, prices second.
 *   INSIDER (106, 2026-07-19) — the alpha desk: dark, the feed told as
 *     gossip, Price Lens + Sentiment reading the room, The Watch on vitals,
 *     pings popping the moment anything moves, bold tape. First to hear.
 *   CURATOR — the arranging room: light, chrome stripped (no stickers, no
 *     ASCII-ID), presence broadcasting off, tape silent — nothing between
 *     the eye and the work.
 *   SCOUT — the discovery post: feed sort, the standard tape chattering,
 *     The Watch on vitals, ping toasts flagging moves as they land. Haze.
 *
 * ⛔ TOP-BAR RULE (Brendon, 2026-07-16): no shipped default may carry a
 * token that adds/removes anything in the top bar — switching dots must
 * never make the navbar jump. Banned from the DEFAULT codes forever: TBCL
 * (top-bar calendar), HMMR (Hammer pill), PLGO (logo swap), ANON. The
 * TAPE is explicitly FINE ("it's low enough" — Brendon, same day), and
 * colorway repaints are fine (the personas ship DARK/REDD/LITE/HAZE).
 * SPACES presets (below) have NO restrictions at all — also his call.
 *
 * ⛔ INERT-FLAG RULE: never put a token in a shipped code or a Space that
 * nothing listens to (spell_moodring / astral / portal / cme are roundtrip-
 * parity flags with no live surface — a preset carrying them would lie).
 * Guarded by tests/workspace-defaults.test.ts.
 *
 * When changing a default's shipped code, move the OLD code into
 * OLD_DEFAULT_CODES (WorkspacesContext) so existing users migrate.
 * DEFAULTS_SEED_VERSION lets NEW shipped defaults reach EXISTING users:
 * bump it when adding a default and hydrate appends the missing ids once
 * (deleting one afterwards sticks — the seed only runs per version).
 */

import type { Workspace } from './WorkspacesContext';

/** Bump when the shipped set gains a NEW workspace id. */
export const DEFAULTS_SEED_VERSION = 4;
export const DEFAULTS_SEED_KEY = 'pd_ws_defaults_seeded';

/** Which seed version each shipped id arrived in. Version 1 = the original
 *  Main/Zen baseline every existing user already has (or deliberately
 *  deleted — those deletions must stick, so v1 ids are NEVER re-injected).
 *  Only ids newer than the user's stamp get appended by the seed pass. */
export const WORKSPACE_SEED_VERSION: Record<number, number> = {
    1: 1,
    101: 2, 102: 2, 103: 2, 104: 2,
    105: 3, 106: 3,
    107: 4, 108: 4,
};

export const SHIPPED_WORKSPACES: ReadonlyArray<Workspace> = [
    // Sim 10120-10127 — codes are post-v1.0.45 short form.
    { id: 1, name: 'Main', code: '‰CSTM-IDAS', isDefault: true },
    // The 2026-07-16 four, in Brendon's 2026-07-19 order (Curator > Scout >
    // Trader > Oracle). High fixed ids so they can never collide with
    // user-created workspaces (which count up from max+1 and started at 3).
    { id: 103, name: 'Curator', code: '‰LITE-NASC-NSTK-IDAS', isDefault: true },
    { id: 104, name: 'Scout', code: '‰HAZE-PTON-WTCH-FDTD-TAPS', isDefault: true },
    { id: 102, name: 'Trader', code: '‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS-TAPB', isDefault: true },
    { id: 101, name: 'Oracle', code: '‰DARK-CLST-LENS-SNTM-IDAS-TAPF', isDefault: true },
    // The 2026-07-19 social pair (Brendon: "add both socialite and insider" —
    // Insider is the alpha/gossip persona, Socialite the positive one, fun
    // with friends).
    { id: 105, name: 'Socialite', code: '‰ORNG-AMBS-ECHO-FMLR-NPCM-FDTD-TAPS', isDefault: true },
    { id: 106, name: 'Insider', code: '‰DARK-GSSP-LENS-PTON-SNTM-WTCH-FDTD-TAPB', isDefault: true },
    // Degen + DJ (Brendon 2026-07-20: "I also wanted degen and dj still").
    // Degen = the Space's classic minus HMMR (the top-bar rule bans Hammer
    // from shipped defaults; the Space keeps its Hammer variant). DJ rides
    // the pd miniplayer — light rig on, the room scrolls itself like a set.
    { id: 107, name: 'Degen', code: '‰DARK-DGEN-ECHO-LENS-SNTM-FDTD-TAPB', isDefault: true },
    { id: 108, name: 'DJ', code: '‰BLUE-AMBS-ASCR-FDTD-TAPF', isDefault: true },
];

/* ── SPACES — the preset library in the Name-Your-Workspace modal ────────
   (Brendon, 2026-07-16: "you can have a LOT of fun making presets — no
   restrictions on anything.") These are NOT installed dots; picking one in
   the create-workspace sheet mints a new dot wearing the preset's code and
   name. Top-bar toys allowed here — a Space is an explicit user choice,
   not a shipped surprise. Every code must decode clean, be canonical
   (encoder ordering) and carry only LIVE tokens (test-guarded). */

export interface SpacePreset {
    key: string;
    name: string;
    code: string;
    /** One-line pitch, shown nowhere yet — kept as the preset's record. */
    blurb: string;
}

export const SPACES: ReadonlyArray<SpacePreset> = [
    /* The mood sets — first drafted as shipped defaults, moved here the
       same day when Brendon pinned the defaults' register to WORK personas.
       This is where moods belong. */
    {
        key: 'observatory', name: 'Observatory',
        code: '‰DARK-AURA-CLST-TROT-FOG-TAPF',
        blurb: 'The dark room where the skies read themselves — auras, birth moons, tarot, Fog order.',
    },
    {
        key: 'museum', name: 'Museum',
        code: '‰LITE-ASCR-NASC-NSTK-IDAS',
        blurb: 'The exhibition that walks itself — light, chrome stripped, Auto-Scroll strolling.',
    },
    {
        key: 'village', name: 'The Village',
        code: '‰ORNG-CRTL-FMLR-GSSP-NPCM-FDTD-TAPS',
        blurb: 'The inhabited one — the cast on the walls, your creature out, the feed told as gossip.',
    },
    {
        key: 'stargazer', name: 'Stargazer',
        code: '‰DARK-CLST-STAR-FOG',
        blurb: 'The whole room goes night sky — stars, birth moons, fates, Fog order.',
    },
    {
        key: 'mission-control', name: 'Mission Control',
        code: '‰DARK-BACK-LENS-SNTM-TBCL-WTCH-PRAS-TAPB',
        blurb: 'Every instrument on: top-bar calendar, The Watch, Price Lens, Sentiment, bold tape, back button.',
    },
    {
        key: 'night-shift', name: 'Night Shift',
        code: '‰DARK-NITE-PGHO-FDTD-TAPF',
        blurb: 'Lights low, pings silenced, prices ghosted, the tape a whisper.',
    },
    {
        key: 'classified', name: 'Classified',
        code: '‰DARK-ANON-RDCT-IDAS',
        blurb: 'Names blacked out, identity masked. You were never here.',
    },
    {
        key: 'ghost', name: 'Ghost',
        code: '‰DARK-ANON-PGHO-IDAS',
        blurb: 'No presence, no prices, no name. Browse as a rumor.',
    },
    {
        key: 'degen', name: 'Degen',
        code: '‰DARK-DGEN-ECHO-HMMR-LENS-SNTM-FDTD-TAPB',
        blurb: 'The retired classic, alive in the library — numbers over art, hammer out.',
    },
    {
        key: 'war-room', name: 'War Room',
        code: '‰REDD-ECHO-HMMR-SHLD-PRAS-TAPB',
        blurb: 'Mutuals only, shield up, hammer on the desk, bold tape, price order.',
    },
    {
        key: 'hearth', name: 'Hearth',
        code: '‰ORNG-AMBS-FMLR-NITE-FDTD-TAPF',
        blurb: 'Warm room, ambient glow, your creature beside you, quiet nights.',
    },
    {
        key: 'maximum-pd', name: 'Maximum PD',
        code: '‰HASH-AMBS-CLST-CRTL-FMLR-GSSP-LENS-NPCM-SNTM-TROT-WTCH-FDTD-TAPX',
        blurb: 'Everything on at once. The full circus, framed tape and all.',
    },
];

/* Load flourish — the four work personas clock in with a cast-toast line
   (Gossip/Celestial precedent: glyph-framed, the NAME is the ALLCAPS
   changed-thing). Only spoken while the default still wears its shipped
   code — a re-saved (customised) default goes back to the plain toast.
   Glyphs from the fixed vocabulary, each the persona's trade mark:
   ❖ rarity (appraisal) · ✹ listed (the market) · ⑆ showcase (curation) ·
   ✧ new upload (scouting). Main keeps its plain toast. */
export const DEFAULT_LOAD_TOASTS: Record<number, string> = {
    101: '❖︎ Workspace: ORACLE ❖︎',
    102: '✹︎ Workspace: TRADER ✹︎',
    103: '⑆︎ Workspace: CURATOR ⑆︎',
    104: '✧︎ Workspace: SCOUT ✧︎',
    /* The social pair — ⚭ mutuals (the marriage glyph, the Socialite's
       trade mark) · ⑃ gossip (the Insider trades in rumor). */
    105: '⚭︎ Workspace: SOCIALITE ⚭︎',
    106: '⑃︎ Workspace: INSIDER ⑃︎',
    /* ⚔ is the Degen mode's own mark; ▶ the catalogued soundtrack mark. */
    107: '⚔︎ Workspace: DEGEN ⚔︎',
    108: '▶︎ Workspace: DJ ▶︎',
};
