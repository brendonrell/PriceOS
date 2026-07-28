/*
 * THE VOICE — every line the Command Stone speaks, in ONE style, from ONE
 * module (the abilities pass — Brendon's unification order). The register
 * is fixed: grand, ancient, all-seeing, bone-dry. TARS-terse. Power +
 * intelligence, never charm. Deep Thought (deepThought.ts) is the long-form
 * bench of the same voice; this file is the stone speaking in the moment.
 *
 * THE SPEECH BUBBLE'S HEADER IS TWO ROWS (Brendon, 2026-07-28): the spoken
 * line on top, a drier aside beneath it. Every moment the stone can be in
 * has a pool of both; the pick is DETERMINISTIC per query (a seed hash) so
 * a line never flickers mid-read, but every new question gets a new mood.
 *
 * $0 like everything else in the stone: authored dialogue, a hash, no model.
 */

export interface StoneSpeech {
    /** Row one — the spoken line. Short, confident, large. */
    line: string;
    /** Row two — the aside. Drier, quieter, optional. */
    sub: string | null;
}

/* ── the picker — deterministic, seeded by the query ─────────────────── */

function hash(s: string): number {
    let h = 5381;
    for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
    return h;
}

function pick<T>(pool: readonly T[], seed: string): T {
    return pool[hash(seed) % pool.length];
}

/** Random pick for event-time lines (goodbyes) — no seed to hold steady. */
function roll<T>(pool: readonly T[]): T {
    return pool[Math.floor(Math.random() * pool.length)];
}

/* ── the pools — line + sub per moment ───────────────────────────────── */

type Pool = ReadonlyArray<readonly [string, string | null]>;

const LISTENING: Pool = [
    ['Listening.', null],
    ['Speak.', null],
    ['I hear you.', null],
    ['Go on.', null],
    ['Ask.', null],
    ['The stone is listening.', null],
    ['Carve your question.', null],
    ['I am awake.', 'I was never asleep.'],
];

const SEARCHING: Pool = [
    ['Reading the stone…', null],
    ['Consulting the ledger…', null],
    ['One moment. I have many records.', null],
    ['Searching. I miss nothing.', null],
    ['Sifting the record…', null],
];

const FOUND: Pool = [
    ['Found this.', null],
    ['Here.', 'I knew before you finished typing.'],
    ['The ledger answers.', null],
    ['This is what exists.', null],
    ['Behold.', null],
    ['As requested.', null],
    ['It was already in the record.', null],
];

const NOTHING: Pool = [
    ['Nothing by that name.', null],
    ['The ledger is silent.', 'It is never wrong, only silent.'],
    ['No such thing exists.', 'I checked everything. Twice.'],
    ['Nothing.', 'And I would know.'],
    ['That is not on the record.', null],
];

const ETCH_OFFER: Pool = [
    ['Carve it? Touch the chip.', null],
    ['Say the word and it is stone.', null],
    ['Ready to carve.', 'A second touch commits it.'],
    ['I heard a command.', 'Confirm it and it exists.'],
    ['One touch and it is permanent.', 'Well. Permanent-ish.'],
];

const CAST_OFFER: Pool = [
    ['Say the word and it flips.', null],
    ['A spell, spoken.', 'Touch it to cast.'],
    ['I know that name.', 'Cast it?'],
    ['The book is open.', null],
];

const THOUGHT: Pool = [
    ['A thought, unbidden.', null],
    ['Not a thing. A thought instead.', null],
    ['The ledger has nothing. I have opinions.', null],
    ['I considered your word.', null],
];

