'use client';

import { getProject } from '../project/registry';

/*
 * npc/awareness — the NPC Cast's read on what YOU'RE doing right now.
 *
 * The residents clock where you are and react — like reality-TV commentary on
 * a stranger browsing. This module owns rung 2 of the awareness ladder
 * (ClickUp 86b9fcp11): the third-person GLANCE pools, keyed by page kind.
 * Rungs 3–4 (direct address, fourth wall), the sight lines that react to the
 * piece's actual pixels, and every multi-beat scene live in lib/npc/scenarios;
 * lib/npc/director decides what fires when.
 *
 * Pure client-side: readStage classifies the current route into the page +
 * piece in view (PROJECT #id); the pixel-level "seeing" comes from
 * lib/npc/inview.
 *
 * Voice rules (locked): offhand, deadpan, one unbreakable lens each; market
 * voices stay on patterns, never a real identifiable person.
 */

export type StageKind = 'home' | 'project' | 'artwork' | 'artists' | 'profile' | 'dispatch' | 'other';

export interface Stage {
    kind: StageKind;
    slug?: string;
    id?: string;
    /** Display label for the piece in view, e.g. "BOREAL #33". */
    piece?: string;
}

/** Classify the current route into a Stage. */
export function readStage(pathname: string | null): Stage {
    if (!pathname) return { kind: 'other' };
    const segs = pathname.split('/').filter(Boolean);
    if (segs.length === 0) return { kind: 'home' };
    if (segs[0] === 'art') {
        if (segs.length >= 3) {
            return { kind: 'artwork', slug: segs[1], id: segs[2], piece: `${segs[1].toUpperCase()} #${segs[2]}` };
        }
        if (segs.length === 2) return { kind: 'project', slug: segs[1], piece: segs[1].toUpperCase() };
        return { kind: 'other' };
    }
    if (segs[0] === 'artists') return { kind: 'artists' };
    if (segs[0] === 'dispatch') return { kind: 'dispatch' };
    return { kind: 'profile', slug: segs[0] };
}

/* ── SURFACES — the menus/modals the viewer is actually inside ───────────
   2026-07-16 upgrade: the cast clocks WHICH surface is open and knows what
   it does — the Composer builds queries, the Spite Book keeps grudges, the
   Friend Inspector reads someone's circle, Cartography is the living map.
   Modal name (ModalContext) wins over an open user-menu view. */

export type SurfaceKind =
    | 'composer' | 'cartography' | 'spitebook' | 'stickers' | 'tarot'
    | 'friendInspector' | 'priceSprite' | 'familiar' | 'leaderboard'
    | 'gasTracker' | 'sigilForge' | 'takeover' | 'aboutPd'
    | 'calendar' | 'settings' | 'portfolio';

const MODAL_SURFACE: Record<string, SurfaceKind> = {
    composer: 'composer',
    cartography: 'cartography',
    spiteBook: 'spitebook',
    stickers: 'stickers',
    tarot: 'tarot',
    followers: 'friendInspector',
    priceSprite: 'priceSprite',
    familiar: 'familiar',
    leaderboard: 'leaderboard',
    'golf-leaderboard': 'leaderboard',
    gasTracker: 'gasTracker',
    sigilForge: 'sigilForge',
    takeover: 'takeover',
    aboutPd: 'aboutPd',
};
const VIEW_SURFACE: Record<string, SurfaceKind> = {
    calendar: 'calendar',
    settings: 'settings',
    portfolio: 'portfolio',
};

/** The surface the viewer is inside right now, or null when it's just a page. */
export function readSurface(modalName: string | null, dropdownView: string | null): SurfaceKind | null {
    if (modalName && MODAL_SURFACE[modalName]) return MODAL_SURFACE[modalName];
    if (dropdownView && VIEW_SURFACE[dropdownView]) return VIEW_SURFACE[dropdownView];
    return null;
}

/* Per-character surface lines. Each shows the resident KNOWS what the surface
   does, through their one lens. Not every resident has a take on every
   surface — silence beats a forced line. {name} variants drop when logged out. */
