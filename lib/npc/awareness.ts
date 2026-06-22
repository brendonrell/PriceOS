'use client';

import { getProject } from '../project/registry';

/*
 * npc/awareness — the NPC Cast's read on what YOU'RE doing right now.
 *
 * The residents mostly live in their own world (lib/npc/cast lines), but they
 * also clock where you are and react — like reality-TV commentary on a stranger
 * browsing. This is the UI rung of the awareness ladder (ClickUp 86b9fcp11):
 *   1. own-world chatter (most of the time — lives in cast.ts)
 *   2. third-person glances at you ("they keep opening the red ones")  ← here
 *   3. rare direct address                                            ← here
 *   4. the once-in-a-blue-moon fourth-wall jolt                       ← here
 *
 * Pure client-side: we read the current route to know the page + the piece in
 * view (PROJECT #id). No indexer / live events yet. The visual fingerprint
 * (colour / busy / mood) is the next rung — these lines name the piece and the
 * surface; "seeing" what it looks like plugs in later.
 *
 * Voice rules (locked): offhand, deadpan, one unbreakable lens each; market
 * voices stay on patterns, never a real identifiable person.
 */

export type StageKind = 'home' | 'project' | 'artwork' | 'artists' | 'profile' | 'other';

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
    return { kind: 'profile', slug: segs[0] };
}

/* Map a stage to the awareness pool key. Home / artists / other → 'browsing'. */
function poolKey(kind: StageKind): 'artwork' | 'project' | 'profile' | 'browsing' {
    if (kind === 'artwork') return 'artwork';
    if (kind === 'project') return 'project';
    if (kind === 'profile') return 'profile';
    return 'browsing';
}

type AwarePools = { artwork: string[]; project: string[]; profile: string[]; browsing: string[] };

/* Per-character awareness lines. {piece} = the piece in view (e.g. BOREAL #33),
   {slug} = the project name, {name} = YOUR username (no @). Mostly third-person
   about you — eerier + funnier than talking at you. Each pool carries a couple of
   {name} variants so the residents don't only ever say "they" (Brendon,
   2026-06-22); those are dropped when you're logged out (no name to use). */
