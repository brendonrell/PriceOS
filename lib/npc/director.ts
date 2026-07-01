'use client';

/*
 * npc/director — decides what the cast plays next. The component (NpcCast)
 * owns timers + rendering; this module owns the DRAMATURGY: which rung of the
 * awareness ladder fires, who speaks, in what order, with what line — plus the
 * hard cooldowns that keep the rare rungs rare (overuse kills the magic —
 * ClickUp 86b9fcp11).
 *
 * The ladder, in priority order each tick:
 *   0. something you just DID (the action bus — mint, wishlist, cart, grail…)
 *   1. a prediction/bet about you just resolved (the couch owns the result)
 *   2. a queued moment (colour streak / piece revisit / an adoption)
 *   3. your lights flipped (dark ↔ light)
 *   4. the cold open (first sign of life, once per session)
 *   5. boredom / pacing (idle stretch, or tearing through pages)
 *   6. the weighted roll: sight › exchange › duet › glance › own-world ›
 *      direct › the once-a-session fourth-wall jolt › the once-EVER
 *      familiar crossover.
 *
 * Every spoken line lands in the persistent used-ledger (lib/npc/memory), so
 * the show doesn't repeat across logins until the bank cycles.
 */

import { CAST } from './cast';
import { pickAwareness, type Stage } from './awareness';
import type { PieceInView } from './inview';
import {
    SIGHT, SIGHT_SCENE, EXCHANGES, STREAK, REVISIT, PREDICT_ARM, PREDICT_HIT, PREDICT_MISS,
    IDLE, PACING, NIGHT, MORNING, DIRECT, FOURTHWALL, colorWord,
    ACTION_LINES, ACTION_EXCHANGES, BUYBET_ARM, BUYBET_HIT, BUYBET_MISS,
    DUET_OPENERS, DUET_REPLIES, ADOPTION_SCENES, LOYAL, XOVER_SCENES, MUTE_REACTS,
    type Sight, type Exchange,
} from './scenarios';
import {
    sessionFacts, nextEvent, fireOnce, fireOncePersist, markUsed, isUsed,
    armPrediction, duePrediction, hasPredictionFor, noteObsession, recordNav,
    recordAction, armBuyBet, resolveBuyBet, expiredBuyBet,
} from './memory';
import { consumeAction, type NpcAction } from './actions';
import {
    brightnessBand, saturationBand, complexityBand, toneMood,
    contrastBand, warmthBand, symmetryBand, airBand, textureBand, orientationOf,
    fateDetail,
} from '../output/derive';
import { primaryTrait, traitRarity, fateRarity, colorRarity, overallRarity } from '../output/rarity';

export interface DirectorCtx {
    stage: Stage;
    piece: PieceInView | null;
    name: string | null;
    polarity: 'dark' | 'light';
    hour: number;
    idleMs: number;
    /** Residents whose bubbles are currently visible. */
    activeIds: Set<string>;
    /** The Digital Familiar is on screen (gates the once-ever crossover). */
    familiarOn: boolean;
    /** Its species name, for {familiar}. */
    familiarName: string | null;
}

export interface PlayBeat {
    who: string;
    text: string;
    /** Delay before this beat, ms (0 for the first). */
    gapMs: number;
}

/* ── module state (session-lifetime cooldowns) ──────────────────────── */

const last: Record<string, number> = {};
let lastPolarity: 'dark' | 'light' | null = null;

function cooled(key: string, ms: number): boolean {
    return Date.now() - (last[key] ?? 0) >= ms;
}
function stamp(key: string): void {
    last[key] = Date.now();
}

const rand = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const beatGap = () => 2800 + Math.round(Math.random() * 1400);

/* ── the cast's read of the piece (band words, matching the sheet) ──── */

const sightCache = new Map<string, Sight>();

