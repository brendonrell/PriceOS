/*
 * The Dispatch VOICE — the paper's house writing kit.
 *
 * Three parts make the prose feel written, not generated, and keep it from
 * ever repeating on a reader:
 *
 *   1. PHRASE LIBRARIES — deep pools per beat (headlines by market shape,
 *      salon commentary, aphorisms, quiet-day musings). Every line is the
 *      house voice: friendly, dry, a little knowing. Facts are never in the
 *      template — numbers, names and prices arrive as slots.
 *   2. ROTATION MEMORY — the builder loads which phrases the last ~90
 *      editions used (stored in each edition's `voice.used`) and refuses to
 *      pick them again. Repeats aren't "unlikely"; they're excluded until
 *      the pool genuinely runs dry, at which point the oldest lines have
 *      been out of print for months.
 *   3. DETERMINISM — everything is seeded by the edition day, so a rebuild
 *      of the same edition writes the same words (the Price Story rule).
 *
 * Slots use {NAME} markers filled by `fill()`. Templates must read clean
 * with any realistic value in the slot.
 */

/* ── seeded engine ─────────────────────────────────────────────────── */

export function fnv(s: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
        h ^= s.charCodeAt(i);
        h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
}

/** Fill {SLOT} markers from a vars record. Unknown slots are left visible
 *  (they'd be a template bug — better loud than silently wrong). */
