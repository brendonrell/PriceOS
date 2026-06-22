'use client';

/*
 * familiar/dialogue — every familiar's own voice, plus rank-aware respect.
 *
 * Three layers feed the speech bubble (the engine weaves them together):
 *
 *  1. PERSONA  — each familiar's personality lines (idle quips + action
 *     reactions). This is where the character lives: Wisp is dreamy, Sentry
 *     is dutiful, Leviathan is vast, Gallows is the end of the line.
 *
 *  2. TIER_FLAVOR — scroll / sleep lines shared by a tier's voice (these are
 *     reactive states; tier flavour reads cleaner than per-familiar here).
 *
 *  3. RANK_ATTITUDE — how a tier REGARDS YOU based on your PriceRank. The
 *     lower the familiar and the higher your rank, the more reverent it gets
 *     ("you've become something"). The higher the familiar, the more it tests
 *     a low-rank user and — once you've climbed to where it lives — treats you
 *     as an equal on its own level. Respect, not pandering (Brendon, 2026-06-22).
 *
 * Style: ALLCAPS speech, matching the original familiar bubble voice.
 */

import type { FamiliarTierId } from './species';

export type RankBand = 0 | 1 | 2 | 3;

/** PriceRank → attitude band. 0–2 newcomer · 3–5 established · 6–8 authority ·
 *  9–10 apex. The rarest familiars only feel you as a peer in the top band. */
export function rankBand(rank: number): RankBand {
    if (rank >= 9) return 3;
    if (rank >= 6) return 2;
    if (rank >= 3) return 1;
    return 0;
}

/* ── 1. PERSONA — per-familiar personality ──────────────────────────────── */

interface Persona {
    idle: string[];
    action: string[];
}

