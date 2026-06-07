'use client';

/*
 * sentimentEngine — Batch I / F65 / BUG-29
 *
 * Sim port of the Sentiment Weather state machine at sim.html
 * 12238–12291. Module singleton — owns the 7-state cycle that drives
 * the cloud/sun glyph in PeteyLogo's #sentimentWidget.
 *
 * Subscriber model: components subscribe via subscribeSentiment().
 * Engine starts on first subscriber, stops on last. PeteyLogo is the
 * sole consumer in v0; further consumers (toolbar weather pill, etc.)
 * just subscribe the same way.
 *
 * Tick cadence verbatim from sim 12261–12277:
 *   - first swap: 1000ms after start so the user sees motion
 *   - subsequent: 3000–6000ms (3000 + Math.random()*3000)
 *   - if document.hidden when a tick fires: reschedule with 3000ms,
 *     no state change (sim 12265 — in-tick check, NOT a separate
 *     visibilitychange listener; matches sim verbatim)
 *   - 75% chance per tick to pick a different state (sim 12268-12274)
 *
 * Initial index is randomized at module load (sim 12250). Different
 * tabs / different PeteyLogo mounts therefore start on different
 * states — fine, sim does the same.
 *
 * Body class `sentiment-on` is independent of this engine — driven by
 * useBodyClass + prehydration script reading notifs.sentimentOn. The
 * engine only owns the rotating state; visibility is the consumer's
 * concern.
 */

export interface SentimentState {
    icon: string;
    label: string;
    tip: string;
}

/* sim 12239–12247 verbatim. Order matters — preserved exactly.
 * S5 changes: Bear → ⛈ U+26C8 (Thunder Cloud and Rain, broader support);
 * Neutral ☽ U+263D (First Quarter Moon) added as 8th state. */
export const SENTIMENT_STATES: readonly SentimentState[] = [
    { icon: '\u263C\uFE0E', label: 'Strong Bull',  tip: 'Taker momentum: Strong Bull \u263C' },
    { icon: '\u2600\uFE0E', label: 'Bull',         tip: 'Taker momentum: Bull \u2600' },
    { icon: '\u26C5\uFE0E', label: 'Lean Bull',    tip: 'Taker momentum: Lean Bull \u26C5' },
    { icon: '\u2601\uFE0E', label: 'Lean Bear',    tip: 'Taker momentum: Lean Bear \u2601' },
    { icon: '\u26C8\uFE0E', label: 'Bear',         tip: 'Taker momentum: Bear \u26C8' },
    { icon: '\u2602\uFE0E', label: 'Strong Bear',  tip: 'Taker momentum: Strong Bear \u2602' },
    { icon: '\u2608\uFE0E', label: 'Capitulation', tip: 'Taker momentum: Capitulation \u2608' },
    { icon: '\u263D\uFE0E', label: 'Neutral',      tip: 'Taker momentum: Neutral \u263D' },
];

let _idx = Math.floor(Math.random() * SENTIMENT_STATES.length);
let _timer: ReturnType<typeof setTimeout> | null = null;
const _subscribers = new Set<() => void>();

function _emit(): void {
    _subscribers.forEach((fn) => {
        try { fn(); } catch { /* subscriber error must not break the loop */ }
    });
}

function _tick(): void {
    /* sim 12265 — when hidden, sleep 3s and re-check, no state change */
    if (typeof document !== 'undefined' && document.hidden) {
        _timer = setTimeout(_tick, 3000);
        return;
    }
    /* sim 12268-12274 — 75% chance per tick to swap to a different state */
    if (Math.random() < 0.75) {
        let next: number;
        do {
            next = Math.floor(Math.random() * SENTIMENT_STATES.length);
        } while (next === _idx);
        _idx = next;
        _emit();
    }
    _timer = setTimeout(_tick, 3000 + Math.random() * 3000);
}

function _start(): void {
    if (_timer) return;
    /* sim 12277 — first swap after 1s so the user sees it change */
    _timer = setTimeout(_tick, 1000);
}

function _stop(): void {
    if (_timer) {
        clearTimeout(_timer);
        _timer = null;
    }
}

/**
 * Get the current sentiment state. Stable between ticks.
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