const SURFACE_AWARE: Record<string, Partial<Record<SurfaceKind, string[]>>> = {
    rocco: {
        composer: ['The Composer. Building a taste machine because they don\'t trust their eye.', 'Writing rules for what to like. I just look.'],
        cartography: ['They opened the map. The whole world, from above. I preferred it street level.', 'The map again. Territory is not taste.'],
        spitebook: ['The Spite Book. The ones that got away. Mine has one page. One.', 'Reading their grudge ledger. Healthy. Sort of.'],
        stickers: ['The sticker store. Decorating. Sure.', 'Stickers. We are decorating websites now. Fine.'],
        tarot: ['Cards made of their own collection. At least the art is good.'],
        friendInspector: ['Inspecting someone\'s circle. Borrowed taste, twice removed.', 'Reading who follows who. It won\'t tell them what\'s good.'],
        priceSprite: ['Admiring their own sprite. It IS well drawn. That\'s all I\'ll say.'],
        leaderboard: ['The leaderboard. Ranking taste by points. Grim.', 'Checking the standings. Being first to like something doesn\'t chart.'],
        sigilForge: ['The Forge. A permanent mark. Finally, a commitment.'],
        settings: ['In the settings. Tuning the room instead of looking at the art.'],
        portfolio: ['Counting the portfolio. The number isn\'t the collection.'],
        aboutPd: ['Reading the about page. Late, but thorough.'],
    },
    mick: {
        composer: ['They\'re in the Composer. Writing a query. A filterer. My kind of person.', 'Building rules in the Composer. I keep mine on paper, but noted.'],
        cartography: ['The map is open. Every territory on it is in my files, in worse handwriting.', 'Cartography. A map is just a log with a shape.'],
        spitebook: ['The Spite Book is open. A grudge ledger. Somebody else keeps records. Respect.', 'Reading their spite entries. I cross-reference mine by date.'],
        stickers: ['The sticker store. I log every sheet that clears.'],
        tarot: ['A tarot spread. Divination is just records of the future. Unverified ones.'],
        friendInspector: ['The Friend Inspector. Reading a circle. That\'s an audit. Approved.', 'They\'re inspecting someone\'s graph. I have it on file if they want it fast.'],
        priceSprite: ['Checking their own identity plate. The file photo, basically.'],
        leaderboard: ['The standings. I keep the unofficial ones too. They differ. Interestingly.'],
        gasTracker: ['Watching the gas. The old-timers checked it hourly. Habit worth keeping.'],
        sigilForge: ['The Forge is open. A permanent mark. Permanent things end up in MY book.'],
        calendar: ['The calendar. Forward-looking records. The optimist\'s ledger.'],
        settings: ['In the settings. Adjusting the instruments. Fine practice.'],
        portfolio: ['Portfolio open. Counting. I approve of counting.'],
        aboutPd: ['Reading the history page. I could add footnotes.'],
    },
    mimi: {
        composer: ['The Composer. They\'re building a filter for underpriced. Smart. Annoying, but smart.', 'Writing queries now. Whatever it finds, I saw it first.'],
        cartography: ['The map. I read it for thin territories. Thin means motivated sellers.'],
        spitebook: ['The Spite Book. The ones that got away. They come back around. To me, usually.', 'Grudges over pieces. I don\'t hold grudges. I hold offers.'],
        stickers: ['In the sticker store. Small money. Warm-up money.'],
        tarot: ['Asking cards about the market. The cards don\'t make offers. I do.'],
        friendInspector: ['Inspecting a circle. Know the friends, know the exits.', 'Reading someone\'s people. That\'s due diligence. I like this viewer more now.'],
        leaderboard: ['The leaderboard. Points aren\'t positions.'],
        gasTracker: ['Watching gas. Cheap gas nights are when I send the rude offers.'],
        takeover: ['A takeover sheet. A blanket bid over someone\'s whole stack. Now THAT is my genre.'],
        sigilForge: ['Forging a mark. Branding. Brands raise prices. Noted.'],
        portfolio: ['Portfolio open. Checking the number. The number is why I\'m here too.'],
        settings: ['Settings. Sharpening the tools. Then use them.'],
    },
    steven: {
        composer: ['They opened the query thing. Lots of buttons. I\'d just type "blue".', 'The Composer. It answers questions about art. I have no questions.'],
        cartography: ['The map is open. It\'s a map of the website. I like maps.', 'Cartography. Little islands. One of them is probably mine somehow.'],
        spitebook: ['The Spite Book. A list of art that hurt them. I don\'t keep one. Seems heavy.'],
        stickers: ['The sticker store. I get it, actually. Stickers are great.', 'Stickers. My cooler has stickers. It\'s a good system.'],
        tarot: ['They\'re doing the card reading. With their own art as cards. Neat trick.'],
        friendInspector: ['The friend thing is open. Checking who knows who. Small town in here.'],
        priceSprite: ['Looking at their little face card. Mine would just be a guy.'],
        leaderboard: ['The leaderboard. I\'m not on it. That\'s fine. Genuinely.'],
        gasTracker: ['Gas prices. For the internet. Still getting used to that one.'],
        calendar: ['They opened the calendar. Responsible. I use the fridge.'],
        settings: ['In the settings. There are a lot of switches in there. I flipped one once. Everything went purple.'],
        portfolio: ['Portfolio. The money page. I don\'t look at mine on weekends.'],
        aboutPd: ['Reading the about page. I skimmed it. There\'s a timeline. It\'s nice.'],
    },
    eddie: {
        composer: ['They\'re in the Composer. Building a QUERY. Hunting for something SPECIFIC. What is it.', 'Writing rules in the Composer. Rules mean a thesis. A thesis means information.'],
        cartography: ['The map is open. They\'re scouting territory. Before a move. Always before a move.', 'Cartography. Watch which island they hover. That\'s the tell.'],
        spitebook: ['The Spite Book. The ones that got away. That list is a shopping list, if you read it right.'],
        stickers: ['The sticker store. Nobody browses stickers innocently. Okay, maybe Steven.'],
        tarot: ['A tarot spread. Consulting the cards before a move. So there IS a move.'],
        friendInspector: ['The Friend Inspector. They\'re mapping someone\'s circle. Building a CASE. I do the same thing.', 'Reading a circle. Who\'s mutual with who. That\'s the real ledger.'],
        leaderboard: ['The standings are open. They\'re measuring somebody. Who.'],
        gasTracker: ['Checking gas. You only check gas when something\'s about to cost gas.'],
        takeover: ['A TAKEOVER sheet. A raid, in writing. Everyone act calm.'],
        sigilForge: ['The Forge. Permanent mark. You only ink up before a long campaign.'],
        calendar: ['The calendar. Deadlines. Deadlines mean plans. I want the plans.'],
        portfolio: ['Portfolio check. Counting powder. Something\'s brewing.'],
        settings: ['Deep in the settings. The Spell Book\'s in there. What are they switching ON.'],
    },
    carl: {
        composer: ['The Composer. A machine for finding things to lose money on. Efficient.'],
        cartography: ['The map. All those little territories. Empires, briefly.'],
        spitebook: ['The Spite Book. The ones that got away. They got away for a reason. Lucky pieces.', 'A whole book of regret, built into the site. Finally, honest software.'],
        stickers: ['The sticker store. Even the stickers have a market now. Nothing is safe.'],
        tarot: ['Tarot. Asking the cards. The cards say the same thing I do. It ends.'],
        friendInspector: ['Inspecting friends. Auditing the people. They\'ll find something disappointing. One always does.'],
        leaderboard: ['The leaderboard. Everyone above you is a warning. Everyone below, a preview.'],
        gasTracker: ['Watching gas prices. It\'s high when you need it. Law of the land.'],
        takeover: ['A takeover. Someone\'s about to overpay for a whole stack at once. Ambitious.'],
        sigilForge: ['The Forge. Permanent, they say. Everything says that at first.'],
        calendar: ['A calendar. Scheduling optimism.'],
        portfolio: ['The portfolio page. Deep breath before that one.'],
        settings: ['The settings. Rearranging deck chairs. Nice chairs though.'],
    },
    romy: {
        composer: ['They\'re composing a little question in there. I hope the answer is pretty.', 'The Composer. Asking the catalog what it has. It has plenty, sweetheart.'],
        cartography: ['The map is open. All the little islands. Somebody lives on each one. I love that.'],
        spitebook: ['The Spite Book. Oh, honey. Let one go. Just one.', 'Reading their grudges. The wanting means they cared. Still.'],
        stickers: ['The sticker store. Let them have stickers. Joy is joy.'],
        tarot: ['A tarot reading with their own pieces as the cards. That\'s the sweetest thing this site does.'],
        friendInspector: ['Peeking at someone\'s circle. Curiosity about people is the good kind.', 'The Friend Inspector. Look how many mutuals. A little village.'],
        priceSprite: ['Looking at their own sprite. It\'s a good face. I\'ve always said so.'],
        leaderboard: ['The leaderboard. Someone worked hard for those points. Clap a little.'],
        familiar: ['They opened the creature\'s page. Give it a scratch from me.'],
        sigilForge: ['The Forge. Choosing a mark to keep forever. Take your time in there.'],
        calendar: ['The calendar\'s open. They\'re planning something. Good for them.'],
        portfolio: ['Checking the portfolio. Whatever the number is, the art\'s still good.'],
        aboutPd: ['Reading the story of the place. Everyone should, once.'],
    },
    celestia: {
        composer: ['The Composer. Writing rules to summon artworks. That is a spell. They finally noticed the site is a grimoire.', 'A query is just an incantation with buttons. Compose carefully.'],
        cartography: ['The map is open. Places have moods. The islands drift when nobody watches.', 'Cartography. Look at the coastlines. They grew from mints. Living land.'],
        spitebook: ['The Spite Book. Grudges keep a piece warm long after it leaves you. Careful with that.', 'The book of the ones that got away. Some of them are circling back. I can feel two.'],
        stickers: ['The sticker store. Little charms. People underestimate charms.'],
        tarot: ['They opened the spread. Three cards, their own pieces for faces. Past, present, the other one. Sit with it.', 'The cards are out. Whatever they show, it was already true.'],
        friendInspector: ['Reading someone\'s circle. Bonds are visible if you squint. They\'re squinting.'],
        priceSprite: ['Facing their own sprite. Mirror work. Brave, actually.'],
        leaderboard: ['Rankings. Ladders are horizontal if you tip your head. Anyway, climb.'],
        gasTracker: ['Watching the gas. Even the fees have tides.'],
        takeover: ['A takeover sheet. A siege written as paperwork. Violence, but polite.'],
        sigilForge: ['The Forge is open. A mark chosen once, worn forever. The right one is already theirs — they just have to recognise it.', 'Forging a Sigil. Names have power. Marks more so. No pressure.'],
        calendar: ['The calendar. Days have temperaments. Wednesday is a liar, for the record.'],
        settings: ['They\'re in the Spell Book pages. Switch by switch, the room changes. As it should.'],
        familiar: ['Visiting their creature. It knew they were coming. It always knows.'],
    },
};