export function fill(tpl: string, vars: Record<string, string | number>): string {
    return tpl.replace(/\{([A-Z0-9_]+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function plural(n: number, word: string, pluralWord?: string): string {
    return n === 1 ? word : (pluralWord ?? `${word}s`);
}

export function eth(n: number): string {
    return `${Number(n.toFixed(3))} ETH`;
}

/** English ordinal for milestone counts: 1st, 2nd, 10,000th. */
export function ordinal(n: number): string {
    const s = n % 100;
    const suf = s >= 11 && s <= 13 ? 'th' : n % 10 === 1 ? 'st' : n % 10 === 2 ? 'nd' : n % 10 === 3 ? 'rd' : 'th';
    return `${n.toLocaleString('en-US')}${suf}`;
}

/**
 * VoiceMemory — rotation-aware phrase picker.
 *
 * `recentlyUsed` arrives from the archive (phrase ids the last N editions
 * consumed). `pickFresh` walks a pool in a seeded order and returns the
 * first entry not recently used, recording what it takes so (a) this
 * edition never reuses a line twice and (b) the id is stored for future
 * editions to avoid. When a pool is fully exhausted the seeded walk's
 * first choice wins — by then every line has rested for months.
 */
export class VoiceMemory {
    /** id → recency clock of its last use (higher = more recent). */
    private lastUse = new Map<string, number>();
    private clock = 0;
    /** Phrase ids consumed by THIS edition — persist into body.voice.used. */
    readonly out: string[] = [];
    private readonly seed: number;

    /** `usedOldestToNewest`: phrase ids from the archive, ordered oldest
     *  edition first, so recency is known — not just membership. */
    constructor(seed: number, usedOldestToNewest: Iterable<string>) {
        this.seed = seed;
        for (const id of usedOldestToNewest) this.lastUse.set(id, ++this.clock);
    }

    pickFresh(poolId: string, pool: readonly string[]): string {
        const n = pool.length;
        // >>> 0: XOR yields a SIGNED int32 — unsign before the modulo or a
        // negative start walks pool[-x] (undefined) forever.
        const start = ((this.seed ^ fnv(poolId)) >>> 0) % n;
        // stride coprime with n → the walk visits every index once.
        let stride = 1 + ((this.seed >>> 7) % (n - 1 || 1));
        while (n > 1 && gcd(stride, n) !== 1) stride++;
        let idx = start;
        let lruIdx = start;
        let lruAt = Infinity;
        for (let step = 0; step < n; step++) {
            const id = `${poolId}#${idx}`;
            const at = this.lastUse.get(id);
            if (at === undefined) return this.take(poolId, idx, pool); // never used
            if (at < lruAt) { lruAt = at; lruIdx = idx; }
            idx = (idx + stride) % n;
        }
        // Pool exhausted within memory: take the LEAST RECENTLY used line —
        // a line can only return after every other line has run since.
        return this.take(poolId, lruIdx, pool);
    }

    private take(poolId: string, idx: number, pool: readonly string[]): string {
        const id = `${poolId}#${idx}`;
        this.lastUse.set(id, ++this.clock);
        this.out.push(id);
        return pool[idx];
    }
}

function gcd(a: number, b: number): number {
    while (b) { const t = a % b; a = b; b = t; }
    return a;
}

/**
 * walkPick — the STATELESS anti-repeat picker, for surfaces rebuilt on
 * demand (the PriceDay almanac) that can't carry archive memory. Each pool
 * is walked with a per-pool coprime stride as `day` advances, so
 * consecutive days are GUARANTEED different phrasings until the pool has
 * fully cycled — pool of 16 → 16 days minimum before any line returns.
 * Deterministic per day forever (the Price Story rule).
 */
export function walkPick(day: number, poolId: string, pool: readonly string[]): string {
    const n = pool.length;
    if (n === 0) return '';
    const salt = fnv(poolId);
    let stride = 1 + (salt % (n - 1 || 1));
    while (n > 1 && gcd(stride, n) !== 1) stride++;
    return pool[(((day % n) * stride) + salt) % n];
}

/** Montreal hour → a daypart the paper can print forever (never a clock
 *  time — the Dispatch is day-keyed, and clock times belong to viewers). */
export function daypart(montrealHour: number): string {
    if (montrealHour < 5) return 'in the small hours';
    if (montrealHour < 9) return 'over breakfast';
    if (montrealHour < 12) return 'before noon';
    if (montrealHour < 14) return 'over lunch';
    if (montrealHour < 17) return 'mid-afternoon';
    if (montrealHour < 20) return 'around the dinner hour';
    if (montrealHour < 23) return 'in the evening';
    return 'just before midnight';
}

/* ── PHRASE LIBRARIES ──────────────────────────────────────────────────
 * House voice: warm, dry, precise. The paper likes its readers and takes
 * the record seriously; it never sneers and never gushes. */

export const POOLS = {
    /* Headlines — a big sale led the day. {PIECE} {PRICE} */
    HEAD_SALE: [
        '{PIECE} TAKES THE DAY AT {PRICE}',
        'THE HAMMER FALLS: {PIECE} AT {PRICE}',
        '{PRICE} SAYS {PIECE} WAS WORTH ARGUING OVER',
        '{PIECE} CLEARS AT {PRICE} — THE ROOM TOOK NOTES',
        'SOLD: {PIECE} · {PRICE} · NO FURTHER QUESTIONS',
        '{PIECE} FINDS ITS NUMBER: {PRICE}',
        'THE DAY BELONGED TO {PIECE}',
        '{PRICE} ON THE TAPE — {PIECE} MOVES',
        '{PIECE} CHANGES HANDS, AND CHANGES THE CONVERSATION',
        'ONE PRICE SETTLED EVERYTHING: {PIECE} AT {PRICE}',
        '{PIECE} GETS ITS VERDICT: {PRICE}',
        'THE TAPE SPEAKS: {PIECE}, {PRICE}',
    ],
    /* Headlines — mints carried the day. {N} */
    HEAD_MINT: [
        '{N} NEW PIECES FOUND KEEPERS',
        'THE MINT BUTTON EARNED ITS KEEP: {N} PRESSED',
        'SUPPLY DAY: {N} FRESH PIECES ON THE RECORD',
        'THE PRESSES RAN — {N} NEW PIECES',
        '{N} PIECES ENTERED THE DISCUSSION',
        'COLLECTORS SHOWED UP: {N} MINTED',
        '{N} MINTS · THE WALL GREW OVERNIGHT',
        'FRESH INK: {N} PIECES JOINED THE LEDGER',
        '{N} KEEPERS STEPPED FORWARD',
        'NEW BLOOD: {N} MINTS ON THE DAY',
    ],
    /* Headline — exactly one mint. */
    HEAD_MINT_ONE: [
        'ONE MINT. IT ONLY TAKES ONE.',
        'A SINGLE PIECE FOUND ITS KEEPER',
        'ONE PRESS OF THE BUTTON, DULY RECORDED',
        'THE DAY PRODUCED EXACTLY ONE KEEPER — WHICH IS PLENTY',
    ],
    /* Headlines — quiet day. */
    HEAD_QUIET: [
        'A QUIET DAY ON THE RECORD',
        'NOTHING MOVED. SOMEBODY WAS WATCHING, THOUGH.',
        'THE ROOM HELD ITS BREATH',
        'NO TRADES — THE ARCHIVE FILED IT ANYWAY',
        'SILENCE, DULY RECORDED',
        'THE LEDGER TOOK A PERSONAL DAY',
        'ALL EYES, NO HANDS',
        'A PAGE LEFT DELIBERATELY BLANK',
        'STILL WATERS ON THE TAPE',
        'THE WATCHERS HAD THE FLOOR TO THEMSELVES',
        'NOT ONE ENTRY — AND STILL A PAGE IN THE BOOK',
        'THE RECORD SHOWS: PATIENCE',
    ],
    /* Headlines — listings but no sales. {N} */
    HEAD_LIST: [
        'SELLERS NAMED THEIR NUMBERS — {N} LISTINGS UP',
        '{N} ASKS HIT THE BOOK. THE ROOM IS THINKING.',
        'THE ASK SIDE SPOKE FIRST: {N} LISTINGS',
        '{N} PRICE TAGS, ZERO TAKERS — SO FAR',
        'INVENTORY DAY: {N} PIECES SEEK NEW WALLS',
        '{N} INVITATIONS TO ARGUE, POLITELY DECLINED',
    ],
    /* Headlines — offers dominated. {N} */
    HEAD_OFFER: [
        'THE BID SIDE GOT LOUD: {N} OFFERS',
        '{N} OFFERS ON THE TABLE — SELLERS UNMOVED',
        'BUYERS CIRCLED: {N} OFFERS FILED',
        '{N} BIDS AND A STARING CONTEST',
        'THE ROOM MADE {N} OFFERS. THE ROOM CAN WAIT.',
    ],
    /* Headlines — a new project arrived. {TITLE} */
    HEAD_UPLOAD: [
        'NEW WORK ON THE WALL: {TITLE}',
        'THE FILTER OPENED FOR {TITLE}',
        'GENESIS DAY — {TITLE} ARRIVES',
        '{TITLE} JOINS THE CATALOG',
        'FRESH CANVAS: {TITLE} IS HERE',
    ],
    /* Headlines — working day, mixed small activity. */
    HEAD_MIXED: [
        'A WORKING DAY ON THE RECORD',
        'THE MACHINE TICKED OVER',
        'BUSINESS AS USUAL, DULY FILED',
        'SMALL MOVES, ALL RECORDED',
        'THE LEDGER EARNED ITS LUNCH',
        'A DAY OF HONEST BOOKKEEPING',
        'NO HEADLINES — JUST HISTORY, ACCUMULATING',
    ],

    /* Lead color — one closing sentence after the facts. Generic on purpose:
     * must sit under any market shape. */
    LEAD_COLOR: [
        'The record keeps all of it, as usual.',
        'Every line of it is on the ledger, where it will stay.',
        'The archive took it down without comment.',
        'All of it printed, none of it negotiable.',
        'The desk checked the arithmetic twice; it held.',
        'Tomorrow gets its own page.',
        'The room will argue about what it means. The numbers won’t move.',
        'History, filed on time.',
        'That’s the record — the rest is conversation.',
        'The ink is dry on all of it.',
        'Nothing here is a rumor; that’s a different protocol.',
        'The paper stands behind every figure above.',
    ],

    /* Salon — new accounts arrived. {N} */
    SALON_ARRIVALS: [
        '{N} new {ACCOUNT_WORD} walked in yesterday. Nobody arrives at a price platform by accident.',
        'The room grew by {N}. Watch what they star before you watch what they buy.',
        '{N} fresh {ACCOUNT_WORD} at the door. The old hands pretended not to look up.',
        'Somebody told {N} more {PEOPLE_WORD} about this place. The secret is not holding.',
        '{N} new {ACCOUNT_WORD} signed the book. First impressions are being formed both ways.',
        'The population ticked up by {N}. Every regular here was new once, briefly.',
    ],
    /* Salon — offers outran sales. */
    SALON_BIDS: [
        'More offers than sales yesterday — the bid side is talking and the ask side is letting it.',
        'Offers outran sales. Somebody wants in cheaper than the room will allow. The standoff is the content.',
        'The bids kept coming and the asks kept their composure. Somebody blinks eventually; the ledger will say who.',
        'A day of proposals, few of them accepted. Courtship is like that.',
        'The offer column filled faster than the sale column. Patience was the day’s best position.',
        'Plenty of interest, little agreement. That gap has a name here: the discussion.',
    ],
    /* Salon — listings without sales. */
    SALON_ASKS: [
        'Listings without sales: sellers named their numbers and the room declined to argue. Yet.',
        'The asks went up like flags. The room saluted and kept its wallet pocketed.',
        'Sellers spoke first yesterday. The reply, so far, is a comfortable silence.',
        'New numbers on old walls. Whether they’re prices or opinions is what today decides.',
        'The book filled with asks. An ask is just a dare with formatting.',
    ],
    /* Salon — trading day with real volume. */
    SALON_TRADE: [
        'Money moved and nobody had to explain themselves. The tape is explanation enough.',
        'A day of settled arguments — every sale is a discussion that reached its number.',
        'The room agreed on prices {SALES_N} times yesterday. Consensus, in this economy.',
        'Hands changed, floors flexed, and the discussion continued in its native language.',
        'Deals closed. Somewhere a spreadsheet updated itself with feeling.',
        'The market cleared its throat and then actually said something.',
    ],
    /* Salon — the idle-day aphorism library. Pure house voice, no facts, so
     * the pool can be deep and the rotation memory keeps each line out of
     * print for months after it runs. */
    SALON_APHORISM: [
        'The discussion continued in the only language this place respects: price.',
        'Watchers watched. Holders held. The equilibrium is doing its quiet work.',
        'Price is the only critic whose reviews settle on-chain.',
        'Every collection is an autobiography written in other people’s art.',
        'The floor is a fiction everyone agrees to take literally.',
        'Patience is a position too. It compounds quietly.',
        'A listing is a question. A sale is the only answer that counts.',
        'Taste is private. Price is public. The gap between them is where this place lives.',
        'Nobody ever framed a screenshot of their hesitation.',
        'Art doesn’t need a market to matter. It just behaves better with an audience.',
        'The ledger never gets tired of being right.',
        'Conviction is cheap to claim and expensive to hold. The record knows which one you did.',
        'Half of collecting is looking. The other half is admitting what you saw.',
        'A quiet market is not an empty one. Somebody is always doing arithmetic.',
        'The best time to have bought was always obvious later.',
        'Rooms have moods. Ledgers have facts. The paper prints the facts and respects the mood.',
        'Every price is a small treaty between two kinds of stubbornness.',
        'What you star is a diary entry. What you buy is a signature.',
        'The market rewards attention and punishes attention-seeking. Adjust accordingly.',
        'Some days the most sophisticated trade is not trading.',
        'A floor rises one changed mind at a time.',
        'The archive is undefeated: every hot take eventually reports to it.',
        'Value is what survives the second look.',
        'The room remembers who sold the bottom. The room is petty like that. The paper is not.',
        'Great collections are built on days nobody else found interesting.',
        'An offer declined is still information. Most information here is free.',
        'The tape doesn’t do subtext.',
        'Everything on this platform is a price discussion, including the silences.',
        'Liquidity is courage, measured.',
        'Yesterday’s hesitation is today’s footnote.',
        'The record doesn’t care what anything is worth. It cares what somebody paid. So does everyone else, eventually.',
        'You can’t buy taste, but you can watch it operate in public, free of charge.',
        'A collection is a argument you make one piece at a time.',
        'The wall doesn’t lie. The wall also doesn’t brag. Be like the wall.',
        'Somewhere between the bid and the ask sits the entire human condition.',
        'Days like this are why the archive matters: the silence is part of the story.',
        'The ledger has quiet pages too; this was one.',
        'Every era of this place will look obvious in the rearview. None of them felt obvious at the time.',
        'Hold long enough and your portfolio becomes a museum of your former selves.',
        'The number that matters most is the one you’d actually accept. The rest is theater.',
    ],

    /* Quiet-day lead bodies. */
    QUIET_BODY: [
        'The ledger has quiet pages too; this was one. No mints, no sales — the room held its breath and the record kept it anyway.',
        'No trades printed. Days like this are why the archive matters: the silence is part of the story.',
        'Not a single entry hit the tape. The paper checked twice, found nothing, and prints the nothing with full confidence.',
        'Zero across the board — no mints, no sales, no listings, no offers. A rest day, recorded with the same care as a rally.',
        'The room looked, weighed, and kept its hands in its pockets. That, too, is a market position.',
        'A blank ledger day. The presses run regardless; a paper that only printed loud days would be an advertisement.',
        'Nothing cleared. Nobody blinked. The staring contest continues at tomorrow’s prices.',
        'The tape stayed clean for a full day — rare enough to be its own kind of headline.',
    ],

    /* Market desk — volume comparison. {VOL} {PREV} */
    DELTA_UP: [
        'Volume ran hot: {VOL} against {PREV} the day before.',
        'The tape thickened — {VOL} moved, up from {PREV} yesterday.',
        'More money in motion: {VOL}, versus {PREV} the previous day.',
        'The dial moved right: {VOL} on the day, {PREV} the day prior.',
    ],
    DELTA_DOWN: [
        'Volume cooled: {VOL} against {PREV} the day before.',
        'A softer tape — {VOL} moved, down from {PREV}.',
        'The pace eased: {VOL} on the day after {PREV} the day prior.',
        'Less money in motion: {VOL}, versus yesterday’s {PREV}.',
    ],
    DELTA_FLAT: [
        'Volume held its line: {VOL}, in step with the day before.',
        'Steady tape — {VOL} moved, about even with yesterday.',
    ],
    /* Market desk — streaks. {N} */
    STREAK_SALES: [
        'That makes {N} straight days with sales on the tape.',
        'The sales streak reaches {N} days and counting.',
        'Day {N} of unbroken selling — the room hasn’t gone a day without a deal in over a week.',
    ],
    /* Market desk — records. {N} {DAY} */
    RECORD_SALE: [
        'The desk checked the files: that’s the biggest sale in {N} days.',
        'Largest single sale since PriceDay {DAY} — the files confirm it.',
        'No sale has printed bigger in {N} days.',
    ],
    RECORD_BUSY: [
        'Busiest ledger since PriceDay {DAY}.',
        'More entries hit the record than any day since PriceDay {DAY}.',
    ],

    /* Persons of interest. {WHO} {N} */
    POI_COLLECTOR: [
        '{WHO} was everywhere yesterday — {N} entries under one name.',
        'Busiest hands on the platform: {WHO}, with {N} ledger entries.',
        '{WHO} did the most business in the room: {N} entries.',
        'If the ledger had a byline yesterday it would read {WHO} — {N} entries.',
    ],
    POI_SELLER: [
        'On the other side of the table, {WHO} let {N} {PIECE_WORD} go.',
        '{WHO} was the day’s willing seller — {N} {PIECE_WORD} released.',
        'The supply had a name too: {WHO} parted with {N} {PIECE_WORD}.',
    ],

    /* Number of the day — framings. One data sentence + these closers. */
    NOTD_CLOSER: [
        'Numbers like this are why the desk keeps a calculator.',
        'File it under: things the tape knew before anyone said it.',
        'Small number, honest work.',
        'The kind of figure that means more in a month.',
        'Write it down; it won’t repeat.',
        'That’s the day, measured.',
        'Statistics: the poetry the ledger writes on its own.',
    ],

    /* Horizon flavor for an empty horizon. */
    HORIZON_OPEN: [
        'An open day. The record is patient.',
        'Nothing scheduled — which is how interesting days usually start.',
        'The calendar is clear. The room rarely is.',
        'No fixtures on the books. Improvisation it is.',
        'Tomorrow arrives unbooked. Somebody will write on it.',
    ],

    /* Weekend — softer lead color, used instead of LEAD_COLOR on weekends. */
    WEEKEND_COLOR: [
        'It’s the weekend; the paper runs lighter and the coffee runs longer.',
        'Weekend rules: same facts, gentler typeface.',
        'The desk prints this one in its slippers.',
        'A weekend page — shorter, slower, just as permanent.',
        'The weekend edition believes in rest, within reason.',
    ],
} as const;

export type PoolName = keyof typeof POOLS;
