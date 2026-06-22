'use client';

/*
 * familiar/species — the animated roster for the Digital Familiar.
 *
 * Every familiar in the bestiary (lib/familiar/bestiary.ts) is alive here:
 * each has a four-state frame loop (idle / scroll / action / sleep) the
 * engine plays round-robin at 600ms. The static `art` in bestiary.ts is the
 * tile thumbnail; THIS file is the living companion.
 *
 * DESIGN RULE (Brendon, 2026-06-22): the designs do not change — these frames
 * only bring the existing art to LIFE. The five original BitDaemons (Wisp,
 * Watcher, Slime, Spider, Orbit) are copied byte-for-byte from the engine's
 * original SPECIES table — their animation already shipped, so it is left
 * exactly as-is. The other thirty get motion derived from their existing
 * static art: a blink, a pulse, a sway, a flicker — the silhouette is
 * preserved, only small interior glyphs move.
 *
 * `tier` keys each familiar to its bestiary tier so dialogue can adjust how
 * the creature treats the user as they climb the ranks.
 */

export type FamiliarTierId = 'bitdaemons' | 'titans' | 'ascended' | 'oldgods';

export interface AnimatedSpecies {
    name: string;
    tier: FamiliarTierId;
    idle: string[];
    scroll: string[];
    action: string[];
    sleep: string[];
}

/* ── BitDaemons (common, compact, single-line) ──────────────────────────── */

/* The first five are the ORIGINAL live species — copied verbatim from the
   engine's sim port (sim 12752-12756). Do not touch their frames. */