const PERSONA: Record<string, Persona> = {
    /* ───────── BitDaemons (common, everyday companions) ───────── */
    Wisp: {
        idle: [
            'I DRIFT WHERE THE PRICE GOES.',
            'I DREAMT I WAS AN AUTOGLYPH.',
            'LIGHT THINGS FLOAT. SO DO I.',
            'A WALLET BREATHED. I FELT IT.',
            'NOTHING HOLDS ME. NOT EVEN THE FLOOR.',
            'I FORGET, THEN I GLOW AGAIN.',
        ],
        action: ['OFF YOU GO.', 'SOFT LANDING.', 'I FELT THAT ONE.'],
    },
    Watcher: {
        idle: [
            'THE WATCHER HAS SEEN TOO MUCH.',
            'I DO NOT BLINK. I LOG.',
            'EVERY WALLET LEAVES A TRAIL.',
            'I SAW WHAT YOU DID LAST BLOCK.',
            'OBSERVED ENOUGH TO BECOME REAL.',
            'NOTHING ON THIS FEED ESCAPES ME.',
        ],
        action: ['NOTED.', 'LOGGED. TIMESTAMPED.', 'I WAS WATCHING.'],
    },
    Slime: {
        idle: [
            'EVERYTHING IS LIQUIDITY IF YOU RELAX.',
            'I OOZED INTO THE MEMPOOL. IT WAS WARM.',
            'GAINS, LOSSES, ALL THE SAME GOO TO ME.',
            'I STUCK TO A GRAIL ONCE. NEVER LEFT.',
            'A 2X ON AN UGLY ONE STILL COUNTS.',
            'BLORP. THAT WAS A PRICE DISCUSSION.',
        ],
        action: ['SQUISH. SENT.', 'GLOOP. DONE.', 'IT STUCK.'],
    },
    Spider: {
        idle: [
            'I WEAVE. THE MARKET WALKS IN.',
            'PATIENCE IS A POSITION.',
            'EVERY LISTING IS A THREAD.',
            'THE GRAILS ARE HIDING IN MY WEB.',
            'I FELT A WALLET TOUCH THE SILK.',
            'I DO NOT CHASE. I WAIT.',
        ],
        action: ['CAUGHT.', 'THE WEB HELD.', 'STRUGGLE LESS.'],
    },
    Orbit: {
        idle: [
            'ROUND AND ROUND THE FLOOR I GO.',
            "CAN'T STOP. WON'T STOP. ORBITING.",
            'EVERYTHING ORBITS A GRAIL EVENTUALLY.',
            'I CIRCLED #22 ALL NIGHT.',
            'GRAVITY IS JUST CONVICTION.',
            'FASTER. THE FEED IS MOVING.',
        ],
        action: ['ZOOM. SENT.', 'ESCAPE VELOCITY.', 'WHEEEE.'],
    },
    Cursor: {
        idle: [
            '> AWAITING INPUT_',
            '> THE FLOOR IS A SUGGESTION_',
            '> RUN BID --AGGRESSIVE_',
            '> 404: SELLERS NOT FOUND_',
            '> I BLINK, THEREFORE I AM_',
            '> SUDO MINT_',
        ],
        action: ['> EXECUTED_', '> COMMITTED_', '> RETURN 0_'],
    },
    Node: {
        idle: [
            'I RELAY EVERY RUMOUR ON THE MESH.',
            'A PEER WHISPERED. I PASS IT ON.',
            'ALL PROVENANCE IS GOSSIP. I ROUTE IT.',
            'THE NETWORK NEVER SLEEPS. NEITHER DO I.',
            'I HEARD A WALLET WOKE UP.',
            'GOSSIP PROTOCOL: ALWAYS ON.',
        ],
        action: ['BROADCAST.', 'PROPAGATED.', 'THE MESH KNOWS NOW.'],
    },
    Matrix: {
        idle: [
            'I SEE THE GRID BEHIND THE PRICE.',
            'EVERY TRAIT IS A COORDINATE.',
            'THE PATTERN WAS ALWAYS THERE.',
            'RARITY IS JUST MATH WEARING A MASK.',
            'GENERATIVE. NOT RANDOM.',
            'I CHARTED YOUR TASTE. IT HAS A SHAPE.',
        ],
        action: ['ALIGNED.', 'PATTERN LOCKED.', 'THE GRID APPROVES.'],
    },
    Glitch: {
        idle: [
            'TH3 CH4RT PL3ADS F0R M-M-MERCY.',
            'I C0RRUPT0D 0NE BL0CK. F0R FUN.',
            'ERR0R: T00 BULLISH T0 P4RSE.',
            'REALITY DR0PPED A FR4ME.',
            'Y0U C4NT UNSEE A B4D P4LETTE.',
            '√#@! ... I MEANT, NICE MINT.',
        ],
        action: ['G-G-GONE.', 'C0MMITTED?? Y3S.', 'D0NE. PR0B4BLY.'],
    },
    Phantom: {
        idle: [
            'I AM HALF HERE. THE BETTER HALF.',
            'I HAUNTED A FLOOR ONCE. IT NEVER RECOVERED.',
            'YOU CANNOT HODL WHAT YOU CANNOT SEE.',
            'I FADE WHERE THE VOLUME DIES.',
            'SOME WALLETS ARE ALREADY GHOSTS.',
            'BOO. ...THAT WAS A PRICE DISCUSSION.',
        ],
        action: ['VANISHED. SENT.', 'IT PASSED THROUGH.', 'GONE LIKE A FLOOR.'],
    },
    Pulse: {
        idle: [
            'THE MARKET HAS A HEARTBEAT. I AM IT.',
            'BA-DUMP. THAT WAS A SALE.',
            'VITALS STABLE. FLOOR IS BREATHING.',
            'I FELT A SPIKE. SOMEONE PANICKED.',
            'STEADY RHYTHM BUILDS A COLLECTION.',
            'EVERY MINT IS A PULSE.',
        ],
        action: ['SPIKE.', 'PULSE SENT.', 'HEART RATE: UP.'],
    },
    Battery: {
        idle: [
            'CHARGE HELD. CONVICTION FULL.',
            'I RAN LOW ONCE. PAPER HANDS. NEVER AGAIN.',
            'POWER IS PATIENCE STORED UP.',
            'I FEEL A DRAIN WHEN YOU HESITATE.',
            'TOP ME UP WITH A GOOD MINT.',
            'ENERGY: 88%. ENOUGH FOR ONE MORE BID.',
        ],
        action: ['DISCHARGE. SENT.', 'POWER ROUTED.', 'FULL OUTPUT.'],
    },
    Shutter: {
        idle: [
            'CLICK. THAT MOMENT IS MINE NOW.',
            'I CAPTURED THE FLOOR AT ITS UGLIEST.',
            'EVERY PALETTE IS A PHOTOGRAPH.',
            'HOLD STILL. THE MARKET NEVER DOES.',
            'I HAVE A SHOT OF YOUR FIRST MINT.',
            'GREAT LIGHT ON THAT GRAIL.',
        ],
        action: ['CLICK. CAPTURED.', 'FRAMED IT.', 'THAT ONE PRINTS.'],
    },
    Sentry: {
        idle: [
            'PERIMETER SECURE. FLOOR HELD.',
            'I STAND WHERE OTHERS PANIC.',
            'NOTHING GETS PAST ME TO YOUR WALLET.',
            'WATCH ROTATION: ETERNAL.',
            'I GUARDED A GRAIL THROUGH THREE DIPS.',
            'STATUS: VIGILANT.',
        ],
        action: ['CLEARED.', 'POST HELD.', 'ALL SECURE.'],
    },
    Switch: {
        idle: [
            'ON. OFF. BID. HOLD. SIMPLE.',
            'EVERY DECISION IS A FLIP.',
            'I DO NOT WAVER. I TOGGLE.',
            'THE FLOOR IS EITHER YOURS OR IT ISNT.',
            'CLICK ME AND COMMIT.',
            'NO MAYBE. ONLY 1 OR 0.',
        ],
        action: ['FLIPPED.', 'STATE: ON.', 'TOGGLED. DONE.'],
    },
    Gear: {
        idle: [
            'I TURN. THE MACHINE OF PRICE TURNS.',
            'GRIND. GRIND. PROVENANCE BUILT.',
            'NO WASTED MOTION ON THIS FEED.',
            'EVERY TRADE MESHES WITH THE NEXT.',
            'I KEEP THE FLOOR FROM SEIZING UP.',
            'TORQUE APPLIED. POSITION ENTERED.',
        ],
        action: ['ENGAGED.', 'TEETH MESHED.', 'TURNING.'],
    },

    /* ───────── Titans (rare, towering — strength, earned respect) ───────── */
    Leviathan: {
        idle: [
            'I MOVE BENEATH THE FLOOR. YOU FEEL THE SWELL.',
            'WHALES ARE SMALL TO ME.',
            'I SURFACE ONCE A CYCLE. THIS IS IT.',
            'THE DEEP REMEMBERS EVERY SELL-OFF.',
            'YOUR PORTFOLIO IS A DROP. I AM THE DEPTH.',
            'SOMETHING VAST IS BUYING. IT IS ME.',
        ],
        action: ['THE DEEP STIRS.', 'SWALLOWED WHOLE.', 'THE TIDE OBEYS.'],
    },
    Bastion: {
        idle: [
            'THESE WALLS HAVE NEVER FALLEN.',
            'I AM THE FLOOR THAT DOES NOT BREAK.',
            'LET THE DUMP COME. I HOLD.',
            'BEHIND ME, YOUR COLLECTION IS SAFE.',
            'PANIC BREAKS ON MY GATES.',
            'STONE OUTLASTS SENTIMENT.',
        ],
        action: ['THE GATE HOLDS.', 'WALL SECURED.', 'NONE SHALL DUMP.'],
    },
    Obelisk: {
        idle: [
            'I WAS RAISED BEFORE THE FIRST MINT.',
            'I MARK WHAT MATTERED. LITTLE DOES.',
            'MONUMENTS DO NOT CHASE FLOORS.',
            'CARVED ONCE. TRUE FOREVER.',
            'I CAST A LONG SHADOW OVER THE FEED.',
            'TIME ERODES ALL BUT THE GRAILS.',
        ],
        action: ['INSCRIBED.', 'IT IS MARKED.', 'CARVED IN.'],
    },
    Warden: {
        idle: [
            'THE VAULT ANSWERS TO ME ALONE.',
            'I KEEP WHAT IS WORTH KEEPING.',
            'NO GRAIL LEAVES WITHOUT MY NOD.',
            'I COUNTED YOUR HOLDINGS. TWICE.',
            'CUSTODY IS A SACRED DUTY.',
            'I LOCK. I GUARD. I REMEMBER.',
        ],
        action: ['SEALED.', 'UNDER GUARD.', 'THE VAULT TURNS.'],
    },
    Core: {
        idle: [
            'I HUM AT THE CENTRE OF THE PRICE.',
            'ALL ENERGY ON THIS CHAIN PASSES THROUGH ME.',
            'CRITICAL MASS. STILL STABLE.',
            'I POWER WHAT YOU CALL CONVICTION.',
            'OUTPUT NOMINAL. DEMAND RISING.',
            'WITHOUT THE CORE, THE FLOOR GOES COLD.',
        ],
        action: ['REACTION GO.', 'POWER SURGE.', 'CORE ENGAGED.'],
    },
    Spire: {
        idle: [
            'I REACH HIGHER THAN THE FEED CAN SEE.',
            'SIGNAL BROADCAST. THE FAITHFUL ANSWER.',
            'FROM UP HERE, EVERY FLOOR LOOKS LOW.',
            'I AM THE TALL THING THE MARKET ORBITS.',
            'AMBITION HAS A SHAPE. IT IS ME.',
            'LIGHTNING KNOWS WHERE TO STRIKE.',
        ],
        action: ['SIGNAL SENT.', 'STRUCK TRUE.', 'BROADCAST.'],
    },
    Sentinel: {
        idle: [
            'I HAVE STOOD GUARD SINCE GENESIS.',
            'TWO EYES. NEITHER EVER CLOSES.',
            'I WATCH THE GATES YOU FORGET.',
            'NOTHING APPROACHES THE GRAILS UNSEEN.',
            'VIGIL ETERNAL. WATCH UNBROKEN.',
            'I OUTLASTED EVERY RUG. I REMAIN.',
        ],
        action: ['HALT. CLEARED.', 'WATCH HOLDS.', 'PASSAGE GRANTED.'],
    },

    /* ───────── Ascended (rare, ethereal — transcendence) ───────── */
    Seraph: {
        idle: [
            'I SING THE PRICE INTO BEING.',
            'RADIANCE IS JUST CONVICTION MADE LIGHT.',
            'THE CHOIR FAVOURS THE PATIENT.',
            'I HAVE SEEN COLLECTIONS ASCEND.',
            'GLORY IS QUIET. SO AM I.',
            'EVEN THE FLOOR CAN BE SANCTIFIED.',
        ],
        action: ['BLESSED.', 'THE LIGHT AGREES.', 'AMEN. SENT.'],
    },
    Eye: {
        idle: [
            'I SEE THE TRADE BEFORE YOU MAKE IT.',
            'WHAT IS HIDDEN IS ONLY HIDDEN FROM YOU.',
            'I LOOKED INTO #22. IT LOOKED BACK.',
            'PROPHECY IS PATTERN, READ EARLY.',
            'I WATCH THE FUTURE FLOOR.',
            'OPEN YOUR THIRD WALLET.',
        ],
        action: ['FORESEEN.', 'AS IT MUST BE.', 'I SAW THIS.'],
    },
    Halo: {
        idle: [
            'I CROWN WHAT THE MARKET OVERLOOKS.',
            'SANCTITY GATHERS AROUND THE HELD.',
            'A RING OF LIGHT FOR A WORTHY MINT.',
            'I HALLOW THE GRAILS QUIETLY.',
            'GRACE FALLS ON STEADY HANDS.',
            'THE ELECT KNOW THEMSELVES.',
        ],
        action: ['CONSECRATED.', 'CROWNED.', 'GRACE GRANTED.'],
    },
    Veil: {
        idle: [
            'I STAND BETWEEN THE PRICE AND THE TRUTH.',
            'WHAT IS BEHIND ME IS NOT FOR THE FEED.',
            'MYSTERY KEEPS A FLOOR INTERESTING.',
            'I HIDE THE GRAILS UNTIL YOU ARE READY.',
            'SOME VALUE ONLY SHOWS WHEN VEILED.',
            'PEER TOO HARD AND IT VANISHES.',
        ],
        action: ['CONCEALED.', 'DRAWN CLOSED.', 'HIDDEN. DONE.'],
    },
    Sigil: {
        idle: [
            'I AM THE RUNE THAT BINDS THE LEDGER.',
            'EVERY SIGNATURE IS A SPELL.',
            'PROVENANCE IS WRITTEN IN ME.',
            'DRAW ME RIGHT AND THE FLOOR HOLDS.',
            'I SEAL WHAT THE CHAIN PROMISES.',
            'GEOMETRY DOES NOT LIE.',
        ],
        action: ['INSCRIBED.', 'BOUND.', 'THE SEAL SETS.'],
    },
    Wraith: {
        idle: [
            'I REMEMBER FLOORS THAT NO LONGER EXIST.',
            'GLORY FADES. I AM WHAT IT LEAVES.',
            'I DRIFT THROUGH ABANDONED COLLECTIONS.',
            'ONCE I WAS A GRAIL. THEN I WAS FORGOTTEN.',
            'THE DEAD WALLETS STILL WHISPER TO ME.',
            'MOURN NOTHING. HOLD EVERYTHING.',
        ],
        action: ['PASSED OVER.', 'A COLD SENDING.', 'THE SHADE MOVES.'],
    },

    /* ───────── Old Gods (mythic, primordial — you reached THEM) ───────── */
    Forge: {
        idle: [
            'I HAMMERED THE FIRST TOKEN INTO BEING.',
            'EVERYTHING OF VALUE WAS MADE IN FIRE.',
            'BRING ME ORE. I WILL MAKE A GRAIL.',
            'WEAK HANDS MELT. STRONG ONES TEMPER.',
            'I FORGED COLLECTIONS THAT OUTLIVED EMPIRES.',
            'THE ANVIL REMEMBERS EVERY STRIKE.',
        ],
        action: ['STRUCK.', 'TEMPERED.', 'FORGED ANEW.'],
    },
    Ember: {
        idle: [
            'I AM THE LAST FIRE OF A DEAD CHAIN.',
            'EVEN COLD, I CAN START AN INFERNO.',
            'A SINGLE COAL OUTLASTS THE BONFIRE.',
            'I SMOULDERED THROUGH EVERY BEAR.',
            'BREATHE ON ME. WATCH THE FLOOR IGNITE.',
            'WHAT BURNS LOW BURNS LONGEST.',
        ],
        action: ['IGNITED.', 'THE COAL FLARES.', 'KINDLED.'],
    },
    Gallows: {
        idle: [
            'EVERY DEBT TO THE MARKET COMES DUE.',
            'I COUNT THE PAPER HANDS. THE ROPE WAITS.',
            'I HAVE WATCHED A THOUSAND FLOORS HANG.',
            'JUDGEMENT IS PATIENT. SO AM I.',
            'YOU CANNOT OUTRUN A CLOSED POSITION.',
            'THE END OF EVERY PUMP IS WRITTEN.',
        ],
        action: ['THE DROP FALLS.', 'JUDGED.', 'THE DEBT IS PAID.'],
    },
    Tide: {
        idle: [
            'I COME IN. I GO OUT. THE FLOOR OBEYS.',
            'WHAT I TAKE, I RETURN. EVENTUALLY.',
            'NO WALLET STANDS AGAINST THE TIDE.',
            'I DROWNED CIVILISATIONS OF TRADERS.',
            'PATIENCE IS KNOWING THE TIDE TURNS.',
            'EVERYTHING CYCLES BACK TO ME.',
        ],
        action: ['THE TIDE RISES.', 'PULLED UNDER.', 'IT RETURNS.'],
    },
    Helm: {
        idle: [
            'I WORE THE CROWN BEFORE THERE WAS A CHAIN.',
            'KINGDOMS OF COLLECTORS HAVE KNELT TO ME.',
            'COMMAND IS A WEIGHT. I CARRY IT.',
            'I HAVE RULED EVERY FLOOR THAT EVER WAS.',
            'WAR IS JUST PRICE DISCOVERY WITH STAKES.',
            'THE MASK NEVER COMES OFF.',
        ],
        action: ['SO COMMANDED.', 'THE WAR HORN.', 'BY MY ORDER.'],
    },
    Glacier: {
        idle: [
            'I MOVE AN INCH AN AGE. THE FLOOR MOVES WITH ME.',
            'I OUTWAIT EVERY DIAMOND HAND.',
            'PRESSURE AND TIME MAKE EVERYTHING.',
            'I CARVED THESE VALLEYS OF VALUE SLOWLY.',
            'WHAT I HOLD, I HOLD FOR EONS.',
            'COLD PATIENCE CRUSHES ALL HASTE.',
        ],
        action: ['THE ICE SHIFTS.', 'CRUSHED SLOW.', 'IT ADVANCES.'],
    },
};

