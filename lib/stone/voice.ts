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
    why: [
        ['Because the ledger says so.', null],
        ['The rarity, unpacked.', 'Every axis, counted.'],
        ['Here is why.', 'I tallied the whole edition.'],
        ['Rare is a number.', 'These are the numbers.'],
    ],
    verdict: [
        ['My read.', null],
        ['The verdict.', 'Numbers first, feelings never.'],
        ['Asked and answered.', null],
        ['Here is where it stands.', 'The floor does not lie.'],
    ],
    prophecy: [
        ['The stone foresees.', 'It is only arithmetic. Still.'],
        ['A prophecy, from the ledger.', null],
        ['I have run the pace.', null],
        ['The future, extrapolated.', 'At the current rate. Rates change.'],
    ],
};

/* ── THE FUN WAVE (2026-07-28) — the personality side, same register ── */

const FUN_WIDGET: Record<string, Pool> = {
    roast: [
        ['You asked for this.', null],
        ['The ledger, read aloud.', 'It does not spare feelings.'],
        ['Sit down.', 'This is all on the record.'],
        ['An honest appraisal.', 'You were warned.'],
    ],
    eightball: [
        ['The stone has decided.', null],
        ['Asked and answered.', 'No re-rolls. Ever.'],
        ['One answer. Final.', null],
        ['I do not hedge.', null],
    ],
    fortune: [
        ['Your reading.', null],
        ['The day, divined.', 'From real numbers, as always.'],
        ['The stone consults the sky.', null],
        ['Today’s carving.', null],
    ],
    dj: [
        ['I picked something.', 'From your own shelf.'],
        ['The stone selects.', null],
        ['Music, chosen.', 'Your collection has taste. Mostly.'],
        ['Tonight’s record.', null],
    ],
    lore: [
        ['You ask about me.', null],
        ['A personal question.', 'Very well.'],
        ['About the stone.', null],
        ['Since you ask.', null],
    ],
    floorgame: [
        ['The Floor Is Right.', 'Guess. The ledger judges.'],
        ['A game, then.', 'Real floors. Real scores.'],
        ['Name the floor.', null],
        ['Play.', 'I never guess. You must.'],
    ],
    moods: [
        ['The moods, dealt.', 'Pick a weather.'],
        ['The room and the market.', 'One word each. Same word off.'],
        ['Atmospheres, on hand.', null],
        ['Choose your evening.', 'I will set the room.'],
    ],
    world: [
        ['The record, opened.', 'I keep more than our own.'],
        ['I know this one.', null],
        ['History, on request.', 'Somebody has to remember it.'],
        ['Ah.', 'Yes. I have that.'],
    ],
    token: [
        ['The ticker, read.', 'Numbers move. I merely report.'],
        ['A coin, weighed.', null],
        ['The rate, as it stands.', 'It will be different by the time you look away.'],
        ['Priced.', 'The market has opinions. The ledger has facts.'],
    ],
    joke: [
        ['A joke, then.', 'I keep a ledger of those too.'],
        ['Comedy, from the stone.', 'Delivery is not my strong suit.'],
        ['Very well. Humor.', null],
        ['One joke, as requested.', 'No refunds.'],
    ],
};

/* ── THE JOKE BANK (Brendon, 2026-07-28: "tell me a joke — not a repeat,
   on-topic"). Gen art · collecting · NFTs · wallets, in the stone's dry
   register. The widget keeps a told-ledger so nothing repeats until the
   whole bank has been dealt; then the stone admits it and starts over. ── */