function buildSight(p: PieceInView): Sight {
    const key = `${p.slug}:${p.id}`;
    const cached = sightCache.get(key);
    if (cached) return cached;
    const fp = p.fp;
    let rarity: number | null = null;
    try {
        const pt = primaryTrait(p.slug, p.id);
        const tf = pt ? traitRarity(p.slug, pt.name, pt.value) : null;
        const cf = fp?.bucket ? colorRarity(p.slug, fp.bucket) : null;
        const ff = fateRarity(p.slug, fateDetail(p.slug, p.id).fate);
        rarity = overallRarity([tf, ff, cf])?.score ?? null;
    } catch { /* rarity stays unknown — the cast shrugs */ }
    const s: Sight = {
        label: p.label,
        project: p.project,
        bucket: fp?.bucket ?? null,
        accent: fp?.accent ?? null,
        palette: fp ? paletteWordOf(fp.paletteCount) : null,
        brightness: fp ? brightnessBand(fp.brightness) : null,
        saturation: fp ? saturationBand(fp.saturation) : null,
        complexity: fp ? complexityBand(fp.complexity) : null,
        contrast: fp ? contrastBand(fp.contrast) : null,
        warmth: fp?.warmth != null ? warmthBand(fp.warmth) : null,
        gravity: fp?.gravity ?? null,
        symmetry: fp ? symmetryBand(fp.symmetry) : null,
        air: fp ? airBand(fp.air) : null,
        texture: fp ? textureBand(fp.texture) : null,
        tone: fp ? toneMood(fp.brightness, fp.saturation) : null,
        orientation: fp ? orientationOf(fp.aspect) || null : null,
        rarity,
        scene: fp?.scene ?? null,
        shapeCount: fp?.shapeCount ?? 0,
        pattern: fp?.pattern ?? null,
        hasCircle: fp?.shapes?.some((sh) => sh.kind === 'circle') ?? false,
        hasSquare: fp?.shapes?.some((sh) => sh.kind === 'square') ?? false,
    };
    sightCache.set(key, s);
    return s;
}

function paletteWordOf(count: number): string {
    if (count <= 1) return 'Monochrome';
    if (count === 2) return 'Duotone';
    if (count === 3) return 'Trichrome';
    return 'Polychrome';
}

/* ── template fill ──────────────────────────────────────────────────── */

interface FillCtx {
    piece?: string | null;
    project?: string | null;
    name?: string | null;
    color?: string | null;
    accent?: string | null;
    n?: number | null;
    obsession?: string | null;
    scene?: string | null;
    familiar?: string | null;
    mute?: string | null;
}

function fill(text: string, f: FillCtx): string {
    return text
        .replace(/\{piece\}/g, f.piece ?? 'this one')
        .replace(/\{project\}/g, f.project ?? 'this')
        .replace(/\{name\}/g, f.name ?? 'they')
        .replace(/\{color\}/g, f.color ?? 'that colour')
        .replace(/\{accent\}/g, f.accent ?? 'colour')
        .replace(/\{n\}/g, f.n != null ? String(f.n) : 'a few')
        .replace(/\{obsession\}/g, f.obsession ?? 'that one')
        .replace(/\{scene\}/g, capFirst(f.scene ?? 'what it is'))
        .replace(/\{familiar\}/g, f.familiar ?? 'creature')
        .replace(/\{mute\}/g, f.mute ?? 'them');
}

function capFirst(s: string): string {
    return s.length ? s[0].toUpperCase() + s.slice(1) : s;
}

function lineKey(who: string, text: string): string {
    return `${who}:${text.slice(0, 32)}`;
}

/** Prefer lines the show hasn't used (persisted across logins); if the whole
 *  pool is spent, allow repeats rather than going silent. */
function freshest<T>(pool: T[], keyOf: (t: T) => string): T | null {
    if (!pool.length) return null;
    const unused = pool.filter((t) => !isUsed(keyOf(t)));
    return rand(unused.length ? unused : pool);
}

function idleChars(ctx: DirectorCtx, pref?: string[]): string[] {
    const ids = CAST.map((c) => c.id).filter((id) => !ctx.activeIds.has(id));
    if (pref) {
        const p = pref.filter((id) => ids.includes(id));
        if (p.length) return p;
    }
    return ids;
}

/* ── beat builders ──────────────────────────────────────────────────── */

function single(who: string, text: string, f: FillCtx): PlayBeat[] {
    markUsed(lineKey(who, text));
    return [{ who, text: fill(text, f), gapMs: 0 }];
}

function playExchange(x: Exchange, f: FillCtx): PlayBeat[] {
    markUsed(`x:${x.id}`);
    return x.beats.map((b, i) => ({ who: b.who, text: fill(b.text, f), gapMs: i === 0 ? 0 : beatGap() }));
}

