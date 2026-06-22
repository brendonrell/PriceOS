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
   {slug} = the project name. Mostly third-person about you — eerier + funnier
   than talking at you. */
const AWARE: Record<string, AwarePools> = {
    rocco: {
        artwork: ['They keep staring at {piece}. I sold mine.', '{piece}. Bold of them to like it out loud.'],
        project: ['They found {slug}. I was here first.', 'Whole collection now? Amateur hour.'],
        profile: ['They care what other people own. Cute.', 'Reading a profile. Looking for taste to borrow.'],
        browsing: ["They'll buy the popular one. They always do.", 'Scrolling for permission to like something.'],
    },
    eddie: {
        artwork: ['They keep coming back to {piece}. That means something.', '{piece} again. Somebody tipped them off.'],
        project: ["They're deep in {slug}. Heard it's moving.", 'Watching {slug}. So is someone else.'],
        profile: ["They're checking whose hands it's in.", 'Reading a profile. Building a case.'],
        browsing: ["They're hunting. I can tell.", 'Quiet scroll. The dangerous kind.'],
    },
    mick: {
        artwork: ['They looked at {piece}. Noted.', "{piece}. I've seen it pass through three wallets."],
        project: ['Back in {slug}. Same as last week.', 'I have records on all of {slug}.'],
        profile: ["They're reading history. At least someone does.", 'Checking tenure. Good instinct.'],
        browsing: ['Browsing. Tuesday behavior.', "Seen this exact session a hundred times."],
    },
    carl: {
        artwork: ["They like {piece}. It'll let them down.", '{piece}. Looks great. For now.'],
        project: ['All of {slug}? That is a lot to regret later.', "{slug}. Floor's coming for it."],
        profile: ['Looking at what they do not have.', 'Comparing up. Healthy. Sure.'],
        browsing: ['Still looking. It will not help.', "They'll find something to lose money on."],
    },
    mimi: {
        artwork: ["They want {piece}. I'll be there when they fold.", '{piece}. I own the better one.'],
        project: ['Circling {slug}. So am I.', 'They like {slug}. Noted for later.'],
        profile: ['Sizing someone up. I size wallets.', 'Reading a profile. I read positions.'],
        browsing: ['Indecisive. Cheap to take from.', "They're scared. Good."],
    },
    romy: {
        artwork: ['They really like {piece}. That is nice.', '{piece}. Good eye, honestly.'],
        project: ['They are enjoying {slug}. Let them.', '{slug} is a sweet little world.'],
        profile: ['Curious about someone. That is the whole point.', 'Seeing what other people love.'],
        browsing: ['Just looking around. Nothing wrong with that.', "They'll find their one."],
    },
    steven: {
        artwork: ['{piece}. Looks fine. I am having a sandwich.', "They're looking at {piece}. I'd hang it. Maybe."],
        project: ['All of {slug}. Sure. I do not get it but sure.', '{slug}. Cool, I guess.'],
        profile: ["Reading a stranger's profile. People do that here.", 'I never filled mine out.'],
        browsing: ['They are browsing. I am also just here.', 'Cool. Anyway.'],
    },
    celestia: {
        artwork: ['{piece} chose them, not the other way.', 'They linger on {piece}. The cards saw this.'],
        project: ['{slug} is pulling them. I felt it too.', 'They wandered into {slug}. No accident.'],
        profile: ['They seek someone else’s path. Telling.', 'Reading a profile, looking for a sign.'],
        browsing: ["They're searching for something they can't name.", 'The scroll is a kind of divination.'],
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

function fill(line: string, stage: Stage): string {
    /* {slug} reads as the project's REGULAR display name, not the raw slug —
       slugs are arbitrary all-caps strings that overrun the bubble (Brendon,
       2026-06-22). */
    const projName = stage.slug ? (getProject(stage.slug)?.displayName ?? stage.slug) : 'this';
    return line
        .replace(/\{piece\}/g, stage.piece ?? 'this one')
        .replace(/\{slug\}/g, projName);
}

/** An awareness line for this character + stage, or null if it has nothing. */
export function pickAwareness(charId: string, stage: Stage): string | null {
    const pools = AWARE[charId];
    if (!pools) return null;
    const pool = pools[poolKey(stage.kind)];
    if (!pool || !pool.length) return null;
    return fill(rand(pool), stage);
}

/** The rare fourth-wall line. {piece} variants are dropped when no piece is in view. */
export function pickFourthWall(stage: Stage): string {
    const usable = stage.piece ? FOURTHWALL : FOURTHWALL.filter((l) => !l.includes('{piece}'));
    return fill(rand(usable.length ? usable : FOURTHWALL), stage);
}