const BITDAEMONS: AnimatedSpecies[] = [
    { name: 'Wisp',    tier: 'bitdaemons', idle: ['( ¤ )', '( ☼ )', '( ¤ )'],            scroll: ['~¤~ ', ' -☼-', ' ~¤~'],          action: ['< ❂ >', '« ✺ »', '< ❂ >'],         sleep:  ['( . )', '( . )', '( . )'] },
    { name: 'Watcher', tier: 'bitdaemons', idle: ['[ ◉ ]', '[ ◎ ]', '[ ◉ ]'],            scroll: ['[ » ]', '[ » ]', '[ » ]'],        action: ['[ ⊛ ]', '[ ⊛ ]', '[ ⊛ ]'],         sleep:  ['[ - ]', '[ - ]', '[ - ]'] },
    { name: 'Slime',   tier: 'bitdaemons', idle: ['(~o~)', '(~O~)', '(~o~)'],            scroll: ['( o=)', '(= o)', '( o=)'],        action: ['(@o@)', '(@O@)', '(@o@)'],         sleep:  ['(--z)', '(--z)', '(--z)'] },
    { name: 'Spider',  tier: 'bitdaemons', idle: ['/|o.o|\\', '\\|o.o|/', '/|o.o|\\'],   scroll: ['/|>.>|\\', '\\|<.<|/', '/|>.>|\\'], action: ['/|✱.✱|\\', '\\|✱.✱|/', '/|✱.✱|\\'], sleep:  ['/|-.-|\\', '\\|-.-|/', '/|-.-|\\'] },
    { name: 'Orbit',   tier: 'bitdaemons', idle: ['(◯·)', '(·◯)', '(◯·)'],                scroll: ['(○»)', '(»○)', '(○»)'],           action: ['(◉‼)', '(‼◉)', '(◉‼)'],           sleep:  ['(◌-)', '(-◌)', '(◌-)'] },

    /* ── newly animated BitDaemons — art from bestiary, brought to life ── */
    { name: 'Cursor',  tier: 'bitdaemons', idle: ['>_', '> ', '>_'],                      scroll: ['>>_', '>> ', '>>_'],              action: ['>█', '>_', '>█'],                   sleep:  ['>z', '> ', '>z'] },
    { name: 'Node',    tier: 'bitdaemons', idle: ['─[⊕]─', '─[⊗]─', '─[⊕]─'],             scroll: ['─[⊕]»', '«[⊕]─', '─[⊕]»'],        action: ['═[⊕]═', '─[⊕]─', '═[⊕]═'],          sleep:  ['─[-]─', '─[_]─', '─[-]─'] },
    { name: 'Matrix',  tier: 'bitdaemons', idle: ['[◧ ◨]', '[◨ ◧]', '[◧ ◨]'],             scroll: ['[◧◨ ]', '[ ◧◨]', '[◧◨ ]'],        action: ['[▓ ▓]', '[◧ ◨]', '[▓ ▓]'],          sleep:  ['[- -]', '[_ _]', '[- -]'] },
    { name: 'Glitch',  tier: 'bitdaemons', idle: ['▒▓▒', '▓▒▓', '▒▓▒'],                   scroll: ['░▒░', '▒▓▒', '░▒░'],              action: ['█▓█', '▓█▓', '█▓█'],                sleep:  ['░░░', '   ', '░░░'] },
    { name: 'Phantom', tier: 'bitdaemons', idle: ['░▒░', '▒░▒', '░▒░'],                   scroll: [' ░▒', '▒░ ', ' ░▒'],              action: ['▒▓▒', '░▒░', '▒▓▒'],                sleep:  ['░ ░', ' . ', '░ ░'] },
    { name: 'Pulse',   tier: 'bitdaemons', idle: ['───●───', '──●●●──', '───●───'],       scroll: ['»──●───', '──»●───', '───●»──'],  action: ['━━━●━━━', '──◉◉◉──', '━━━●━━━'],     sleep:  ['───·───', '───────', '───·───'] },
    { name: 'Battery', tier: 'bitdaemons', idle: ['├■■□┤', '├■■■┤', '├■■□┤'],             scroll: ['├■□□┤', '├■■□┤', '├■□□┤'],        action: ['├■■■┤', '├▓▓▓┤', '├■■■┤'],          sleep:  ['├■□□┤', '├□□□┤', '├■□□┤'] },
    { name: 'Shutter', tier: 'bitdaemons', idle: ['<[◉]>', '<[◎]>', '<[◉]>'],             scroll: ['<[»]>', '<[◉]>', '<[»]>'],        action: ['<[⊛]>', '<[◉]>', '<[⊛]>'],          sleep:  ['<[-]>', '<[_]>', '<[-]>'] },
    { name: 'Sentry',  tier: 'bitdaemons', idle: ['[■_■]', '[▪_▪]', '[■_■]'],             scroll: ['[■»■]', '[■_■]', '[■»■]'],        action: ['[▣_▣]', '[■_■]', '[▣_▣]'],          sleep:  ['[-_-]', '[_,_]', '[-_-]'] },
    { name: 'Switch',  tier: 'bitdaemons', idle: ['[─○─]', '[─◌─]', '[─○─]'],             scroll: ['[─○»]', '[«○─]', '[─○»]'],        action: ['[─◉─]', '[─○─]', '[─◉─]'],          sleep:  ['[─-─]', '[─_─]', '[─-─]'] },
    { name: 'Gear',    tier: 'bitdaemons', idle: ['├◎┤', '├◍┤', '├◎┤'],                   scroll: ['├◎»', '«◎┤', '├◎»'],              action: ['├◉┤', '├◎┤', '├◉┤'],                sleep:  ['├-┤', '├_┤', '├-┤'] },
];

