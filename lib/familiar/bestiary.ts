/*
 * familiar/bestiary — the Familiar collection model (the "Price-a-gotchi"
 * bestiary the modal renders).
 *
 * Four tiers, videogame-collection style. BitDaemons are the live, common
 * companions (the engine picks one as yours). Titans / Ascended / Old Gods
 * are the rarer tiers — their art + names are shown so you can SEE what's
 * earnable, each marked locked until the unlock rules wire in (those are
 * Brendon's to tune; 1k achievements give plenty of levers).
 *
 * `art` is a single static idle frame (multi-line via \n for the tall tiers),
 * rendered white-space:pre in the tile. Glyphs are restricted to a block /
 * box-drawing / circle set that renders as monochrome text on iOS, Windows and
 * Android (no tofu, no double-width). The multi-line tiers carry dithered ▓▒░
 * shading for depth + per-creature texture variance; eyes vary across the
 * roster (Ø is single-eyed). (Brendon 2026-06-23.)
 *
 * Tier identities (design — ClickUp NPC-Cast task, 2026-06-14):
 *   BitDaemons — common, compact, the everyday companion.
 *   Titans     — semi-rare, towering; earned through achievements (the flex).
 *   Ascended   — rare, ethereal; grown through bond/time with your familiar.
 *   Old Gods   — mythic, carved stone; earned through long holding tenure.
 */

export interface BestiaryEntry {
    /** Species name (matches familiarEngine for the live BitDaemons). */
    name: string;
    /** Static idle art — single line for BitDaemons, multi-line (\n) above. */
    art: string;
}

export interface BestiaryTier {
    id: 'bitdaemons' | 'titans' | 'ascended' | 'oldgods';
    label: string;
    rarity: string;
    /** One-line unlock condition (placeholder — tuned later). */
    unlock: string;
    /** Rare tiers render their art dimmed + LOCKED until unlocks wire in. */
    locked: boolean;
    entries: BestiaryEntry[];
}

/* ── BitDaemons (common, single-line) ─────────────────────────── */
const BITDAEMONS: BestiaryEntry[] = [
    { name: "Wisp", art: "( ☼ )" },
    { name: "Watcher", art: "[ ◎ ]" },
    { name: "Slime", art: "(~O~)" },
    { name: "Spider", art: "/|o.o|\\" },
    { name: "Orbit", art: "(◯·)" },
    { name: "Cursor", art: ">_" },
    { name: "Node", art: "─[⊕]─" },
    { name: "Matrix", art: "[◧ ◨]" },
    { name: "Glitch", art: "▒▓▒" },
    { name: "Phantom", art: "░▒░" },
    { name: "Pulse", art: "───●───" },
    { name: "Battery", art: "├■■□┤" },
    { name: "Shutter", art: "<[◉]>" },
    { name: "Sentry", art: "[■_■]" },
    { name: "Switch", art: "[─○─]" },
    { name: "Gear", art: "├◎┤" },
    { name: "Pip", art: "(•_•)" },
    { name: "Optic", art: "[◉_◉]" },
    { name: "Relay", art: "─[▪]─" },
    { name: "Sly", art: "(¬_¬)" },
    { name: "Owlet", art: "{○_○}" },
    { name: "Mouser", art: "=^•^=" },
    { name: "Cans", art: "d[◎]b" },
    { name: "Wave", art: "~[≡]~" },
    { name: "Tin", art: "|°_°|" },
    { name: "Bit", art: ">●<" },
    { name: "Echo", art: "((( · )))" },
    { name: "Beacon", art: "!◉!" },
    { name: "Magnet", art: "⊃·⊂" },
    { name: "Socket", art: "[o|o]" },
    { name: "Crumb", art: "(··)" },
    { name: "Static", art: "[≋]" },
    { name: "Sprout", art: ",ψ," },
    { name: "Bloop", art: "(°o°)" },
    { name: "Dial", art: "(◷)" },
    { name: "Fuse", art: "≈─●" },
    { name: "Radar", art: "[(·)]" },
    { name: "Domino", art: "[∷]" },
    { name: "Pixel", art: "▪" },
    { name: "Knot", art: "~⊗~" },
];

