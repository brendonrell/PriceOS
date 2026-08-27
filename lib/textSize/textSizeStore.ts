'use client';

/*
 * textSizeStore — the ONE flag for the site-wide text size (Brendon,
 * 2026-08-26). Same idiom as soundStore: localStorage 'pd_text_size',
 * read/write helpers + a 'pd:text-size-changed' event so any mounted
 * surface (the Aa key itself, the <body> class) restamps.
 *
 * Three steps only — S / M / L. DEFAULT M (the site's existing size,
 * unlike sound which defaults off — text size isn't an opt-in feature,
 * it's a starting point you can nudge either way).
 */

import { pushSettings } from '../state/userState';

const TEXT_SIZE_KEY = 'pd_text_size';

export type TextSize = 'S' | 'M' | 'L';

const ORDER: TextSize[] = ['S', 'M', 'L'];

export function readTextSize(): TextSize {
    try {
        if (typeof window === 'undefined') return 'M';
        const v = window.localStorage.getItem(TEXT_SIZE_KEY);
        return v === 'S' || v === 'M' || v === 'L' ? v : 'M';
    } catch {
        return 'M';
    }
}

export function writeTextSize(size: TextSize): void {
    try {
        if (typeof window !== 'undefined') {
            window.localStorage.setItem(TEXT_SIZE_KEY, size);
        }
    } catch { /* swallow */ }
    // Account-backed, same bargain as sound/themeMusic — no-ops until the
    // snapshot hydrates for a signed-in user, so it stops resetting per device.
    pushSettings({ textSize: size });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pd:text-size-changed', { detail: { size } }));
    }
}

/** S → M → L → S. The Aa key's whole click handler. */
export function nextTextSize(current: TextSize): TextSize {
    return ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
}
