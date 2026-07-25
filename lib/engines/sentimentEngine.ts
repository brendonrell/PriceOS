'use client';

/*
 * sentimentEngine — Sentiment Weather, computed from the REAL ledger.
 *
 * Owns the cloud/sun glyph in PeteyLogo's #sentimentWidget. Until 2026-07-06
 * this was the sim's random 7-state cycle (Math.random ticks, zero data —
 * tech-debt product-truth fix); it now reads the same global events feed the
 * Tape rides (/api/feed) and scores taker momentum for real:
 *
 *   bull side — MINT + SALE rows (takers hitting: demand aggression)
 *   bear side — LIST rows (supply coming out faster than it clears)
 *   XFER      — neutral, ignored
 *
 * Each event is weighted by recency (exponential decay, 6h half-life) so the
 * needle follows the last few hours, not all history. The balance
 * r = (bull − bear) / (bull + bear) ∈ [−1, 1] buckets into the sim's original
 * state ladder; a dead-quiet window reads Neutral ☽ (honest for a fresh
 * platform), and Capitulation needs BOTH an extreme bear balance and real
 * volume behind it — quiet drift never reads as a crash.
 *
 * Subscriber model unchanged: components subscribe via subscribeSentiment();
 * engine starts on first subscriber, stops on last; refresh pauses while the
 * tab is hidden (same wasted-wakeup guard as before) and re-pulls on
 * 'pd:project-refresh' — the same signal the Tape refreshes on.
 */

import type { EventRow } from '../supabase';

export interface SentimentState {
    icon: string;
    label: string;
    tip: string;
}

/* State ladder preserved verbatim from the sim port (order matters).
 *
 * 2026-07-25 — EMOJI PURGE (Brendon's picks, one at a time). Glyphs with an
 * emoji mapping get painted in colour by iOS no matter what the variation
 * selector says, so four were swapped for marks with NO emoji mapping at all:
 *   Bull ☀ → ✷   Lean Bull ⛅ → ✵   Bear ⛈ → ↯   Strong Bear ☂ → ⛇
 *
 * ⛔ Lean Bear stays ☁ — BRENDON'S CALL, 2026-07-25: "leave the overcast look".
 * It is the one remaining emoji-mapped glyph in the ladder and it STAYS until
 * he says otherwise. Do not "fix" it.
 *
 * The rule the others were picked against (GLYPHS §7, sharpened the same day):
 * a glyph is only safe if the codepoint has NO emoji mapping anywhere in
 * Unicode — judging by default presentation is what shipped ☁ and ☂. */
export const SENTIMENT_STATES: readonly SentimentState[] = [
    { icon: '\u263C\uFE0E', label: 'Strong Bull',  tip: 'Taker momentum: Strong Bull ☼' },
    { icon: '\u2737\uFE0E', label: 'Bull',         tip: 'Taker momentum: Bull ✷' },
    { icon: '\u2735\uFE0E', label: 'Lean Bull',    tip: 'Taker momentum: Lean Bull ✵' },
    { icon: '\u2601\uFE0E', label: 'Lean Bear',    tip: 'Taker momentum: Lean Bear ☁' },
    { icon: '\u21AF\uFE0E', label: 'Bear',         tip: 'Taker momentum: Bear ↯' },
    { icon: '\u26C7\uFE0E', label: 'Strong Bear',  tip: 'Taker momentum: Strong Bear ⛇' },
    { icon: '\u2608\uFE0E', label: 'Capitulation', tip: 'Taker momentum: Capitulation ☈' },
    { icon: '\u263D\uFE0E', label: 'Neutral',      tip: 'Taker momentum: Neutral ☽' },
];

const IDX = {
    strongBull: 0,
    bull: 1,
    leanBull: 2,
    leanBear: 3,
    bear: 4,
    strongBear: 5,
    capitulation: 6,
    neutral: 7,
} as const;

const FEED_LIMIT = 40;
const REFRESH_MS = 5 * 60_000;
const HALF_LIFE_MS = 6 * 3_600_000;
/** Decayed-volume floor below which the window counts as quiet → Neutral. */
const QUIET_FLOOR = 0.5;
/** Decayed-volume floor Capitulation additionally requires — a crash needs
    real selling pressure behind it, not two stale listings. */