/* ── Titans (rare, towering — multi-line) ───────────────────────────────── */
const TITANS: AnimatedSpecies[] = [
    {
        name: 'Leviathan', tier: 'titans',
        idle:   ['[ ⫿⫿ ⎈ ⫿⫿ ]', '[ ⫿⫿ ⊙ ⫿⫿ ]', '[ ⫿⫿ ⎈ ⫿⫿ ]'],
        scroll: ['[ ⫿⫿ » ⫿⫿ ]', '[ ⫿⫿ ⎈ ⫿⫿ ]', '[ ⫿⫿ » ⫿⫿ ]'],
        action: ['[ ▓▓ ⎈ ▓▓ ]', '[ ⫿⫿ ◉ ⫿⫿ ]', '[ ▓▓ ⎈ ▓▓ ]'],
        sleep:  ['[ ⫿⫿ - ⫿⫿ ]', '[ ⫿⫿ _ ⫿⫿ ]', '[ ⫿⫿ - ⫿⫿ ]'],
    },
    {
        name: 'Bastion', tier: 'titans',
        idle:   ['╔═[■_■]═╗\n║ [■_■] ║\n╚═[■_■]═╝', '╔═[▪_▪]═╗\n║ [▪_▪] ║\n╚═[▪_▪]═╝', '╔═[■_■]═╗\n║ [■_■] ║\n╚═[■_■]═╝'],
        scroll: ['╔═[■»■]═╗\n║ [■»■] ║\n╚═[■»■]═╝', '╔═[■_■]═╗\n║ [■_■] ║\n╚═[■_■]═╝', '╔═[■»■]═╗\n║ [■»■] ║\n╚═[■»■]═╝'],
        action: ['╔═[▣_▣]═╗\n║ [▣_▣] ║\n╚═[▣_▣]═╝', '╔═[■_■]═╗\n║ [■_■] ║\n╚═[■_■]═╝', '╔═[▣_▣]═╗\n║ [▣_▣] ║\n╚═[▣_▣]═╝'],
        sleep:  ['╔═[-_-]═╗\n║ [-_-] ║\n╚═[-_-]═╝', '╔═[_,_]═╗\n║ [_,_] ║\n╚═[_,_]═╝', '╔═[-_-]═╗\n║ [-_-] ║\n╚═[-_-]═╝'],
    },
    {
        name: 'Obelisk', tier: 'titans',
        idle:   ['┌─∆─┐\n│ ◉ │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ ◎ │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ ◉ │\n│ ∇ │\n└───┘'],
        scroll: ['┌─∆─┐\n│ » │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ ◉ │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ » │\n│ ∇ │\n└───┘'],
        action: ['┌─▲─┐\n│ ◉ │\n│ ▼ │\n└───┘', '┌─∆─┐\n│ ◉ │\n│ ∇ │\n└───┘', '┌─▲─┐\n│ ◉ │\n│ ▼ │\n└───┘'],
        sleep:  ['┌─∆─┐\n│ - │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ _ │\n│ ∇ │\n└───┘', '┌─∆─┐\n│ - │\n│ ∇ │\n└───┘'],
    },
    {
        name: 'Warden', tier: 'titans',
        idle:   ['╔═══╗\n║■_■║\n║───║\n╚═══╝', '╔═══╗\n║▪_▪║\n║───║\n╚═══╝', '╔═══╗\n║■_■║\n║───║\n╚═══╝'],
        scroll: ['╔═══╗\n║■»■║\n║───║\n╚═══╝', '╔═══╗\n║■_■║\n║───║\n╚═══╝', '╔═══╗\n║■»■║\n║───║\n╚═══╝'],
        action: ['╔═══╗\n║▣_▣║\n║▓▓▓║\n╚═══╝', '╔═══╗\n║■_■║\n║───║\n╚═══╝', '╔═══╗\n║▣_▣║\n║▓▓▓║\n╚═══╝'],
        sleep:  ['╔═══╗\n║-_-║\n║───║\n╚═══╝', '╔═══╗\n║_,_║\n║───║\n╚═══╝', '╔═══╗\n║-_-║\n║───║\n╚═══╝'],
    },
    {
        name: 'Core', tier: 'titans',
        idle:   ['┌───┐\n┌┤ ⊗ ├┐\n└┤ ⊕ ├┘\n└───┘', '┌───┐\n┌┤ ⊕ ├┐\n└┤ ⊗ ├┘\n└───┘', '┌───┐\n┌┤ ⊗ ├┐\n└┤ ⊕ ├┘\n└───┘'],
        scroll: ['┌───┐\n┌┤ » ├┐\n└┤ ⊕ ├┘\n└───┘', '┌───┐\n┌┤ ⊗ ├┐\n└┤ ⊕ ├┘\n└───┘', '┌───┐\n┌┤ » ├┐\n└┤ ⊕ ├┘\n└───┘'],
        action: ['┌───┐\n┌┤ ◉ ├┐\n└┤ ◉ ├┘\n└───┘', '┌───┐\n┌┤ ⊗ ├┐\n└┤ ⊕ ├┘\n└───┘', '┌───┐\n┌┤ ◉ ├┐\n└┤ ◉ ├┘\n└───┘'],
        sleep:  ['┌───┐\n┌┤ - ├┐\n└┤ _ ├┘\n└───┘', '┌───┐\n┌┤ _ ├┐\n└┤ - ├┘\n└───┘', '┌───┐\n┌┤ - ├┐\n└┤ _ ├┘\n└───┘'],
    },
    {
        name: 'Spire', tier: 'titans',
        idle:   ['  │\n  │\n ⟨◉⟩\n  │\n ─┴─', '  │\n  │\n ⟨◎⟩\n  │\n ─┴─', '  │\n  │\n ⟨◉⟩\n  │\n ─┴─'],
        scroll: ['  │\n  │\n ⟨»⟩\n  │\n ─┴─', '  │\n  │\n ⟨◉⟩\n  │\n ─┴─', '  │\n  │\n ⟨»⟩\n  │\n ─┴─'],
        action: ['  ┃\n  ┃\n ⟨◉⟩\n  ┃\n ━┻━', '  │\n  │\n ⟨◉⟩\n  │\n ─┴─', '  ┃\n  ┃\n ⟨◉⟩\n  ┃\n ━┻━'],
        sleep:  ['  │\n  │\n ⟨-⟩\n  │\n ─┴─', '  │\n  │\n ⟨_⟩\n  │\n ─┴─', '  │\n  │\n ⟨-⟩\n  │\n ─┴─'],
    },
    {
        name: 'Sentinel', tier: 'titans',
        idle:   [' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ ◎ │\n│ ◎ │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n └─┘'],
        scroll: [' ┌─┐\n┌┤ ├┐\n│ » │\n│ » │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ » │\n│ » │\n└┤ ├┘\n └─┘'],
        action: [' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n ━┻━', ' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ ◉ │\n│ ◉ │\n└┤ ├┘\n ━┻━'],
        sleep:  [' ┌─┐\n┌┤ ├┐\n│ - │\n│ - │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ _ │\n│ _ │\n└┤ ├┘\n └─┘', ' ┌─┐\n┌┤ ├┐\n│ - │\n│ - │\n└┤ ├┘\n └─┘'],
    },
];

