'use client';

/*
 * profileGenerative — the "Generative" preset mode's standing 24h reroll
 * (Brendon, 2026-09-02: "turning it on shows a new reroll every 24hrs, like
 * mood ring"). Unlike Random/Match/Accent/Pair (one-tap, one-shot via Roll),
 * Generative is a STANDING mode: once on, the profile look (colorway + tag
 * paint + logo + name font) rerolls automatically every 24h, drawing from
 * all four base roll shapes — see rollGenerativePreset() in presetRoll.ts.
 *
 * Persistence rides the settings envelope (device cache + account), the same
 * pattern as Ambient Presets: { enabled, lastRolledAt }.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS, pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';

export const GENERATIVE_REROLL_MS = 24 * 60 * 60 * 1000;

export interface ProfileGenerativeState {
    enabled: boolean;
    /** epoch ms of the last automatic (or enabling) roll. */
    lastRolledAt: number;
}

const DEFAULT_STATE: ProfileGenerativeState = { enabled: false, lastRolledAt: 0 };
const KEY = STATE_CACHE_KEYS.profileGenerative;
const EVT = 'pd:profile-generative-changed';

function read(): ProfileGenerativeState {
    if (typeof window === 'undefined') return DEFAULT_STATE;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return DEFAULT_STATE;
        const p = JSON.parse(raw);
        if (!p || typeof p !== 'object') return DEFAULT_STATE;
        return {
            enabled: !!p.enabled,
            lastRolledAt: typeof p.lastRolledAt === 'number' ? p.lastRolledAt : 0,
        };
    } catch {
        return DEFAULT_STATE;
    }
}

function write(state: ProfileGenerativeState) {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushSettings({ profileGenerative: state });
}

export function getProfileGenerative(): ProfileGenerativeState {
    return read();
}

/** Flip the standing toggle. Turning ON stamps `lastRolledAt` to now (the
 *  caller is expected to also perform an immediate roll — see the pill's
 *  onClick in ProfilePageBody — so "on" always means a fresh look, not a
 *  stale one waiting out the rest of a 24h window it was never part of). */
export function setProfileGenerativeEnabled(on: boolean): ProfileGenerativeState {
    const state: ProfileGenerativeState = {
        enabled: on,
        lastRolledAt: on ? Date.now() : read().lastRolledAt,
    };
    write(state);
    return state;
}

/** Stamp a fresh roll without touching the enabled flag — used by both the
 *  24h auto-reroll effect and a manual Roll tap while Generative is active. */
export function stampProfileGenerativeRoll(): ProfileGenerativeState {
    const state: ProfileGenerativeState = { enabled: true, lastRolledAt: Date.now() };
    write(state);
    return state;
}

export function useProfileGenerative(): ProfileGenerativeState {
    const [v, setV] = useState<ProfileGenerativeState>(DEFAULT_STATE);
    useEffect(() => {
        const sync = () => setV(read());
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        window.addEventListener(USERSTATE_HYDRATED_EVENT, sync);
        return () => {
            window.removeEventListener(EVT, sync);
            window.removeEventListener('storage', sync);
            window.removeEventListener(USERSTATE_HYDRATED_EVENT, sync);
        };
    }, []);
    return useMemo(() => v, [v]);
}