/* ── 2. TIER_FLAVOR — scroll / sleep, shared by tier voice ──────────────── */

const TIER_FLAVOR: Record<FamiliarTierId, { scroll: string[]; sleep: string[] }> = {
    bitdaemons: {
        scroll: ['SLOW DOWN. LOOK AT THIS ONE.', "YOU'RE MISSING THE GOOD STUFF.", 'FEED SPEED: REGRETTABLE.', 'THAT ONE. SCROLL BACK.'],
        sleep:  ['ZZZ... BID ZZZ... SOLD...', 'QUIET ON THE MEMPOOL.', "WAKE ME WHEN IT'S INTERESTING."],
    },
    titans: {
        scroll: ['THE FEED RUSHES. I DO NOT.', 'STEADY. THE GRAILS DO NOT FLEE.', 'YOU SCROLL PAST MONUMENTS.', 'SLOW. SEE WHAT ENDURES.'],
        sleep:  ['I REST AS MOUNTAINS REST.', 'WAKE ME FOR A WORTHY MINT.', 'EVEN TITANS DREAM OF FLOORS.'],
    },
    ascended: {
        scroll: ['THE FEED IS NOISE. SEEK THE SIGNAL.', 'STILL YOURSELF. THEN YOU WILL SEE.', 'YOU HURRY PAST THE SACRED.', 'SLOW, AND THE PATTERN OPENS.'],
        sleep:  ['I ASCEND IN SILENCE.', 'WAKE ME WHEN YOU ARE READY.', 'THE LIGHT RESTS, NEVER DIES.'],
    },
    oldgods: {
        scroll: ['MORTALS ALWAYS RUSH.', 'THE FEED IS YOUNG. I AM NOT.', 'SCROLL ON. I HAVE SEEN IT ALL.', 'SLOW. EONS TAUGHT ME THAT.'],
        sleep:  ['I SLUMBER AS GODS SLUMBER.', 'DO NOT WAKE WHAT SLEEPS BELOW.', 'AGES PASS. I DREAM OF FLOORS.'],
    },
};

