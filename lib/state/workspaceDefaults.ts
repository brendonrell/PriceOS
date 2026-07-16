/*
 * workspaceDefaults — the SHIPPED workspace set + the SPACES preset
 * library (pure data, no React).
 *
 * Six dots out of the box (2026-07-16 wow pass — Brendon: "4 awesome
 * defaults", joining Main + Zen; Degen's retirement note always promised
 * replacements):
 *
 *   1   · Main        — ‰CSTM-IDAS                                   (clean)
 *   2   · Zen         — ‰BLUE-NASC-NSTK-ZNMD-IDAS                    (zen, blue)
 *   101 · Observatory — ‰DARK-AURA-CLST-TROT-FOG-TAPF                (the mystic)
 *   102 · The Floor   — ‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS-TAPB     (the trader)
 *   103 · Museum      — ‰LITE-ASCR-NASC-NAUD-NSTK-IDAS               (the exhibition)
 *   104 · The Village — ‰ORNG-CRTL-FMLR-GSSP-NPCM-FDTD-TAPS          (the company)
 *
 * The four personas, and why each token is there:
 *   OBSERVATORY — the dark room where the skies read themselves: Celestial
 *     Tracker (birth moons + fates), Tarot Spread, Aura glow on every card,
 *     a faded tape, sorted by Fog. Dark colorway.
 *   THE FLOOR — the trading desk: Price Lens on every card, Sentiment on,
 *     Offer Shield up, The Watch chip ticking platform vitals, money pings
 *     popping as toasts, the tape in BOLD, sorted by price. Red colorway.
 *   MUSEUM — the exhibition that walks itself: light colorway, chrome
 *     stripped (no stickers, no ASCII-ID), presence broadcasting off, tape
 *     silent, and Auto-Scroll strolling the gallery for you.
 *   THE VILLAGE — the inhabited one: the NPC cast on the walls, a Familiar
 *     on screen, the Gossip Protocol telling the feed as rumors, Cartel
 *     counts on projects, the standard tape chattering, feed sort. Orange.
 *
 * ⛔ TOP-BAR RULE (Brendon, 2026-07-16): no shipped default may carry a
 * token that adds/removes anything in the top bar — switching dots must
 * never make the navbar jump. Banned from the DEFAULT codes forever: TBCL
 * (top-bar calendar), HMMR (Hammer pill), PLGO (logo swap), ANON. The
 * TAPE is explicitly FINE ("it's low enough" — Brendon, same day), and
 * colorway repaints are fine (Zen has shipped blue since 2026-06-12).
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
export const DEFAULTS_SEED_VERSION = 2;
export const DEFAULTS_SEED_KEY = 'pd_ws_defaults_seeded';

/** Which seed version each shipped id arrived in. Version 1 = the original
 *  Main/Zen baseline every existing user already has (or deliberately
 *  deleted — those deletions must stick, so v1 ids are NEVER re-injected).
 *  Only ids newer than the user's stamp get appended by the seed pass. */
export const WORKSPACE_SEED_VERSION: Record<number, number> = {
    1: 1, 2: 1,
    101: 2, 102: 2, 103: 2, 104: 2,
};

export const SHIPPED_WORKSPACES: ReadonlyArray<Workspace> = [
    // Sim 10120-10127 — codes are post-v1.0.45 short form.
    { id: 1, name: 'Main', code: '‰CSTM-IDAS', isDefault: true },
    // Zen carries the blue colorway (Brendon 2026-06-12 — "pick a colour";
    // blue is the calm pick). Pre-blue Zen migrates via OLD_DEFAULT_CODES.
    { id: 2, name: 'Zen', code: '‰BLUE-NASC-NSTK-ZNMD-IDAS', isDefault: true },
    // The 2026-07-16 four. High fixed ids so they can never collide with
    // user-created workspaces (which count up from max+1 and started at 3).
    { id: 101, name: 'Observatory', code: '‰DARK-AURA-CLST-TROT-FOG-TAPF', isDefault: true },
    { id: 102, name: 'The Floor', code: '‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS-TAPB', isDefault: true },
    { id: 103, name: 'Museum', code: '‰LITE-ASCR-NASC-NAUD-NSTK-IDAS', isDefault: true },
    { id: 104, name: 'The Village', code: '‰ORNG-CRTL-FMLR-GSSP-NPCM-FDTD-TAPS', isDefault: true },
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
        code: '‰DARK-ANON-NAUD-PGHO-IDAS',
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

/* Load flourish — the four personas announce themselves in the cast-toast
   voice (Gossip/Celestial precedent: glyph-framed, the NAME is the ALLCAPS
   changed-thing). Only spoken while the default still wears its shipped
   code — a re-saved (customised) default goes back to the plain toast.
   Glyphs from the fixed vocabulary: ☽ celestial · ✹ listed/market ·
   ⑆ showcase · ⚭ social. Main and Zen keep their plain toasts. */
export const DEFAULT_LOAD_TOASTS: Record<number, string> = {
    101: '☽︎ Workspace: OBSERVATORY ☽︎',
    102: '✹︎ Workspace: THE FLOOR ✹︎',
    103: '⑆︎ Workspace: MUSEUM ⑆︎',
    104: '⚭︎ Workspace: THE VILLAGE ⚭︎',
};
