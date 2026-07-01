'use client';

/*
 * npc/memory — what the NPC Cast REMEMBERS about you. Strictly limited to what
 * they could SEE from the walls (the hard boundary vs the omniscient Familiar):
 * the pieces you opened this session, your pacing, your idle stretches, and —
 * across visits — only the shallow stuff a regular would notice: that they've
 * seen you before, how many episodes they've watched, and the piece you kept
 * coming back to last time. No wallet, no history, no truth. They guess.
 *
 * Persistence is localStorage (one small JSON blob). The used-line ledger is
 * what keeps the show from repeating across logins: every spoken line is
 * remembered (LRU, ~400) and skipped while remembered.
 */

import type { Fingerprint } from '../art/sampleColor';

export interface ViewEvent {
    /** A colour streak just hit: they keep opening the same-coloured ones. */
    streak?: { bucket: string; len: number };
    /** They came back to the same piece again (2nd, 3rd… look this session). */
    revisit?: { label: string; count: number };
    /** A resident just decided this viewer is THEIRS (the favourites form). */
    adoption?: { by: string };
}

interface Prediction {
    id: string;
    pieceKey: string;
    label: string;
    /** Session view-count when armed (for the miss timeout). */
    armedAtViews: number;
    /** Who made the call (charId) — the callback goes to/about them. */
    by: string;
}

interface PersistShape {
    v: 1;
    sessions: number;
    lastSeen: number;
    used: string[];
    /** The piece they kept returning to LAST session (label + colour) — the
     *  cold-open callback material. */
    lastObsession: { label: string; bucket: string | null } | null;
    /** Once-EVER flags (e.g. the familiar crossover) — survive across visits. */
    flags?: string[];
    /** The favourites form: per-resident taste affinity, and who adopted you. */
    affinity?: Record<string, number>;
    adoptedBy?: string | null;
    /** Residents you've long-press muted. Cleared by toggling the NPC spell. */
    muted?: string[];
}

const KEY = 'pd:npc:memory';
const USED_CAP = 400;
const SESSION_GAP_MS = 45 * 60 * 1000;

/* ── persistent ─────────────────────────────────────────────────────── */

let persist: PersistShape = { v: 1, sessions: 0, lastSeen: 0, used: [], lastObsession: null };
let usedSet = new Set<string>();
let loaded = false;
let returning = false;

function load(): void {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (raw) {
            const p = JSON.parse(raw) as PersistShape;
            if (p && p.v === 1) persist = p;
        }
    } catch { /* ignore */ }
    const now = Date.now();
    returning = persist.sessions > 0 && now - persist.lastSeen > SESSION_GAP_MS;
    if (persist.sessions === 0 || now - persist.lastSeen > SESSION_GAP_MS) {
        persist.sessions += 1;
    }
    persist.lastSeen = now;
    usedSet = new Set(persist.used);
    save();
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
function save(): void {
    if (typeof window === 'undefined') return;
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
        try {
            persist.lastSeen = Date.now();
            window.localStorage.setItem(KEY, JSON.stringify(persist));
        } catch { /* ignore */ }
    }, 800);
}

/** A line was spoken — remember it so it isn't repeated across logins. */
export function markUsed(key: string): void {
    load();
    if (usedSet.has(key)) return;
    usedSet.add(key);
    persist.used.push(key);
    while (persist.used.length > USED_CAP) {
        const drop = persist.used.shift();
        if (drop) usedSet.delete(drop);
    }
    save();
}

export function isUsed(key: string): boolean {
    load();
    return usedSet.has(key);
}

/* ── session (module-lifetime) ──────────────────────────────────────── */

const viewCounts = new Map<string, number>();
const viewOrder: { key: string; label: string; bucket: string | null }[] = [];
let streakBucket: string | null = null;
let streakLen = 0;
const navTimes: number[] = [];
const onceFired = new Set<string>();
const predictions: Prediction[] = [];
const pendingEvents: ViewEvent[] = [];
let sessionStart = 0;

/* ── the favourites form ────────────────────────────────────────────────
   Each resident has a TASTE — the visual qualities they'd respect in what
   you keep opening. Every viewed piece scores for whoever it matches; when
   one resident clearly leads, they quietly adopt you (persisted), announce
   it once, and their loyalty lines join the show. */