/* ── Titans (semi-rare, towering — multi-line, textured) ──────── */
const TITANS: BestiaryEntry[] = [
    { name: "Leviathan", art: " ▟▓▓▓▙\n▓▒◉◎▒▓\n▓▓▒▒▓▓\n ▜▓▓▛\n ▒▓▓▒\n▟▒  ▒▙" },
    { name: "Bastion", art: "╔═[■_■]═╗\n║ [■_■] ║\n╚═[■_■]═╝" },
    { name: "Obelisk", art: "┌─▲─┐\n│ ◎ │\n│ ▽ │\n└───┘" },
    { name: "Warden", art: "╔═══╗\n║■_■║\n║───║\n╚═══╝" },
    { name: "Spire", art: "  ▲\n  █\n (◉)\n  █\n ─┴─" },
    { name: "Sentinel", art: " ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n └─┘" },
    { name: "Core", art: "┌──────┐\n│◉ ── ◉│\n│◉ ── ◉│\n└──────┘" },
    { name: "Goliath", art: " ▟▓▓▓▙\n █▒●●▒█\n▟▓████▓▙\n ▒▓██▓▒\n ▜▓▓▓▛\n █   █" },
    { name: "Pylon", art: "  ╱╲\n ░▒▒░\n░▒◎◎▒░\n ▒▒▒▒\n ░▒▒░\n ─┴┴─" },
    { name: "Rampart", art: "▒▀▒ ▒▀▒\n▒▒▒▒▒▒▒\n▒░○○░▒\n▒▒▒▒▒▒▒\n▒▄▒ ▒▄▒" },
    { name: "Golem", art: " ▟▓▒▓▙\n▓▒◉◉▒▓\n▓▓▒▒▓▓\n ▜▓▓▛\n▟▒  ▒▙" },
    { name: "Atlas", art: "  ░▒░\n ░▒▒▒░\n ▒◎▒●▒\n ░▒▒▒░\n  ▒▒▒\n ▟░ ░▙" },
    { name: "Juggernaut", art: "▟█▓▓▓█▙\n█▓▒●◉▒▓█\n████████\n▜█▓▓▓█▛\n █▌ ▐█" },
    { name: "Citadel", art: "▒▀▀▀▒\n▒░░░▒\n▒○▒●▒\n▒░░░▒\n▒▄▄▄▒\n▒   ▒" },
    { name: "Vanguard", art: "  ▲\n ▟█▙\n░▓◎◎▓░\n ▒▓▓▒\n ▜▓▓▛\n ░ ░" },
    { name: "Behemoth", art: " ▟▓▙▟▓▙\n▓▒▒▒▒▒▓\n▓░◉▒○░▓\n ▜▓▓▓▛\n  ▒▒▒\n ▟▒ ▒▙" },
    { name: "Megalith", art: "▒▀▀▀▀▀▒\n▒░░░░░▒\n▒░◉◎●░▒\n▒░░░░░▒\n▒▒▒▒▒▒▒" },
    { name: "Bulwark", art: "▛▀▀▀▀▀▜\n▌░○░○░▐\n▌▒▒▒▒▒▐\n▙▄▄▄▄▄▟" },
    { name: "Dynamo", art: " ┌▓▓▓┐\n─┤◉▒◉├─\n └▓▓▓┘\n  ▀▀▀" },
    { name: "Turbine", art: "  ╲│╱\n ─(◎)─\n  ╱│╲\n ─┴┴─" },
    { name: "Gantry", art: "┌─┬─┬─┐\n│ │◉│ │\n┴ ┴─┴ ┴" },
    { name: "Keystone", art: "  ▟▓▙\n ▟▒◉▒▙\n▟░▒▒▒░▙\n▌     ▐" },
    { name: "Anvil", art: "▄▄▄▄▄▄▄\n ▜▓●▓▛\n  ▐▓▌\n▄▄▟▓▙▄▄" },
    { name: "Reactor", art: "╔═▓▓▓═╗\n║ ◉◉◉ ║\n║ ▒▒▒ ║\n╚═▓▓▓═╝" },
];

/* ── Ascended (rare, ethereal — multi-line) ───────────────────── */
const ASCENDED: BestiaryEntry[] = [
    { name: "Seraph", art: "╲╲ ◉ ╱╱\n ╲ ◎ ╱\n╱╱ ● ╲╲" },
    { name: "Eye", art: " ┌▲┐\n(◉◉)\n └▼┘" },
    { name: "Halo", art: "○ ○ ○\n( ◉ )" },
    { name: "Veil", art: " ░▒░\n▒ ◌ ▒\n ░▒░" },
    { name: "Sigil", art: "◇ ─ ◇\n  ┼\n◇ ─ ◇" },
    { name: "Wraith", art: "░▒▒▒░\n░▒◉▒░\n░▒▒▒░\n ░▒░\n  ░" },
    { name: "Oracle", art: " ╲ │ ╱\n─ (◉) ─\n ╱ │ ╲" },
    { name: "Prism", art: "  ▲\n ▟▓▙\n▟▓▒▓▙\n▜▓▒▓▛\n ▜▓▛\n  ▼" },
    { name: "Nimbus", art: " ░░░\n░▒▒▒░\n▒▒◎▒▒\n ▒▒▒\n  ▽" },
    { name: "Aurora", art: "░▒▓▒░\n ▒▓▒\n ░▒░\n ░ ░" },
    { name: "Lattice", art: "◇─◇─◇\n│ ◉ │\n◇─◇─◇" },
    { name: "Comet", art: "   ◉\n  ▓▒\n ▒░\n░" },
    { name: "Cherub", art: "(◉)(◎)\n ╲╲╱╱\n  ▽▽" },
    { name: "Pulsar", art: "  │\n ─◉─\n╱ │ ╲\n  ▽" },
    { name: "Zenith", art: "  ✦\n ╱│╲\n░ │ ░\n  ▽" },
    { name: "Mirage", art: "░ ◎ ░\n ░ ░\n≈≈≈≈≈" },
    { name: "Hymn", art: "♪ │ ♪\n ⟨◉⟩\n  ┴" },
    { name: "Iris", art: "╱▔▔╲\n( ◉ )\n╲▁▁╱" },
    { name: "Quasar", art: "· ✦ ·\n ─◉─\n· ✦ ·" },
    { name: "Mote", art: " ·\n(·)\n ·" },
];

