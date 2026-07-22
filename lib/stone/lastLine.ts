'use client';

/*
 * lib/stone/lastLine.ts — the Command Stone's LAST BUBBLE memory (Brendon,
 * 2026-07-22): tap the page to tuck the stone away, and the next time you tap
 * it back open the SAME speech bubble returns. Account-backed so it survives a
 * reload and follows the viewer across devices — mirrors stoneStyle's pattern
 * exactly (localStorage cache `pd_stone_last_line` + the settings envelope).
 *
 * The stored value is just the typed LINE; the bubble deterministically
 * re-derives from it (search / widget / etch), so nothing else needs saving.
 */

import { pushSettingsDebounced, STATE_CACHE_KEYS } from '../state/userState';

const LS_KEY = STATE_CACHE_KEYS.stoneLastLine;
const MAX = 120;

/** The last bubble line, or '' if none. */
export function readLastLine(): string {
    if (typeof window === 'undefined') return '';
    try {
        return (window.localStorage.getItem(LS_KEY) ?? '').slice(0, MAX);
    } catch {
        return '';
    }
}

/** Remember (or clear) the current bubble line — device cache now, account soon. */
export function writeLastLine(line: string): void {
    const v = line.trim().slice(0, MAX);
    try {
        if (v) window.localStorage.setItem(LS_KEY, v);
        else window.localStorage.removeItem(LS_KEY);
    } catch { /* private mode — session-only is fine */ }
    pushSettingsDebounced({ stoneLastLine: v || null });
}