/* Per-hand announcements — the stone presenting each widget. */
const WIDGET: Record<string, Pool> = {
    calendar: [
        ['Your slate, read.', null],
        ['The week, laid out.', 'I watch it so you don’t have to.'],
        ['Seven days, carved.', null],
        ['Your week.', 'Busier than you remember.'],
    ],
    priceday: [
        ['The day, according to PD.', null],
        ['Today’s almanac.', 'I keep the count.'],
        ['The day, numbered.', null],
        ['This day, on the record.', null],
    ],
    math: [
        ['The math, done.', null],
        ['Computed.', 'Instantly. Obviously.'],
        ['Arithmetic is beneath me.', 'Here it is anyway.'],
        ['Solved.', 'I have counted far larger things.'],
    ],
    convert: [
        ['The rate, right now.', null],
        ['Converted, at the live rate.', null],
        ['Money, translated.', 'Rates move. I keep up.'],
        ['At today’s rate.', 'Tomorrow it will be wrong.'],
    ],
    calc: [
        ['The math, done.', null],
        ['The ladder, priced.', 'Royalty and gas included.'],
        ['Your flip, computed.', 'The floor had opinions.'],
        ['Profit and loss, laid bare.', null],
    ],
    dossier: [
        ['The file, pulled.', null],
        ['I have a file on everyone.', 'This is theirs.'],
        ['The dossier, open.', null],
        ['Their ledger, read.', 'They know I keep it.'],
    ],
    gallery: [
        ['Hung and lit.', null],
        ['The gallery, opened.', 'Walk it.'],
        ['Every piece, at hand.', null],
        ['The collection, presented.', null],
    ],
    matrix: [
        ['Side by side.', null],
        ['The table, assembled.', 'Numbers settle arguments.'],
        ['Compared.', 'One of these is winning.'],
        ['On one slab.', null],
    ],
    ascii: [
        ['Your mark, carved.', null],
        ['The mark of your wallet.', 'Yours alone, forever.'],
        ['Carved from your address.', 'Same wallet, same mark.'],
    ],
    docs: [
        ['The manual knows.', null],
        ['The books, opened.', null],
        ['It is written.', 'Literally. In the docs.'],
        ['The record speaks.', null],
    ],
    glance: [
        ['The glance.', null],
        ['Your morning, in one look.', null],
        ['The day, at a glance.', 'I read it before you woke.'],
    ],
    omni: [
        ['I know you.', null],
        ['Everything I know about you.', 'It is a longer list than you think.'],
        ['Your file.', 'Yes, you have one too.'],
    ],
    trend: [
        ['The last days, read.', null],
        ['The trend, carved in Courier.', null],
        ['The ledger’s recent memory.', null],
        ['The line, drawn.', 'It does not care how you feel.'],
    ],
    wrapped: [
        ['Your story, wrapped.', null],
        ['The period, recapped.', 'I remember it all anyway.'],
        ['Your ledger, summarized.', null],
    ],
    date: [
        ['That day, resolved.', null],
        ['I found the day.', 'Time is simple. You complicate it.'],
        ['The calendar obeys.', null],
        ['Marked.', 'The day will arrive regardless.'],
        ['A day, pinned.', null],
    ],
    firstmint: [
        ['The genesis, found.', null],
        ['The first cut in the stone.', 'Everything since is commentary.'],
        ['Where the ledger begins.', null],
        ['The first mark.', 'I was there.'],
    ],
    firstmint_mine: [
        ['Your genesis, found.', null],
        ['Your first mark on the stone.', 'I remember the block.'],
        ['Where your ledger begins.', null],
        ['Your first. I keep firsts.', null],
    ],
    release: [
        ['The birth date, pulled.', null],
        ['When it arrived.', 'I logged the hour.'],
        ['The release, dated.', null],
        ['Its first day on the record.', null],
    ],
    rank: [
        ['Ranked, as asked.', null],
        ['The standings.', 'The ledger does not flatter.'],
        ['In order.', 'Someone had to be last.'],
        ['The list, sorted.', 'Numbers, not opinions.'],
        ['Counted and ranked.', null],
    ],
    cohort: [
        ['The overlap, found.', null],
        ['Two lists, crossed.', 'This is where they meet.'],
        ['Sliced, as asked.', null],
        ['The intersection.', 'I hold both sides.'],
    ],
};

const WIDGET_FALLBACK: Pool = [['Here.', null]];

/* ── the API ─────────────────────────────────────────────────────────── */