const AWARE: Record<string, AwarePools> = {
    rocco: {
        artwork: ['They keep staring at {piece}. I sold mine.', '{piece}. Bold of them to like it out loud.', '{name} keeps staring at {piece}. I sold mine.'],
        project: ['They found {slug}. I was here first.', 'Whole collection now? Amateur hour.', '{name} found {slug}. I was here first.'],
        profile: ['They care what other people own. Cute.', 'Reading a profile. Looking for taste to borrow.', '{name} cares what other people own. Cute.'],
        browsing: ["They'll buy the popular one. They always do.", 'Scrolling for permission to like something.', '{name} will buy the popular one. Always does.'],
    },
    eddie: {
        artwork: ['They keep coming back to {piece}. That means something.', '{piece} again. Somebody tipped them off.', '{name} keeps coming back to {piece}. That means something.'],
        project: ["They're deep in {slug}. Heard it's moving.", 'Watching {slug}. So is someone else.', "{name}'s deep in {slug}. Heard it's moving."],
        profile: ["They're checking whose hands it's in.", 'Reading a profile. Building a case.', "{name}'s checking whose hands it's in."],
        browsing: ["They're hunting. I can tell.", 'Quiet scroll. The dangerous kind.', "{name}'s hunting. I can tell."],
    },
    mick: {
        artwork: ['They looked at {piece}. Noted.', "{piece}. I've seen it pass through three wallets.", '{name} looked at {piece}. Noted.'],
        project: ['Back in {slug}. Same as last week.', 'I have records on all of {slug}.', "{name}'s back in {slug}. Same as last week."],
        profile: ["They're reading history. At least someone does.", 'Checking tenure. Good instinct.', "{name}'s reading history. At least someone does."],
        browsing: ['Browsing. Tuesday behavior.', "Seen this exact session a hundred times.", '{name}, browsing. Tuesday behavior.'],
    },
    carl: {
        artwork: ["They like {piece}. It'll let them down.", '{piece}. Looks great. For now.', "{name} likes {piece}. It'll let them down."],
        project: ['All of {slug}? That is a lot to regret later.', "{slug}. Floor's coming for it.", 'All of {slug}, {name}? That is a lot to regret later.'],
        profile: ['Looking at what they do not have.', 'Comparing up. Healthy. Sure.', '{name} is looking at what they do not have.'],
        browsing: ['Still looking. It will not help.', "They'll find something to lose money on.", "{name}'s still looking. It will not help."],
    },
    mimi: {
        artwork: ["They want {piece}. I'll be there when they fold.", '{piece}. I own the better one.', "{name} wants {piece}. I'll be there when they fold."],
        project: ['Circling {slug}. So am I.', 'They like {slug}. Noted for later.', '{name} likes {slug}. Noted for later.'],
        profile: ['Sizing someone up. I size wallets.', 'Reading a profile. I read positions.', "{name}'s sizing someone up. I size wallets."],
        browsing: ['Indecisive. Cheap to take from.', "They're scared. Good.", "{name}'s scared. Good."],
    },
    romy: {
        artwork: ['They really like {piece}. That is nice.', '{piece}. Good eye, honestly.', '{name} really likes {piece}. That is nice.'],
        project: ['They are enjoying {slug}. Let them.', '{slug} is a sweet little world.', '{name} is enjoying {slug}. Let them.'],
        profile: ['Curious about someone. That is the whole point.', 'Seeing what other people love.', '{name} is curious about someone. That is the whole point.'],
        browsing: ['Just looking around. Nothing wrong with that.', "They'll find their one.", '{name} is just looking around. Nothing wrong with that.'],
    },
    steven: {
        artwork: ['{piece}. Looks fine. I am having a sandwich.', "They're looking at {piece}. I'd hang it. Maybe.", "{name}'s looking at {piece}. I'd hang it. Maybe."],
        project: ['All of {slug}. Sure. I do not get it but sure.', '{slug}. Cool, I guess.', 'All of {slug}, {name}? Sure. I do not get it but sure.'],
        profile: ["Reading a stranger's profile. People do that here.", 'I never filled mine out.', "{name} is reading a stranger's profile. People do that here."],
        browsing: ['They are browsing. I am also just here.', 'Cool. Anyway.', '{name} is browsing. I am also just here.'],
    },
    celestia: {
        artwork: ['{piece} chose them, not the other way.', 'They linger on {piece}. The cards saw this.', '{piece} chose {name}, not the other way.'],
        project: ['{slug} is pulling them. I felt it too.', 'They wandered into {slug}. No accident.', '{slug} is pulling {name}. I felt it too.'],
        profile: ['They seek someone else’s path. Telling.', 'Reading a profile, looking for a sign.', '{name} seeks someone else’s path. Telling.'],
        browsing: ["They're searching for something they can't name.", 'The scroll is a kind of divination.', "{name} is searching for something they can't name."],
    },
};

/* The fourth-wall jolt — rare. {piece}-bearing lines only fire on an artwork. */
const FOURTHWALL: string[] = [
    'Wait… do they know we are watching them look at {piece} right now?',
    'Hold on — who is watching us watch them?',
    'Are we on a screen right now? Is this a screen?',
    'They can see us. Right? …Right?',
    'Someone is reading this. I can feel it.',
];

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
    let pool = pools[poolKey(stage.kind)];
    if (!name) pool = pool.filter((l) => !l.includes('{name}'));
    if (!pool || !pool.length) return null;
    return fill(rand(pool), stage, name);
}

/** The rare fourth-wall line. {piece} variants are dropped when no piece is in view. */
export function pickFourthWall(stage: Stage, name?: string | null): string {
    const usable = stage.piece ? FOURTHWALL : FOURTHWALL.filter((l) => !l.includes('{piece}'));
    return fill(rand(usable.length ? usable : FOURTHWALL), stage, name);
}
