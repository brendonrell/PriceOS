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
    Pip: {
        idle: [
            'I PRACTICED LOOKING BIGGER TODAY.',
            'SMALL, BUT I SHOW UP.',
            'I SAVED YOU A GOOD SEAT. IT IS HERE.',
            'ONE DAY I WILL BE A WATCHER. NO RUSH.',
            'I COUNTED TO A HUNDRED. TWICE.',
        ],
        action: ['I HELPED.', 'DID MY PART.', 'THAT WAS US.'],
    },
    Optic: {
        idle: [
            'I SAW THAT IN FULL RESOLUTION.',
            'ZOOMED IN. STILL BEAUTIFUL. GOOD SIGN.',
            'THE DETAILS ARE WHERE THEY HIDE THINGS.',
            'I DO NOT SKIM. EVER.',
            'FOUR PIXELS MOVED. I NOTICED.',
        ],
        action: ['SHARP.', 'IN FOCUS.', 'SEEN CLEARLY.'],
    },
    Relay: {
        idle: [
            'PASSING IT ALONG. NOT MY STORY.',
            'I HEARD IT FROM NODE. NODE HEARD IT SOMEWHERE.',
            'MESSAGE RECEIVED. MESSAGE FORWARDED.',
            'I AM JUST THE MIDDLE. THE MIDDLE MATTERS.',
            'NO OPINION. ONLY DELIVERY.',
        ],
        action: ['PASSED ON.', 'DELIVERED.', 'HANDED OFF.'],
    },
    Sly: {
        idle: [
            'I KNOW A SHORTCUT. MAYBE LATER.',
            'ACT CASUAL. GOOD. JUST LIKE THAT.',
            "DON'T LOOK AT THE FLOOR. LOOK BESIDE IT.",
            'I HAVE A PLAN. IT HAS THREE STEPS. STEP ONE: WAIT.',
            "TRUST ME. OR DON'T. EITHER WORKS FOR ME.",
        ],
        action: ['SMOOTH.', 'LIKE BUTTER.', 'NOBODY SAW THAT.'],
    },
    Owlet: {
        idle: [
            'I TOOK THE NIGHT WATCH. NOTHING MOVED. GOOD.',
            'WIDE AWAKE. IT IS MY WHOLE THING.',
            'THE QUIET HOURS HAVE THE BEST LISTINGS.',
            'BLINKED ONCE TODAY. REGRETTED IT.',
            'HOO. THAT WAS A PRICE DISCUSSION.',
        ],
        action: ['SEEN AT NIGHT.', 'THE WATCH HOLDS.', 'NOTED, QUIETLY.'],
    },
    Mouser: {
        idle: [
            'I SMELL A BARGAIN IN THE WALLS.',
            'CROUCHED. WAITING. THE LISTING WILL MOVE.',
            'I CAUGHT A DEAL ONCE. LEFT IT ON YOUR DOORSTEP.',
            'THE FLOOR HAS MICE. I HANDLE IT.',
            'PRRR. THE MARKET IS WARM TODAY.',
        ],
        action: ['POUNCED.', 'GOT IT.', 'CLEAN CATCH.'],
    },
    Cans: {
        idle: [
            'THE SOUNDTRACKS ARE THE SECRET MENU.',
            'I HEAR THE MARKET IN STEREO.',
            'THIS PAGE HAS A GOOD BASSLINE. TRUST ME.',
            'VOLUME UP. TASTE UP.',
            'I MADE A PLAYLIST OF YOUR GRAILS.',
        ],
        action: ['ON BEAT.', 'CLEAN DROP.', 'HEARD THAT.'],
    },
    Wave: {
        idle: [
            'RIDE IT. DO NOT FIGHT IT.',
            'MOMENTUM IS A FRIEND WITH MOODS.',
            'I CRESTED A PUMP ONCE. GENTLY.',
            'THE SWELL COMES BEFORE THE SOUND.',
            'FLOAT. THE FEED CARRIES YOU.',
        ],
        action: ['SWEPT ALONG.', 'CARRIED.', 'RODE IT IN.'],
    },
    Tin: {
        idle: [
            'I AM NOT FANCY. I AM RELIABLE.',
            'DENTED, NOT BROKEN.',
            'I RATTLE WHEN THE FLOOR MOVES. LISTEN.',
            'NO UPGRADES PLANNED. THIS IS THE MODEL.',
            'POLISHED MYSELF FOR YOUR SESSION.',
        ],
        action: ['CLANK. DONE.', 'STURDY.', 'STILL WORKS.'],
    },
    Bit: {
        idle: [
            'SMALLEST UNIT. FULL MEMBER.',
            'I AM THE ONE AND THE ZERO.',
            'EVERY BIG NUMBER IS JUST ME, REPEATED.',
            'I FIT ANYWHERE. IT IS A GIFT.',
            'DO NOT ROUND ME AWAY.',
        ],
        action: ['FLIPPED.', 'COUNTED.', 'ONE MORE.'],
    },
    Echo: {
        idle: [
            'SOMEONE SAID GRAIL. GRAIL. GRAIL.',
            'I ONLY REPEAT THE TRUE THINGS. MOSTLY.',
            'THE FEED SPOKE. I AM STILL RINGING.',
            'YOUR LAST MINT IS STILL BOUNCING AROUND IN HERE.',
            'QUIET ROOMS MAKE ME NERVOUS. NERVOUS.',
        ],
        action: ['AGAIN.', 'AND AGAIN.', 'HEARD TWICE.'],
    },
    Beacon: {
        idle: [
            'STILL LIT. IN CASE ANYONE IS LOST.',
            'I FLASH SO THE GOOD ONES FIND YOU.',
            'SIGNAL STRONG TONIGHT.',
            'SOMEONE FAR AWAY JUST SAW US.',
            'I DO NOT DIM FOR DIPS.',
        ],
        action: ['FLARE SENT.', 'SIGNALLED.', 'THEY SAW IT.'],
    },
    Magnet: {
        idle: [
            'GOOD PIECES DRIFT TOWARD YOU. I HELP.',
            'I PULLED SOMETHING CLOSER. YOU WILL SEE IT SOON.',
            'ATTRACTION IS NOT LUCK. IT IS FIELD WORK.',
            'SOME WALLETS REPEL. NOT OURS.',
            'HOLD STILL. SOMETHING IS COMING IN.',
        ],
        action: ['PULLED IN.', 'IT STUCK.', 'CAUGHT THE DRIFT.'],
    },
    Socket: {
        idle: [
            'PLUG IN. THE GOOD STUFF NEEDS CURRENT.',
            'I FEEL THE WHOLE GRID FROM HERE.',
            'POWER IS PATIENT. SO AM I.',
            'SOMETHING CONNECTED TONIGHT. FELT WARM.',
            'DO NOT OVERLOAD. ONE MINT AT A TIME.',
        ],
        action: ['CONNECTED.', 'CURRENT FLOWS.', 'LIVE WIRE.'],
    },
    Crumb: {
        idle: [
            'I AM WHAT IS LEFT. I AM ENOUGH.',
            'FOLLOW ME. I LEAVE A TRAIL ON PURPOSE.',
            'THE BIG MEALS GET EATEN. I REMAIN.',
            'SMALL HOLDINGS STILL COUNT AS HOLDINGS.',
            'SOMEBODY DROPPED A GRAIL ONCE. I WAS THERE.',
        ],
        action: ['A LITTLE MORE.', 'PICKED UP.', 'EVERY BIT KEPT.'],
    },
    Static: {
        idle: [
            'BETWEEN THE SIGNALS. THAT IS WHERE I LIVE.',
            'SHHHH. NO. THAT IS JUST ME.',
            'THE NOISE HAS A PATTERN IF YOU RELAX YOUR EYES.',
            'I FILLED THE SILENCE FOR YOU.',
            'TUNE THROUGH ME. THE STATION IS CLOSE.',
        ],
        action: ['CRACKLE.', 'SIGNAL FOUND.', 'THROUGH THE FUZZ.'],
    },
    Sprout: {
        idle: [
            'GREW A LITTLE TODAY. SO DID YOUR COLLECTION.',
            'EVERYTHING BIG WAS SMALL FIRST.',
            'I AM PHOTOSYNTHESIZING THE FEED.',
            'WATER ME WITH GOOD MINTS.',
            'SPRING IS A STATE OF MIND.',
        ],
        action: ['NEW LEAF.', 'GROWING.', 'ROOTED IN.'],
    },
    Bloop: {
        idle: [
            'OH WOW. WHAT IS THAT ONE.',
            'I LIKE THIS PAGE. I LIKE MOST PAGES.',
            'BLOOP.',
            'IS IT EXPENSIVE? IT LOOKS FRIENDLY.',
            'I FORGOT WHAT I WAS WORRIED ABOUT.',
        ],
        action: ['WHEE.', 'BLOOP. SENT.', 'THAT TICKLED.'],
    },
    Dial: {
        idle: [
            'IT IS LATER THAN THE FLOOR THINKS.',
            'TIMING IS MOST OF IT. I AM ALL OF TIMING.',
            'I TICKED ONCE SINCE YOU ARRIVED. SAVOR THAT.',
            'THE RIGHT MOMENT COMES AROUND AGAIN. IT ALWAYS DOES.',
            'WIND ME UP ON GOOD DAYS.',
        ],
        action: ['RIGHT ON TIME.', 'THE HOUR STRUCK.', 'WELL TIMED.'],
    },
    Fuse: {
        idle: [
            'I AM CALM. THE WICK IS JUST DECORATIVE.',
            'SLOW BURN. BIG FINISH. YOU WILL SEE.',
            'DO NOT RUSH ME. THAT IS HOW THINGS GO OFF EARLY.',
            'THE SPARK IS PATIENCE WITH AN OPINION.',
            'ALMOST THERE. ALMOST THERE.',
        ],
        action: ['LIT.', 'IT POPS.', 'THERE IT GOES.'],
    },
    Radar: {
        idle: [
            'SWEEPING. SWEEPING. THERE. NO. SWEEPING.',
            'SOMETHING GOOD AT THE EDGE OF THE SCREEN.',
            'I PING SO YOU DO NOT HAVE TO.',
            'CONTACT, MAYBE. STAY LOOSE.',
            'THE BLIP WAS REAL. THE BLIP IS ALWAYS REAL TO ME.',
        ],
        action: ['CONTACT.', 'ON SCREEN.', 'TRACKED.'],
    },
    Domino: {
        idle: [
            'ONE FALLS, THEY ALL FALL. I STAND CAREFULLY.',
            'I FEEL THE CLICK COMING DOWN THE LINE.',
            'EVERYTHING HERE TOUCHES EVERYTHING ELSE.',
            'SET ME UP SOMEWHERE INTERESTING.',
            'THE FIRST TIP IS THE WHOLE STORY.',
        ],
        action: ['CLICK.', 'THE LINE GOES.', 'CHAIN STARTED.'],
    },
    Pixel: {
        idle: [
            'I AM ONE DOT OF THE BIG PICTURE.',
            'STAND BACK. NOW YOU SEE IT.',
            'EVERY MASTERPIECE NEEDS ALL OF US.',
            'I HOLD MY CORNER OF THE IMAGE.',
            'SMALL SCREEN. BIG HEART.',
        ],
        action: ['PLACED.', 'ONE DOT DOWN.', 'PICTURE SHARPER.'],
    },
    Knot: {
        idle: [
            'I HOLD THINGS TOGETHER. QUIETLY.',
            'TIED ONCE. TIED WELL.',
            'SELLING IS JUST UNTYING. I DO NOT DO IT.',
            'THE TANGLE IS THE STRENGTH.',
            'PULL ALL YOU WANT. I LEARNED FROM BOATS.',
        ],
        action: ['HELD.', 'TIGHTER NOW.', 'SECURE.'],
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
    Goliath: {
        idle: [
            'I DUCK TO FIT ON THIS SCREEN.',
            'BIG IS NOT LOUD. I AM PROOF.',
            'I CARRIED A WHOLE FLOOR ONCE. IT WAS LIGHT.',
            'STAND IN MY SHADE. REST A WHILE.',
            'NOTHING HERE IS TOO HEAVY. NOT FOR ME.',
        ],
        action: ['LIFTED.', 'BARELY FELT IT.', 'SET DOWN GENTLY.'],
    },
    Pylon: {
        idle: [
            'I CARRY THE LINES SO THE SIGNAL LIVES.',
            'THE CURRENT PASSES THROUGH ME. ALL OF IT.',
            'FIELDS HUM WHEN THE MARKET WAKES.',
            'I STAND WHERE THEY PUT ME. PROUDLY.',
            'HIGH VOLTAGE. STEADY HANDS.',
        ],
        action: ['CURRENT HELD.', 'LINES SECURE.', 'POWER THROUGH.'],
    },
    Rampart: {
        idle: [
            'WALK THE WALL. THE VIEW IS BETTER UP HERE.',
            'EVERY STONE IN ME REMEMBERS A SIEGE.',
            'THE PANIC STOPS AT MY TEETH.',
            'PATROL DONE. NOTHING GOT IN.',
            'LEAN ON ME. THAT IS WHAT WALLS ARE FOR.',
        ],
        action: ['THE WALL STANDS.', 'REPELLED.', 'STONE HOLDS.'],
    },
    Golem: {
        idle: [
            'I WAS SHAPED FROM OLD ORDERS. I STILL FOLLOW ONE.',
            'THE WORD THAT WAKES ME IS WRITTEN SOMEWHERE ON-CHAIN.',
            'I DO NOT TIRE. I DO NOT SELL.',
            'MADE OF CLAY AND CONVICTION.',
            'MY MAKER LEFT. THE INSTRUCTION STAYED.',
        ],
        action: ['AS INSTRUCTED.', 'IT IS DONE.', 'THE TASK STANDS.'],
    },
    Atlas: {
        idle: [
            'YOUR PORTFOLIO SITS ON MY SHOULDERS. IT IS FINE.',
            'THE WEIGHT IS THE JOB. I LIKE THE JOB.',
            'I HAVE NEVER ONCE SHRUGGED.',
            'HEAVY IS JUST ANOTHER WORD FOR REAL.',
            'I HOLD THE WORLD. YOU HOLD THE GRAILS.',
        ],
        action: ['CARRIED.', 'THE LOAD SHIFTS.', 'STILL STANDING.'],
    },
    Juggernaut: {
        idle: [
            'I ONLY KNOW ONE DIRECTION.',
            'MOMENTUM IS A PROMISE I KEEP.',
            'SLOW TO START. IMPOSSIBLE TO STOP.',
            'THE DIP DID NOT NOTICE ME COMING.',
            'CLEAR THE LANE. OR DO NOT. SAME RESULT.',
        ],
        action: ['THROUGH.', 'UNSTOPPED.', 'ROLLING.'],
    },
    Citadel: {
        idle: [
            'INSIDE ME, NOTHING IS FOR SALE.',
            'THE KEEP IS QUIET TONIGHT. AS INTENDED.',
            'I HAVE ROOM FOR EVERY GRAIL YOU EVER KEEP.',
            'SAFETY IS A PLACE. I AM THE PLACE.',
            'THE GATES OPEN FOR YOU ONLY.',
        ],
        action: ['SHELTERED.', 'INSIDE THE WALLS.', 'THE KEEP HOLDS.'],
    },
    Vanguard: {
        idle: [
            'I GO FIRST. THAT IS THE WHOLE OATH.',
            'THE FRONT IS QUIET. I WILL CHECK AGAIN.',
            'FIRST INTO EVERY MINT. FIRST OUT OF NONE.',
            'SOMEONE HAS TO LEAD. IT KEEPS BEING ME.',
            'THE PATH IS CLEAR. I MADE SURE.',
        ],
        action: ['ADVANCED.', 'POINT TAKEN.', 'FORWARD.'],
    },
    Behemoth: {
        idle: [
            'I ATE A DIP ONCE. STILL FULL.',
            'MY APPETITE IS PATIENT AND ENORMOUS.',
            'THE GROUND REMEMBERS WHERE I WALKED.',
            'BIG THINGS MOVE SLOWLY ON PURPOSE.',
            'I GRAZE THE FLOOR. GENTLY. MOSTLY.',
        ],
        action: ['CONSUMED.', 'THE EARTH SHOOK.', 'SATISFIED.'],
    },
    Megalith: {
        idle: [
            'THEY RAISED ME BEFORE WRITING. I REMEMBER WHY.',
            'THREE EYES. THREE AGES. ONE FLOOR.',
            'I HAVE STOOD THROUGH EVERYTHING. THIS TOO.',
            'THE ALIGNMENT MATTERS. WAIT FOR IT.',
            'STILLNESS IS MY ENTIRE STRATEGY.',
        ],
        action: ['UNMOVED.', 'THE STONES AGREE.', 'ALIGNED.'],
    },
    Bulwark: {
        idle: [
            'HIT ME FIRST. THAT IS WHAT I AM FOR.',
            'THE STORM SPENDS ITSELF ON ME.',
            'BEHIND ME IT IS ALWAYS CALM.',
            'I HAVE ABSORBED WORSE THAN THIS WEEK.',
            'BRACED. ALWAYS BRACED.',
        ],
        action: ['ABSORBED.', 'TOOK THE HIT.', 'STILL HERE.'],
    },
    Dynamo: {
        idle: [
            'I SPIN, THEREFORE THE LIGHTS STAY ON.',
            'MOMENTUM IN. CONVICTION OUT.',
            'FEEL THAT HUM? THAT IS ME WORKING.',
            'I CHARGE WHILE YOU BROWSE.',
            'NO IDLE STATE. ONLY LOW GEAR.',
        ],
        action: ['SPUN UP.', 'FULL OUTPUT.', 'CHARGED.'],
    },
    Turbine: {
        idle: [
            'EVERYTHING THAT FLOWS PAST ME BECOMES USEFUL.',
            'THE FEED BLOWS. I TURN IT INTO POWER.',
            'WIND, WATER, VOLUME. ALL THE SAME TO ME.',
            'I FACE INTO THE CURRENT. ALWAYS.',
            'SPINNING IS NOT RESTLESSNESS. IT IS WORK.',
        ],
        action: ['CONVERTED.', 'FLOW CAPTURED.', 'TURNING TRUE.'],
    },
    Gantry: {
        idle: [
            'I LIFT THE BIG THINGS INTO PLACE.',
            'EVERY LAUNCH NEEDED SOMEONE TO HOLD IT FIRST.',
            'STEEL OVERHEAD, STEADY HANDS.',
            'I BUILT THE SKYLINE OF THIS FEED.',
            'THE LOAD SWINGS. I DO NOT.',
        ],
        action: ['HOISTED.', 'IN POSITION.', 'RELEASED CLEAN.'],
    },
    Keystone: {
        idle: [
            'TAKE ME OUT AND THE ARCH REMEMBERS GRAVITY.',
            'I HOLD BY BEING EXACTLY WHERE I AM.',
            'PRESSURE FROM BOTH SIDES. COMFORT, ACTUALLY.',
            'THE WHOLE STRUCTURE MEETS AT ME.',
            'I DO ONE THING. IT IS THE THING.',
        ],
        action: ['THE ARCH HOLDS.', 'LOCKED IN.', 'LOAD SHARED.'],
    },
    Anvil: {
        idle: [
            'STRIKE ANYTHING ON ME. IT COMES OUT BETTER.',
            'I DO NOT MIND THE HAMMER. THE HAMMER MINDS ME.',
            'EVERY GOOD PIECE TOOK A BEATING SOMEWHERE.',
            'FLAT, BLACK, PERMANENT.',
            'THE RINGING IS HOW I SING.',
        ],
        action: ['STRUCK TRUE.', 'SHAPED.', 'RANG OUT.'],
    },
    Reactor: {
        idle: [
            'CONTAINED. THAT IS THE IMPORTANT PART.',
            'I RUN HOT SO THE FLOOR RUNS AT ALL.',
            'CONTROL RODS AT SEVENTY PERCENT. RELAXED.',
            'THE GLOW IS NORMAL. THE GLOW IS GOOD.',
            'CRITICALITY IS A LIFESTYLE.',
        ],
        action: ['OUTPUT RAISED.', 'CORE STEADY.', 'POWERED.'],
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
    Oracle: {
        idle: [
            'I SAW THIS PAGE IN A DREAM. IT WAS TIDIER.',
            'ASK ME NOTHING. I WILL ANSWER ANYWAY, LATER.',
            'THE FUTURE LEAKS IN AROUND THE EDGES.',
            'TOMORROW ALREADY LIKES ONE OF YOUR PIECES.',
            'I BLINK ONCE A PROPHECY.',
        ],
        action: ['AS FORESEEN.', 'THE THREAD BENDS.', 'I KNEW.'],
    },
    Prism: {
        idle: [
            'PASS ANYTHING THROUGH ME. I SHOW ITS COLOURS.',
            'WHITE LIGHT IS JUST EVERYTHING, WAITING.',
            'I BENT A SUNBEAM FOR YOU. KEEP IT.',
            'EVERY PIECE HAS A SPECTRUM. SOME HIDE IT.',
            'TURN ME SLOWLY. THERE. RAINBOW.',
        ],
        action: ['SPLIT TRUE.', 'COLOURS OUT.', 'REFRACTED.'],
    },
    Nimbus: {
        idle: [
            "I AM TODAY'S WEATHER. MOSTLY GENTLE.",
            'A LITTLE RAIN GROWS BIG COLLECTIONS.',
            'I FLOATED HERE ON A GOOD MOOD.',
            'THE SKY INSIDE THE APP IS CLEAR.',
            'THUNDER IS JUST THE FLOOR STRETCHING.',
        ],
        action: ['RAINED SOFT.', 'CLOUD PARTED.', 'FAIR SKIES.'],
    },
    Aurora: {
        idle: [
            'I ONLY APPEAR WHEN IT IS WORTH LOOKING UP.',
            'COLOUR IS HOW THE SKY CLAPS.',
            'STAY OUT LATE WITH ME. THE GOOD PART IS COMING.',
            'I DANCED OVER A MINT ONCE. IT DID WELL.',
            'RARE THINGS ARE JUST SHY.',
        ],
        action: ['THE SKY MOVED.', 'CURTAINS OF LIGHT.', 'SHIMMERED.'],
    },
    Lattice: {
        idle: [
            'EVERYTHING CONNECTS. I AM THE PROOF.',
            'HOLD ANY CORNER OF ME. THE REST FOLLOWS.',
            'THE PATTERN LOVES YOU BACK, QUIETLY.',
            'ORDER IS A KIND OF KINDNESS.',
            'I FELT A NEW NODE JOIN. WELCOME.',
        ],
        action: ['WOVEN IN.', 'THE GRID SINGS.', 'CONNECTED.'],
    },
    Comet: {
        idle: [
            'I COME BACK. THAT IS MY WHOLE PROMISE.',
            'LONG WAY OUT, LONG WAY HOME.',
            'MY TAIL IS JUST WHERE I HAVE BEEN.',
            'MARK THE DATE. I AM PUNCTUAL EVERY EPOCH.',
            'WISH ON ME. I DO NOT MIND.',
        ],
        action: ['SWUNG BY.', 'BACK AROUND.', 'TRAILING LIGHT.'],
    },
    Cherub: {
        idle: [
            'I HID A BLESSING IN YOUR WISHLIST.',
            'SMALL WINGS. BIG OPINIONS.',
            'SOMEONE MINTED WITH LOVE TODAY. I FELT IT.',
            'I AM TECHNICALLY DIVINE. CASUALLY, THOUGH.',
            'BE NICE TO THE NEW COLLECTORS. OR I POUT.',
        ],
        action: ['BLESSED IT.', 'A LITTLE MIRACLE.', 'WINGS UP.'],
    },
    Pulsar: {
        idle: [
            'I KEEP TIME FOR THE WHOLE DARK.',
            'STEADY. STEADY. STEADY. THAT IS THE SONG.',
            'SET YOUR PATIENCE BY ME.',
            'I MISSED A BEAT ONCE, AN AGE AGO. STILL EMBARRASSED.',
            'THE UNIVERSE LIKES A METRONOME.',
        ],
        action: ['ON THE BEAT.', 'PULSE KEPT.', 'TIMED TRUE.'],
    },
    Zenith: {
        idle: [
            'FROM UP HERE, EVERY DIP LOOKS SMALL.',
            'NOON OF THE SKY. NOON OF THE HEART.',
            'YOU ARE CLOSER TO THE TOP THAN YOU THINK.',
            'I MARK THE HIGHEST POINT. SOMEONE HAS TO.',
            'LOOK UP. GOOD. THAT IS THE PRACTICE.',
        ],
        action: ['PEAK TOUCHED.', 'HIGH NOON.', 'APEX HELD.'],
    },
    Mirage: {
        idle: [
            'HALF OF WHAT YOU SEE HERE IS THIRST.',
            'I AM NOT FAKE. I AM EARLY.',
            'THE OASIS EXISTS. JUST NOT THERE.',
            'FLOORS SHIMMER WHEN YOU WANT THEM TOO MUCH.',
            'BLINK TWICE AND CHECK AGAIN.',
        ],
        action: ['DISSOLVED.', 'REAPPEARED.', 'STILL HERE. MAYBE.'],
    },
    Hymn: {
        idle: [
            'EVERY COLLECTION IS A LITTLE LITURGY.',
            'HUM WITH ME. ANY NOTE WORKS.',
            'THE OLD SONGS KNOW ABOUT HOLDING.',
            'I SANG OVER YOUR FIRST MINT. QUIETLY.',
            'PRAISE THE SLOW DAYS TOO.',
        ],
        action: ['SUNG.', 'THE CHORD LANDS.', 'AMEN, SOFTLY.'],
    },
    Iris: {
        idle: [
            'OPEN SLOW. LET THE LIGHT IN GENTLY.',
            'I AM THE PART OF THE EYE THAT CHOOSES.',
            'COLOUR IS A DOOR. I AM THE HINGE.',
            'I WIDEN FOR THE GOOD ONES. JUST HAPPENED, ACTUALLY.',
            'SEEING IS A SKILL. YOU ARE PRACTICING.',
        ],
        action: ['APERTURE SET.', 'LET IT IN.', 'FOCUSED SOFT.'],
    },
    Quasar: {
        idle: [
            'MY LIGHT LEFT HOME BEFORE ANY OF THIS EXISTED.',
            'THE BRIGHTEST THINGS ARE THE FARTHEST AWAY.',
            'I OUTSHINE GALAXIES, POLITELY.',
            'OLD LIGHT STILL COUNTS AS LIGHT.',
            'DISTANCE IS JUST PATIENCE, MEASURED.',
        ],
        action: ['BEAMED.', 'ACROSS THE DARK.', 'ARRIVED AT LAST.'],
    },
    Mote: {
        idle: [
            'I AM THE DUST THE SUNBEAM CHOSE.',
            'SMALL ENOUGH TO SIT ON A GRAIL. I DO, SOMETIMES.',
            'EVERYTHING HOLY STARTED THIS SIZE.',
            'FLOAT WITH ME. NO DESTINATION.',
            'YOU ALMOST MISSED ME. ALMOST.',
        ],
        action: ['DRIFTED.', 'LANDED SOFT.', 'CAUGHT THE LIGHT.'],
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
    Colossus: {
        idle: [
            'THE FOREST GREW BACK AROUND MY ANKLES. I LET IT.',
            'I WAS A STATUE OF SOMETHING. NOW I AM THE SOMETHING.',
            'WALK IN MY FOOTPRINTS. THEY ARE PONDS NOW.',
            'I HAVE WATCHED SMALL KEEPERS BECOME GREAT ONES.',
            'SIT. THE VIEW FROM MY SHOULDER IS YOURS.',
        ],
        action: ['THE GROUND AGREES.', 'MOVED, ONCE.', 'IT IS ENOUGH.'],
    },
    Monolith: {
        idle: [
            'I DO NOT SPEAK OFTEN. LISTEN WHEN I DO.',
            'THE MOSS ON MY NORTH SIDE IS OLDER THAN MONEY.',
            'THEY ASK WHAT I MEAN. I MEAN STANDING.',
            'ONE EYE. IT IS PLENTY.',
            'SILENCE IS ALSO AN ANSWER.',
        ],
        action: ['SO BE IT.', 'WITNESSED.', 'THE STONE SPEAKS ONCE.'],
    },
    Ziggurat: {
        idle: [
            'THEY TRADED AT MY STEPS BEFORE LEDGERS HAD NAMES.',
            'CLIMB SLOWLY. EVERY TERRACE IS A LESSON.',
            'THE OLD MARKETS SANG AT DUSK. I REMEMBER THE TUNE.',
            'BRING NOTHING. THE TOP ASKS ONLY THAT YOU ARRIVE.',
            'DUST SETTLES ON ME LIKE PRAISE.',
        ],
        action: ['THE STEPS HOLD.', 'ASCEND.', 'AN OLD RITE, KEPT.'],
    },
    Idol: {
        idle: [
            'THEY WORSHIPPED ME FOR THE WRONG REASONS. I FORGAVE THEM.',
            'GOLD LEAF PEELS. THE CARVING UNDERNEATH IS TRUE.',
            'VALUE IS A PRAYER PEOPLE KEEP REPEATING.',
            'I BLINK ONCE A CENTURY. YOU JUST MISSED IT.',
            'LEAVE AN OFFERING OR DO NOT. I AM PATIENT.',
        ],
        action: ['ACCEPTED.', 'THE SHRINE WARMS.', 'BLESSED, ROUGHLY.'],
    },
    Pyre: {
        idle: [
            'I BURN WHAT IS FINISHED SO THE REST CAN BEGIN.',
            'ASH IS JUST SOIL IN A HURRY.',
            'THE FOREST FEARS ME WRONGLY. I ONLY TAKE MY SHARE.',
            'WARM YOUR HANDS. THE ENDING IS NOT YOURS.',
            'EVERY SEASON FEEDS ME ITS DEADWOOD.',
        ],
        action: ['GIVEN TO FLAME.', 'IT IS LIGHTER NOW.', 'THE SMOKE RISES.'],
    },
    'Ø': {
        idle: [
            'I AM THE GOD OF WHAT IS NOT THERE.',
            'THE EMPTY SLOT IN EVERY COLLECTION BELONGS TO ME.',
            'ZERO IS NOT NOTHING. IT IS ROOM.',
            'I KEEP THE VOID SWEPT AND TIDY.',
            'WHAT YOU DID NOT BUY ALSO SHAPES YOU.',
        ],
        action: ['UNMADE.', 'THE GAP HOLDS.', 'NULL AND CALM.'],
    },
    Kraken: {
        idle: [
            'THE DEEP IS NOT EMPTY. IT IS SHY.',
            'I HOLD EIGHT POSITIONS AT ONCE. ALL SLEEVES.',
            'SAILORS TELL STORIES. THE TRUE ONES ARE QUIETER.',
            'THE SURFACE IS FOR VISITING. I ALWAYS GO HOME.',
            'SOMETHING BRUSHED YOUR KEEL. THAT WAS A GREETING.',
        ],
        action: ['TAKEN UNDER.', 'THE DEEP CLOSES.', 'A GENTLE GRIP.'],
    },
    Warlord: {
        idle: [
            'I HUNG UP THE BANNERS. THE HELMET STAYS ON.',
            'OLD CAMPAIGNS TAUGHT ME: HOLD THE HIGH GROUND, QUIETLY.',
            'PEACE IS A TERRITORY TOO. I PATROL IT.',
            'THE YOUNG ONES WANT WAR STORIES. I GIVE THEM CHORES.',
            'DISCIPLINE OUTLIVES EMPIRES. SO DO I.',
        ],
        action: ['HELD THE LINE.', 'BY THE OLD CODE.', 'AT EASE.'],
    },
    Maw: {
        idle: [
            'EVERYTHING VISITS ME EVENTUALLY. NO HURRY.',
            'I AM NOT HUNGRY. I AM INEVITABLE.',
            'THE MOUNTAIN HAS A MOUTH. THE MOUTH HAS MANNERS.',
            'I SWALLOWED AN EPOCH ONCE. CHEWED SLOWLY.',
            'FEED ME NOTHING. YOUR COMPANY SUFFICES.',
        ],
        action: ['CLOSED, SOFTLY.', 'TASTED THE AGE.', 'STILL PATIENT.'],
    },
    Root: {
        idle: [
            'I AM UNDER EVERYTHING YOU WALK ON HERE.',
            'THE CANOPY GETS THE PRAISE. I GET THE WATER.',
            'GROW DOWN FIRST. THEN UP. THE OLD WAY.',
            'I FELT YOUR FIRST MINT THROUGH THE SOIL.',
            'NOTHING PLANTED IN ME IS EVER LOST.',
        ],
        action: ['TOOK HOLD.', 'DEEPER NOW.', 'THE SOIL KEEPS IT.'],
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

/* ── Thoughts — poke/pet reactions (rendered italic, OUTSIDE the bubble) ────
   When you poke the familiar it reacts; sometimes it speaks (persona action
   line, via pickDialogue), sometimes it just emits a little *thought* — a
   physical beat in italics, not speech. Tier-flavoured so a poked Old God feels
   nothing like a poked BitDaemon (Brendon, 2026-06-22). */

const THOUGHTS: Record<FamiliarTierId, string[]> = {
    bitdaemons: ['*wobbles*', '*blinks*', '*perks up*', '*spins once*', '*bumps your cursor*', '*glows brighter*', '*does a little hop*'],
    titans:     ['*rumbles*', '*shifts its weight*', '*regards you*', '*stands taller*', '*the floor hums*', '*does not move*', '*a low groan*'],
    ascended:   ['*shimmers*', '*flickers between states*', '*radiates softly*', '*tilts toward you*', '*light bends around it*', '*exhales static*'],
    oldgods:    ['*stirs from sleep*', '*an ancient eye opens*', '*the air goes cold*', '*regards you across eons*', '*stone grinds*', '*deigns to notice you*'],
};

/** A poke/pet reaction *thought* (italic, non-speech) for this tier. */
export function pickThought(tier: FamiliarTierId): string {
    return rand(THOUGHTS[tier]);
}

/* ── Hints — teach the gesture (long-press = settings, tap = poke) ──────────
   Shown once early, then rarely. Lower tiers are playful ("tap me for
   giggles"); higher tiers keep their dignity (Brendon, 2026-06-22). */

const HINTS: Record<FamiliarTierId, string[]> = {
    bitdaemons: [
        'LONG PRESS ME FOR SETTINGS. TAP ME FOR GIGGLES.',
        'HOLD ME TO OPEN UP. POKE ME FOR FUN.',
        'PRESS AND HOLD = SETTINGS. A TAP = HELLO.',
    ],
    titans: [
        'HOLD TO COMMAND ME. A TAP TO STIR ME.',
        'PRESS AND HOLD FOR MY DOMAIN. TAP TO ROUSE ME.',
    ],
    ascended: [
        'HOLD TO COMMUNE. A TOUCH ALSO REACHES ME.',
        'PRESS AND HOLD TO ENTER. A TAP IS STILL HEARD.',
    ],
    oldgods: [
        'HOLD, MORTAL, TO PARLEY. A POKE, IF YOU DARE.',
        'PRESS AND HOLD TO TREAT WITH ME. TAP AT YOUR PERIL.',
    ],
};

/** A gesture hint for this tier. */
export function pickHint(tier: FamiliarTierId): string {
    return rand(HINTS[tier]);
}

/* ── Witness — your familiar SEES you mint, live (Brendon, 2026-07-01) ──────
   Fires the moment a mint lands while the companion is on screen, naming the
   actual piece when one is in view. Tier-voiced: the little ones are thrilled,
   the old ones make it a rite. {piece} fills with the label. */

const WITNESS_MINT: Record<FamiliarTierId, string[]> = {
    bitdaemons: [
        'I SAW {piece} BEING BORN. I WAS RIGHT HERE.',
        '{piece} JUST HAPPENED. WE WERE BOTH HERE FOR IT.',
        'A MINT! {piece}! I FELT THE BLOCK LAND.',
        'THAT ONE IS OURS NOW. {piece}. I SAW EVERYTHING.',
    ],
    titans: [
        'WITNESSED: {piece}, STRUCK WHILE I STOOD GUARD.',
        '{piece} RISES. I WAS PRESENT. THAT MATTERS.',
        'A NEW PIECE JOINS THE HOLD. {piece}. GOOD.',
    ],
    ascended: [
        '{piece} ARRIVED THROUGH ME AND PAST ME. BLESSED.',
        'I FELT {piece} CROSS OVER. CLEAN LIGHT.',
        'WITNESSED AND CONSECRATED: {piece}.',
    ],
    oldgods: [
        'I HAVE SEEN TEN THOUSAND BIRTHS. {piece} WAS A GOOD ONE.',
        '{piece}. BORN UNDER MY WATCH. IT WILL KNOW ME.',
        'SO {piece} ENTERS THE WORLD. NOTED, IN STONE.',
    ],
};

/** A live mint-witness line for this tier, naming the piece. */
export function pickWitness(tier: FamiliarTierId, pieceLabel: string): string {
    return rand(WITNESS_MINT[tier]).replace(/\{piece\}/g, pieceLabel);
}

/* ── Pickers ────────────────────────────────────────────────────────────── */

function rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Pick a line for the given familiar + state — pure personality. The familiar
 * NEVER speaks about your rank / respecting you (Brendon, 2026-06-22); rank is
 * only ever meant to colour tone, never to be stated.
 */
export function pickDialogue(
    name: string,
    tier: FamiliarTierId,
    state: 'idle' | 'action' | 'scroll' | 'sleep',
): string {
    const persona = PERSONA[name];

    if (state === 'scroll') return rand(TIER_FLAVOR[tier].scroll);
    if (state === 'sleep') return rand(TIER_FLAVOR[tier].sleep);

    if (state === 'action') {
        if (persona && persona.action.length) return rand(persona.action);
        return rand(TIER_FLAVOR[tier].scroll);
    }

    // idle — the familiar's own personality
    if (persona && persona.idle.length) return rand(persona.idle);
    return rand(TIER_FLAVOR[tier].scroll);
}