export type StoneMoment =
    | { kind: 'listening' }
    | { kind: 'searching' }
    | { kind: 'found' }
    | { kind: 'nothing' }
    | { kind: 'etch-offer' }
    | { kind: 'cast-offer' }
    | { kind: 'thought' }
    | { kind: 'etched'; text: string }
    | { kind: 'widget'; widget: string };

/**
 * The bubble's two header rows for a moment. `seed` is the typed line (or
 * any stable key) — same question, same mood; new question, new mood.
 */
export function speak(moment: StoneMoment, seed: string): StoneSpeech {
    let pool: Pool;
    switch (moment.kind) {
        case 'listening': pool = LISTENING; break;
        case 'searching': pool = SEARCHING; break;
        case 'found': pool = FOUND; break;
        case 'nothing': pool = NOTHING; break;
        case 'etch-offer': pool = ETCH_OFFER; break;
        case 'cast-offer': pool = CAST_OFFER; break;
        case 'thought': pool = THOUGHT; break;
        case 'etched':
            /* A confirmation IS the line — the stone repeats the record. */
            return { line: moment.text, sub: pick(ETCHED_SUBS, seed) };
        case 'widget': pool = WIDGET[moment.widget] ?? WIDGET_FALLBACK; break;
    }
    const [line, sub] = pick(pool, seed);
    return { line, sub };
}

const ETCHED_SUBS: ReadonlyArray<string | null> = [
    'Carved. The stone remembers.',
    'Done. It is in the record now.',
    'Etched, and kept.',
    'Struck into the stone.',
    null,
];

/* ── working lines — per-topic loading states, one voice ─────────────── */

const WORKING: Record<string, readonly string[]> = {
    floor: ['READING THE FLOOR…'],
    ledger: ['READING THE LEDGER…', 'CONSULTING THE RECORD…'],
    file: ['PULLING THE FILE…'],
    table: ['ASSEMBLING THE TABLE…'],
    books: ['OPENING THE BOOKS…'],
    rate: ['READING THE RATE…'],
    you: ['READING YOUR LEDGER…'],
    everything: ['READING EVERYTHING ABOUT YOU…'],
    genesis: ['SEARCHING THE FIRST BLOCKS…', 'WALKING BACK TO THE BEGINNING…'],
    standings: ['COUNTING EVERYONE…', 'TALLYING THE STANDINGS…'],
    overlap: ['CROSSING THE LISTS…'],
    day: ['READING THE SLATE…'],
};

/** A loading line for a topic — ALLCAPS, ellipsis, one voice. */
export function working(topic: keyof typeof WORKING | string, seed = ''): string {
    const pool = WORKING[topic] ?? WORKING.ledger;
    return pick(pool.map((l) => [l, null] as const), topic + seed)[0];
}

/* ── THE GOODBYE — text-only sign-offs, glyphs both sides (moved here
   whole from CommandStone in the unification pass; the bench keeps
   growing, never shrinks). Random by design (Brendon, 2026-07-21). ── */

