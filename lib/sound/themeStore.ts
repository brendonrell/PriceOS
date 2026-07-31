'use client';

/*
 * themeStore — the ONE flag for PD theme music (Brendon, 2026-07-31).
 *
 * localStorage 'pd_theme_on', DEFAULT OFF (Rule #-0.4: nothing is
 * default-on). Same idiom as soundStore: read/write helpers plus a
 * 'pd:theme-changed' event so the sound key restamps.
 *
 * The door, confirmed before the build: LONG-PRESS the sound key to turn it
 * on, LONG-PRESS again to turn it off. That is the only way in and the only
 * way out — a plain tap still toggles the blips, untouched.
 */

import { pushSettings } from '../state/userState';

const THEME_KEY = 'pd_theme_on';

export function readThemeOn(): boolean {
    try {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(THEME_KEY) === '1';
    } catch {
        return false;
    }
}

export function writeThemeOn(on: boolean): void {
    try {
        if (typeof window !== 'undefined') {
            if (on) window.localStorage.setItem(THEME_KEY, '1');
            else window.localStorage.removeItem(THEME_KEY);
        }
    } catch { /* swallow */ }
    pushSettings({ themeMusic: on });
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pd:theme-changed', { detail: { on } }));
    }
}