/** Pick a line from a per-character pool for any idle character. */
function fromPool(pools: Record<string, string[]>, ctx: DirectorCtx, f: FillCtx): PlayBeat[] | null {
    const ids = idleChars(ctx).filter((id) => pools[id]?.length);
    if (!ids.length) return null;
    const candidates = ids.flatMap((id) => pools[id].map((text) => ({ id, text })));
    const pick = freshest(candidates, (c) => lineKey(c.id, c.text));
    if (!pick) return null;
    return single(pick.id, pick.text, f);
}

function eligibleExchanges(kind: Exchange['kind'], ctx: DirectorCtx, sight: Sight | null): Exchange[] {
    return EXCHANGES.filter((x) => {
        if (x.kind !== kind) return false;
        if (x.beats.some((b) => ctx.activeIds.has(b.who))) return false;
        const carriesName = x.beats.some((b) => b.text.includes('{name}'));
        if (carriesName && !ctx.name) return false;
        if (x.id === 'x-ghost' && ctx.name) return false;
        if (x.needsPiece && !ctx.piece) return false;
        if (x.sightWhen && (!sight || !x.sightWhen(sight))) return false;
        return true;
    });
}

function pickExchange(kinds: Exchange['kind'][], ctx: DirectorCtx, sight: Sight | null, f: FillCtx): PlayBeat[] | null {
    const pool = kinds.flatMap((k) => eligibleExchanges(k, ctx, sight));
    const x = freshest(pool, (e) => `x:${e.id}`);
    return x ? playExchange(x, f) : null;
}

/* ── the tick ───────────────────────────────────────────────────────── */

