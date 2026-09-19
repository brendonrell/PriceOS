'use client';

/*
 * marketPulseStore — Market Pulse Colorway on/off, persisted.
 *
 * Same shape as lib/pins/breadcrumbStore's recording switch: a module-level
 * boolean mirrored to localStorage (`pd_market_pulse`) for instant reads, and
 * write-through to the account via pushSettings({ marketPulse }) so the pick
 * follows the viewer across sessions/devices. Default OFF — the marketplace
 * title's single-tap Easter egg turns it on.
 *
 * Re-reads on USERSTATE_HYDRATED_EVENT so a login on another device restores
 * the choice live (userState.hydrateFromRow already mirrors the server value
 * into the same localStorage key before firing that event).
 */

import { pushSettings, STATE_CACHE_KEYS, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const KEY = STATE_CACHE_KEYS.marketPulse;

let enabled = false;
let loaded = false;
const listeners = new Set<() => void>();

function load(): void {
    if (loaded || typeof window === 'undefined') return;
    loaded = true;
    try { enabled = window.localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        let next = false;
        try { next = window.localStorage.getItem(KEY) === '1'; } catch { /* ignore */ }
        if (next !== enabled) {
            enabled = next;
            listeners.forEach((l) => l());
        }
    });
}

export function isMarketPulseEnabled(): boolean {
    load();
    return enabled;
}

/** Flip the toggle — discrete user choice, write through immediately. */
export function setMarketPulseEnabled(on: boolean): void {
    load();
    enabled = on;
    try {
        if (typeof window !== 'undefined') window.localStorage.setItem(KEY, on ? '1' : '0');
    } catch { /* ignore */ }
    pushSettings({ marketPulse: on });
    listeners.forEach((l) => l());
}

/** Subscribe to toggle changes (local flips + cross-device hydration). */
export function subscribeMarketPulse(fn: () => void): () => void {
    load();
    listeners.add(fn);
    return () => listeners.delete(fn);
}