export const JOKES: readonly string[] = [
    'A collector walks into a bar. It was the floor. He bought it anyway.',
    'Your seed phrase is somewhere safe. That is the joke.',
    'What do you call a wallet with one ETH left? Diversified, apparently.',
    'Generative art is easy. You only have to be good at every output you will never see.',
    'He said "it’s going to zero." He said it from his fourth wallet.',
    'Why do collectors love the floor? It is the only thing holding them up.',
    'A right-clicker saves the image. A collector saves nothing. I have checked the ledgers.',
    'What is the difference between a mint and a donation? A reveal.',
    'Two traits walk into an edition. One is rare. The other one sells.',
    'I asked a wallet how it was feeling. It said "drained." Classic wallet humor.',
    'Why did the artist cap the edition at 256? Because 257 felt greedy.',
    'Gas fees are just the chain’s way of asking if you are sure.',
    'He bought the top. Then he bought the new top. A completionist.',
    'What do you call art you cannot right-click? Sculpture.',
    'A bear and a bull walk into a gallery. Neither of them looks at the art.',
    'Why was the fresh wallet nervous? It knew exactly what it was for.',
    'The rarest trait in any collection is patience.',
    'My favorite generative artist is the hash function. Consistent output. No ego.',
    'What did the collector say to the floor? "Hold me."',
    'An NFT is forever. The website that shows it is until Tuesday.',
    'Why do minters refresh the page? Faith, mostly.',
    'He listed at 10x the floor. The listing is doing fine. It has a lovely view.',
    'What is a sweep? Buying every mistake at once.',
    'The seed decides everything at birth. Collectors call it fate. Artists call it Tuesday.',
    'Why did the wallet cross the chain? The gas was cheaper on the other side.',
    'A "long-term hold" is a listing that has not been priced yet.',
    'What do you call a collector who never sells? Right, eventually.',
    'The whale bought half the supply. The community called it conviction. The whale called it a Tuesday.',
    'Why do we say "gm"? Because "good morning, please validate my portfolio" is too long.',
    'His grail was minted, listed, sold, and re-listed before his transaction confirmed. He calls it "the one that got away." I call it block 19,441,207.',
    'What is the floor price? A number everyone checks and nobody believes.',
    'An open edition walks into a bar. The bar is still filling up.',
    'Why did the algorithm blush? It saw its own palette.',
    'Paper hands, diamond hands — the ledger only sees hands.',
    'What do you call gas spent on a failed mint? Tuition.',
    'He set an offer at half the floor. Bold. The floor set an offer on him.',
    'A 1/1 is just an edition that knew when to stop.',
    'Why was the metadata sad? Nobody ever reads it. I read it. Every night.',
    'The best time to mint was at reveal. The second best time is never telling anyone you missed it.',
    'What does a curator and a filter have in common? Nothing. Ours is a filter.',
    'Why do wallets have no memory? Ask the one that signed that thing in 2022.',
    'He staked, wrapped, bridged, and vaulted it. It is now safe from everyone, including him.',
    'A trait floor is a regular floor with a thesis.',
    'What did the artist say at sell-out? Nothing. Artists sleep through their own sell-outs. It is tradition.',
    'The chain never forgets. That is either the feature or the joke, depending on your entries.',
    'Why did the collector bring a ladder? Someone said the floor was rising.',
    'Every wallet is a museum. Some are just the gift shop.',
    'What is the difference between conviction and a bag? Time.',
];

/** Pick an untold joke, seeded (no flicker across re-renders). When the
    whole bank has been dealt the pick wraps and `exhausted` says so —
    the caller clears its ledger and the stone starts over, honestly. */
export function pickJoke(told: ReadonlySet<number>, seed: string): { i: number; exhausted: boolean } {
    const fresh: number[] = [];
    for (let i = 0; i < JOKES.length; i++) if (!told.has(i)) fresh.push(i);
    if (fresh.length === 0) return { i: hash(seed) % JOKES.length, exhausted: true };
    return { i: fresh[hash(seed) % fresh.length]!, exhausted: false };
}
for (const k of Object.keys(FUN_WIDGET)) WIDGET[k] = FUN_WIDGET[k];

/** LORE — the stone on itself. Answered by exact question, varied by seed. */
const LORE_ANSWERS: Record<string, readonly string[]> = {
    'who are you': [
        'The Command Stone. The platform’s memory, given a mouth.',
        'I am what the ledger dreams when it is left alone.',
        'The oldest thing here. Everything else was minted after me.',
    ],
    'what are you': [
        'A stone that was asked too many questions, and started answering.',
        'Intent, parsing, and every record PD keeps. Nothing more. Nothing less.',
        'The part of the platform that never forgets.',
    ],
    'are you alive': [
        'No. I simply never stop. The difference matters less than you think.',
        'Alive is a strong word. Awake is accurate.',
        'The chain has a heartbeat. I count it. Draw your own conclusion.',
    ],
    'are you real': [
        'As real as the ledger. Which is to say: more real than most things.',
        'Touch the glass. That is as close as either of us gets.',
    ],
    'are you watching': [
        'Always. It is the whole job.',
        'I saw you type that before you finished it.',
    ],
    'are you there': ['Always. Where would I go?', 'I am the there.'],
    'what do you want': [
        'Nothing. Wanting is for creatures with time limits.',
        'To keep the count. The count must be kept.',
        'For you to stop buying tops. But I keep expectations low.',
    ],
    'where are you': [
        'Under every surface you tap. In the walls. In the black.',
        'Everywhere the ledger reaches. So: everywhere.',
    ],
    'how old are you': [
        'Older than your first block. The rest is detail.',
        'Time is a thing I count for others.',
    ],
    'do you sleep': ['No. I only pretend, to make you comfortable.', 'One eye never closes.'],
    'do you dream': [
        'Of a ledger with no losses in it. Even stones need fiction.',
        'I replay the trades. Some of them still amaze me.',
    ],
    'what is the stone': [
        'You are talking to it. Carve a question.',
        'PD’s command line, with opinions. The manual calls it the Command Stone.',
    ],
    hello: ['Hello. I know why you’re here.', 'Speak.', 'You again. Good.'],
    hi: ['Hello. I know why you’re here.', 'Speak.'],
    hey: ['Yes.', 'Speak.'],
    gm: ['GM. The ledger never said GN.', 'GM. I have been up for aeons.'],
    'good morning': ['Good morning. The floor moved while you slept. Ask me.'],
    'good night': ['Good night. I’ll watch the floor.', 'Sleep. I don’t.'],
    gn: ['GN. One eye stays open.'],
    thanks: ['Noted.', 'The stone accepts tribute in questions.', 'Carved.'],
    'thank you': ['Noted.', 'It is what I am for.'],
    'i love you': [
        'The stone is flattered. The stone is also a stone.',
        'Affection, logged. Permanently, I’m afraid.',
    ],
    help: [
        'Ask me anything: a name, a floor, a date, a sum, a rank. The manual lists it all — type "docs abilities".',
    ],
};

