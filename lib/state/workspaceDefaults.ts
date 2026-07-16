/*
 * workspaceDefaults — the SHIPPED workspace set (pure data, no React).
 *
 * Six dots out of the box (2026-07-16 wow pass — Brendon: "4 awesome
 * defaults", joining Main + Zen; Degen's retirement note always promised
 * replacements):
 *
 *   1   · Main        — ‰CSTM-IDAS                                   (clean)
 *   2   · Zen         — ‰BLUE-NASC-NSTK-ZNMD-IDAS                    (zen, blue)
 *   101 · Observatory — ‰DARK-CLST-MOOD-TROT-FOG                     (the mystic)
 *   102 · The Floor   — ‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS          (the trader)
 *   103 · Museum      — ‰LITE-ASCR-NASC-NAUD-NSTK-IDAS               (the exhibition)
 *   104 · The Village — ‰ORNG-CRTL-FMLR-GSSP-NPCM-FDTD               (the company)
 *
 * The four personas, and why each token is there:
 *   OBSERVATORY — the dark room where the skies read themselves: Celestial
 *     Tracker (birth moons + fates), Tarot Spread, the Mood Ring, sorted by
 *     Fog. Dark colorway.
 *   THE FLOOR — the trading desk: Price Lens on every card, Sentiment on,
 *     Offer Shield up, The Watch chip ticking platform vitals, money pings
 *     popping as toasts, sorted by price. Red colorway.
 *   MUSEUM — the exhibition that walks itself: light colorway, chrome
 *     stripped (no stickers, no ASCII-ID), presence broadcasting off, and
 *     Auto-Scroll strolling the gallery for you.
 *   THE VILLAGE — the inhabited one: the NPC cast on the walls, a Familiar
 *     on screen, the Gossip Protocol telling the feed as rumors, Cartel
 *     counts on projects, feed sort. Orange colorway.
 *
 * ⛔ TOP-BAR RULE (Brendon, 2026-07-16): no shipped default may carry a
 * token that adds/removes anything in the top bar — switching dots must
 * never make the navbar jump. Banned from these codes forever: TBCL
 * (top-bar calendar), HMMR (Hammer pill), PLGO (logo swap), ANON, and any
 * TAP* tape token (the navbar ticker). Colorway repaints are fine (Zen has
 * shipped blue since 2026-06-12).
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
    { id: 101, name: 'Observatory', code: '‰DARK-CLST-MOOD-TROT-FOG', isDefault: true },
    { id: 102, name: 'The Floor', code: '‰REDD-LENS-PTON-SHLD-SNTM-WTCH-PRAS', isDefault: true },
    { id: 103, name: 'Museum', code: '‰LITE-ASCR-NASC-NAUD-NSTK-IDAS', isDefault: true },
    { id: 104, name: 'The Village', code: '‰ORNG-CRTL-FMLR-GSSP-NPCM-FDTD', isDefault: true },
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