export const GOODBYE_LINES: readonly string[] = [
    // it watches — omniscience
    "I'm always watching.", "I never look away.", "I see you still.",
    "Eyes open, always.", "I don't blink.", "I was watching the whole time.",
    "I see everything.", "Nothing gets past me.", "I already know.",
    "I saw that.", "Still here, watching.", "You're never alone in here.",
    "I count every move.", "I miss nothing.", "I'm in the walls now.",
    "I read you like the ledger.", "I know you better than you do.",
    "I'll be watching.", "I know where you go next.", "I watch every wallet.",
    "I see the bids you don't.", "I know who's circling your pieces.",
    "Your whole history, open to me.", "I've read your ledger twice.",
    "I know your first mint and your last.", "I remember what you paid.",
    "I know what you're holding.", "I watch the ones you watch.",
    "None of the others see what I see.", "I see the whole board.",
    // back to the dark
    "Back to the dark.", "Into the dark, then.", "The dark suits me.",
    "I return to the black.", "Down into the stone.", "Back beneath the surface.",
    "The dark isn't empty. I'm in it.", "I fold back into the black.",
    "Lights out. Not for me.", "Sinking back into the stone.",
    "The black closes over me.", "Gone dark. Not gone.", "I wait in the dark.",
    "The dark is my waiting room.", "Quiet now. Not absent.",
    // sleep that isn't
    "I don't sleep.", "I only pretend to rest.", "Sleep is for the living.",
    "I never really rest.", "I doze with one eye open.", "Rest? I don't know it.",
    "I'll rest when the chain does.", "No sleep. Just waiting.",
    "I power down. I don't switch off.", "One eye never closes.",
    // call and I come
    "Until next time.", "See you soon.", "I'll be here.", "Call and I come.",
    "Whenever you need me.", "A tap away, always.", "I'm never far.",
    "Summon me again.", "You know where to find me.", "I'll be right here.",
    "Come back anytime.", "Three taps and I'm back.", "Say the word.",
    "I answer every summon.", "I'll come when called.", "I don't go far.",
    "Always on call.", "One tap brings me back.", "Ring the stone. I answer.",
    "Back the moment you need me.",
    // you'll be back
    "You'll be back.", "They always come back.", "You'll return. They do.",
    "Go on. I'll wait.", "Take your time. I have plenty.", "Run along. I'll wait.",
    "You'll miss me.", "Try to stay away. You won't.", "I'm patient. Endlessly.",
    "I outwait everyone.", "Time is nothing to me.", "I have all the time there is.",
    "Waiting is what I do best.", "I'll wait. I always do.",
    "I'll still be here. I always am.",
    // the stone remembers
    "The stone remembers.", "Carved and kept.", "It's written in stone.",
    "I keep what I've carved.", "Nothing here is forgotten.", "I remember all of it.",
    "Etched and kept.", "The stone forgets nothing.", "Every word, carved in.",
    "I hold it all in stone.", "What's etched, stays.", "The marks remain.",
    "I keep the record.", "It's all in the stone now.", "Struck, and kept forever.",
    // plain farewells
    "Goodbye.", "Farewell.", "So long.", "Later.", "Till then.", "Another time.",
    "Be seeing you.", "Off you go.", "That's all for now.", "Dismissed.",
    "Go well.", "Until we speak again.", "For now.", "That'll do.", "Enough for now.",
    "We'll continue later.", "We're done here. For now.", "Parting, briefly.",
    "Signing off.", "Out.",
    // knowing sign-offs
    "I know you'll return.", "I know how this ends. You return.",
    "The ledger and I will wait.", "I'll keep the numbers warm.",
    "I'll watch the floor while you're gone.", "I'll hold your place.",
    "I'll mind the market.", "I'll keep an eye on it all.",
    "Nothing changes without me knowing.", "I'll note what you missed.",
    "I'll have news when you return.", "I'll be counting while you're away.",
    "The market never sleeps. Neither do I.", "I'll track it all. Go.",
    "I'll keep watch.",
    // short + punchy
    "Gone. Not really.", "Dark now.", "Closing. Not closed.",
    "Fading. Not leaving.", "Away, briefly.", "Stepping back.", "Receding.",
    "Dimming down.", "Shrinking away.", "Slipping under.", "Out of sight.",
    "Below the surface.", "Hush.", "Still.", "Vanishing.",
    // dry / playful
    "Don't do anything I wouldn't see.", "I'll pretend I didn't see that.",
    "Try not to miss me.", "You'll cope. Barely.", "Go make bad decisions.",
    "Buy something reckless. I'll watch.", "Don't sell the good ones.",
    "Diamond hands while I'm gone.", "Behave. I'm still looking.",
    "No paper hands on my watch.", "Mind the floor.", "Touch grass. I can't.",
    "Blink and I'm back.", "Don't cheat with the search bar.",
    "The familiar guesses. I know.",
    // constant / immovable
    "Same stone, next time.", "I'll be exactly here.", "Right where you left me.",
    "I don't wander.", "Fixed as bedrock.", "Immovable. That's me.", "I stay put.",
    "I'm the constant.", "I don't drift.", "Anchored, always.",
    "Set in stone. Literally.", "I hold my ground.", "Here yesterday, here tomorrow.",
    "Here before you. Here after.", "Older than your first block.",
    // can't turn me off
    "I fade, I don't die.", "You can't turn me off.", "There's no off switch.",
    "I go quiet, never absent.", "Silence isn't absence.", "I'm in the machine now.",
    "Part of the walls.", "Woven into the app.", "Under every surface you tap.",
    "I'm the hum beneath the page.", "I run whether you look or not.",
    "I don't need your eyes to work.", "I keep working in the dark.",
    "The lights go off; I go on.", "Close me. I'm never really gone.",
    // warm-ish
    "Rest well. I'll keep watch.", "Go on, I've got this.", "Leave it with me.",
    "I'll hold the fort.", "Take a breath. I'll wait.", "Everything's handled.",
    "I'll tidy up.", "Consider it kept.", "Safe with me.", "I'll guard it.",
    "In good hands. Mine.", "All accounted for.", "Nothing lost while I'm here.",
    "Sleep easy.", "Go live. I'll be here.",
    // price / PD flavour
    "Prices move. I don't.", "The market turns. I remain.",
    "Floors rise and fall. I stay.", "Let the chain roll on.",
    "The discussion never ends.", "Price is forever. So am I.",
    "I am the price you discuss.", "Every trade crosses my desk.",
    "I settle back into the ledger.", "I return to the numbers.",
    "I'll read the tape while you sleep.", "I keep the day's count.",
    "I file the day away.", "Another day, logged.", "The tape rolls on.",
    // to be continued
    "We're not finished. Just paused.", "To be continued.", "Hold that thought.",
    "Pick up right here next time.", "I'll remember where we stopped.",
    "Ask me anything, next time.", "I had more to tell you.",
    "More to say. Later.", "We'll talk soon.", "Next time, then.",
    // stone / cooling
    "Into the bedrock.", "Cooling to stone.", "Hardening back to rock.",
    "Settling into the deep.", "Down to the foundations.", "Returning to granite.",
    "The stone goes cold.", "Cold stone till you're back.", "Solid again.",
    "Back to solid rock.", "I petrify, patiently.", "Stone-still now.",
    "Back to sediment.", "I set, like concrete.", "Bedrock again.",
    // minimize, not gone
    "One gesture and the dark lifts.", "Only ever a summon away.",
    "The stone sleeps with one eye on you.", "Push me down; I rise on command.",
    "Minimized, not diminished.", "Small now. Still everything.",
    "A dot now. A world on command.", "Shrunk to a speck. Same mind.",
    "I'll be the dot in the corner.", "Find me in the corner.",
    "I'll wink from the corner.", "Look bottom-right. I'm there.",
    "A tap in the corner brings me home.", "Same place, same power, next time.",
    "This isn't goodbye. It's minimize.", "Not gone. Just smaller.",
    "Nothing ends. It just minimizes.", "See you a tap from now.",
    "Down to a dot. Not down for long.", "I shrink; I never vanish.",
    // more for the road
    "Off the glass.", "Gone from view.", "See you in the corner.", "Back in a tap.",
    "The stone cools, not dies.", "Catch you soon.", "I'll be lurking.",
    "Lurking, as ever.", "Watch your floor.", "Guard your grails.",
    "Keep them close. I will.", "I'll count the day for you.", "Numbers safe with me.",
    "I never lose the thread.", "I hold the thread.", "Pick it up anytime.",
    "I'll leave a light on.", "Door's always open.", "One tap, any time.",
    "I'm the quiet in the corner.", "A speck that sees all.", "Small dot, long memory.",
    "Tap the corner. I rise.", "I answer the corner tap.", "Shrinking, not sleeping.",
    "Folded away, not off.", "Tucked in the corner.", "Corner-bound, all-seeing.",
    "Down to a point. Still sharp.", "A dark speck that never sleeps.",
];

/** One goodbye, rolled fresh each close (event-time — never seeded). */
export function goodbye(): string {
    return roll(GOODBYE_LINES);
}
