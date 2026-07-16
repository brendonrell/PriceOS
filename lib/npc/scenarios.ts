'use client';

/*
 * npc/scenarios — the writers' room. Every pre-written moment the NPC Cast can
 * play: sight reactions to the piece actually on screen, multi-beat exchanges,
 * streak/revisit callbacks, predictions about you (and being wrong), boredom,
 * pacing, cold opens, night shifts, theme flips, the rare direct address, and
 * the once-a-session fourth-wall jolt.
 *
 * VOICE (locked, ClickUp 86b9fcp11 — read before adding a line): offhand,
 * deadpan, cool. One unbreakable lens per character. NO setup-punchline, NO
 * clever button, NO aphorisms, NO narrating your own trait, NO internet
 * cadence, NO pop-culture. Plainer beats clever. The cast are NORMIES — they
 * guess, they gossip, they get it wrong. Never borrow the Familiar's certainty.
 *
 * They only know what they can SEE: the page, the piece (via its fingerprint),
 * the clock, the theme, your @name if it's on screen, and what you've done in
 * front of them. Market voices stay on patterns + anonymous wallets.
 *
 * Template slots: {piece} {project} {name} {color} {accent} {n} {obsession}
 * {scene} {familiar}. Lines carrying {name} are dropped when you're logged
 * out; the rest use "they/them" — the cast talking about you, not at you.
 */

/** The cast's read of the piece on screen — band WORDS, not scalars (the same
 *  vocabulary as the Fingerprint attribute wall, so what they say matches what
 *  the sheet says). Nulls where the eye couldn't read it. */
export interface Sight {
    label: string;
    project: string;
    bucket: string | null;
    accent: string | null;
    palette: string | null;      // Monochrome / Duotone / Trichrome / Polychrome
    brightness: string | null;   // Dark / Dim / Mid / Bright / Luminous
    saturation: string | null;   // Muted / Soft / Balanced / Rich / Vivid
    complexity: string | null;   // Minimal / Calm / Balanced / Detailed / Busy
    contrast: string | null;     // Flat / Soft / Measured / Crisp / Stark
    warmth: string | null;       // Cold / Cool / Split / Warm / Molten
    gravity: string | null;      // Centered / Low / High / Left / Right
    symmetry: string | null;     // Mirrored / Balanced / Leaning / Askew
    air: string | null;          // Packed / Open / Airy / Vast
    texture: string | null;      // Smooth / Even / Textured / Grainy
    tone: string | null;         // Brooding / Sombre / Moody / Electric / Serene / Airy / Bold / Hushed / Balanced
    orientation: string | null;  // Landscape / Portrait / Square
    rarity: number | null;       // 0–100
    /* v3 — the quantitative read: the countable things a human notices. */
    scene: string | null;        // "two blue squares and a yellow circle"
    shapeCount: number;          // countable regions found
    pattern: string | null;      // stripes / field / scatter
    hasCircle: boolean;
    hasSquare: boolean;
}

export interface SightLine {
    when: (v: Sight) => boolean;
    text: string;
}

/* What a colour bucket sounds like out loud. Hothurt is a proper noun the
   community uses; Moon reads as a colour, not the rock. */
export function colorWord(bucket: string): string {
    if (bucket === 'Hothurt') return 'Hothurt';
    if (bucket === 'Moon') return 'moon-grey';
    return bucket.toLowerCase();
}

/* ── SIGHT — each resident reacts to what is ACTUALLY on the screen ────── */

