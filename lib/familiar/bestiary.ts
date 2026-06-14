/*
 * familiar/bestiary — the Familiar collection model (the "Price-a-gotchi"
 * bestiary the modal renders).
 *
 * Four tiers, videogame-collection style. Only BitDaemons are live today:
 * the 5 species the engine actually picks from (familiarEngine SPECIES),
 * one of which is the wallet's current companion. The three rarer tiers are
 * shown LOCKED with their unlock condition + a hidden-entry count — honest
 * placeholders, same pattern as the PriceSprite modal's locked surfaces.
 *
 * Glyphs here mirror the engine's idle frames so a revealed BitDaemon tile
 * shows the real creature. The rarer tiers ship glyph-less (rendered as
 * locked '?' tiles) until their normalized rosters land in the engine.
 *
 * Tier identities (design — ClickUp NPC-Cast task, 2026-06-14):
 *   BitDaemons — common, the everyday companion everyone gets.
 *   Titans     — rare, earned through achievements (the flex).
 *   Ascended   — rare, grown through bond/time with your familiar.
 *   Old Gods   — mythic, earned through long holding tenure.
 */

export interface BestiaryEntry {
    /** Species name as the engine knows it (used to flag the current one). */
    name: string;
    /** Representative idle glyph — mirrors familiarEngine SPECIES idle[1]. */
    glyph: string;
}

export interface BestiaryTier {
    id: 'bitdaemons' | 'titans' | 'ascended' | 'oldgods';
    label: string;
    rarity: string;
    /** One-line unlock condition, shown under a locked tier. */
    unlock: string;
    /** Locked tiers render as mystery tiles + the unlock note. */
    locked: boolean;
    /** Revealed creatures (BitDaemons). Empty for locked tiers. */
    entries: BestiaryEntry[];
    /** Hidden-entry count teased under a locked tier ("? / N"). */
    hidden: number;
}

/* The five live BitDaemons — names + idle glyphs mirror familiarEngine. */
export const BITDAEMONS: readonly BestiaryEntry[] = [
    { name: 'Wisp',    glyph: '( ☼ )' },   // ( ☼ )
    { name: 'Watcher', glyph: '[ ◎ ]' },   // [ ◎ ]
    { name: 'Slime',   glyph: '(~O~)' },
    { name: 'Spider',  glyph: '/|o.o|\\' },
    { name: 'Orbit',   glyph: '(·◯)' }, // (·◯)
];

export const TIERS: readonly BestiaryTier[] = [
    {
        id: 'bitdaemons',
        label: 'BitDaemons',
        rarity: 'COMMON',
        unlock: 'The everyday familiars. One picks you.',
        locked: false,
        entries: [...BITDAEMONS],
        hidden: 0,
    },
    {
        id: 'titans',
        label: 'Titans',
        rarity: 'RARE',
        unlock: 'Earned through achievements.',
        locked: true,
        entries: [],
        hidden: 6,
    },
    {
        id: 'ascended',
        label: 'Ascended',
        rarity: 'RARE',
        unlock: 'Grown through time spent with your familiar.',
        locked: true,
        entries: [],
        hidden: 6,
    },
    {
        id: 'oldgods',
        label: 'Old Gods',
        rarity: 'MYTHIC',
        unlock: 'Awakened by holding through long tenure.',
        locked: true,
        entries: [],
        hidden: 6,
    },
];
