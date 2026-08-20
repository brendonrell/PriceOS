/*
 * Spell Book — 21 entries.
 *
 * Each spell has a pill in the Spell Book section of Settings. Tapping
 * a pill toggles its corresponding pdNotifs.spell_<name> flag. None of
 * the entries below carry a body class — Stargazing (which does drive
 * body.stargazing-mode) is NOT a spell; it lives in SpellBookSection as a
 * hardcoded pill (sb-stargazing, sim 4735) between Solar Flare and Offer
 * Shield. It toggles the plain `stargazing` pdNotifs key (sim 6782).
 *
 * Order matches the sim left-to-right, top-to-bottom. The Hammer is
 * always last per Brendon's convention.
 *
 * Icons all carry the VS-15 selector (\uFE0E) so iOS / Android render
 * them as text glyphs rather than colored emoji.
 */

import type { PdNotifs } from '../state/PdNotifsContext';

// Keys into PdNotifs that store spell on/off state.
type SpellFlag = Extract<keyof PdNotifs, `spell_${string}`>;

export interface SpellEntry {
    /** DOM id slug — matches sim's `sb-<id>` ids. */
    id: string;
    /** pdNotifs flag this spell maps to. */
    flag: SpellFlag;
    /** Display name in the pill. */
    name: string;
    /** Glyph (with VS-15). Omitted for icon-less pills (e.g. NPC). */
    icon?: string;
    /** Optional inline style overrides for the icon span. */
    iconStyle?: { fontSize?: string; lineHeight?: string; top?: string };
    /** Use the .sharp-glyph class on the icon for crisp dingbat rendering. */
    sharp?: boolean;
}

export const SPELLS: SpellEntry[] = [
    { id: 'familiar',    flag: 'spell_familiar',    name: 'Digital Familiar',  icon: '⚝\uFE0E' },
    { id: 'cartel',      flag: 'spell_cartel',      name: 'Cartel',            icon: '⟁\uFE0E' },
    { id: 'panopticon',  flag: 'spell_panopticon',  name: 'Panopticon',        icon: '⎌\uFE0E' },
    { id: 'spitebook',   flag: 'spell_spitebook',   name: 'Spite Book',        icon: '⌧\uFE0E' },
    { id: 'celestial',   flag: 'spell_celestial',   name: 'Celestial Tracker', icon: '♃\uFE0E', iconStyle: { fontSize: '14px', lineHeight: '1' } },
    { id: 'tribunal',    flag: 'spell_tribunal',    name: 'Tribunal',          icon: '⚻\uFE0E', sharp: true },
    { id: 'gravitydrop', flag: 'spell_gravitydrop', name: '????' }, // icon-less ???? mystery button — no glyph, only fires its toast (Brendon, 2026-07-16)
    { id: 'invisible',   flag: 'spell_invisible',   name: 'Deactivate',         icon: '⊖\uFE0E' },
    /* NPC — icon-less by design (Brendon, 2026-06-20): no glyph, just the
       label. Our "icon-less" pill. */
    { id: 'npc',         flag: 'spell_npc',         name: 'NPC' },
    { id: 'tarot',       flag: 'spell_tarot',       name: 'Tarot Spread',      icon: '▯▯▯\uFE0E', iconStyle: { top: '-2px' } },
    { id: 'priceghost',  flag: 'spell_priceghost',  name: 'Price Ghost',       icon: 'ᗝ\uFE0E', iconStyle: { top: '-1px' } },
    /* Solar Flare (id 'cme') retired 2026-06-14 — its inactive Spell Book slot
       was reassigned to The Watch (a hardcoded pill in SpellBookSection, like
       Stargazing / Echo). The `spell_cme` pdNotifs flag is intentionally KEPT
       for Setup Code roundtrip parity; only the pill is gone. */
    { id: 'offershield', flag: 'spell_offershield', name: 'Offer Shield',      icon: '⍲\uFE0E' },
    { id: 'sybilnet',    flag: 'spell_sybilnet',    name: 'Sybil Net',         icon: '∾\uFE0E' },
    { id: 'gossip',      flag: 'spell_gossip',      name: 'Gossip Protocol',   icon: '⑃\uFE0E' },
    { id: 'aura',        flag: 'spell_aura',        name: 'Aura',              icon: '⦿\uFE0E' },
    { id: 'arbitrage',   flag: 'spell_arbitrage',   name: 'Arbitrage Map',     icon: '⇄\uFE0E' },
    { id: 'hammer',      flag: 'spell_hammer',      name: 'The Hammer',        icon: '⟙\uFE0E', sharp: true, iconStyle: { fontSize: '14px', top: '1px' } },
];