/** A surface-awareness line for this character, or null if they have nothing.
 *  Returns raw text (the caller runs the {name} fill + used-ledger). */
export function surfaceLines(charId: string, surface: SurfaceKind): string[] {
    return SURFACE_AWARE[charId]?.[surface] ?? [];
}

/* Map a stage to the awareness pool key. Home / artists / other → 'browsing'. */
function poolKey(kind: StageKind): 'artwork' | 'project' | 'profile' | 'browsing' | 'dispatch' {
    if (kind === 'artwork') return 'artwork';
    if (kind === 'project') return 'project';
    if (kind === 'profile') return 'profile';
    if (kind === 'dispatch') return 'dispatch';
    return 'browsing';
}

type AwarePools = { artwork: string[]; project: string[]; profile: string[]; browsing: string[]; dispatch?: string[] };

/* Per-character awareness lines. {piece} = the piece in view (e.g. BOREAL #33),
   {slug} = the project name, {name} = YOUR username (no @). Mostly third-person
   about you — eerier + funnier than talking at you. Each pool carries a couple of
   {name} variants so the residents don't only ever say "they" (Brendon,
   2026-06-22); those are dropped when you're logged out (no name to use). */
const AWARE: Record<string, AwarePools> = {
    rocco: {
        artwork: ['They keep staring at {piece}. I sold mine.', '{piece}. Bold of them to like it out loud.', '{name} keeps staring at {piece}. I sold mine.', 'A long look at {piece}. Longer than it needs.', '{piece}. I clocked it months ago. Anyway.'],
        project: ['They found {slug}. I was here first.', 'Whole collection now? Amateur hour.', '{name} found {slug}. I was here first.', '{slug}. Late, but they made it.', '{slug} again. It was better before the write-ups.'],
        profile: ['They care what other people own. Cute.', 'Reading a profile. Looking for taste to borrow.', '{name} cares what other people own. Cute.', 'Studying a collection like it\'s a syllabus. It isn\'t.'],
        browsing: ["They'll buy the popular one. They always do.", 'Scrolling for permission to like something.', '{name} will buy the popular one. Always does.', "Look at them shop. No thesis. Just scrolling.", 'Browsing. The eye develops or it doesn\'t.'],
        dispatch: ['Reading the paper. The reviews section is the only part worth the ink.', 'The Dispatch. At least somebody in here edits.'],
    },
    eddie: {
        artwork: ['They keep coming back to {piece}. That means something.', '{piece} again. Somebody tipped them off.', '{name} keeps coming back to {piece}. That means something.', 'What do they see in {piece}. No really — what. I want in.', '{piece}. Third-party interest confirmed. By me. Just now.'],
        project: ["They're deep in {slug}. Heard it's moving.", 'Watching {slug}. So is someone else.', "{name}'s deep in {slug}. Heard it's moving.", '{slug}. Two other wallets circled it this week. Allegedly.'],
        profile: ["They're checking whose hands it's in.", 'Reading a profile. Building a case.', "{name}'s checking whose hands it's in.", 'Profile research. The pros start with the follows.'],
        browsing: ["They're hunting. I can tell.", 'Quiet scroll. The dangerous kind.', "{name}'s hunting. I can tell.", 'What are they thinking right now. I need to know.', 'That scroll speed says shortlist.'],
        dispatch: ['Reading the Dispatch. Yesterday\'s news. The real stuff never prints.', 'The paper\'s open. Check who ISN\'T mentioned. That\'s the story.'],
    },
    mick: {
        artwork: ['They looked at {piece}. Noted.', "{piece}. I've seen it pass through three wallets.", '{name} looked at {piece}. Noted.', '{piece}. Second look this week, if my notes hold.', '{piece}. There\'s a margin note on that one. Two, now.'],
        project: ['Back in {slug}. Same as last week.', 'I have records on all of {slug}.', "{name}'s back in {slug}. Same as last week.", '{slug}. Founded, minted, logged. Ask me anything.'],
        profile: ["They're reading history. At least someone does.", 'Checking tenure. Good instinct.', "{name}'s reading history. At least someone does.", 'A profile read, top to bottom. Proper archival behaviour.'],
        browsing: ['Browsing. Tuesday behavior.', 'Seen this exact session a hundred times.', '{name}, browsing. Tuesday behavior.', 'Standard session so far. The log stays tidy.'],
        dispatch: ['They\'re reading the Dispatch. Cross-checking it against my notes. It holds up. Mostly.', 'The morning paper. I file every edition. Ask me about the gaps.'],
    },
    carl: {
        artwork: ["They like {piece}. It'll let them down.", '{piece}. Looks great. For now.', "{name} likes {piece}. It'll let them down.", '{piece}. Somebody loved it once. Look how that went.'],
        project: ['All of {slug}? That is a lot to regret later.', "{slug}. Floor's coming for it.", 'All of {slug}, {name}? That is a lot to regret later.', '{slug}. Good project. That\'s usually when it happens.'],
        profile: ['Looking at what they do not have.', 'Comparing up. Healthy. Sure.', '{name} is looking at what they do not have.', 'Reading someone else\'s wins. Brave.'],
        browsing: ['Still looking. It will not help.', "They'll find something to lose money on.", "{name}'s still looking. It will not help.", "They seem hopeful today. That'll sort itself out.", 'Scrolling. The optimism phase.'],
        dispatch: ['Reading the paper. All that news and the floor still does what it wants.', 'The Dispatch. Good news on page one means bad news by Friday.'],
    },
    mimi: {
        artwork: ["They want {piece}. I'll be there when they fold.", '{piece}. I own the better one.', "{name} wants {piece}. I'll be there when they fold.", '{piece}. If they hesitate one more day it\'s mine.'],
        project: ['Circling {slug}. So am I.', 'They like {slug}. Noted for later.', '{name} likes {slug}. Noted for later.', '{slug}. I keep a bid warm there. Always.'],
        profile: ['Sizing someone up. I size wallets.', 'Reading a profile. I read positions.', "{name}'s sizing someone up. I size wallets.", 'A profile visit. Everyone\'s inventory is my inventory eventually.'],
        browsing: ['Indecisive. Cheap to take from.', "They're scared. Good.", "{name}'s scared. Good.", 'Window shopping. The window remembers.', 'Slow browse. Slow browsers pay asking.'],
        dispatch: ['Reading the Dispatch. The prices in print are already stale. Mine aren\'t.', 'The paper. I read the listings column first. Obviously.'],
    },
    romy: {
        artwork: ['They really like {piece}. That is nice.', '{piece}. Good eye, honestly.', '{name} really likes {piece}. That is nice.', 'Look at them lingering. What are they thinking?', '{piece} found a fan. Both of them are lucky.'],
        project: ['They are enjoying {slug}. Let them.', '{slug} is a sweet little world.', '{name} is enjoying {slug}. Let them.', 'Deep in {slug}. Take the scenic route, there\'s a lot in there.'],
        profile: ['Curious about someone. That is the whole point.', 'Seeing what other people love.', '{name} is curious about someone. That is the whole point.', 'Visiting someone\'s shelf. Leave a follow, it costs nothing.'],
        browsing: ['Just looking around. Nothing wrong with that.', "They'll find their one.", '{name} is just looking around. Nothing wrong with that.', 'A wander. The best finds happen mid-wander.'],
        dispatch: ['They\'re reading the morning paper. With the little stamp and everything. Civilised.', 'The Dispatch. Somebody prints this every day for us. I think that\'s lovely.'],
    },
    steven: {
        artwork: ['{piece}. Looks fine. I am having a sandwich.', "They're looking at {piece}. I'd hang it. Maybe.", "{name}'s looking at {piece}. I'd hang it. Maybe.", '{piece}. Good one. That\'s the review.'],
        project: ['All of {slug}. Sure. I do not get it but sure.', '{slug}. Cool, I guess.', 'All of {slug}, {name}? Sure. I do not get it but sure.', '{slug}. I know one fact about it and I\'m saving it.'],
        profile: ["Reading a stranger's profile. People do that here.", 'I never filled mine out.', "{name} is reading a stranger's profile. People do that here.", 'Someone\'s profile. They have more stuff than me. Neat stuff though.'],
        browsing: ['They are browsing. I am also just here.', 'Cool. Anyway.', '{name} is browsing. I am also just here.', 'Scrolling. Same. Solidarity.'],
        dispatch: ['They\'re reading the paper. I read the number of the day. That\'s my section.', 'The Dispatch. I like that it comes out at nine. Dependable.'],
    },
    celestia: {
        artwork: ['{piece} chose them, not the other way.', 'They linger on {piece}. The cards saw this.', '{piece} chose {name}, not the other way.', '{piece} was minted under a specific sky. It shows. Look longer.'],
        project: ['{slug} is pulling them. I felt it too.', 'They wandered into {slug}. No accident.', '{slug} is pulling {name}. I felt it too.', '{slug} has a fate written over its door. Most walk past it.'],
        profile: ['They seek someone else’s path. Telling.', 'Reading a profile, looking for a sign.', '{name} seeks someone else’s path. Telling.', 'Two collections crossing gazes. Something transfers. It always does.'],
        browsing: ["They're searching for something they can't name.", 'The scroll is a kind of divination.', "{name} is searching for something they can't name.", 'Wandering with intent they haven\'t admitted yet.'],
        dispatch: ['The Dispatch. A daily horoscope that thinks it\'s a newspaper.', 'Reading the paper. The almanac column is the true part.'],
    },
};