/* ── Ascended (rare, ethereal — multi-line) ─────────────────────────────── */
const ASCENDED: AnimatedSpecies[] = [
    {
        name: 'Seraph', tier: 'ascended',
        idle:   ['《《 ◎ 》》\n 《 ◎ 》\n《《 ◎ 》》', '《《 ◉ 》》\n 《 ◉ 》\n《《 ◉ 》》', '《《 ◎ 》》\n 《 ◎ 》\n《《 ◎ 》》'],
        scroll: ['《《 » 》》\n 《 » 》\n《《 » 》》', '《《 ◎ 》》\n 《 ◎ 》\n《《 ◎ 》》', '《《 » 》》\n 《 » 》\n《《 » 》》'],
        action: ['《《 ✦ 》》\n 《 ✦ 》\n《《 ✦ 》》', '《《 ◎ 》》\n 《 ◎ 》\n《《 ◎ 》》', '《《 ✦ 》》\n 《 ✦ 》\n《《 ✦ 》》'],
        sleep:  ['《《 - 》》\n 《 - 》\n《《 - 》》', '《《 _ 》》\n 《 _ 》\n《《 _ 》》', '《《 - 》》\n 《 - 》\n《《 - 》》'],
    },
    {
        name: 'Eye', tier: 'ascended',
        idle:   ['  ∆\n《 ◎ 》\n  ∇', '  ∆\n《 ◉ 》\n  ∇', '  ∆\n《 ◎ 》\n  ∇'],
        scroll: ['  ∆\n《 » 》\n  ∇', '  ∆\n《 ◎ 》\n  ∇', '  ∆\n《 » 》\n  ∇'],
        action: ['  ▲\n《 ✦ 》\n  ▼', '  ∆\n《 ◎ 》\n  ∇', '  ▲\n《 ✦ 》\n  ▼'],
        sleep:  ['  ∆\n《 - 》\n  ∇', '  ∆\n《 _ 》\n  ∇', '  ∆\n《 - 》\n  ∇'],
    },
    {
        name: 'Halo', tier: 'ascended',
        idle:   ['○ ○ ○\n⟨ ◉ ⟩', '· ○ ·\n⟨ ◉ ⟩', '○ ○ ○\n⟨ ◉ ⟩'],
        scroll: ['○ ○ »\n⟨ ◉ ⟩', '« ○ ○\n⟨ ◉ ⟩', '○ ○ »\n⟨ ◉ ⟩'],
        action: ['✦ ✦ ✦\n⟨ ◉ ⟩', '○ ○ ○\n⟨ ◉ ⟩', '✦ ✦ ✦\n⟨ ◉ ⟩'],
        sleep:  ['· · ·\n⟨ - ⟩', '     \n⟨ _ ⟩', '· · ·\n⟨ - ⟩'],
    },
    {
        name: 'Veil', tier: 'ascended',
        idle:   ['┌ ─ ─ ┐\n│  ∅  │\n└     ┘', '┌ ─ ─ ┐\n│  ◌  │\n└     ┘', '┌ ─ ─ ┐\n│  ∅  │\n└     ┘'],
        scroll: ['┌ ─ ─ ┐\n│  »  │\n└     ┘', '┌ ─ ─ ┐\n│  ∅  │\n└     ┘', '┌ ─ ─ ┐\n│  »  │\n└     ┘'],
        action: ['┌ ─ ─ ┐\n│  ✦  │\n└     ┘', '┌ ─ ─ ┐\n│  ∅  │\n└     ┘', '┌ ─ ─ ┐\n│  ✦  │\n└     ┘'],
        sleep:  ['┌ ─ ─ ┐\n│  -  │\n└     ┘', '┌ ─ ─ ┐\n│  _  │\n└     ┘', '┌ ─ ─ ┐\n│  -  │\n└     ┘'],
    },
    {
        name: 'Sigil', tier: 'ascended',
        idle:   ['∞ ─ ∞\n  ┼\n∅ ─ ∅', '∞ ─ ∞\n  ╋\n∅ ─ ∅', '∞ ─ ∞\n  ┼\n∅ ─ ∅'],
        scroll: ['∞ » ∞\n  ┼\n∅ » ∅', '∞ ─ ∞\n  ┼\n∅ ─ ∅', '∞ » ∞\n  ┼\n∅ » ∅'],
        action: ['✦ ─ ✦\n  ╋\n✦ ─ ✦', '∞ ─ ∞\n  ┼\n∅ ─ ∅', '✦ ─ ✦\n  ╋\n✦ ─ ✦'],
        sleep:  ['∞ ─ ∞\n  ┴\n∅ ─ ∅', '∞ ─ ∞\n  ─\n∅ ─ ∅', '∞ ─ ∞\n  ┴\n∅ ─ ∅'],
    },
    {
        name: 'Wraith', tier: 'ascended',
        idle:   ['░ ▒ ░\n░ ▒ ░\n░ ▒ ░', '▒ ░ ▒\n▒ ░ ▒\n▒ ░ ▒', '░ ▒ ░\n░ ▒ ░\n░ ▒ ░'],
        scroll: [' ░ ▒\n ░ ▒\n ░ ▒', '▒ ░ \n▒ ░ \n▒ ░ ', ' ░ ▒\n ░ ▒\n ░ ▒'],
        action: ['▒ ▓ ▒\n▒ ▓ ▒\n▒ ▓ ▒', '░ ▒ ░\n░ ▒ ░\n░ ▒ ░', '▒ ▓ ▒\n▒ ▓ ▒\n▒ ▓ ▒'],
        sleep:  ['░ · ░\n░ · ░\n░ · ░', '·   ·\n·   ·\n·   ·', '░ · ░\n░ · ░\n░ · ░'],
    },
];