const CAPITULATION_FLOOR = 3;

/** Bucket a live event window into a state index. Pure — exported so the
    mapping is provable without a browser. */
export function scoreSentiment(events: readonly EventRow[], nowMs: number): number {
    let bull = 0;
    let bear = 0;
    for (const e of events) {
        const t = Date.parse(e.timestamp);
        if (Number.isNaN(t)) continue;
        const age = Math.max(0, nowMs - t);
        const w = Math.pow(0.5, age / HALF_LIFE_MS);
        if (e.type === 'MINT') bull += w;
        else if (e.type === 'SALE') bull += 1.25 * w;
        else if (e.type === 'LIST') bear += 0.75 * w;
        /* XFER — neutral, ignored */
    }
    const volume = bull + bear;
    if (volume < QUIET_FLOOR) return IDX.neutral;
    const r = (bull - bear) / volume;
    if (r >= 0.75) return IDX.strongBull;
    if (r >= 0.35) return IDX.bull;
    if (r >= 0.1) return IDX.leanBull;
    if (r > -0.1) return IDX.neutral;
    if (r > -0.35) return IDX.leanBear;
    if (r > -0.75) return IDX.bear;
    return volume >= CAPITULATION_FLOOR ? IDX.capitulation : IDX.strongBear;
}

let _idx: number = IDX.neutral;
let _timer: ReturnType<typeof setTimeout> | null = null;
let _inflight = false;
const _subscribers = new Set<() => void>();

function _emit(): void {
    _subscribers.forEach((fn) => {
        try { fn(); } catch { /* subscriber error must not break the loop */ }
    });
}

function _refresh(): void {
    if (_inflight) return;
    _inflight = true;
    fetch(`/api/feed?limit=${FEED_LIMIT}`, { cache: 'no-store' })
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { events?: EventRow[] } | null) => {
            if (!Array.isArray(d?.events)) return;
            const next = scoreSentiment(d!.events, Date.now());
            if (next !== _idx) {
                _idx = next;
                _emit();
            }
        })
        .catch(() => { /* keep last good state */ })
        .finally(() => { _inflight = false; });
}

function _tick(): void {
    if (typeof document === 'undefined' || !document.hidden) _refresh();
    _timer = setTimeout(_tick, REFRESH_MS);
}

/* Stop the refresh cycle entirely on hide, re-arm the moment the tab
   returns — zero wakeups in backgrounded PD tabs (perf batch 2026-06-10,
   same guard the random-cycle engine carried). */
function _onVisibility(): void {
    if (_subscribers.size === 0) return;
    if (document.hidden) {
        if (_timer) {
            clearTimeout(_timer);
            _timer = null;
        }
    } else if (!_timer) {
        _refresh();
        _timer = setTimeout(_tick, REFRESH_MS);
    }
}

function _onProjectRefresh(): void {
    if (_subscribers.size === 0) return;
    if (typeof document === 'undefined' || !document.hidden) _refresh();
}

function _start(): void {
    if (_timer) return;
    _refresh();
    _timer = setTimeout(_tick, REFRESH_MS);
    if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', _onVisibility);
    }
    if (typeof window !== 'undefined') {
        window.addEventListener('pd:project-refresh', _onProjectRefresh);
    }
}

function _stop(): void {
    if (_timer) {
        clearTimeout(_timer);
        _timer = null;
    }
    if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', _onVisibility);
    }
    if (typeof window !== 'undefined') {
        window.removeEventListener('pd:project-refresh', _onProjectRefresh);
    }
}

/**
 * Get the current sentiment state. Stable between data refreshes.
 */
export function getSentimentState(): SentimentState {
    return SENTIMENT_STATES[_idx];
}

/**
 * Subscribe to sentiment state changes. Returns an unsubscribe fn.
 * Engine auto-starts on first subscriber, auto-stops on last.
 */
export function subscribeSentiment(fn: () => void): () => void {
    _subscribers.add(fn);
    if (_subscribers.size === 1) _start();
    return () => {
        _subscribers.delete(fn);
        if (_subscribers.size === 0) _stop();
    };
}