export function directorTick(ctx: DirectorCtx): PlayBeat[] | null {
    noteObsession();
    const facts = sessionFacts();
    const sight = ctx.piece ? buildSight(ctx.piece) : null;
    const f: FillCtx = {
        piece: ctx.piece?.label ?? null,
        project: ctx.piece?.project ?? null,
        name: ctx.name,
        color: sight?.bucket ? colorWord(sight.bucket) : null,
        accent: sight?.accent ? colorWord(sight.accent) : null,
        obsession: facts.lastObsession?.label ?? null,
        scene: sight?.scene ?? null,
        familiar: ctx.familiarName,
    };

    /* 0 — something you just DID. The couch pounces. */
    const act = consumeAction();
    if (act) {
        const beats = actionBeat(act, ctx, sight, f);
        if (beats) return beats;
    }
    const lapsed = expiredBuyBet();
    if (lapsed) {
        const pool = BUYBET_MISS[lapsed.by];
        if (pool?.length) {
            const p = rand(pool);
            if (!ctx.activeIds.has(p.who)) return single(p.who, p.text, { ...f, piece: lapsed.label });
        }
    }

    /* 1 — a prediction about you just resolved. */
    const due = duePrediction();
    if (due) {
        const pool = due.hit ? PREDICT_HIT[due.by] : PREDICT_MISS[due.by];
        if (pool?.length) {
            const p = rand(pool);
            return single(p.who, p.text, { ...f, piece: due.label });
        }
    }

    /* 2 — a queued moment: streak, revisit, or an adoption. */
    const ev = nextEvent();
    if (ev?.adoption) {
        const scene = ADOPTION_SCENES[ev.adoption.by];
        if (scene && !scene.beats.some((b) => ctx.activeIds.has(b.who))) {
            return playExchange(scene, f);
        }
        // Announcer busy — the adopter says a loyalty line instead.
        const loyal = LOYAL[ev.adoption.by];
        if (loyal?.length && !ctx.activeIds.has(ev.adoption.by)) {
            return single(ev.adoption.by, rand(loyal), f);
        }
    }
    if (ev?.streak && cooled('streak', 90000)) {
        stamp('streak');
        const beats = fromPool(STREAK, ctx, { ...f, color: colorWord(ev.streak.bucket), n: ev.streak.len });
        if (beats) return beats;
    }
    if (ev?.revisit && cooled('revisit', 90000)) {
        stamp('revisit');
        // Sometimes the second look arms a bet instead of a comment.
        if (ev.revisit.count === 2 && ctx.piece && !hasPredictionFor(ctx.piece.slug, ctx.piece.id) && Math.random() < 0.4) {
            const by = Math.random() < 0.6 ? 'eddie' : 'mimi';
            if (!ctx.activeIds.has(by)) {
                armPrediction(by, ctx.piece.slug, ctx.piece.id, ctx.piece.label);
                return single(by, rand(PREDICT_ARM[by]), { ...f, piece: ev.revisit.label });
            }
        }
        const beats = fromPool(REVISIT, ctx, { ...f, piece: ev.revisit.label, n: ev.revisit.count });
        if (beats) return beats;
    }

    /* 3 — your lights flipped. */
    if (lastPolarity && lastPolarity !== ctx.polarity && cooled('flip', 600000)) {
        lastPolarity = ctx.polarity;
        stamp('flip');
        const want = ctx.polarity === 'dark' ? 'x-wentdark' : 'x-lightson';
        const x = EXCHANGES.find((e) => e.id === want);
        if (x && !x.beats.some((b) => ctx.activeIds.has(b.who))) return playExchange(x, f);
    }
    lastPolarity = ctx.polarity;

    /* 4 — the cold open. */
    if (fireOnce('coldopen')) {
        if (facts.sessionNumber <= 1) {
            const x = EXCHANGES.find((e) => e.id === 'x-newface');
            if (x) return playExchange(x, f);
        } else if (facts.isReturning) {
            if (facts.lastObsession && Math.random() < 0.6) {
                const x = EXCHANGES.find((e) => e.id === 'x-back-obsession');
                if (x) return playExchange(x, f);
            }
            const x = EXCHANGES.find((e) => e.id === 'x-back-file');
            if (x) return playExchange(x, f);
        }
        // mid-gap return (same session resumed) — fall through to the roll
    }

    /* 5 — boredom / pacing. */
    if (ctx.idleMs > 75000 && cooled('idle', 240000)) {
        stamp('idle');
        if (Math.random() < 0.5) {
            const beats = pickExchange(['idle'], ctx, sight, f);
            if (beats) return beats;
        }
        const beats = fromPool(IDLE, ctx, f);
        if (beats) return beats;
    }
    if (facts.navsLastMinute >= 6 && cooled('pacing', 300000)) {
        stamp('pacing');
        const beats = fromPool(PACING, ctx, f);
        if (beats) return beats;
    }

    /* Night / morning colour — an occasional seasoning, not a category. */
    const isNight = ctx.hour >= 23 || ctx.hour < 5;
    const isMorning = ctx.hour >= 5 && ctx.hour < 9;
    if (isNight && cooled('night', 480000) && Math.random() < 0.18) {
        stamp('night');
        if (Math.random() < 0.45) {
            const beats = pickExchange(['night'], ctx, sight, f);
            if (beats) return beats;
        }
        const beats = fromPool(NIGHT, ctx, f);
        if (beats) return beats;
    }
    if (isMorning && cooled('night', 480000) && Math.random() < 0.1) {
        stamp('night');
        const beats = fromPool(MORNING, ctx, f);
        if (beats) return beats;
    }

    /* The once-EVER familiar crossover — the cast notices your companion. */
    if (ctx.familiarOn && ctx.familiarName && facts.minutesIn >= 2 && Math.random() < 0.035) {
        const playable = XOVER_SCENES.filter((x) => !x.beats.some((b) => ctx.activeIds.has(b.who)));
        if (playable.length && fireOncePersist('xover')) {
            return playExchange(rand(playable), f);
        }
    }

    /* 6 — the weighted roll. REACTIVE FIRST (Brendon, 2026-07-01): they're a
       gossiping audience, not a companion — the show is what's on screen, and
       own-world chatter is the connective bed, never the default. */
    const roll = Math.random();
    if (ctx.piece && sight) {
        // On an artwork: the piece is the guest star.
        if (roll < 0.02 && facts.minutesIn >= 3 && cooled('direct', 300000) && fireOnce('fourthwall')) {
            stamp('direct');
            const who = rand(idleChars(ctx));
            return single(who, rand(FOURTHWALL), f);
        }
        if (roll < 0.06 && cooled('direct', 360000)) {
            stamp('direct');
            const beats = directAddress(ctx, f);
            if (beats) return beats;
        }
        if (roll < 0.5) {
            const beats = sightBeat(ctx, sight, f);
            if (beats) return beats;
        }
        if (roll < 0.66 && cooled('exchange', 150000)) {
            stamp('exchange');
            const beats = pickExchange(['sight', 'couch', 'seen', 'drift'], ctx, sight, f);
            if (beats) return beats;
        }
        if (roll < 0.8 && cooled('duet', 120000)) {
            stamp('duet');
            const beats = duetBeat(ctx, sight, f);
            if (beats) return beats;
        }
        if (roll < 0.92) {
            const beats = glanceBeat(ctx, f);
            if (beats) return beats;
        }
        return ownWorldBeat(ctx, facts, f);
    }
    // Off the artwork: the glances at what you're doing carry the show.
    if (roll < 0.03 && cooled('direct', 360000)) {
        stamp('direct');
        const beats = directAddress(ctx, f);
        if (beats) return beats;
    }
    if (roll < 0.26 && cooled('exchange', 150000)) {
        stamp('exchange');
        const beats = pickExchange(['couch', 'seen', 'drift'], ctx, sight, f);
        if (beats) return beats;
    }
    if (roll < 0.42 && cooled('duet', 120000)) {
        stamp('duet');
        const beats = duetBeat(ctx, sight, f);
        if (beats) return beats;
    }
    if (roll < 0.74) {
        const beats = glanceBeat(ctx, f);
        if (beats) return beats;
    }
    return ownWorldBeat(ctx, facts, f);
}

