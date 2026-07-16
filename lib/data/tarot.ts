/*
 * The Major Arcana — the 22 trump cards of the tarot, the deck the Tarot Spread
 * (Spell Book) reads from. Real cards, real meanings; each drawn card wears one
 * of the reader's Collected pieces as its face. Upright AND reversed are both
 * authored, so a reversed draw reads true — not just a rotated picture.
 */

export interface Arcana {
    /** 0–21, the card's number in the Major Arcana. */
    n: number;
    /** Roman numeral as it prints on the card ('0' for The Fool). */
    roman: string;
    name: string;
    /** One-word essence, worn as the card's tab. */
    keyword: string;
    /** Upright meaning — a short, evocative clause. */
    upright: string;
    /** Reversed meaning. */
    reversed: string;
}

export const MAJOR_ARCANA: Arcana[] = [
    { n: 0,  roman: '0',     name: 'The Fool',            keyword: 'Beginnings',    upright: 'a leap into the unknown, innocence, the whole road still ahead',       reversed: 'recklessness, the cliff-edge ignored, a leap taken blind' },
    { n: 1,  roman: 'I',     name: 'The Magician',        keyword: 'Will',          upright: 'will made real, every tool in hand, power channelled',                 reversed: 'manipulation, talent squandered, smoke without fire' },
    { n: 2,  roman: 'II',    name: 'The High Priestess',  keyword: 'Mystery',       upright: 'intuition, the veil, secrets known and kept',                          reversed: 'a secret turned against you, the inner voice ignored' },
    { n: 3,  roman: 'III',   name: 'The Empress',         keyword: 'Abundance',     upright: 'creation, nurture, the fruit ripening on the branch',                  reversed: 'a creative block, smothering, the harvest neglected' },
    { n: 4,  roman: 'IV',    name: 'The Emperor',         keyword: 'Authority',     upright: 'structure, command, the throne earned rather than seized',             reversed: 'rigidity, control that cracks, the tyrant undone' },
    { n: 5,  roman: 'V',     name: 'The Hierophant',      keyword: 'Tradition',     upright: 'the well-worn path, doctrine, belonging',                              reversed: 'dogma broken, your own road taken, cheerful heresy' },
    { n: 6,  roman: 'VI',    name: 'The Lovers',          keyword: 'Union',         upright: 'alignment, a choice made from the heart, two made one',                reversed: 'discord, the wrong choice, values at war' },
    { n: 7,  roman: 'VII',   name: 'The Chariot',         keyword: 'Drive',         upright: 'victory through sheer will, the reins held, momentum',                 reversed: 'the reins lost, forces pulling you apart' },
    { n: 8,  roman: 'VIII',  name: 'Strength',            keyword: 'Courage',       upright: 'quiet power, the lion tamed by patience, not force',                   reversed: 'self-doubt, force where softness was called for' },
    { n: 9,  roman: 'IX',    name: 'The Hermit',          keyword: 'Solitude',      upright: 'the inward turn, a lantern in the dark, wisdom sought alone',           reversed: 'isolation, a retreat held too long' },
    { n: 10, roman: 'X',     name: 'Wheel of Fortune',    keyword: 'Fate',          upright: 'the turn of luck, the cycle, what rises',                              reversed: 'the wheel turned against you, change resisted' },
    { n: 11, roman: 'XI',    name: 'Justice',             keyword: 'Truth',         upright: 'cause and effect, the scales balanced, the account settled',           reversed: 'imbalance, the reckoning dodged, an unfairness' },
    { n: 12, roman: 'XII',   name: 'The Hanged Man',      keyword: 'Surrender',     upright: 'the useful pause, a new angle, the grip released',                     reversed: 'stalling, martyrdom, a sacrifice spent for nothing' },
    { n: 13, roman: 'XIII',  name: 'Death',               keyword: 'Endings',       upright: 'transformation, the necessary end, the ground cleared for what grows', reversed: 'clinging, a change refused, the slow decay' },
    { n: 14, roman: 'XIV',   name: 'Temperance',          keyword: 'Balance',       upright: 'the middle way, patience, quiet alchemy',                              reversed: 'excess, the mix gone wrong, a balance lost' },
    { n: 15, roman: 'XV',    name: 'The Devil',           keyword: 'Bondage',       upright: 'the chain you chose, appetite, the shadow acknowledged',               reversed: 'the chain loosed, the shadow faced, freedom reclaimed' },
    { n: 16, roman: 'XVI',   name: 'The Tower',           keyword: 'Upheaval',      upright: 'sudden ruin, the false thing struck down, revelation by lightning',     reversed: 'a disaster narrowly missed — delayed, not denied' },
    { n: 17, roman: 'XVII',  name: 'The Star',            keyword: 'Hope',          upright: 'renewal, faith after the storm, the light that guides you home',        reversed: 'the light dimmed, faith lost from view, despair' },
    { n: 18, roman: 'XVIII', name: 'The Moon',            keyword: 'Illusion',      upright: 'the unclear, dreams and fears, the path half-lit',                     reversed: 'the fog lifting, the truth surfacing at last' },
    { n: 19, roman: 'XIX',   name: 'The Sun',             keyword: 'Joy',           upright: 'clarity, warmth, success made plain for all to see',                   reversed: 'a cloud on the joy, gladness delayed but coming' },
    { n: 20, roman: 'XX',    name: 'Judgement',           keyword: 'Reckoning',     upright: 'the call, the awakening, absolution',                                  reversed: 'the call unanswered, a harsh self-judgement' },
    { n: 21, roman: 'XXI',   name: 'The World',           keyword: 'Completion',    upright: 'the circle closed, fulfilment, the long arrival',                      reversed: 'the last step unfinished, an ending withheld' },
];
