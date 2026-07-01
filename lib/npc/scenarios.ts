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
 * Template slots: {piece} {project} {name} {color} {accent} {n} {obsession}.
 * Lines carrying {name} are dropped when you're logged out; the rest use
 * "they/them" — the cast talking about you, not at you.
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
];

/* ── STREAKS — they keep opening the same colour ({color}, {n}) ────────── */

export const STREAK: Record<string, string[]> = {
    mick: ["That's {n} {color} ones in a row. Somebody check on them."],
    eddie: ["{n} {color} pieces straight. That's not taste, that's a signal."],
    rocco: ["The {color} phase. We've all had one. Mine was shorter."],
    steven: ['They really like {color}. Same, honestly.'],
    carl: ['All {color} today. It ends in a purchase. It always ends in a purchase.'],
    romy: ['A whole {color} afternoon. I get it.'],
    mimi: ['{color}, {color}, {color}. Good. Predictable buyers are my favourite buyers.'],
    celestia: ['{color} keeps calling them. {n} times now. Threes matter.'],
};

/* ── REVISITS — they came back to the same piece ({piece}, {n}) ────────── */

export const REVISIT: Record<string, string[]> = {
    eddie: ["Back to {piece} again. That's {n} now. Something's up."],
    mimi: ["That's {n} looks at {piece}. The wanting is priced in now."],
    rocco: ['{piece} again. Fine. They have one good eye.'],
    romy: ['{n} visits to {piece}. They should just get it, honestly.'],
    mick: ['{piece}. Again. Logged.'],
    carl: ["They keep coming back to {piece}. It won't love them back."],
    steven: ["Back at {piece}. I mean, it's a good one. I get it."],
    celestia: ["{piece} pulls them back. That's not a choice anymore. That's orbit."],
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
    carl: ['Slow episode.'],
    mick: ['Nothing to report. Reporting it.'],
    eddie: ['They went quiet. Quiet people are reading something. What are they reading.'],
    romy: ["Shh. They're thinking."],
    mimi: ["Stillness. Someone's about to do something expensive."],
    celestia: ["They've gone still. A decision is circling."],
    rocco: ['Are we boring them? Impossible.'],
    steven: ['They fell asleep, maybe. Happens to me on this couch.'],
};

/* ── PACING — they're tearing through pages ────────────────────────────── */

export const PACING: Record<string, string[]> = {
    eddie: ['Look at them go. Page, page, page. Hunting.'],
    mick: ["That's a lot of pages in a minute. Noted."],
    steven: ["They scroll fast. I'd be dizzy."],
    carl: ["All that clicking. Won't help."],
    romy: ["Somebody's looking for something specific."],
    celestia: ['Circling, circling. The thing they want is behind them.'],
};

/* ── NIGHT / MORNING — they can see your clock ─────────────────────────── */

export const NIGHT: Record<string, string[]> = {
    eddie: ['Browsing at this hour. Insomnia or information.'],
    celestia: ["Three a.m. energy, whatever the clock says. The veil's thin."],
    steven: ["It's late. I'm only up because of the chili."],
    carl: ["Can't sleep either. The market gets in the walls."],
    romy: ["They're up late. Someone get them water."],
    mimi: ['The best offers go out at night. Watch.'],
};
export const MORNING: Record<string, string[]> = {
    steven: ["They're on before coffee. Committed."],
    mick: ['Early session. The early ones are deliberate.'],
    romy: ['Morning person. Good for them.'],
};

/* ── DIRECT — rung 3, rare: they talk TO you ({name} allowed) ──────────── */

export const DIRECT: Record<string, string[]> = {
    rocco: ["Yes, you. Don't buy it because I liked it."],
    mick: ["You. You're in the notes now."],
    mimi: ['Take your time, {name}. I price impatience hourly.'],
    eddie: ['{name}. What do you know. You can tell me.'],
    steven: ["Hey. No pressure. It's just a website."],
    carl: ["Don't get attached. Or do. It goes the same way."],
    romy: ["You're allowed to just like it, {name}."],
    celestia: ['Warm through and through, isn’t it. Hold your hand near the screen.'],
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
];