/* ── the action pounce ─────────────────────────────────────────────── */

function actionBeat(act: NpcAction, ctx: DirectorCtx, sight: Sight | null, f: FillCtx): PlayBeat[] | null {
    const n = recordAction(act.kind, ctx.piece ? `${ctx.piece.slug}:${ctx.piece.id}` : null);

    // A purchase resolves any open buy bet first — the payoff beats the react.
    if (act.kind === 'mint' || act.kind === 'buy') {
        const won = resolveBuyBet(ctx.piece?.slug ?? ctx.stage.slug ?? null);
        if (won) {
            const pool = BUYBET_HIT[won.by];
            if (pool?.length) {
                const p = rand(pool);
                if (!ctx.activeIds.has(p.who)) return single(p.who, p.text, { ...f, piece: won.label });
            }
        }
    }

    // Per-kind cooldown — spamming stars doesn't spam bubbles (counts still
    // accumulate, so the eventual line says "{n} today").
    if (!cooled(`act:${act.kind}`, 45000)) return null;
    stamp(`act:${act.kind}`);

    // A wishlist on a visible piece sometimes arms a buy bet instead.
    if (act.kind === 'wishlist' && ctx.piece && Math.random() < 0.35) {
        const by = Math.random() < 0.6 ? 'eddie' : 'mimi';
        if (!ctx.activeIds.has(by)) {
            armBuyBet(by, ctx.piece.slug, ctx.piece.id, ctx.piece.label);
            return single(by, rand(BUYBET_ARM[by]), f);
        }
    }

    // The couch reacts together to the big moves, sometimes.
    const scenes = ACTION_EXCHANGES[act.kind];
    if (scenes?.length && Math.random() < 0.3) {
        const playable = scenes.filter((x) =>
            !x.beats.some((b) => ctx.activeIds.has(b.who)) && !isUsed(`x:${x.id}`));
        if (playable.length) return playExchange(rand(playable), f);
    }

    const pool = (ACTION_LINES[act.kind] ?? [])
        .filter((l) => !ctx.activeIds.has(l.who))
        .filter((l) => !l.when || l.when(sight, n))
        .filter((l) => !l.text.includes('{name}') || ctx.name);
    const pick = freshest(pool, (l) => lineKey(l.who, l.text));
    if (!pick) return null;
    return single(pick.who, pick.text, { ...f, n });
}

/* ── duets — halves assembled into whole scenes ────────────────────── */