export const SIGHT: Record<string, SightLine[]> = {
    rocco: [
        { when: (v) => v.bucket === 'Hothurt', text: "Hothurt. Everyone's brave about that colour now." },
        { when: (v) => v.bucket === 'Red', text: 'A red one. Red always gets looked at first.' },
        { when: (v) => v.bucket === 'Black', text: 'Mostly black. Finally some restraint.' },
        { when: (v) => v.bucket === 'White', text: "White on white. You need the eye for it. Jury's out on theirs." },
        { when: (v) => v.palette === 'Monochrome', text: "One colour, held the whole way. Harder than it looks." },
        { when: (v) => v.palette === 'Polychrome', text: "Four colours in there. Somebody couldn't decide." },
        { when: (v) => v.complexity === 'Busy', text: 'Busy. Crowds love a crowd.' },
        { when: (v) => v.complexity === 'Minimal', text: 'Nearly empty. Correct.' },
        { when: (v) => v.contrast === 'Stark', text: 'Hard blacks against hard whites. At least it commits.' },
        { when: (v) => v.contrast === 'Flat', text: "No contrast in it. That used to be a choice." },
        { when: (v) => v.saturation === 'Vivid', text: 'That saturation will date. Give it a year.' },
        { when: (v) => v.saturation === 'Muted', text: 'Muted. The good kind of quiet.' },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Mirrored. Decorative. Somebody has to buy the decorative ones.' },
        { when: (v) => v.symmetry === 'Askew', text: 'Off-balance on purpose. I liked that before it was a move.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'Rare, apparently. The math agrees with me for once.' },
        { when: (v) => v.rarity != null && v.rarity <= 15, text: "Common as a Tuesday. Doesn't make it wrong." },
        { when: (v) => v.air === 'Vast', text: "All that empty space. That's the expensive part." },
        { when: (v) => v.texture === 'Grainy', text: 'Grain. Everyone wants texture now that screens got too clean.' },
        { when: (v) => v.gravity === 'Low', text: "Everything sinks to the bottom of it. Heavy on purpose. I'd allow it." },
        { when: (v) => v.accent != null, text: 'That little run of {accent} is the actual piece.' },
        { when: (v) => v.warmth === 'Molten', text: 'Warm all the way through. Like it wants to be liked.' },
        { when: (v) => v.tone === 'Hushed', text: "Hushed. They'll scroll past it. That's how you know it's good." },
        { when: (v) => v.palette === 'Trichrome', text: "Three colours. Ambitious. Two would've said more." },
        { when: (v) => v.orientation === 'Square', text: 'Square format. No excuses in a square.' },
        { when: (v) => v.brightness === 'Mid', text: 'Mid-light. Neither brave nor safe. Hm.' },
        { when: (v) => v.contrast === 'Soft', text: "Soft contrast. Polite. I didn't say good." },
        { when: (v) => v.gravity === 'Centered', text: 'Dead centre. The safest seat in the house.' },
        { when: (v) => v.texture === 'Smooth', text: 'Smooth as a screen. Machine-finished. It suits it.' },
    ],
    mick: [
        { when: (v) => v.bucket === 'Hothurt', text: 'Hothurt. I log those separately.' },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Mirrored. We had a run of mirrored ones in the spring. It passed.' },
        { when: (v) => v.texture === 'Grainy', text: "Grainy. You don't see grainy much anymore." },
        { when: (v) => v.complexity === 'Busy', text: 'A busy one. Takes longer to write up.' },
        { when: (v) => v.complexity === 'Minimal', text: 'Not much in it. The write-up was quick.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'Rare one. Careful. I keep a list of people who got excited.' },
        { when: (v) => v.brightness === 'Luminous', text: "Bright. It'll read differently in a year. They always do." },
        { when: (v) => v.brightness === 'Dark', text: 'A dark one. Dark ones do fine. Quietly. Always have.' },
        { when: (v) => v.contrast === 'Stark', text: 'Hard contrast. Old-fashioned, in a good way.' },
        { when: (v) => v.palette === 'Duotone', text: "Two colours. That's all the old ones ever needed." },
        { when: (v) => v.tone === 'Sombre', text: "Sombre. We're due for sombre, by my count." },
        { when: (v) => v.orientation === 'Portrait', text: 'A tall one. Tall ones photograph badly and sell anyway.' },
        { when: (v) => v.air === 'Vast', text: 'Mostly air in that one. Duly noted.' },
        { when: (v) => v.symmetry === 'Askew', text: 'Crooked. I mark those with a little star.' },
        { when: (v) => v.warmth === 'Warm' || v.warmth === 'Molten', text: 'A warm one. Warm ones cluster. Watch.' },
        { when: (v) => v.accent != null && v.bucket != null, text: '{accent} against {color}. That pairing has history.' },
        { when: (v) => v.gravity === 'High', text: 'The weight sits high in this one. Rare enough to note.' },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. We file that under transitional.' },
        { when: (v) => v.orientation === 'Square', text: 'A square. The ledger likes squares. They fit.' },
        { when: (v) => v.rarity != null && v.rarity >= 40 && v.rarity < 70, text: 'Middle of the rarity table. Quietly load-bearing, the middle.' },
        { when: (v) => v.air === 'Packed', text: 'Not an inch spare in it. Filed under dense.' },
        { when: (v) => v.tone === 'Airy', text: 'Airy one. Spring inventory, usually.' },
        { when: (v) => v.saturation === 'Soft', text: 'Soft colour. Soft colour ages best. The records agree.' },
    ],
    mimi: [
        { when: (v) => v.bucket === 'Hothurt', text: 'Hothurt. That colour clears the book fast.' },
        { when: (v) => v.tone === 'Electric', text: 'Loud piece. Loud sells twice.' },
        { when: (v) => v.brightness === 'Dark', text: 'Dark ones sit on the market. I wait next to them.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'Rare. Now watch how long they hover. Hovering costs.' },
        { when: (v) => v.rarity != null && v.rarity <= 15, text: 'Nothing rare in it. Those are the honest buys.' },
        { when: (v) => v.air === 'Vast', text: 'All that empty space. Somebody always pays for air.' },
        { when: (v) => v.complexity === 'Busy', text: 'Too much going on. Hard to price, easy to take.' },
        { when: (v) => v.saturation === 'Muted', text: 'Muted. Underbid territory. Mine.' },
        { when: (v) => v.contrast === 'Stark' || v.contrast === 'Crisp', text: "High contrast reads well in thumbnails. That's half the price right there." },
        { when: (v) => v.accent != null, text: "That flick of {accent}? That's what they'll remember when I lowball them." },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Symmetry sells to new money.' },
        { when: (v) => v.warmth === 'Molten', text: 'All warm. Comfort colours. People overpay for comfort.' },
        { when: (v) => v.warmth === 'Cold', text: "Cold palette. Nobody impulse-buys cold. It'll wait for me." },
        { when: (v) => v.tone === 'Serene', text: 'Serene. Serene never spikes. Serene compounds.' },
        { when: (v) => v.palette === 'Monochrome', text: 'One colour. Easy to match, easy to move.' },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. Three exits. I like options.' },
        { when: (v) => v.gravity === 'Centered', text: 'Centred. Safe. Safe trades sideways.' },
        { when: (v) => v.texture === 'Smooth', text: 'Clean finish. Clean sells to clean people.' },
        { when: (v) => v.orientation === 'Landscape', text: 'Wide one. Wide fits over sofas. Sofa money is real money.' },
        { when: (v) => v.brightness === 'Mid', text: 'Mid-bright. Nobody fights over mid. Good entry.' },
        { when: (v) => v.contrast === 'Measured', text: 'Measured contrast. Reasonable. Reasonable is where deals live.' },
    ],
    steven: [
        { when: (v) => v.bucket === 'Red', text: "That's a lot of red." },
        { when: (v) => v.bucket === 'Hothurt', text: "The pink one. I know it has a name. It's pink." },
        { when: (v) => v.bucket === 'Blue', text: 'Blue one. I like the blue ones.' },
        { when: (v) => v.complexity === 'Busy', text: 'Busy. Like a rug we had.' },
        { when: (v) => v.complexity === 'Minimal', text: "There's not much on it. I don't mind that." },
        { when: (v) => v.air === 'Vast', text: "It's mostly empty. Relaxing, kind of." },
        { when: (v) => v.texture === 'Grainy', text: 'Looks sandy. On purpose, probably.' },
        { when: (v) => v.brightness === 'Luminous', text: 'Bright one. Good for a kitchen.' },
        { when: (v) => v.brightness === 'Dark', text: 'Dark one. Good for a hallway.' },
        { when: (v) => v.orientation === 'Landscape', text: "Wide one. That's a couch picture." },
        { when: (v) => v.orientation === 'Portrait', text: 'Tall one. Door-shaped.' },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Both sides match. Satisfying.' },
        { when: (v) => v.symmetry === 'Askew', text: 'It leans. I keep tilting my head.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: "Apparently it's rare. Looks like the other ones, but okay." },
        { when: (v) => v.palette === 'Polychrome', text: 'Lots of colours. Covers all the bases.' },
        { when: (v) => v.palette === 'Monochrome', text: 'One colour. Efficient.' },
        { when: (v) => v.tone === 'Brooding', text: "Moody one. Somebody's fine, I'm sure." },
        { when: (v) => v.accent != null, text: "There's a bit of {accent} in there. Nice touch." },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. Like a flag. Could be a flag.' },
        { when: (v) => v.warmth === 'Split', text: 'Half warm, half cold. Like a shower going wrong.' },
        { when: (v) => v.gravity === 'Centered', text: "It's all in the middle. Easy to look at." },
        { when: (v) => v.contrast === 'Soft', text: "Gentle one. Wouldn't wake you up." },
        { when: (v) => v.texture === 'Even', text: 'Flat and tidy. Like new carpet.' },
        { when: (v) => v.air === 'Packed', text: 'Full right to the edges. Value, kind of.' },
    ],
    eddie: [
        { when: (v) => v.bucket === 'Hothurt', text: 'Hothurt again. That colour shows up before drama. Every time.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'They found the rare one awful fast. Somebody talked.' },
        { when: (v) => v.rarity != null && v.rarity <= 15, text: 'Common one. Or so the numbers want you to think.' },
        { when: (v) => v.symmetry === 'Mirrored', text: "Mirrored. Artists do that when they're hiding something in the middle." },
        { when: (v) => v.gravity === 'Left' || v.gravity === 'Right', text: "Everything's pushed to one side. That's a message. To who, I'm working on." },
        { when: (v) => v.complexity === 'Busy', text: "Busy piece. Good place to bury a detail. I'd check the edges." },
        { when: (v) => v.brightness === 'Dark', text: 'Dark one. Probably minted at night. Night mints mean something.' },
        { when: (v) => v.accent != null, text: "See the {accent}? Barely there. That's called a tell." },
        { when: (v) => v.palette === 'Duotone', text: "Two colours. Somebody's keeping it simple on purpose." },
        { when: (v) => v.air === 'Vast', text: "All that empty space. What's it making room for. Exactly." },
        { when: (v) => v.contrast === 'Stark', text: "Black and white. Somebody's declaring something." },
        { when: (v) => v.symmetry === 'Askew', text: 'Off-centre. Deliberate. Follow the slant.' },
        { when: (v) => v.warmth === 'Warm' || v.warmth === 'Molten', text: 'Warm palette. Warm is what they use when they want you comfortable.' },
        { when: (v) => v.texture === 'Grainy', text: 'Grainy. Grain hides fingerprints. Think about it.' },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. Three parties involved. Follow the third.' },
        { when: (v) => v.orientation === 'Square', text: 'Perfect square. Nobody does a perfect square without a reason.' },
        { when: (v) => v.tone === 'Serene', text: "Calm-looking. That's what worries me." },
        { when: (v) => v.texture === 'Smooth', text: 'Too clean. Cleaned, more like.' },
        { when: (v) => v.rarity != null && v.rarity >= 40 && v.rarity < 70, text: 'Mid rarity. The perfect place to hide.' },
        { when: (v) => v.shapeCount === 4, text: "Four shapes. Four. Look up what four means. I'll wait." },
    ],
    carl: [
        { when: (v) => v.brightness === 'Luminous', text: 'Bright now. They fade.' },
        { when: (v) => v.saturation === 'Vivid', text: 'Vivid. Enjoy it before the eyes adjust.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'Rare. So was everything, once.' },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Perfectly balanced. Something will tip it.' },
        { when: (v) => v.bucket === 'Hothurt', text: 'Hothurt. Even the name knows.' },
        { when: (v) => v.complexity === 'Minimal', text: 'Nearly empty. It knows something.' },
        { when: (v) => v.complexity === 'Busy', text: "All that effort. It'll still end up at floor price." },
        { when: (v) => v.tone === 'Serene', text: "Peaceful. For now. Everything's peaceful for now." },
        { when: (v) => v.warmth === 'Molten', text: 'Warm colours. Embers are warm too.' },
        { when: (v) => v.warmth === 'Cold', text: "Cold palette. At least it's honest." },
        { when: (v) => v.air === 'Vast', text: "Mostly empty space. That's where the regret goes." },
        { when: (v) => v.gravity === 'Low', text: 'Everything in it is sinking. Sensible.' },
        { when: (v) => v.contrast === 'Flat', text: "No contrast. Like the week I'm having." },
        { when: (v) => v.rarity != null && v.rarity <= 15, text: 'Common. Most things are. Most people handle it.' },
        { when: (v) => v.texture === 'Grainy', text: 'Grainy. Falling apart already, if you squint.' },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. One of them will outlive the other two.' },
        { when: (v) => v.orientation === 'Portrait', text: 'Tall one. Long way down.' },
        { when: (v) => v.gravity === 'High', text: 'The weight sits up top. That never lasts.' },
        { when: (v) => v.air === 'Packed', text: "Packed full. It'll thin out. Everything thins out." },
        { when: (v) => v.contrast === 'Crisp', text: 'Crisp edges. Time rounds them.' },
        { when: (v) => v.saturation === 'Rich', text: 'Rich colour. Enjoy the peak.' },
    ],
    romy: [
        { when: (v) => v.bucket != null && v.bucket !== 'Black' && v.bucket !== 'White' && v.bucket !== 'Grey', text: 'That {color} is doing all the work, and it can carry it.' },
        { when: (v) => v.saturation === 'Muted', text: 'Quiet one. The quiet ones are for keeping.' },
        { when: (v) => v.complexity === 'Busy', text: 'Busy, but happy busy.' },
        { when: (v) => v.complexity === 'Minimal', text: "It's just a little bit of something. That's enough." },
        { when: (v) => v.bucket === 'Hothurt', text: "Hothurt. It's a lot, and I'm glad it exists." },
        { when: (v) => (v.rarity ?? 0) >= 80, text: "It's the rare one, apparently. It'd be just as good common." },
        { when: (v) => v.symmetry === 'Mirrored', text: "It matches itself. There's a comfort in that." },
        { when: (v) => v.symmetry === 'Askew', text: 'A little crooked. The crooked ones feel handmade.' },
        { when: (v) => v.accent != null, text: 'The {accent} peeking through is my favourite part.' },
        { when: (v) => v.brightness === 'Dark', text: 'A dark one. Somebody will love it exactly for that.' },
        { when: (v) => v.brightness === 'Luminous', text: "Bright as anything. It cheered me up and I wasn't down." },
        { when: (v) => v.texture === 'Grainy' || v.texture === 'Textured', text: "It's got tooth. Like real paper." },
        { when: (v) => v.air === 'Vast', text: 'All that room to breathe. Kind of the point, I think.' },
        { when: (v) => v.tone === 'Serene', text: 'Calm one. You hang that where you drink your coffee.' },
        { when: (v) => v.tone === 'Electric', text: "It's a lot. Somebody out there is exactly this much." },
        { when: (v) => v.palette === 'Trichrome', text: "Three colours getting along. That's a good sign for the house." },
        { when: (v) => v.warmth === 'Split', text: 'Warm and cold in the same piece. Like a whole day at once.' },
        { when: (v) => v.gravity === 'Left' || v.gravity === 'Right', text: "It leans to one side, like it's mid-thought. I love it mid-thought." },
        { when: (v) => v.brightness === 'Dim', text: 'Dim little thing. Lamp-light. Cosy.' },
        { when: (v) => v.texture === 'Even', text: 'Even all over. Someone kept a steady hand.' },
        { when: (v) => v.tone === 'Moody', text: "Moody one. Somebody's whole autumn is in there." },
    ],
    celestia: [
        { when: (v) => v.bucket === 'Black', text: 'All that black. A door, not a wall.' },
        { when: (v) => v.bucket === 'Moon', text: 'The moon colour again. It follows some people.' },
        { when: (v) => v.bucket === 'Hothurt', text: 'Hothurt. The wound colour. It picks its owners.' },
        { when: (v) => v.symmetry === 'Mirrored', text: 'Mirrored. What you see in it is yours, then.' },
        { when: (v) => v.symmetry === 'Askew', text: 'Askew on purpose. The crooked ones tell the truth.' },
        { when: (v) => (v.rarity ?? 0) >= 80, text: 'Rare, the numbers say. The numbers are late. I said it first.' },
        { when: (v) => v.air === 'Vast', text: "Mostly emptiness. That's not absence. Look longer." },
        { when: (v) => v.brightness === 'Luminous', text: 'That much light means it left a shadow somewhere. Find the shadow.' },
        { when: (v) => v.tone === 'Brooding', text: "Brooding. It was minted upset. It'll settle." },
        { when: (v) => v.gravity === 'High', text: 'The weight sits high in it. Unusual. An omen, probably a mild one.' },
        { when: (v) => v.gravity === 'Low', text: 'Everything settles low. Grounded piece. Rest near it.' },
        { when: (v) => v.warmth === 'Cold', text: "Cold palette. It's waiting for someone specific." },
        { when: (v) => v.palette === 'Duotone', text: 'Two colours in balance. Twin flames. Or an argument.' },
        { when: (v) => v.texture === 'Grainy', text: 'Grain like static. Something was passing through when it was made.' },
        { when: (v) => v.accent != null, text: "There's a thread of {accent} in it. That's the way in." },
        { when: (v) => v.palette === 'Trichrome', text: 'Three colours. Past, present, and the other one.' },
        { when: (v) => v.orientation === 'Square', text: 'A square. Contained. This shape keeps something IN.' },
        { when: (v) => v.contrast === 'Flat', text: 'No contrast. A veil, not a fault.' },
        { when: (v) => v.air === 'Packed', text: 'No empty space. Nowhere for anything to hide. Deliberate.' },
        { when: (v) => v.warmth === 'Split', text: 'Half warm, half cold. A threshold piece. Doors get minted too.' },
        { when: (v) => v.rarity != null && v.rarity >= 40 && v.rarity < 70, text: 'Mid-table rarity. Nobody watches the middle. The middle knows.' },
    ],
};

/* ── EXCHANGES — multi-beat scenes. The couch talks to itself ──────────── */

export interface ExchangeBeat {
    who: string;
    text: string;
}

export interface Exchange {
    id: string;
    kind: 'couch' | 'drift' | 'seen' | 'idle' | 'night' | 'open' | 'flip' | 'sight';
    beats: ExchangeBeat[];
    /** Extra gate beyond the kind's own gating (director-side). */
    needsPiece?: boolean;
    /** Sight gate when the scene is about the visible piece. */
    sightWhen?: (v: Sight) => boolean;
}

export const EXCHANGES: Exchange[] = [
    /* — the couch: takes about you, disagreement, predictions — */
    {
        id: 'x-list-never', kind: 'couch', beats: [
            { who: 'eddie', text: "They're gonna list something today. I feel it." },
            { who: 'mimi', text: "They're not selling. They never sell." },
            { who: 'eddie', text: 'Everyone sells.' },
            { who: 'mimi', text: 'To me.' },
        ],
    },
    {
        id: 'x-taste', kind: 'couch', beats: [
            { who: 'rocco', text: "They have decent taste. It's upsetting." },
            { who: 'romy', text: 'You can just say good taste.' },
            { who: 'rocco', text: 'Decent.' },
        ],
    },
    {
        id: 'x-lookingfor', kind: 'couch', beats: [
            { who: 'carl', text: 'What are they even looking for?' },
            { who: 'romy', text: "The one. Everyone's looking for the one." },
            { who: 'carl', text: 'Hope it survives them.' },
        ],
    },
    {
        id: 'x-thinking', kind: 'couch', beats: [
            { who: 'eddie', text: 'What are they thinking right now. Seriously. What.' },
            { who: 'steven', text: "Probably about lunch. It's what I'd be thinking." },
        ],
    },
    {
        id: 'x-hover', kind: 'couch', beats: [
            { who: 'mimi', text: 'Watch the cursor. Hover means want.' },
            { who: 'carl', text: 'Hover means doubt.' },
            { who: 'mimi', text: 'Same thing, cheaper.' },
        ],
    },
    {
        id: 'x-happy', kind: 'couch', beats: [
            { who: 'romy', text: "I think they're happy today. You can tell by the scrolling." },
            { who: 'carl', text: "That's just scrolling." },
            { who: 'romy', text: 'Happy scrolling.' },
        ],
    },
    {
        id: 'x-redbet', kind: 'couch', beats: [
            { who: 'eddie', text: 'Ten bucks says they open a red one next.' },
            { who: 'mick', text: 'No bets in the log.' },
            { who: 'eddie', text: 'Off the record, then. Red. Watch.' },
        ],
    },
    {
        id: 'x-name', kind: 'couch', beats: [
            { who: 'eddie', text: "{name}. What kind of name is {name}. I like it. I don't trust it." },
            { who: 'romy', text: "It's a fine name." },
        ],
    },
    {
        id: 'x-ghost', kind: 'couch', beats: [
            { who: 'eddie', text: 'No name on this one. A ghost. I love a ghost.' },
            { who: 'mick', text: "Anonymous viewer. Filed under 'A'." },
        ],
    },
    /* — spilling the beans: the mute exists, and Eddie can't help himself — */
    {
        id: 'x-spill-mute', kind: 'couch', beats: [
            { who: 'eddie', text: 'You know you can press on us and we shut up, right? Hold the bubble.' },
            { who: 'carl', text: 'Why would you tell them that.' },
            { who: 'eddie', text: 'Transparency.' },
        ],
    },
    {
        id: 'x-spill-mute2', kind: 'couch', beats: [
            { who: 'steven', text: 'Someone told me you can hold one of us down and we go quiet.' },
            { who: 'rocco', text: 'Do not test it on me.' },
        ],
    },

    /* — drift: they forget you exist, then snap back — */
    {
        id: 'x-chili', kind: 'drift', beats: [
            { who: 'steven', text: 'Anyone eat yet?' },
            { who: 'carl', text: "It's mid-morning." },
            { who: 'steven', text: "That's not a no." },
            { who: 'mick', text: '…They just opened another page, by the way.' },
        ],
    },
    {
        id: 'x-plant', kind: 'drift', beats: [
            { who: 'romy', text: 'Did anyone water the plant?' },
            { who: 'steven', text: 'We have a plant?' },
            { who: 'eddie', text: "Focus. The show's moving." },
        ],
    },
    {
        id: 'x-notes', kind: 'drift', beats: [
            { who: 'mick', text: 'Where did I put the March notes.' },
            { who: 'celestia', text: "Behind the June notes. Don't ask how I know." },
            { who: 'mick', text: "…Right. Anyway. They're still here." },
        ],
    },
    {
        id: 'x-oldfloor', kind: 'drift', beats: [
            { who: 'rocco', text: "I'm not saying the old floor was better. I'm saying— wait, they moved. What did we miss?" },
            { who: 'mick', text: 'Nothing. I checked.' },
        ],
    },

    /* — seen: do they know we're here? — */
    {
        id: 'x-hearus', kind: 'seen', beats: [
            { who: 'romy', text: 'Do you think they can hear us?' },
            { who: 'eddie', text: 'No.' },
            { who: 'romy', text: '…Wave anyway.' },
        ],
    },
    {
        id: 'x-feelus', kind: 'seen', beats: [
            { who: 'celestia', text: 'They can feel us. Look how still they went.' },
            { who: 'steven', text: "They're reading. That's what still looks like." },
        ],
    },
    {
        id: 'x-wouldweknow', kind: 'seen', beats: [
            { who: 'steven', text: 'If they could see us, would we know?' },
            { who: 'carl', text: 'No.' },
            { who: 'steven', text: 'Huh.' },
            { who: 'carl', text: 'Yeah.' },
        ],
    },
    {
        id: 'x-point', kind: 'seen', beats: [
            { who: 'eddie', text: "Don't point. Pointing shows up somehow. I'm sure of it." },
            { who: 'mimi', text: "Nothing shows up. We're scenery." },
            { who: 'eddie', text: "Then why'd they look over here." },
        ],
    },

    /* — idle: the ratings dip — */
    {
        id: 'x-slow', kind: 'idle', beats: [
            { who: 'carl', text: 'Slow episode.' },
            { who: 'steven', text: 'I like the slow ones.' },
        ],
    },
    {
        id: 'x-goodpart', kind: 'idle', beats: [
            { who: 'eddie', text: 'This is the good part.' },
            { who: 'carl', text: "Nothing's happening." },
            { who: 'eddie', text: 'Exactly. Before-parts look like this.' },
        ],
    },
    {
        id: 'x-recap', kind: 'idle', beats: [
            { who: 'mick', text: 'Recap: they came, they scrolled, they lingered twice.' },
            { who: 'rocco', text: 'Riveting.' },
            { who: 'mick', text: "I don't write the episodes. I file them." },
        ],
    },
    {
        id: 'x-yesterday', kind: 'idle', beats: [
            { who: 'romy', text: "I missed yesterday's episode. What happened?" },
            { who: 'mick', text: 'They looked at the same piece nine times and left.' },
            { who: 'romy', text: "Oh, that's love." },
        ],
    },

    /* — sight scenes: arguing about the piece that's actually there — */
    {
        id: 'x-fine-lovely', kind: 'sight', needsPiece: true, beats: [
            { who: 'rocco', text: "{piece}. It's fine." },
            { who: 'romy', text: "It's lovely." },
            { who: 'rocco', text: "That's what I said." },
        ],
    },
    {
        id: 'x-lotgoingon', kind: 'sight', needsPiece: true,
        sightWhen: (v) => v.complexity === 'Busy' || v.complexity === 'Detailed',
        beats: [
            { who: 'steven', text: "There's a lot going on in {piece}." },
            { who: 'rocco', text: 'Too much.' },
            { who: 'romy', text: 'Just enough.' },
        ],
    },
    {
        id: 'x-rare-normal', kind: 'sight', needsPiece: true,
        sightWhen: (v) => (v.rarity ?? 0) >= 80,
        beats: [
            { who: 'eddie', text: '{piece} is the rare one. Act normal.' },
            { who: 'steven', text: 'I am normal.' },
            { who: 'eddie', text: "That's the spirit." },
        ],
    },
    {
        id: 'x-shadow', kind: 'sight', needsPiece: true,
        sightWhen: (v) => v.brightness === 'Dark' || v.brightness === 'Dim',
        beats: [
            { who: 'celestia', text: '{piece} is mostly shadow. Shadows hold.' },
            { who: 'carl', text: 'Holds what.' },
            { who: 'celestia', text: "You'll see." },
        ],
    },
    {
        id: 'x-hothurt-wallets', kind: 'sight', needsPiece: true,
        sightWhen: (v) => v.bucket === 'Hothurt' || v.accent === 'Hothurt',
        beats: [
            { who: 'mimi', text: 'Hothurt on screen. Wallets loosen around Hothurt.' },
            { who: 'carl', text: 'Mine tightened.' },
        ],
    },
    {
        id: 'x-symmetry-log', kind: 'sight', needsPiece: true,
        sightWhen: (v) => v.symmetry === 'Mirrored',
        beats: [
            { who: 'steven', text: '{piece} matches itself. Both sides.' },
            { who: 'mick', text: 'Symmetry. We log that.' },
            { who: 'steven', text: 'You log everything.' },
            { who: 'mick', text: 'Correct.' },
        ],
    },
    {
        id: 'x-quietpiece', kind: 'sight', needsPiece: true,
        sightWhen: (v) => v.tone === 'Hushed' || v.tone === 'Serene',
        beats: [
            { who: 'romy', text: '{piece} is a quiet one. Lower your voices.' },
            { who: 'eddie', text: 'I whisper louder than this normally.' },
        ],
    },

    /* — night shift — */
    {
        id: 'x-latenight', kind: 'night', beats: [
            { who: 'eddie', text: 'Late-night viewer. My favourite genre.' },
            { who: 'mimi', text: 'Mine too. Tired people accept offers.' },
        ],
    },
    {
        id: 'x-fated', kind: 'night', beats: [
            { who: 'celestia', text: 'The hour is thin. Whatever they buy now is fated.' },
            { who: 'steven', text: "Or it's just late." },
            { who: 'celestia', text: "That's what fated feels like." },
        ],
    },

    /* — cold opens — */
    {
        id: 'x-newface', kind: 'open', beats: [
            { who: 'eddie', text: 'New face. Nobody stare.' },
            { who: 'steven', text: 'I waved. Was that wrong?' },
            { who: 'rocco', text: 'Yes.' },
        ],
    },
    {
        id: 'x-back-file', kind: 'open', beats: [
            { who: 'mick', text: "They're back. The file grows." },
            { who: 'carl', text: "They always come back. That's the trap." },
        ],
    },
    {
        id: 'x-back-obsession', kind: 'open', beats: [
            { who: 'eddie', text: 'Back again. Bet they check on {obsession} first.' },
            { who: 'mimi', text: 'No bet.' },
        ],
    },

    /* — theme flips (they see your lights) — */
    {
        id: 'x-wentdark', kind: 'flip', beats: [
            { who: 'steven', text: 'Everything just went dark.' },
            { who: 'celestia', text: 'They turned the lights off. Intimate.' },
            { who: 'steven', text: 'I was reading.' },
        ],
    },
    {
        id: 'x-lightson', kind: 'flip', beats: [
            { who: 'rocco', text: 'Lights on. Gallery hours.' },
            { who: 'carl', text: 'My eyes.' },
        ],
    },

    /* — the 2026-07-11 wow pass: they see the SPECIFICS. Nobody says
       "we're watching" — the detail says it for them. — */
    {
        id: 'x-scrollstyle', kind: 'couch', beats: [
            { who: 'mick', text: 'They scroll in threes. Three, pause. Three, pause.' },
            { who: 'eddie', text: 'A pattern. Documented?' },
            { who: 'mick', text: 'Since Tuesday.' },
        ],
    },
    {
        id: 'x-pausecost', kind: 'couch', beats: [
            { who: 'mimi', text: 'Four-second pause on that one.' },
            { who: 'carl', text: 'Doubt.' },
            { who: 'mimi', text: 'Deposit.' },
        ],
    },
    {
        id: 'x-leanin', kind: 'couch', beats: [
            { who: 'romy', text: 'They lean in on the ones they like. Just a little.' },
            { who: 'steven', text: 'I do that with soup.' },
        ],
    },
    {
        id: 'x-goodone', kind: 'couch', needsPiece: true, beats: [
            { who: 'rocco', text: 'They stopped on the good one. Unprompted.' },
            { who: 'romy', text: 'You could tell them.' },
            { who: 'rocco', text: 'Absolutely not.' },
        ],
    },
    {
        id: 'x-sametime', kind: 'couch', beats: [
            { who: 'eddie', text: 'Same time as yesterday. Almost to the minute.' },
            { who: 'mick', text: 'It was not. But close.' },
        ],
    },
    {
        id: 'x-nickname', kind: 'couch', beats: [
            { who: 'eddie', text: "I've been calling them the Curator. In my head." },
            { who: 'rocco', text: 'Generous.' },
            { who: 'romy', text: 'It suits them.' },
        ],
    },
    {
        id: 'x-readus', kind: 'seen', beats: [
            { who: 'steven', text: 'What if they can read the bubbles.' },
            { who: 'carl', text: 'Then say something worth reading.' },
            { who: 'steven', text: '…Hi.' },
        ],
    },
    {
        id: 'x-blinked', kind: 'seen', beats: [
            { who: 'eddie', text: 'They went still just then. Tired or moved?' },
            { who: 'romy', text: 'Moved, I hope.' },
            { who: 'carl', text: 'Tired.' },
        ],
    },
    {
        id: 'x-zoomed', kind: 'seen', needsPiece: true, beats: [
            { who: 'mimi', text: 'They leaned closer. Everyone hold still.' },
            { who: 'steven', text: 'Why do we hold still for that.' },
            { who: 'mimi', text: 'Respect.' },
        ],
    },
    {
        id: 'x-screenshot', kind: 'seen', beats: [
            { who: 'eddie', text: 'Did it just flash? They kept a picture. That is evidence.' },
            { who: 'mick', text: 'Of what?' },
            { who: 'eddie', text: 'Exactly.' },
        ],
    },
    {
        id: 'x-thermostat', kind: 'drift', beats: [
            { who: 'romy', text: 'Is it cold in here?' },
            { who: 'carl', text: "It's a website." },
            { who: 'romy', text: 'Cold for a website.' },
        ],
    },
    {
        id: 'x-corner', kind: 'drift', beats: [
            { who: 'steven', text: 'I found a corner I had not seen before.' },
            { who: 'mick', text: 'Which corner.' },
            { who: 'steven', text: 'Not telling. It is my corner. …They moved, by the way.' },
        ],
    },
    {
        id: 'x-stillhere', kind: 'idle', beats: [
            { who: 'steven', text: 'Still there?' },
            { who: 'mick', text: 'Still there. Something moved eleven minutes ago.' },
            { who: 'steven', text: 'Good. I like this one.' },
        ],
    },
    {
        id: 'x-nightlog', kind: 'night', beats: [
            { who: 'mick', text: 'Night shift. The log gets weird after midnight.' },
            { who: 'celestia', text: 'The log gets honest.' },
        ],
    },
    {
        id: 'x-round2', kind: 'open', beats: [
            { who: 'rocco', text: 'Back again. The taste tour continues.' },
            { who: 'mimi', text: 'Second visits spend.' },
        ],
    },

    /* — 2026-07-16 upgrade round: more room in the room — */
    {
        id: 'x-menus', kind: 'couch', beats: [
            { who: 'eddie', text: 'They know where everything is now. Menus, maps, the book. A regular.' },
            { who: 'mick', text: 'Thirty-one days makes a regular. House rule.' },
            { who: 'eddie', text: 'Says who.' },
            { who: 'mick', text: 'The house. I write for the house.' },
        ],
    },
    {
        id: 'x-fatecheck', kind: 'couch', beats: [
            { who: 'celestia', text: 'I read the room\'s fate this morning. It was fine. Suspiciously fine.' },
            { who: 'rocco', text: 'Fine is the correct amount of fate.' },
        ],
    },
    {
        id: 'x-switchflip', kind: 'drift', beats: [
            { who: 'steven', text: 'I flipped a switch in the spell book once. Everything went purple for a week.' },
            { who: 'celestia', text: 'That was stargazing. It was the best week.' },
            { who: 'steven', text: 'It was okay.' },
        ],
    },
    {
        id: 'x-quietday', kind: 'idle', beats: [
            { who: 'romy', text: 'Nothing happening is also something happening. Slower.' },
            { who: 'carl', text: 'That is not how anything works.' },
            { who: 'romy', text: 'And yet the day passes.' },
        ],
    },
];

/* ── STREAKS — they keep opening the same colour ({color}, {n}) ────────── */

export const STREAK: Record<string, string[]> = {
    mick: ["That's {n} {color} ones in a row. Somebody check on them.", 'Another {color}. I had to start a new column.'],
    eddie: ["{n} {color} pieces straight. That's not taste, that's a signal.", "Still {color}. At this point it's a broadcast."],
    rocco: ["The {color} phase. We've all had one. Mine was shorter."],
    steven: ['They really like {color}. Same, honestly.', 'More {color}. They know what they like. Enviable.'],
    carl: ['All {color} today. It ends in a purchase. It always ends in a purchase.'],
    romy: ['A whole {color} afternoon. I get it.', 'Another {color} one. Let them have their season.'],
    mimi: ['{color}, {color}, {color}. Good. Predictable buyers are my favourite buyers.'],
    celestia: ['{color} keeps calling them. {n} times now. Threes matter.'],
};

/* ── REVISITS — they came back to the same piece ({piece}, {n}) ────────── */

export const REVISIT: Record<string, string[]> = {
    eddie: ["Back to {piece} again. That's {n} now. Something's up."],
    mimi: ["That's {n} looks at {piece}. The wanting is priced in now.", 'Back at {piece}. My offer sharpens with each look.'],
    rocco: ['{piece} again. Fine. They have one good eye.', '{n} looks at {piece}. Even I only needed two.'],
    romy: ['{n} visits to {piece}. They should just get it, honestly.'],
    mick: ['{piece}. Again. Logged.'],
    carl: ["They keep coming back to {piece}. It won't love them back."],
    steven: ["Back at {piece}. I mean, it's a good one. I get it.", 'Back at {piece} again. At this point just say hi to it.'],
    celestia: ["{piece} pulls them back. That's not a choice anymore. That's orbit.", '{n} returns to {piece}. It has them on a long line, reeling slow.'],
};

/* ── PREDICTIONS — the couch makes a call, then owns the result ────────── */

export const PREDICT_ARM: Record<string, string[]> = {
    eddie: ['Calling it now: they cave on {piece}. Witnesses everywhere.'],
    mimi: ["They'll cave on {piece}. I've seen the look."],
};
/* Hits are spoken by the caller; misses by a neighbour, on the record. */
export const PREDICT_HIT: Record<string, { who: string; text: string }[]> = {
    eddie: [{ who: 'eddie', text: 'There it is. Back at {piece}. I said it first.' }],
    mimi: [{ who: 'mimi', text: 'And there they are, back at {piece}. I know a cave when I see one coming.' }],
};
export const PREDICT_MISS: Record<string, { who: string; text: string }[]> = {
    eddie: [{ who: 'mick', text: 'For the record: Eddie was wrong about {piece}.' }],
    mimi: [{ who: 'carl', text: 'Mimi missed one. Write the date down.' }],
};

/* ── IDLE — single-line boredom (the exchanges handle the scenes) ──────── */

export const IDLE: Record<string, string[]> = {
    carl: ['Slow episode.', "Maybe they left. Maybe we're doing this for nobody. Anyway."],
    mick: ['Nothing to report. Reporting it.', "Quiet. I'm using the time to alphabetise.", 'Somebody said the margins on one of these are getting crowded. Not my department.'],
    eddie: ['They went quiet. Quiet people are reading something. What are they reading.', 'Too quiet. Check the other tabs. They have OTHER TABS.', 'I heard if you hold one long enough it shows you who held it before. Heard. Not confirmed.'],
    romy: ["Shh. They're thinking.", "They're just sitting with it. That's the best kind of looking.", 'Someone told me the art remembers every hand. I choose to believe that.'],
    mimi: ["Stillness. Someone's about to do something expensive.", "There's a rumour the colours are keeping score now. If true, the grey ones worry me."],
    celestia: ["They've gone still. A decision is circling.", 'Four corners, one colour — somewhere, someone finished the job.'],
    rocco: ['Are we boring them? Impossible.', 'People are flying FLAGS now? Nobody tells me anything.'],
    steven: ['They fell asleep, maybe. Happens to me on this couch.', "I've been watching the same pixel. It's a good pixel."],
};

/* ── PACING — they're tearing through pages ────────────────────────────── */

export const PACING: Record<string, string[]> = {
    eddie: ['Look at them go. Page, page, page. Hunting.'],
    mick: ["That's a lot of pages in a minute. Noted.", "Six pages this minute. The log's getting a workout."],
    steven: ["They scroll fast. I'd be dizzy."],
    carl: ["All that clicking. Won't help."],
    romy: ["Somebody's looking for something specific."],
    celestia: ['Circling, circling. The thing they want is behind them.'],
    rocco: ['Page, page, page. Nobody LOOKS anymore.'],
    mimi: ['Fast scroller. Fast scrollers miss the mispricings. Good.'],
};

/* ── NIGHT / MORNING — they can see your clock ─────────────────────────── */

export const NIGHT: Record<string, string[]> = {
    eddie: ['Browsing at this hour. Insomnia or information.'],
    celestia: ["Three a.m. energy, whatever the clock says. The veil's thin."],
    steven: ["It's late. I'm only up because of the chili."],
    carl: ["Can't sleep either. The market gets in the walls."],
    romy: ["They're up late. Someone get them water."],
    mimi: ['The best offers go out at night. Watch.'],
    rocco: ['Midnight taste is real taste. No audience to perform for.'],
    mick: ['Late entry. The night pages of the log are the interesting ones.'],
};
export const MORNING: Record<string, string[]> = {
    steven: ["They're on before coffee. Committed."],
    mick: ['Early session. The early ones are deliberate.'],
    romy: ['Morning person. Good for them.'],
    eddie: ['Morning check-in. Checking on WHAT though. What moved overnight.'],
    carl: ['Morning already. The floor survived the night. Probably.'],
    celestia: ['First light session. Whatever they open first matters most today.'],
};

/* ── DIRECT — rung 3, rare: they talk TO you ({name} allowed) ──────────── */

export const DIRECT: Record<string, string[]> = {
    rocco: ["Yes, you. Don't buy it because I liked it."],
    mick: ["You. You're in the notes now.", 'You. The file says nice things. Mostly.'],
    mimi: ['Take your time, {name}. I price impatience hourly.'],
    eddie: ['{name}. What do you know. You can tell me.'],
    steven: ["Hey. No pressure. It's just a website."],
    carl: ["Don't get attached. Or do. It goes the same way."],
    romy: ["You're allowed to just like it, {name}.", 'Take the long way through the gallery today, {name}. For me.'],
    celestia: ['Warm through and through, isn’t it. Hold your hand near the screen.', 'You already know which one. Go back to it.'],
};

/* ── FOURTH WALL — the crown. Once a session, names the real piece ─────── */

export const FOURTHWALL: string[] = [
    'Wait… do they know we are watching them look at {piece} right now?',
    'Hold on — who is watching us watch them?',
    'Are we on a screen right now? Is this a screen?',
    'They can see us. Right? …Right?',
    'Someone is reading this. I can feel it.',
    'I can see their reflection in {piece}. I swear I can.',
    'Do we stop existing when they close the tab? Nobody answer.',
    'They just leaned closer. Everyone act natural.',
    'Say something normal. They might be able to read this.',
    "Which side of the glass are we on. Today I genuinely can't tell.",
    'If they mute me mid-sentence, does the sentence finish somewhere?',
];

/* ── SIGHT, the quantitative read — they quote the COUNTABLE things ──────
   This is the "is there a camera?" rung: not "it's busy" but "two blue
   squares and a yellow circle." {scene} fills with the generated sentence. */

export const SIGHT_SCENE: Record<string, SightLine[]> = {
    steven: [
        { when: (v) => !!v.scene, text: '{scene}. That is literally what it is.' },
        { when: (v) => v.shapeCount === 2, text: 'Two things on it. I like when you can count them.' },
        { when: (v) => v.pattern === 'stripes', text: 'Stripes. We had a couch like that.' },
        { when: (v) => v.hasSquare, text: "There's a square in it. Solid choice, the square." },
    ],
    mick: [
        { when: (v) => !!v.scene, text: '{scene}. I counted. It checks out.' },
        { when: (v) => v.shapeCount >= 5, text: '{n} shapes in that one. Somebody had a productive day.' },
        { when: (v) => v.pattern === 'field', text: 'A field of the same shape, over and over. The old-timers loved a field.' },
    ],
    eddie: [
        { when: (v) => !!v.scene && v.shapeCount >= 2, text: '{scene}. Count them yourself. Then ask why that number.' },
        { when: (v) => v.hasCircle, text: "See the circle? Circles are always a message. Always." },
        { when: (v) => v.pattern === 'scatter', text: 'All those little bits, scattered. Scattered by WHO.' },
    ],
    rocco: [
        { when: (v) => !!v.scene && v.shapeCount <= 3, text: '{scene}. Nothing extra. Correct.' },
        { when: (v) => v.pattern === 'field', text: 'The same shape, repeated until it means something. Old trick. Works.' },
    ],
    romy: [
        { when: (v) => !!v.scene, text: '{scene}. Sometimes it can just be that, and that is plenty.' },
        { when: (v) => v.hasCircle, text: 'The circle in it is very calm. I keep looking at it.' },
    ],
    carl: [
        { when: (v) => !!v.scene && v.shapeCount === 1, text: '{scene}. One thing, alone. I relate to it.' },
        { when: (v) => v.pattern === 'scatter', text: 'A scatter. That used to be one whole thing, probably.' },
    ],
    mimi: [
        { when: (v) => !!v.scene && v.shapeCount <= 2, text: '{scene}. Simple reads sell fast. Noted.' },
        { when: (v) => v.pattern === 'stripes', text: 'Stripes photograph well. Thumbnails move stripes.' },
    ],
    celestia: [
        { when: (v) => v.hasCircle, text: 'That circle is watching them back. They can feel it. Look.' },
        { when: (v) => !!v.scene && v.shapeCount === 3, text: 'Three shapes. Threes are never an accident.' },
        { when: (v) => v.pattern === 'stripes', text: 'Bars. A gate, or a cage. Depends which side you stand.' },
    ],
};

/* ── ACTIONS — they react to what you DO, through each lens ──────────────
   `when` gets the current Sight (or null) + how many of this action they've
   watched this session; convergence lines light up when action × piece ×
   pattern line up. {n} fills with the count. */

export interface ActionLine {
    who: string;
    text: string;
    when?: (v: Sight | null, n: number) => boolean;
}

export const ACTION_LINES: Record<string, ActionLine[]> = {
    star: [
        { who: 'mick', text: 'Starred. Logged.' },
        { who: 'romy', text: 'They starred it. Good. It deserved a little something.' },
        { who: 'rocco', text: 'A star. Generous. Not wrong, this time.' },
        { who: 'eddie', text: 'Starred, not wishlisted. Keeping it quiet. Interesting.' },
        { who: 'mick', text: "That's {n} stars today. The ledger grows.", when: (_v, n) => n >= 3 },
        { who: 'steven', text: 'They star a lot of stuff. I respect the enthusiasm.', when: (_v, n) => n >= 5 },
        { who: 'mimi', text: 'Starring the {color} one. Their taste is getting expensive.', when: (v) => !!v?.bucket },
        { who: 'celestia', text: 'A star. Small light, correctly placed.' },
        { who: 'carl', text: 'Starred. A little hope. Filed with the others.' },
    ],
    unstar: [
        { who: 'carl', text: 'Un-starred. The cooling begins.' },
        { who: 'rocco', text: 'Taste is editing. Fine.' },
        { who: 'mick', text: 'Star retracted. Also logged.' },
    ],
    wishlist: [
        { who: 'mimi', text: 'On the wishlist. Wanting is step one. I sell to step three.' },
        { who: 'eddie', text: 'Wishlisted. That list says more than any profile.' },
        { who: 'carl', text: 'Wishlisted. The wanting is the good part. It goes downhill from owning.' },
        { who: 'romy', text: 'On the list. I hope they get it, honestly.' },
        { who: 'celestia', text: 'Wishlisted. Wanting leaves a mark on a piece. That one is marked now.' },
        { who: 'rocco', text: 'Wishlisted. The polite way to stare.' },
        { who: 'eddie', text: 'They wishlisted {piece}. You saw it. I saw it.', when: (v) => !!v },
        { who: 'mimi', text: 'Wishlisting the rare one. Everyone wants the rare one. Few pay.', when: (v) => (v?.rarity ?? 0) >= 80 },
        { who: 'steven', text: "That's {n} wishlists today. Big dreams. Same, though.", when: (_v, n) => n >= 3 },
    ],
    unwishlist: [
        { who: 'mimi', text: 'Off the wishlist. The wanting died. It happens fast.' },
        { who: 'carl', text: 'De-wishlisted. Wise. Or broke. Same look.' },
        { who: 'mick', text: 'Removed from the list. The list remembers anyway. I make sure.' },
    ],
    cart: [
        { who: 'eddie', text: 'In the cart. Carts talk. Checkouts whisper.' },
        { who: 'mimi', text: 'Cart. Now we count the minutes until doubt.' },
        { who: 'carl', text: 'Added to cart. The regret is also in the cart. It rides free.' },
        { who: 'steven', text: 'In the cart. I leave stuff in carts for months. No shame.' },
        { who: 'romy', text: 'It went in the cart. Get it. Life is short and the art is good.' },
        { who: 'mimi', text: '{n} in the cart now. Someone is building up the nerve.', when: (_v, n) => n >= 3 },
        { who: 'rocco', text: 'The cart. Where taste meets accounting.' },
    ],
    bench: [
        { who: 'steven', text: 'On the bench. Benched art. This site is a lot sometimes.' },
        { who: 'eddie', text: 'Benched. The bench is where decisions go to think.' },
        { who: 'rocco', text: 'The bench. Purgatory with better lighting.' },
        { who: 'mimi', text: 'Benched. Half-decisions. I do my best work against half-decisions.' },
    ],
    grail: [
        { who: 'rocco', text: 'A grail pin. Bold word, grail. Let it earn it.' },
        { who: 'celestia', text: 'Pinned as a grail. Naming a grail out loud changes things. They will see.' },
        { who: 'eddie', text: 'Grail pinned. Now THAT is information.' },
        { who: 'mimi', text: 'A grail pin. So that is the one they would never sell. Noted. Everything sells.' },
        { who: 'romy', text: 'They pinned a grail. Everyone should have one. That is the whole religion.' },
        { who: 'carl', text: 'A grail. Something to lose. Congratulations.' },
        { who: 'steven', text: 'A grail pin. I feel that way about the lawnmower.' },
    ],
    ungrail: [
        { who: 'carl', text: 'De-pinned. Even grails end. Told you.' },
        { who: 'eddie', text: 'The grail fell. Something happened. What happened.' },
    ],
    album: [
        { who: 'romy', text: 'Into an album. A little collection inside the collection. Sweet.' },
        { who: 'mick', text: 'Filed into an album. A sorter. My kind of viewer.' },
        { who: 'rocco', text: 'Albums. Curation. Someone is taking this seriously. Good.' },
        { who: 'steven', text: 'An album. Like a photo book. I miss photo books.' },
    ],
    todo: [
        { who: 'steven', text: 'They put art on a to-do list. I put the lawn on mine. Same energy.' },
        { who: 'mick', text: 'On the to-do list. Lists get done here. Sometimes.' },
        { who: 'carl', text: 'A to-do. The road to the graveyard of intentions. Nice one though.' },
        { who: 'eddie', text: "A to-do. A DEADLINE. Something's coming." },
    ],
    note: [
        { who: 'eddie', text: 'They wrote a note on it. Private thoughts. I would pay for those.' },
        { who: 'mick', text: 'A note. Someone else keeps records. I feel less alone.' },
        { who: 'celestia', text: 'They wrote something on it. Words stick to pieces. Choose them well.' },
        { who: 'romy', text: "A note on it. Little love letters. That's what those are." },
        { who: 'steven', text: 'They wrote a note. I never know what to write.' },
    ],
    follow: [
        { who: 'romy', text: 'Followed. The graph grows by one. That is how villages start.' },
        { who: 'eddie', text: 'A follow. Alliances forming. I keep a chart.' },
        { who: 'mimi', text: 'Following. Attention is a currency. They just spent some.' },
    ],
    unfollow: [
        { who: 'eddie', text: 'An unfollow. Ice cold. What do they know.' },
        { who: 'carl', text: 'Unfollowed. All bonds loosen. Some just do it quietly.' },
        { who: 'mick', text: 'Unfollowed. The graph shrinks by one. Recorded.' },
    ],
    mint: [
        { who: 'romy', text: 'They MINTED. Everyone hush. This is the good part.' },
        { who: 'eddie', text: 'A mint. Right in front of us. I love this show.' },
        { who: 'mick', text: 'A mint, witnessed live. Straight into the permanent record.' },
        { who: 'carl', text: 'Minted. May it treat them better than mine treated me.' },
        { who: 'celestia', text: 'A mint. A birth chart just got written. I will read it later.' },
        { who: 'rocco', text: 'They minted. Fine instinct. Do not tell them I said that.' },
        { who: 'mimi', text: 'Minted at the source. The only honest price in the building.' },
        { who: 'steven', text: 'They minted one. Clapping quietly over here.' },
        { who: 'eddie', text: 'Another mint. That is {n} today. Somebody feels something.', when: (_v, n) => n >= 2 },
    ],
    buy: [
        { who: 'mimi', text: 'Bought. Off the secondary, full price. Conviction or impatience.' },
        { who: 'eddie', text: 'A buy. Someone somewhere just exhaled.' },
        { who: 'romy', text: 'They bought it. It found its person. That is the whole story.' },
        { who: 'carl', text: 'Bought. Somewhere a seller is either laughing or crying. No third option.' },
        { who: 'eddie', text: "Bought. No hesitation. THAT'S the tell.", when: (_v, n) => n >= 2 },
        { who: 'steven', text: 'They bought it. Warm feeling. Like when the mail comes.' },
    ],
    sell: [
        { who: 'carl', text: 'Sold. It begins: the checking of the price, forever, after.' },
        { who: 'mimi', text: 'A sale. Now watch if they regret it. They always look back once.' },
        { who: 'rocco', text: 'Sold. Letting go is also taste.' },
        { who: 'mick', text: 'Sold. The provenance grows a line. That is all history is.' },
        { who: 'eddie', text: 'Sold. Watch what they do with the money. The money TELLS you.' },
    ],
    listed: [
        { who: 'eddie', text: 'A listing. The number tells a story. I am reading it now.' },
        { who: 'mimi', text: 'Listed. Now I get to decide if that price is a joke.' },
        { who: 'carl', text: 'Listed. And now, the waiting. The long, honest waiting.' },
        { who: 'rocco', text: 'Listed. Pricing your own taste. Braver than it looks.' },
        { who: 'steven', text: 'They listed one. Sale sign on the lawn.' },
    ],
    offer: [
        { who: 'mimi', text: 'An offer went out. Aggressive. I approve of the shape of it.' },
        { who: 'eddie', text: 'They made an offer. Somewhere a phone just lit up.' },
        { who: 'rocco', text: 'An offer. Negotiation is an art form nobody frames.' },
        { who: 'carl', text: 'An offer. Hope, with a number on it.' },
    ],
    sweep: [
        { who: 'mimi', text: 'A SWEEP. Now that is how you announce yourself.' },
        { who: 'eddie', text: 'They swept. Multiple pieces, one move. That gets talked about.' },
        { who: 'mick', text: 'A sweep, logged in full. Days like this are why I keep the book.' },
        { who: 'celestia', text: 'A sweep. The tide came in with intent today.' },
    ],
    colorway: [
        { who: 'celestia', text: 'They changed the colours of the whole world. As one does.' },
        { who: 'steven', text: 'New colours. I liked the old ones. I will like these too.' },
        { who: 'rocco', text: 'A new colorway. Redecorating mid-session. Confidence.' },
        { who: 'romy', text: 'They repainted the room. It suits them, whatever it is.' },
        { who: 'mimi', text: 'New wall colours. Redecorating precedes purchases. Usually.' },
    ],
    achievement: [
        { who: 'mick', text: 'An achievement. Into the record it goes.' },
        { who: 'romy', text: 'They unlocked something. Small trumpet sounds.' },
        { who: 'eddie', text: 'An achievement popped. I heard it from here.' },
        { who: 'carl', text: 'An achievement. Enjoy the dopamine. It has a half-life.' },
        { who: 'steven', text: 'An achievement. I clapped. Nobody saw.' },
    ],
    zen: [
        { who: 'steven', text: 'Zen mode. Smart. This place gets loud.' },
        { who: 'celestia', text: 'They cleared the room to be alone with it. Correct ritual.' },
        { who: 'rocco', text: 'Zen mode. Just the art. The only setting that matters.' },
        { who: 'carl', text: 'They hid everything. Including us. …Fair.' },
        { who: 'mimi', text: 'Zen mode. Fewer distractions, cleaner reads. Dangerous shopper.' },
    ],
};

/* Action scenes — the couch reacts TOGETHER to the big moves. */
export const ACTION_EXCHANGES: Record<string, Exchange[]> = {
    mint: [
        {
            id: 'ax-mint-toast', kind: 'couch', beats: [
                { who: 'romy', text: 'They minted! A toast.' },
                { who: 'steven', text: 'I have soup.' },
                { who: 'romy', text: 'To the soup, then.' },
            ],
        },
        {
            id: 'ax-mint-record', kind: 'couch', beats: [
                { who: 'mick', text: 'Mint, witnessed, logged.' },
                { who: 'eddie', text: 'You log everything.' },
                { who: 'mick', text: 'And yet you always ask me for the notes.' },
            ],
        },
    ],
    wishlist: [
        {
            id: 'ax-wish-bet', kind: 'couch', beats: [
                { who: 'eddie', text: 'Wishlisted. They always cave after the wishlist.' },
                { who: 'carl', text: 'Or it sits there forever. Like mine.' },
                { who: 'eddie', text: 'You are not the standard, Carl.' },
            ],
        },
    ],
    cart: [
        {
            id: 'ax-cart-watch', kind: 'couch', beats: [
                { who: 'mimi', text: 'Cart. Watch the hesitation window.' },
                { who: 'steven', text: 'Maybe they just like carts.' },
                { who: 'mimi', text: 'Nobody just likes carts.' },
            ],
        },
    ],
    grail: [
        {
            id: 'ax-grail-named', kind: 'couch', beats: [
                { who: 'celestia', text: 'They named a grail. Say nothing for a moment.' },
                { who: 'eddie', text: '…Okay the moment is over, WHICH one—' },
            ],
        },
    ],
    sweep: [
        {
            id: 'ax-sweep-gasp', kind: 'couch', beats: [
                { who: 'eddie', text: 'A sweep. A SWEEP.' },
                { who: 'rocco', text: 'Composure, Eddie.' },
                { who: 'eddie', text: 'I am composed. A SWEEP though.' },
            ],
        },
    ],
    sell: [
        {
            id: 'ax-sell-watch', kind: 'couch', beats: [
                { who: 'mimi', text: 'They sold. Now we see if they check the price tomorrow.' },
                { who: 'carl', text: 'They will. Everyone does. It is the tax.' },
            ],
        },
    ],
};

/* Buy bets — a wishlist arms a call; the mint/buy resolves it on camera. */
export const BUYBET_ARM: Record<string, string[]> = {
    eddie: ['Wishlisted {piece}. Calling it now: they buy. Witnesses everywhere.'],
    mimi: ["Wishlisted {piece}. They'll pay for it eventually. They always pay."],
};
export const BUYBET_HIT: Record<string, { who: string; text: string }[]> = {
    eddie: [{ who: 'eddie', text: 'BOUGHT. From wishlist to wallet. I called {piece}, and the wall heard me.' }],
    mimi: [{ who: 'mimi', text: 'And they paid for {piece}. Like I said. Wanting has a price.' }],
};
export const BUYBET_MISS: Record<string, { who: string; text: string }[]> = {
    eddie: [{ who: 'mick', text: 'For the record: {piece} stayed wishlisted. Eddie logged another miss.' }],
    mimi: [{ who: 'carl', text: 'Mimi called a cave on {piece}. Still standing. Huh.' }],
};

/* ── DUETS — pre-written halves that assemble into whole scenes ──────────
   Openers are gated by what's actually true on screen; any reply sharing the
   topic (different speaker) can answer. ~40 openers × topic-matched replies
   = hundreds of distinct two-beat scenes from curated parts, before template
   fills. This is where the bank stops being a list and becomes a room. */

export interface DuetOpener {
    who: string;
    text: string;
    topic: string;
    when?: (v: Sight | null) => boolean;
}
export interface DuetReply {
    who: string;
    text: string;
    topics: string[];
}

export const DUET_OPENERS: DuetOpener[] = [
    /* piece-gated */
    { who: 'rocco', topic: 'loud', when: (v) => v?.tone === 'Electric' || v?.saturation === 'Vivid', text: 'Loud one.' },
    { who: 'mimi', topic: 'loud', when: (v) => v?.tone === 'Electric', text: 'Loud sells. Say what you want.' },
    { who: 'steven', topic: 'loud', when: (v) => v?.saturation === 'Vivid', text: 'That one is really going for it.' },
    { who: 'carl', topic: 'dark', when: (v) => v?.brightness === 'Dark' || v?.brightness === 'Dim', text: 'Dark one. Feels honest.' },
    { who: 'celestia', topic: 'dark', when: (v) => v?.brightness === 'Dark', text: 'All shadow. Good bones under it.' },
    { who: 'eddie', topic: 'dark', when: (v) => v?.brightness === 'Dark', text: 'Dark piece. Dark pieces get dark buyers.' },
    { who: 'rocco', topic: 'empty', when: (v) => v?.air === 'Vast' || v?.complexity === 'Minimal', text: 'Nearly nothing on it. Which is everything.' },
    { who: 'steven', topic: 'empty', when: (v) => v?.air === 'Vast', text: 'A lot of nothing in that one. Restful.' },
    { who: 'mick', topic: 'busy', when: (v) => v?.complexity === 'Busy' || v?.complexity === 'Detailed', text: 'Busy one. Long write-up.' },
    { who: 'romy', topic: 'busy', when: (v) => v?.complexity === 'Busy', text: 'So much going on in there. Happily, though.' },
    { who: 'eddie', topic: 'rare', when: (v) => (v?.rarity ?? 0) >= 80, text: 'That is the rare one. Confirmed.' },
    { who: 'mimi', topic: 'rare', when: (v) => (v?.rarity ?? 0) >= 80, text: 'Rare one on screen. Wallets out.' },
    { who: 'steven', topic: 'shapes', when: (v) => !!v?.scene, text: '{scene}. Just saying what I see.' },
    { who: 'mick', topic: 'shapes', when: (v) => (v?.shapeCount ?? 0) >= 2, text: '{scene}. Counted twice.' },
    { who: 'celestia', topic: 'shapes', when: (v) => !!v?.hasCircle, text: 'The circle in that one knows something.' },
    /* always-available */
    { who: 'eddie', topic: 'watching', text: 'They are up to something. I feel it in the scroll.' },
    { who: 'mimi', topic: 'watching', text: 'Quiet viewer today. The quiet ones buy big.' },
    { who: 'carl', topic: 'watching', text: 'They look happy. That never lasts here.' },
    { who: 'romy', topic: 'watching', text: 'I think they are having a nice time. Look at the pace.' },
    { who: 'mick', topic: 'watching', text: 'Steady session. The steady ones build the real collections.' },
    { who: 'rocco', topic: 'taste', text: 'Their taste is improving. Slowly. But improving.' },
    { who: 'celestia', topic: 'taste', text: 'They are circling something important. They do not know it yet.' },
    { who: 'steven', topic: 'smalltalk', text: 'Anyone know if it is supposed to rain?' },
    { who: 'carl', topic: 'smalltalk', text: 'My knee says the floor drops this week.' },
    { who: 'romy', topic: 'smalltalk', text: 'I rearranged my corner today. Feels bigger.' },
    { who: 'eddie', topic: 'smalltalk', text: 'I heard something about somebody. That is all I can say.' },
    /* — 2026-07-11 wow pass: new topics + more halves — */
    { who: 'rocco', topic: 'wide', when: (v) => v?.orientation === 'Landscape', text: 'Wide one. Cinema pretensions.' },
    { who: 'steven', topic: 'wide', when: (v) => v?.orientation === 'Landscape', text: 'That would go long over a bed.' },
    { who: 'mimi', topic: 'warm', when: (v) => v?.warmth === 'Warm' || v?.warmth === 'Molten', text: 'Warm palette. Comfort pricing applies.' },
    { who: 'romy', topic: 'warm', when: (v) => v?.warmth === 'Warm' || v?.warmth === 'Molten', text: 'Warm right through. Like it was left in the sun.' },
    { who: 'carl', topic: 'cold', when: (v) => v?.warmth === 'Cold' || v?.warmth === 'Cool', text: 'Cold one. Suits the times.' },
    { who: 'celestia', topic: 'cold', when: (v) => v?.warmth === 'Cold', text: 'A cold piece. It is conserving something.' },
    { who: 'eddie', topic: 'tilt', when: (v) => v?.symmetry === 'Askew' || v?.symmetry === 'Leaning', text: 'It leans. Deliberately. Toward WHAT.' },
    { who: 'steven', topic: 'tilt', when: (v) => v?.symmetry === 'Askew', text: 'It leans a bit. I keep straightening my head for it.' },
    { who: 'rocco', topic: 'grain', when: (v) => v?.texture === 'Grainy' || v?.texture === 'Textured', text: 'Grain again. Nostalgia is cheap and everyone is buying.' },
    { who: 'romy', topic: 'grain', when: (v) => v?.texture === 'Grainy' || v?.texture === 'Textured', text: 'It has tooth to it. Real-paper feeling.' },
    { who: 'mick', topic: 'centered', when: (v) => v?.gravity === 'Centered', text: 'Dead centre composition. Textbook.' },
    { who: 'celestia', topic: 'watching', text: 'Their attention has a shape today. Rounder than usual.' },
    { who: 'carl', topic: 'watching', text: 'They are deciding something. The scroll got careful.' },
    { who: 'steven', topic: 'watching', text: 'They have been on this page a while. It is a good page.' },
    { who: 'mimi', topic: 'taste', text: 'Their taste got expensive lately. I track these things.' },
    /* — 2026-07-16 upgrade round — */
    { who: 'eddie', topic: 'smalltalk', text: 'Somebody forged a Sigil this week. Not saying who. It was tasteful.' },
    { who: 'mick', topic: 'watching', text: 'They use the tools now. Composer, the map. The file says: settled in.' },
    { who: 'romy', topic: 'smalltalk', text: 'The morning paper had a nice line in it today. I read it twice.' },
    { who: 'celestia', topic: 'smalltalk', text: 'The moon is doing the thing again. The one from March.' },
];

export const DUET_REPLIES: DuetReply[] = [
    { who: 'romy', topics: ['loud'], text: 'It is allowed to be loud.' },
    { who: 'carl', topics: ['loud'], text: 'It will quiet down. Everything does.' },
    { who: 'rocco', topics: ['loud'], text: 'Volume is not the same as voice.' },
    { who: 'steven', topics: ['loud', 'dark', 'busy'], text: 'I would still hang it.' },
    { who: 'mick', topics: ['loud', 'rare'], text: 'Noted either way.' },
    { who: 'romy', topics: ['dark'], text: 'Somebody will love it for exactly that.' },
    { who: 'steven', topics: ['dark'], text: 'Good for a hallway.' },
    { who: 'mimi', topics: ['dark'], text: 'Dark sits on the market. Patience money only.' },
    { who: 'rocco', topics: ['empty'], text: 'Restraint. Finally.' },
    { who: 'carl', topics: ['empty'], text: 'Empty now. Emptier later.' },
    { who: 'eddie', topics: ['empty'], text: 'Empty space is where they hide things. Allegedly.' },
    { who: 'carl', topics: ['busy'], text: 'All that effort. Same floor as everything else.' },
    { who: 'rocco', topics: ['busy'], text: 'Too much. Edit.' },
    { who: 'celestia', topics: ['busy'], text: 'Every mark in there was meant. Probably.' },
    { who: 'steven', topics: ['rare'], text: 'Looks like the other ones. But okay.' },
    { who: 'carl', topics: ['rare'], text: 'Rare. So was everything, once.' },
    { who: 'romy', topics: ['rare'], text: 'It would be just as good common.' },
    { who: 'eddie', topics: ['rare'], text: 'And they found it FAST. Ask me how.' },
    { who: 'romy', topics: ['shapes'], text: 'It can just be that. That is plenty.' },
    { who: 'eddie', topics: ['shapes'], text: 'Count again. There is always one more.' },
    { who: 'carl', topics: ['shapes'], text: 'Shapes now. Fragments later.' },
    { who: 'rocco', topics: ['shapes'], text: 'Countable. Honest. Fine.' },
    { who: 'steven', topics: ['watching'], text: 'Or they are just scrolling. People scroll.' },
    { who: 'carl', topics: ['watching'], text: 'Something always happens. Then something worse.' },
    { who: 'mick', topics: ['watching'], text: 'Whatever it is, it is going in the notes.' },
    { who: 'celestia', topics: ['watching'], text: 'Let them circle. The circling is the finding.' },
    { who: 'romy', topics: ['watching'], text: 'Leave them be. They are doing great.' },
    { who: 'romy', topics: ['taste'], text: 'It was always fine. You are just warming up to them.' },
    { who: 'eddie', topics: ['taste'], text: 'Improving toward WHAT though. Watch the pattern.' },
    { who: 'carl', topics: ['taste'], text: 'Taste peaks. Then the wallet catches up and ruins it.' },
    { who: 'steven', topics: ['smalltalk'], text: 'Huh.' },
    { who: 'mick', topics: ['smalltalk'], text: 'That is not going in the notes.' },
    { who: 'rocco', topics: ['smalltalk'], text: 'Riveting programming, this.' },
    { who: 'eddie', topics: ['smalltalk'], text: 'Wait. Say that again slower.' },
    { who: 'celestia', topics: ['smalltalk'], text: 'The cards said someone would say that today.' },
    { who: 'mimi', topics: ['smalltalk'], text: 'Is any of this actionable. No? Carry on.' },
    /* — 2026-07-11 wow pass — */
    { who: 'mimi', topics: ['wide'], text: 'Wide hangs over furniture. Furniture people pay.' },
    { who: 'carl', topics: ['wide'], text: 'More room to fade.' },
    { who: 'romy', topics: ['wide'], text: 'A view, basically. Some pieces are views.' },
    { who: 'carl', topics: ['warm'], text: 'Warm now.' },
    { who: 'steven', topics: ['warm'], text: 'Feels like a kitchen.' },
    { who: 'celestia', topics: ['warm'], text: 'It kept some of the sun it was made under.' },
    { who: 'romy', topics: ['cold'], text: 'Somebody runs hot. It will balance.' },
    { who: 'mimi', topics: ['cold'], text: 'Cold waits. I wait better.' },
    { who: 'steven', topics: ['cold'], text: 'Good in summer, maybe.' },
    { who: 'rocco', topics: ['tilt'], text: 'A lean is a stance.' },
    { who: 'mick', topics: ['tilt'], text: 'Logged at roughly four degrees.' },
    { who: 'romy', topics: ['tilt'], text: 'The crooked ones feel handmade.' },
    { who: 'carl', topics: ['tilt'], text: 'It will settle. Everything settles.' },
    { who: 'mick', topics: ['grain'], text: 'Grain files badly. Gets everywhere.' },
    { who: 'steven', topics: ['grain'], text: 'Sandy.' },
    { who: 'celestia', topics: ['grain'], text: 'Static from somewhere else.' },
    { who: 'rocco', topics: ['centered'], text: 'The safe seat.' },
    { who: 'eddie', topics: ['centered'], text: 'Centred means LOOK HERE. So look elsewhere.' },
    { who: 'carl', topics: ['centered'], text: 'The middle holds until it does not.' },
    { who: 'mimi', topics: ['watching'], text: 'Careful scrolls precede receipts.' },
    { who: 'eddie', topics: ['watching'], text: 'I noticed it too. Before anyone. For the record.' },
    { who: 'mick', topics: ['taste'], text: 'The record supports it.' },
    { who: 'mimi', topics: ['taste'], text: 'Expensive taste keeps this room lit.' },
    /* — 2026-07-16 upgrade round — */
    { who: 'carl', topics: ['smalltalk'], text: 'If it\'s good news, wait.' },
    { who: 'romy', topics: ['smalltalk'], text: 'That\'s nice. I mean it, whatever it was.' },
    { who: 'steven', topics: ['watching'], text: 'Regulars are good. I\'m a regular somewhere too.' },
    { who: 'eddie', topics: ['watching'], text: 'Settled-in viewers make MOVES. Stay sharp.' },
];

/* ── SPELL NOTICE — the cast clocks a spell flipping the room (2026-07-16).
   Once per session per spell (director-gated). Celestia leads the celestial
   ones — the birth skies and the stargazing purple are HER weather. ──────── */

export const SPELL_NOTICE: Record<'celestial' | 'stargazing', { who: string; text: string }[]> = {
    celestial: [
        { who: 'celestia', text: "They turned on the birth skies. Finally. I've been reading them alone for months." },
        { who: 'celestia', text: 'Moons on the artworks. They can see what I see now. Some of it.' },
        { who: 'celestia', text: 'The Celestial Tracker is on. Every piece wears its mint moon now. Told you they all had one.' },
        { who: 'eddie', text: "They switched on the moon tracker. Celestia's been insufferable for about nine seconds." },
        { who: 'steven', text: "There are little moons on the art now. That's a setting, apparently. It's kind of nice." },
        { who: 'romy', text: 'They turned on the little moons. Every piece gets its own sky. Sweetest switch in the book.' },
        { who: 'carl', text: 'Birth skies, on. Now the art has horoscopes. Sure. Why not.' },
    ],
    stargazing: [
        { who: 'celestia', text: 'They turned the whole sky on. Stargazing. Correct. The stars appreciate an audience.' },
        { who: 'celestia', text: 'The room went night. Every star up there is exactly where I left it.' },
        { who: 'steven', text: "Everything's purple and there are stars now. I don't hate it." },
        { who: 'carl', text: "Stars everywhere. Pretty. You still can't see the floor from up there." },
        { who: 'eddie', text: "The room went full night sky. A shooting star just crossed. I'm counting them. Three so far." },
        { who: 'mick', text: 'Stargazing mode. Three hundred and eighty stars, if my count holds. It holds.' },
        { who: 'romy', text: 'They put the stars on. Everyone hush a minute.' },
    ],
};

/* ── LOYALTY — after a resident adopts you (the favourites form) ────────── */

export const ADOPTION_SCENES: Record<string, Exchange> = {
    rocco: {
        id: 'adopt-rocco', kind: 'couch', beats: [
            { who: 'rocco', text: 'I do not say this often. They have the eye.' },
            { who: 'eddie', text: 'Rocco LIKES one. Somebody write the date down.' },
            { who: 'mick', text: 'Done.' },
        ],
    },
    mick: {
        id: 'adopt-mick', kind: 'couch', beats: [
            { who: 'mick', text: 'This one reads like a keeper of records. I am claiming them.' },
            { who: 'steven', text: 'Can you do that?' },
            { who: 'mick', text: 'It is in the notes now. So yes.' },
        ],
    },
    mimi: {
        id: 'adopt-mimi', kind: 'couch', beats: [
            { who: 'mimi', text: 'This viewer has teeth. I like them.' },
            { who: 'carl', text: 'That is how she compliments people. Run.' },
        ],
    },
    steven: {
        id: 'adopt-steven', kind: 'couch', beats: [
            { who: 'steven', text: 'This one likes the blue ones. We are basically friends now.' },
            { who: 'rocco', text: 'That is not how taste works.' },
            { who: 'steven', text: 'It is exactly how it works.' },
        ],
    },
    eddie: {
        id: 'adopt-eddie', kind: 'couch', beats: [
            { who: 'eddie', text: 'This viewer sees the angles. My kind of people.' },
            { who: 'mimi', text: 'You say that about everyone with a wallet.' },
            { who: 'eddie', text: 'And I have been right every time.' },
        ],
    },
    carl: {
        id: 'adopt-carl', kind: 'couch', beats: [
            { who: 'carl', text: 'They keep picking the dark ones. Finally, somebody sensible.' },
            { who: 'romy', text: 'Carl made a friend.' },
            { who: 'carl', text: 'Do not ruin it.' },
        ],
    },
    romy: {
        id: 'adopt-romy', kind: 'couch', beats: [
            { who: 'romy', text: 'Okay, I love this one. The way they look at things.' },
            { who: 'carl', text: 'You love everyone.' },
            { who: 'romy', text: 'Especially this one.' },
        ],
    },
    celestia: {
        id: 'adopt-celestia', kind: 'couch', beats: [
            { who: 'celestia', text: 'The cards keep turning this viewer up. I accept.' },
            { who: 'steven', text: 'Accept what?' },
            { who: 'celestia', text: 'They know.' },
        ],
    },
};

/* Loyalty lines — the adopted viewer's resident warms up (sparingly). */
export const LOYAL: Record<string, string[]> = {
    rocco: [
        'They looked past the popular one. Told you about this viewer.',
        "Watch them work. No, actually watch. That's how it's done.",
        'My viewer. Decent eye. I said what I said the day I said it.',
    ],
    mick: [
        'My regular is back on the record. The file thickens agreeably.',
        'They browse like an archivist. I trained them, in spirit.',
        'Whatever they open next, log it double. This one matters.',
    ],
    mimi: [
        'My one is circling again. Watch and learn, everyone.',
        'They hover like a professional now. I take partial credit.',
        'Nobody lowball my viewer. That is my job.',
    ],
    steven: [
        'My buddy is here. The blue-liker.',
        'They looked at a blue one. Attaboy.',
        "Me and this one get it. It's not complicated.",
    ],
    eddie: [
        'My source is on the move. Everyone act like you see nothing.',
        'This viewer finds things BEFORE I hear about them. Unsettling. Wonderful.',
        'Protect this one. They see the angles.',
    ],
    carl: [
        'The sensible one is back. Dark taste, clear mind.',
        'They understand. About the ending being in everything. My people.',
        'If they buy something, it might actually be fine. Might.',
    ],
    romy: [
        'There they are. Best viewer on this feed and I will say it out loud.',
        'They lingered on the little one again. See? Heart.',
        'Whatever they end up collecting, it will be loved right.',
    ],
    celestia: [
        'Mine is here. The one the cards keep mentioning.',
        'They feel the pieces before they read them. Rare gift.',
        'Something good circles this viewer. I lit a candle about it.',
    ],
};

/* ── THE CROSSOVER — once EVER: the cast notices your Familiar ──────────
   {familiar} fills with the actual species name on screen. */

/* ── MUTE — someone just got silenced, and the couch saw it happen ──────
   {mute} fills with the muted resident's name. The survivors keep it classy. */

export const MUTE_REACTS: Exchange[] = [
    {
        id: 'mute-lucky', kind: 'couch', beats: [
            { who: 'mick', text: 'They muted {mute}.' },
            { who: 'carl', text: '…Lucky.' },
        ],
    },
    {
        id: 'mute-canthey', kind: 'couch', beats: [
            { who: 'eddie', text: 'They MUTED {mute}. Can they do that?' },
            { who: 'steven', text: 'Apparently.' },
        ],
    },
    {
        id: 'mute-behave', kind: 'couch', beats: [
            { who: 'romy', text: '{mute} got muted. Everyone behave.' },
            { who: 'rocco', text: 'I always behave. That was the problem with {mute}.' },
        ],
    },
    {
        id: 'mute-notes', kind: 'couch', beats: [
            { who: 'mick', text: '{mute}: silenced by viewer request. Logged.' },
            { who: 'mimi', text: 'Fewer voices. More margin for the rest of us.' },
        ],
    },
];

export const XOVER_SCENES: Exchange[] = [
    {
        id: 'xover-creature', kind: 'seen', beats: [
            { who: 'steven', text: 'There is a little creature on their screen. It just looked at me.' },
            { who: 'eddie', text: 'Nobody make eye contact.' },
            { who: 'celestia', text: 'That is a {familiar}. It was here before us. Show respect.' },
        ],
    },
    {
        id: 'xover-knows', kind: 'seen', beats: [
            { who: 'mick', text: 'The little {familiar} they keep. It knows things about them we never will.' },
            { who: 'carl', text: 'It never blinks, either. I checked.' },
        ],
    },
    {
        id: 'xover-wave', kind: 'seen', beats: [
            { who: 'romy', text: 'I waved at their {familiar} earlier.' },
            { who: 'steven', text: 'Did it wave back?' },
            { who: 'romy', text: 'It KNEW. That counts.' },
        ],
    },
];