const TASTE: Record<string, (fp: Fingerprint) => number> = {
    rocco: (fp) => (fp.paletteCount <= 2 ? 1 : 0) + (fp.saturation < 0.35 ? 1 : 0) + (fp.complexity < 0.4 ? 1 : 0) + (fp.bucket === 'Black' || fp.bucket === 'White' ? 1 : 0),
    mick: (fp) => (fp.texture > 0.38 ? 1 : 0) + (fp.paletteCount === 2 ? 1 : 0) + (fp.contrast > 0.55 ? 1 : 0),
    mimi: (fp) => (fp.bucket === 'Hothurt' || fp.accent === 'Hothurt' ? 2 : 0) + (fp.contrast > 0.55 ? 1 : 0) + (fp.saturation > 0.6 ? 1 : 0),
    steven: (fp) => (fp.bucket === 'Blue' ? 2 : 0) + (fp.shapes.some((s) => s.kind === 'square') ? 1 : 0) + (fp.complexity < 0.4 ? 1 : 0),
    eddie: (fp) => (fp.symmetry < 0.5 ? 1 : 0) + (fp.complexity > 0.6 ? 1 : 0) + (fp.gravity === 'Left' || fp.gravity === 'Right' ? 1 : 0),
    carl: (fp) => (fp.brightness < 0.4 ? 1 : 0) + (fp.saturation < 0.3 ? 1 : 0) + (fp.warmth != null && fp.warmth < 0.4 ? 1 : 0),
    romy: (fp) => (fp.warmth != null && fp.warmth > 0.6 ? 1 : 0) + (fp.texture > 0.38 ? 1 : 0) + (fp.symmetry < 0.72 ? 1 : 0),
    celestia: (fp) => (fp.bucket === 'Moon' || fp.bucket === 'Black' ? 1 : 0) + (fp.air > 0.5 ? 1 : 0) + (fp.shapes.some((s) => s.kind === 'circle') ? 1 : 0),
};

function scoreAffinity(fp: Fingerprint): void {
    if (!persist.affinity) persist.affinity = {};
    let leader: string | null = null, top = 0, second = 0;
    for (const [id, taste] of Object.entries(TASTE)) {
        const gain = taste(fp);
        if (gain > 0) persist.affinity[id] = (persist.affinity[id] ?? 0) + gain;
        const total = persist.affinity[id] ?? 0;
        if (total > top) { second = top; top = total; leader = id; }
        else if (total > second) second = total;
    }
    if (!persist.adoptedBy && leader && top >= 14 && top - second >= 5) {
        persist.adoptedBy = leader;
        pendingEvents.push({ adoption: { by: leader } });
    }
    save();
}

/** Record a piece coming into view. Queues streak/revisit moments and feeds
 *  the favourites form when the full fingerprint is available. */
export function recordView(slug: string, id: number, label: string, bucket: string | null, fp?: Fingerprint | null): void {
    load();
    if (!sessionStart) sessionStart = Date.now();
    const key = `${slug}:${id}`;
    const prevCount = viewCounts.get(key) ?? 0;
    viewCounts.set(key, prevCount + 1);
    const last = viewOrder[viewOrder.length - 1];
    if (!last || last.key !== key) viewOrder.push({ key, label, bucket });

    // Colour streak — consecutive DISTINCT pieces sharing a bucket.
    if (bucket && (!last || last.key !== key)) {
        if (bucket === streakBucket) streakLen += 1;
        else { streakBucket = bucket; streakLen = 1; }
        if (streakLen === 3 || streakLen === 5) {
            pendingEvents.push({ streak: { bucket, len: streakLen } });
        }
    }

    // Revisit — they came back to the same piece.
    const count = prevCount + 1;
    if (count === 2 || count === 3 || count === 5) {
        pendingEvents.push({ revisit: { label, count } });
    }

    // Taste only scores DISTINCT looks (revisits don't stack the form).
    if (fp && prevCount === 0) scoreAffinity(fp);
}

/** Record a route change (pacing read). */
export function recordNav(): void {
    const now = Date.now();
    navTimes.push(now);
    while (navTimes.length && now - navTimes[0] > 60000) navTimes.shift();
}

/** Pull the next queued view moment (streak / revisit), if any. */
export function nextEvent(): ViewEvent | null {
    return pendingEvents.shift() ?? null;
}

/** One-shot session flags (cold open, fourth wall, …). True the FIRST time. */
export function fireOnce(flag: string): boolean {
    if (onceFired.has(flag)) return false;
    onceFired.add(flag);
    return true;
}

/** One-shot EVER flags (the familiar crossover) — persisted across visits. */
export function fireOncePersist(flag: string): boolean {
    load();
    const flags = persist.flags ?? (persist.flags = []);
    if (flags.includes(flag)) return false;
    flags.push(flag);
    save();
    return true;
}

/* ── per-resident mute (long-press a bubble) ────────────────────────── */

export function mutedIds(): string[] {
    load();
    return persist.muted ?? [];
}

export function muteResident(id: string): void {
    load();
    const m = persist.muted ?? (persist.muted = []);
    if (!m.includes(id)) m.push(id);
    save();
}

/** Toggling the NPC spell off→on un-mutes everyone (the reset, no UI). */
export function clearMutes(): void {
    load();
    if (persist.muted?.length) {
        persist.muted = [];
        save();
    }
}

/* ── actions (what they watched you DO) ─────────────────────────────── */

const actionCounts = new Map<string, number>();
const actedOn = new Map<string, Set<string>>(); // pieceKey → action kinds

/** Record an observed action; returns how many of that kind this session. */
export function recordAction(kind: string, pieceKey?: string | null): number {
    const n = (actionCounts.get(kind) ?? 0) + 1;
    actionCounts.set(kind, n);
    if (pieceKey) {
        const set = actedOn.get(pieceKey) ?? new Set<string>();
        set.add(kind);
        actedOn.set(pieceKey, set);
    }
    return n;
}