/* ── Old Gods (mythic, carved stone — multi-line) ───────────────────────── */
const OLD_GODS: AnimatedSpecies[] = [
    {
        name: 'Forge', tier: 'oldgods',
        idle:   ['▓▓▓▓▓\n║▒▒▒║\n╲ ■ ╱\n╱ ■ ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║▒▒▒║\n╲ ▓ ╱\n╱ ▓ ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║▒▒▒║\n╲ ■ ╱\n╱ ■ ╲\n▓▓▓▓▓'],
        scroll: ['▓▓▓▓▓\n║▒▒▒║\n╲ » ╱\n╱ » ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║▒▒▒║\n╲ ■ ╱\n╱ ■ ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║▒▒▒║\n╲ » ╱\n╱ » ╲\n▓▓▓▓▓'],
        action: ['█████\n║▓▓▓║\n╲ ◉ ╱\n╱ ◉ ╲\n█████', '▓▓▓▓▓\n║▒▒▒║\n╲ ■ ╱\n╱ ■ ╲\n▓▓▓▓▓', '█████\n║▓▓▓║\n╲ ◉ ╱\n╱ ◉ ╲\n█████'],
        sleep:  ['▓▓▓▓▓\n║░░░║\n╲ - ╱\n╱ - ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║░░░║\n╲ _ ╱\n╱ _ ╲\n▓▓▓▓▓', '▓▓▓▓▓\n║░░░║\n╲ - ╱\n╱ - ╲\n▓▓▓▓▓'],
    },
    {
        name: 'Ember', tier: 'oldgods',
        idle:   ['░▒▒▒░\n▒▓■▓▒\n▒▓■▓▒\n░▒▒▒░', '░▒▒▒░\n▒▓▓▓▒\n▒▓■▓▒\n░▒▒▒░', '░▒▒▒░\n▒▓■▓▒\n▒▓■▓▒\n░▒▒▒░'],
        scroll: ['░▒▒▒░\n▒▓»▓▒\n▒▓»▓▒\n░▒▒▒░', '░▒▒▒░\n▒▓■▓▒\n▒▓■▓▒\n░▒▒▒░', '░▒▒▒░\n▒▓»▓▒\n▒▓»▓▒\n░▒▒▒░'],
        action: ['▒▓▓▓▒\n▓█◉█▓\n▓█◉█▓\n▒▓▓▓▒', '░▒▒▒░\n▒▓■▓▒\n▒▓■▓▒\n░▒▒▒░', '▒▓▓▓▒\n▓█◉█▓\n▓█◉█▓\n▒▓▓▓▒'],
        sleep:  ['░░░░░\n░▒-▒░\n░▒-▒░\n░░░░░', '░░░░░\n░▒_▒░\n░▒_▒░\n░░░░░', '░░░░░\n░▒-▒░\n░▒-▒░\n░░░░░'],
    },
    {
        name: 'Gallows', tier: 'oldgods',
        idle:   ['╔════╗\n║ ╱ │\n║ ╲ ┼\n║   │\n║   ┴', '╔════╗\n║ ╲ │\n║ ╱ ┼\n║   │\n║   ┴', '╔════╗\n║ ╱ │\n║ ╲ ┼\n║   │\n║   ┴'],
        scroll: ['╔════╗\n║ ╱ »\n║ ╲ ┼\n║   │\n║   ┴', '╔════╗\n║ ╱ │\n║ ╲ ┼\n║   │\n║   ┴', '╔════╗\n║ ╱ »\n║ ╲ ┼\n║   │\n║   ┴'],
        action: ['╔════╗\n║ ╳ │\n║ ╳ ┼\n║   │\n║   ┴', '╔════╗\n║ ╱ │\n║ ╲ ┼\n║   │\n║   ┴', '╔════╗\n║ ╳ │\n║ ╳ ┼\n║   │\n║   ┴'],
        sleep:  ['╔════╗\n║ - │\n║ - ┼\n║   │\n║   ┴', '╔════╗\n║ _ │\n║ _ ┼\n║   │\n║   ┴', '╔════╗\n║ - │\n║ - ┼\n║   │\n║   ┴'],
    },
    {
        name: 'Tide', tier: 'oldgods',
        idle:   ['  ○\n≈≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■', '  ○\n≈ ≈ ≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■', '  ○\n≈≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■'],
        scroll: ['  »\n≈≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■', '  ○\n ≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■', '  »\n≈≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■'],
        action: ['  ◉\n≋≋≋≋≋\n▓▓▓▓▓\n█████\n■■■■■', '  ○\n≈≈≈≈≈\n▒▒▒▒▒\n▓▓▓▓▓\n■■■■■', '  ◉\n≋≋≋≋≋\n▓▓▓▓▓\n█████\n■■■■■'],
        sleep:  ['  -\n─────\n░░░░░\n▒▒▒▒▒\n■■■■■', '  _\n─────\n░░░░░\n▒▒▒▒▒\n■■■■■', '  -\n─────\n░░░░░\n▒▒▒▒▒\n■■■■■'],
    },
    {
        name: 'Helm', tier: 'oldgods',
        idle:   ['╱═══╲\n║◧ ◨║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱', '╱═══╲\n║◨ ◧║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱', '╱═══╲\n║◧ ◨║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱'],
        scroll: ['╱═══╲\n║» »║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱', '╱═══╲\n║◧ ◨║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱', '╱═══╲\n║» »║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱'],
        action: ['╱═══╲\n║◉ ◉║\n╠▓▓▓╣\n║ ╋ ║\n╲═══╱', '╱═══╲\n║◧ ◨║\n╠╳╳╳╣\n║ ┼ ║\n╲═══╱', '╱═══╲\n║◉ ◉║\n╠▓▓▓╣\n║ ╋ ║\n╲═══╱'],
        sleep:  ['╱═══╲\n║- -║\n╠───╣\n║ ┴ ║\n╲═══╱', '╱═══╲\n║_ _║\n╠───╣\n║ ┴ ║\n╲═══╱', '╱═══╲\n║- -║\n╠───╣\n║ ┴ ║\n╲═══╱'],
    },
    {
        name: 'Glacier', tier: 'oldgods',
        idle:   ['▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒∇▒░\n░░░░░', '▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒∆▒░\n░░░░░', '▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒∇▒░\n░░░░░'],
        scroll: ['▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒»▒░\n░░░░░', '▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒∇▒░\n░░░░░', '▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒»▒░\n░░░░░'],
        action: ['█████\n╲███╱\n▓╲█╱▓\n▒▓◉▓▒\n░░░░░', '▓▓▓▓▓\n╲▓▓▓╱\n▒╲▓╱▒\n░▒∇▒░\n░░░░░', '█████\n╲███╱\n▓╲█╱▓\n▒▓◉▓▒\n░░░░░'],
        sleep:  ['░░░░░\n╲░░░╱\n░╲░╱░\n░░-░░\n░░░░░', '░░░░░\n╲░░░╱\n░╲░╱░\n░░_░░\n░░░░░', '░░░░░\n╲░░░╱\n░╲░╱░\n░░-░░\n░░░░░'],
    },
];

/** Every animated familiar, in bestiary order. */
export const ANIMATED_SPECIES: AnimatedSpecies[] = [
    ...BITDAEMONS,
    ...TITANS,
    ...ASCENDED,
    ...OLD_GODS,
];

/** Quick name → species lookup (case-insensitive). */
export function findAnimatedSpecies(name: string): AnimatedSpecies | null {
    const lc = name.toLowerCase();
    return ANIMATED_SPECIES.find((s) => s.name.toLowerCase() === lc) ?? null;
}