/* ── Old Gods (mythic, carved stone — multi-line, translucent) ── */
const OLD_GODS: BestiaryEntry[] = [
    { name: "Forge", art: " ▒▓▓▓▒\n▒▓███▓▒\n ▀███▀\n  ███\n╔═════╗\n╚═════╝" },
    { name: "Ember", art: "   ▒\n  ▒▓▒\n ▒▓█▓▒\n▒▓███▓▒\n▒▓█●█▓▒\n ▜▓▓▓▛\n  ▀▀▀" },
    { name: "Gallows", art: "┌───────┐\n│ ╲     │\n│  ○    │\n│  │    │\n│  │    │\n┴───────┘" },
    { name: "Tide", art: "   ○\n~~~~~~~\n░░░░░░░\n▒▒▒▒▒▒▒\n▓▓▓▓▓▓▓\n███████" },
    { name: "Helm", art: " ▟▓▓▓▓▓▙\n ▓◎▓▓▓◎▓\n ▓▓▓▓▓▓▓\n ▓╳╳╳╳╳▓\n ▜▓▓▓▓▓▛\n   ▓▓▓" },
    { name: "Glacier", art: "▓▓▓▓▓▓▓\n░▓▓▓▓▓░\n░░▓▓▓░░\n▒░░▓░░▒\n▒▒░▽░▒▒\n░░░░░░░" },
    { name: "Colossus", art: " ▟▓▓▓▓▙\n █▒◉◉▒█\n▓▓▓▓▓▓▓▓\n █▐▓▓▌█\n▟▒ ▓▓ ▒▙" },
    { name: "Monolith", art: "▟▓▓▓▓▓▓▙\n▓▓▓▓▓▓▓▓\n▓▓▒◉▒▓▓▓\n▓▓▓▓▓▓▓▓\n▓▓▓▓▓▓▓▓" },
    { name: "Ziggurat", art: "   ▓▓\n  ▒▓▓▒\n ▓▒◎▒▓▓\n▒▓▓▓▓▓▓▒\n▓▒▒▒▒▒▒▓▓" },
    { name: "Idol", art: "  ▟▙\n ▟▓▓▙\n █◉◉█\n █▬▬█\n▟▒▓▓▒▙\n▓▓▒▒▓▓" },
    { name: "Pyre", art: "  ▲ ▲\n ▟▓▟▓▙\n▟▒▓▓▓▒▙\n▓▒▓●▓▒▓\n▜▒▓▓▓▒▛" },
    { name: "Ø", art: "  ▟▓▙\n ▓▓◉▓▓\n▓▓▓▓▓▓▓▓\n ▜▒▓▓▒▛\n  ▓  ▓\n ▟▛  ▜▙" },
    { name: "Kraken", art: " ┌◉◉┐\n┌┴──┴┐\n└┐┌┐┌┘\n └┘└┘" },
    { name: "Warlord", art: "╔══════╗\n║ ▼▼ ║\n║ ▀▀ ║\n╠══════╣\n║▐ ██ ▌║" },
    { name: "Maw", art: "▟▓▓▓▓▓▙\n▓▼▼▼▼▼▓\n▓     ▓\n▓▲▲▲▲▲▓\n▜▓▓▓▓▓▛" },
    { name: "Root", art: "  ░▒░\n ▒▓▓▓▒\n──▓●▓──\n ╱▓▓▓╲\n╱ ▓ ▓ ╲\n  ▓ ▓" },
];

/* TESTING (Brendon, 2026-06-22): every tier is unlocked so the whole roster is
   selectable right now. The unlock conditions below are the real gating copy —
   flip this to false to re-arm tier locking when the rank gates wire in. */
const ALL_UNLOCKED = true;

export const TIERS: readonly BestiaryTier[] = [
    {
        id: 'bitdaemons',
        label: 'BitDaemons',
        rarity: 'COMMON',
        unlock: 'The everyday familiars. One picks you.',
        locked: false,
        entries: BITDAEMONS,
    },
    {
        id: 'titans',
        label: 'Titans',
        rarity: 'SEMI-RARE',
        unlock: 'Earned through achievements.',
        locked: !ALL_UNLOCKED,
        entries: TITANS,
    },
    {
        id: 'ascended',
        label: 'Ascended',
        rarity: 'RARE',
        unlock: 'Grown through time spent with your familiar.',
        locked: !ALL_UNLOCKED,
        entries: ASCENDED,
    },
    {
        id: 'oldgods',
        label: 'Old Gods',
        rarity: 'MYTHIC',
        unlock: 'Awakened by holding through long tenure.',
        locked: !ALL_UNLOCKED,
        entries: OLD_GODS,
    },
];