function duetBeat(ctx: DirectorCtx, sight: Sight | null, f: FillCtx): PlayBeat[] | null {
    const openers = DUET_OPENERS.filter((o) =>
        !ctx.activeIds.has(o.who) && (!o.when || o.when(sight)));
    const opener = freshest(openers, (o) => `duet-o:${lineKey(o.who, o.text)}`);
    if (!opener) return null;
    const replies = DUET_REPLIES.filter((r) =>
        r.topics.includes(opener.topic) && r.who !== opener.who && !ctx.activeIds.has(r.who));
    const reply = freshest(replies, (r) => `duet-r:${lineKey(r.who, r.text)}`);
    if (!reply) return null;
    markUsed(`duet-o:${lineKey(opener.who, opener.text)}`);
    markUsed(`duet-r:${lineKey(reply.who, reply.text)}`);
    return [
        { who: opener.who, text: fill(opener.text, f), gapMs: 0 },
        { who: reply.who, text: fill(reply.text, f), gapMs: beatGap() },
    ];
}

/** Route-change hook — feeds the pacing read. */
export function directorNav(): void {
    recordNav();
}

/** A resident just got long-press muted — the survivors react (once). The
 *  `busy` set should carry active AND muted residents. */
export function directorMuteReaction(mutedId: string, busy: Set<string>): PlayBeat[] | null {
    const name = CAST.find((c) => c.id === mutedId)?.name ?? 'them';
    const playable = MUTE_REACTS.filter((x) =>
        !x.beats.some((b) => busy.has(b.who) || b.who === mutedId));
    const x = freshest(playable, (e) => `x:${e.id}`);
    if (!x) return null;
    return playExchange(x, { mute: name });
}

function sightBeat(ctx: DirectorCtx, sight: Sight, f: FillCtx): PlayBeat[] | null {
    const ids = idleChars(ctx);
    const candidates = ids.flatMap((id) =>
        [...(SIGHT[id] ?? []), ...(SIGHT_SCENE[id] ?? [])]
            .filter((l) => l.when(sight))
            .filter((l) => !l.text.includes('{name}') || ctx.name)
            .map((l) => ({ id, text: l.text })),
    );
    const pick = freshest(candidates, (c) => lineKey(c.id, c.text));
    if (!pick) return null;
    return single(pick.id, pick.text, f);
}

function glanceBeat(ctx: DirectorCtx, f: FillCtx): PlayBeat[] | null {
    const ids = idleChars(ctx);
    if (!ids.length) return null;
    // A couple of tries — some characters have nothing for some stages.
    for (let i = 0; i < 3; i++) {
        const id = rand(ids);
        const line = pickAwareness(id, ctx.stage, ctx.name);
        if (line) {
            markUsed(lineKey(id, line));
            return [{ who: id, text: line, gapMs: 0 }];
        }
    }
    return null;
}

function directAddress(ctx: DirectorCtx, f: FillCtx): PlayBeat[] | null {
    const pools: Record<string, string[]> = {};
    for (const [id, lines] of Object.entries(DIRECT)) {
        const usable = ctx.name ? lines : lines.filter((l) => !l.includes('{name}'));
        if (usable.length) pools[id] = usable;
    }
    return fromPool(pools, ctx, f);
}

function ownWorldBeat(ctx: DirectorCtx, facts?: { adoptedBy: string | null }, f?: FillCtx): PlayBeat[] | null {
    // The adopted viewer's resident warms up now and then (the favourites form).
    if (facts?.adoptedBy && f && !ctx.activeIds.has(facts.adoptedBy)
        && Math.random() < 0.2 && cooled('loyal', 300000)) {
        const loyal = (LOYAL[facts.adoptedBy] ?? []).filter((t) => !isUsed(lineKey(facts.adoptedBy!, t)));
        if (loyal.length) {
            stamp('loyal');
            return single(facts.adoptedBy, rand(loyal), f);
        }
    }
    const ids = idleChars(ctx);
    if (!ids.length) return null;
    const candidates = ids.flatMap((id) => {
        const c = CAST.find((ch) => ch.id === id);
        return (c?.lines ?? []).map((text) => ({ id, text }));
    });
    const pick = freshest(candidates, (c) => lineKey(c.id, c.text));
    if (!pick) return null;
    markUsed(lineKey(pick.id, pick.text));
    return [{ who: pick.id, text: pick.text, gapMs: 0 }];
}
