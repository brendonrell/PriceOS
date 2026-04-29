/*
 * Spell Book — 21 entries.
 *
 * Each spell has a pill in the Spell Book section of Settings. Tapping
 * a pill toggles its corresponding pdNotifs.spell_<name> flag (or, for
 * Stargazing, the body.stargazing-mode class via pdNotifs.spell_stargazing).
 *
 * Order matters — matches the sim left-to-right, top-to-bottom. The
 * Hammer is always last per Brendon's convention.
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
    /** Glyph (with VS-15). */
    icon: string;
    /** Optional inline style overrides for the icon span. */
    iconStyle?: { fontSize?: string; lineHeight?: string; top?: string };
    /** Use the .sharp-glyph class on the icon for crisp dingbat rendering. */
    sharp?: boolean;
}

export const SPELLS: SpellEntry[] = [
    { id: 'familiar',    flag: 'spell_familiar',    name: 'Digital Familiar',  icon: '⚝\uFE0E' },
    { id: 'cartel',      flag: 'spell_cartel',      name: 'Cartel',            icon: '⟁\uFE0E' },
    { id: 'spitebook',   flag: 'spell_spitebook',   name: 'Spite Book',        icon: '⌧\uFE0E' },
    { id: 'gravitydrop', flag: 'spell_gravitydrop', name: 'Gravity',           icon: '↡\uFE0E' },
    { id: 'celestial',   flag: 'spell_celestial',   name: 'Celestial Tracker', icon: '♃\uFE0E', iconStyle: { fontSize: '14px', lineHeight: '1' } },
    { id: 'tribunal',    flag: 'spell_tribunal',    name: 'Tribunal',          icon: '⚖\uFE0E', sharp: true },
    { id: 'panopticon',  flag: 'spell_panopticon',  name: 'Panopticon',        icon: '⎌\uFE0E' },
    { id: 'invisible',   flag: 'spell_invisible',   name: 'Invisible',         icon: '⊖\uFE0E' },
    { id: 'tarot',       flag: 'spell_tarot',       name: 'Tarot Spread',      icon: '♤\uFE0E' },
    { id: 'priceghost',  flag: 'spell_priceghost',  name: 'Price Ghost',       icon: '⦾\uFE0E' },
    { id: 'portal',      flag: 'spell_portal',      name: 'Portal',            icon: 'ᗝ\uFE0E' },
    { id: 'cme',         flag: 'spell_cme',         name: 'Solar Flare',       icon: '⛆\uFE0E' },
    { id: 'stargazing',  flag: 'spell_stargazing',  name: 'Stargazing',        icon: '❇\uFE0E' },
    { id: 'offershield', flag: 'spell_offershield', name: 'Offer Shield',      icon: '⍲\uFE0E' },
    { id: 'sybilnet',    flag: 'spell_sybilnet',    name: 'Sybil Net',         icon: '∾\uFE0E' },
    { id: 'gossip',      flag: 'spell_gossip',      name: 'Gossip Protocol',   icon: '⑃\uFE0E' },
    { id: 'aura',        flag: 'spell_aura',        name: 'Aura',              icon: '⦿\uFE0E' },
    { id: 'arbitrage',   flag: 'spell_arbitrage',   name: 'Arbitrage Map',     icon: '⊞\uFE0E' },
    { id: 'moodring',    flag: 'spell_moodring',    name: 'Mood Ring',         icon: '⌬\uFE0E', iconStyle: { fontSize: '20px', top: '-1px' } },
    { id: 'pricelens',   flag: 'spell_pricelens',   name: 'Price Lens',        icon: '⌾\uFE0E' },
    { id: 'hammer',      flag: 'spell_hammer',      name: 'The Hammer',        icon: 'ᚦ\uFE0E', sharp: true },
];