function rand<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function fill(line: string, stage: Stage, name?: string | null): string {
    /* {slug} reads as the project's REGULAR display name, not the raw slug —
       slugs are arbitrary all-caps strings that overrun the bubble (Brendon,
       2026-06-22). {name} = your username, so the residents sometimes call you
       by name instead of always "they". */
    const projName = stage.slug ? (getProject(stage.slug)?.displayName ?? stage.slug) : 'this';
    return line
        .replace(/\{piece\}/g, stage.piece ?? 'this one')
        .replace(/\{slug\}/g, projName)
        .replace(/\{name\}/g, name || 'they');
}

/** An awareness line for this character + stage, or null if it has nothing.
 *  `name` (your username, no @) lets the residents address you by name; when
 *  it's absent the name-bearing variants are dropped so nothing says "they"
 *  where a name was meant to go. */
export function pickAwareness(charId: string, stage: Stage, name?: string | null): string | null {
    const pools = AWARE[charId];
    if (!pools) return null;
    let pool = pools[poolKey(stage.kind)] ?? [];
    if (!name) pool = pool.filter((l) => !l.includes('{name}'));
    if (!pool || !pool.length) return null;
    return fill(rand(pool), stage, name);
}

/** Run the standard template fill over a surface line (only {name} applies). */
export function fillSurfaceLine(line: string, name?: string | null): string {
    return line.replace(/\{name\}/g, name || 'they');
}