export function actionCount(kind: string): number {
    return actionCounts.get(kind) ?? 0;
}

/** Which actions they've taken on a piece this session (convergence reads). */
export function actionsOn(slug: string, id: number): Set<string> {
    return actedOn.get(`${slug}:${id}`) ?? new Set();
}

/* ── buy bets — wishlist arms a call; a mint/buy resolves it ────────── */

interface BuyBet { by: string; pieceKey: string; label: string; armedAtViews: number; }
const buyBets: BuyBet[] = [];

export function armBuyBet(by: string, slug: string, id: number, label: string): void {
    const key = `${slug}:${id}`;
    if (buyBets.some((b) => b.pieceKey === key)) return;
    buyBets.push({ by, pieceKey: key, label, armedAtViews: viewOrder.length });
}

/** A purchase happened — if the couch had a bet on the piece (or its project),
 *  resolve it as a hit. */
export function resolveBuyBet(slug: string | null): { by: string; label: string } | null {
    for (let i = 0; i < buyBets.length; i++) {
        const b = buyBets[i];
        if (!slug || b.pieceKey.startsWith(`${slug}:`)) {
            buyBets.splice(i, 1);
            return { by: b.by, label: b.label };
        }
    }
    return null;
}

/** An expired buy bet (they browsed far past it without buying), if any. */
export function expiredBuyBet(): { by: string; label: string } | null {
    for (let i = 0; i < buyBets.length; i++) {
        if (viewOrder.length - buyBets[i].armedAtViews >= 12) {
            const b = buyBets.splice(i, 1)[0];
            return { by: b.by, label: b.label };
        }
    }
    return null;
}

/* ── predictions (the couch makes calls about you) ──────────────────── */

export function armPrediction(by: string, slug: string, id: number, label: string): void {
    const key = `${slug}:${id}`;
    if (predictions.some((p) => p.pieceKey === key)) return;
    predictions.push({
        id: `${key}:${viewOrder.length}`,
        pieceKey: key,
        label,
        armedAtViews: viewOrder.length,
        by,
    });
}

export interface DuePrediction { by: string; label: string; hit: boolean; }

/** A prediction that just resolved: hit (they came back to the piece) or miss
 *  (they moved on — several other pieces since). */
export function duePrediction(): DuePrediction | null {
    for (let i = 0; i < predictions.length; i++) {
        const p = predictions[i];
        const seenSince = viewOrder.length - p.armedAtViews;
        const latest = viewOrder[viewOrder.length - 1];
        if (seenSince > 0 && latest && latest.key === p.pieceKey) {
            predictions.splice(i, 1);
            return { by: p.by, label: p.label, hit: true };
        }
        if (seenSince >= 7) {
            predictions.splice(i, 1);
            return { by: p.by, label: p.label, hit: false };
        }
    }
    return null;
}

export function hasPredictionFor(slug: string, id: number): boolean {
    const key = `${slug}:${id}`;
    return predictions.some((p) => p.pieceKey === key);
}

/* ── facts (the director's read of the session) ─────────────────────── */

export interface SessionFacts {
    viewsThisSession: number;
    distinctPieces: number;
    streakBucket: string | null;
    streakLen: number;
    /** Times the CURRENT piece has been opened this session. */
    revisitOf: (slug: string, id: number) => number;
    navsLastMinute: number;
    minutesIn: number;
    /** They've watched this person before (a previous session exists). */
    isReturning: boolean;
    sessionNumber: number;
    /** The piece they kept returning to last session, if the cast noticed. */
    lastObsession: { label: string; bucket: string | null } | null;
    /** The resident who adopted this viewer (the favourites form), if any. */
    adoptedBy: string | null;
}

export function sessionFacts(): SessionFacts {
    load();
    return {
        viewsThisSession: viewOrder.length,
        distinctPieces: viewCounts.size,
        streakBucket,
        streakLen,
        revisitOf: (slug, id) => viewCounts.get(`${slug}:${id}`) ?? 0,
        navsLastMinute: navTimes.length,
        minutesIn: sessionStart ? (Date.now() - sessionStart) / 60000 : 0,
        isReturning: returning,
        sessionNumber: persist.sessions,
        lastObsession: persist.lastObsession,
        adoptedBy: persist.adoptedBy ?? null,
    };
}

/** Keep the cross-session "obsession" fresh: the most-reopened piece so far.
 *  Called opportunistically (each director tick); cheap. */
export function noteObsession(): void {
    load();
    let best: { key: string; n: number } | null = null;
    for (const [key, n] of viewCounts) {
        if (n >= 3 && (!best || n > best.n)) best = { key, n };
    }
    if (!best) return;
    const entry = viewOrder.find((v) => v.key === best!.key);
    if (!entry) return;
    if (persist.lastObsession?.label !== entry.label) {
        persist.lastObsession = { label: entry.label, bucket: entry.bucket };
        save();
    }
}