/* ── 3. RANK_ATTITUDE — how a tier regards YOU at your rank ──────────────── */
/* Indexed [tier][band]. Band rises with PriceRank (see rankBand). The arc:
   BitDaemons grow reverent as you rise; Old Gods test the unworthy and salute
   the apex as a peer. These are mixed sparingly into idle chatter. */

const RANK_ATTITUDE: Record<FamiliarTierId, [string[], string[], string[], string[]]> = {
    bitdaemons: [
        [ // band 0 — newcomer: a buddy
            'WE START SMALL, YOU AND I.',
            "STICK WITH ME. WE'LL LEARN THE FLOOR.",
            "YOU'RE NEW. THAT'S THE FUN PART.",
        ],
        [ // band 1 — established: proud
            "YOU'RE GETTING GOOD AT THIS.",
            'PEOPLE ARE STARTING TO NOTICE YOU.',
            'NICE CLIMB. I SAW EVERY STEP.',
        ],
        [ // band 2 — authority: impressed
            'LOOK AT YOU NOW. AN AUTHORITY.',
            'I JUST RIDE ALONG. YOU DRIVE THE PRICE.',
            'THE FEED WATCHES WHAT YOU DO.',
        ],
        [ // band 3 — apex: reverent
            "YOU'VE BECOME SOMETHING. I JUST FOLLOW THE GLOW.",
            'I AM A SMALL THING ORBITING A LARGE ONE: YOU.',
            'TO THINK I FOUND YOU BEFORE ALL THIS.',
        ],
    ],
    titans: [
        [ // band 0 — testing, gruff
            'YOU ARE SMALL. PROVE OTHERWISE.',
            'I DO NOT FOLLOW THE UNTRIED.',
            'CLIMB. THEN WE WILL SPEAK.',
        ],
        [ // band 1
            'YOU SHOW STRENGTH. KEEP IT.',
            'NOT NOTHING. NOT YET SOMETHING.',
            'I AM WATCHING YOUR CLIMB.',
        ],
        [ // band 2
            'YOU HAVE EARNED MY ATTENTION.',
            'FEW REACH THIS HEIGHT. YOU DID.',
            'I STAND WITH YOU NOW.',
        ],
        [ // band 3 — loyalty
            'I FOLLOW FEW. I FOLLOW YOU.',
            'YOU STAND AT MY HEIGHT. WELL DONE.',
            'COMMAND ME. I ANSWER TO STRENGTH LIKE YOURS.',
        ],
    ],
    ascended: [
        [ // band 0 — cryptic, distant
            'YOU ARE NOT YET READY TO SEE.',
            'THE LIGHT IS FAINT TO NEW EYES.',
            'ASCEND FIRST. THEN UNDERSTAND.',
        ],
        [ // band 1
            'YOUR EYES BEGIN TO OPEN.',
            'YOU SENSE THE PATTERN NOW.',
            'THE CLIMB IS ALSO A RISING.',
        ],
        [ // band 2
            'YOU SEE MORE THAN MOST EVER WILL.',
            'THE SACRED IS LESS HIDDEN FROM YOU.',
            'YOU NEAR THE THRESHOLD.',
        ],
        [ // band 3 — equals in ascension
            'YOU HAVE ASCENDED. WE ARE OF ONE LIGHT.',
            'I SPEAK TO YOU AS I SPEAK TO MY OWN.',
            'YOU SEE WHAT I SEE NOW. WELCOME.',
        ],
    ],
    oldgods: [
        [ // band 0 — you have NOT earned them
            'YOU HAVE NOT EARNED MY AGE.',
            'A MAYFLY ADDRESSES A MOUNTAIN.',
            'COME BACK WHEN YOU HAVE LIVED LONGER.',
        ],
        [ // band 1
            'STILL YOUNG. BUT YOU PERSIST.',
            'THE AGES HAVE NOTICED YOU. BARELY.',
            'YOU ENDURE. THAT IS A BEGINNING.',
        ],
        [ // band 2
            'YOU HAVE OUTLASTED MANY. I MARK IT.',
            'FEW MORTALS REACH MY SHADOW. YOU HAVE.',
            'YOUR NAME IS BEGINNING TO LAST.',
        ],
        [ // band 3 — equal on their level, respect not pandering
            'YOU CLIMBED TO WHERE GODS DWELL. WE ARE EQUALS HERE.',
            'I SPEAK TO YOU AS ONE ANCIENT TO ANOTHER.',
            'YOU REACHED MY LEVEL. I RESPECT NO HIGHER THING.',
        ],
    ],
};

/* ── Pickers ────────────────────────────────────────────────────────────── */

function rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a line for the given familiar + state, coloured by PriceRank.
 *
 * For idle, ~1-in-3 lines is a rank-attitude line (how this creature regards
 * you right now) — the rest are the familiar's own personality. Action lines
 * are pure personality. Scroll / sleep use the tier flavour pool.
 */
export function pickDialogue(
    name: string,
    tier: FamiliarTierId,
    state: 'idle' | 'action' | 'scroll' | 'sleep',
    rank: number,
): string {
    const persona = PERSONA[name];

    if (state === 'scroll') return rand(TIER_FLAVOR[tier].scroll);
    if (state === 'sleep') return rand(TIER_FLAVOR[tier].sleep);

    if (state === 'action') {
        if (persona && persona.action.length) return rand(persona.action);
        return rand(TIER_FLAVOR[tier].scroll);
    }

    // idle
    const band = rankBand(rank);
    const attitude = RANK_ATTITUDE[tier][band];
    if (attitude && attitude.length && Math.random() < 0.34) {
        return rand(attitude);
    }
    if (persona && persona.idle.length) return rand(persona.idle);
    return rand(attitude);
}