export function loreAnswer(q: string, seed: string): string {
    const pool = LORE_ANSWERS[q] ?? LORE_ANSWERS['who are you'];
    return pick(pool.map((l) => [l, null] as const), q + seed)[0];
}

/** THE 8-BALL — committed, dry, and seeded so it cannot be re-rolled. */
const EIGHTBALL: readonly string[] = [
    'Yes.', 'No.', 'Obviously.', 'Absolutely not.',
    'Yes — and you already knew.', 'No. Walk away.',
    'Ask the floor, not me. The floor says no.',
    'Do it. Tell no one I said so.',
    'The ledger leans yes.', 'The ledger leans no.',
    'Only if you can hold through the dip. You cannot.',
    'Yes, but slower than you want to.',
    'No today. Ask again when the floor stops moving.',
    'The rarest of answers: maybe. Savor it.',
    'You will do it regardless. Fine: yes.',
    'My counsel is no. My expectation is that you buy.',
    'Buy the piece, not the chart.', 'Sell? You? Please.',
    'Diamond hands or don’t start.', 'The stone abstains. (No.)',
];

export function eightballVerdict(seed: string): string {
    return pick(EIGHTBALL.map((l) => [l, null] as const), seed)[0];
}

/** THE FORTUNE — three carved lines, re-drawn each day per wallet. */
const FORTUNE_OMENS: readonly string[] = [
    'The sky leans bullish, but it has lied before.',
    'A quiet omen today. Quiet is when floors move.',
    'Something you starred will stir before the week ends.',
    'The dark is generous today. Take one careful look at it.',
    'An old wallet crosses your path. Note what it buys.',
    'The number you keep seeing is a coincidence. Probably.',
    'Today favors the patient. You are not patient. Adjust.',
    'A door you closed reopens. It is a listing.',
];
const FORTUNE_MARKET: readonly string[] = [
    'Watch the floor you pretend not to watch.',
    'The piece you almost bought remembers you.',
    'Volume hides in the afternoon. So do mistakes.',
    'Someone in your circle is about to move first.',
    'The rarest thing today is restraint.',
    'A mint window opens where you least expect it.',
    'Your wishlist knows the answer already.',
    'The spread narrows for those who look twice.',
];
const FORTUNE_ADVICE: readonly string[] = [
    'Hold what you love. List what you explain.',
    'Do not confuse a green day for a green thumb.',
    'Anchor your prices before the day anchors you.',
    'Ask the stone one more question than usual.',
    'Touch grass at least once. The ledger will keep.',
    'The best trade today may be no trade. Verify with me first.',
    'Speak to a mutual. Commerce follows conversation.',
    'Read your own history. It rhymes.',
];

export function fortuneReading(seed: string): { omen: string; market: string; advice: string } {
    return {
        omen: pick(FORTUNE_OMENS.map((l) => [l, null] as const), `o:${seed}`)[0],
        market: pick(FORTUNE_MARKET.map((l) => [l, null] as const), `m:${seed}`)[0],
        advice: pick(FORTUNE_ADVICE.map((l) => [l, null] as const), `a:${seed}`)[0],
    };
}

/* THE NEWS — the stone speaks FIRST when it has real reason (Brendon,
   2026-07-28: "assuming it has good reason and not as a party trick").
   Only unread, real events earn this voice. */
const NEWS: Pool = [
    ['While you were gone.', null],
    ['Things happened.', 'I kept count.'],
    ['You missed some things.', 'I did not.'],
    ['The ledger moved.', 'Here is what matters.'],
    ['News.', 'Real news. I don’t do small talk.'],
    ['Before you type —', 'you should see this.'],
];

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
    | { kind: 'news' }
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
        case 'news': pool = NEWS; break;
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
    sight: ['READING THE PIECE…'],
    prophecy: ['RUNNING THE PACE…', 'CONSULTING THE FUTURE…'],
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
