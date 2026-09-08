'use client';

/*
 * profileDailySaved — the "Daily" preset mode's standing 24h reroll
 * (Brendon, 2026-09-08: "add a mode that randomly picks one of your saved
 * every day"). Unlike Generative (which synthesizes a fresh look from the
 * roll formulas), Daily picks uniformly at random among the profile's OWN
 * filled Preset save slots — a rotation through looks the owner actually
 * chose and saved, not a novel generated one.
 *
 * Persistence rides the settings envelope (device cache + account), the same
 * { enabled, lastRolledAt } shape as profileGenerative.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS, pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';

export const DAILY_SAVED_REROLL_MS = 24 * 60 * 60 * 1000;

export interface ProfileDailySavedState {
    enabled: boolean;
    /** epoch ms of the last automatic (or enabling) pick. */
    lastRolledAt: number;
}

const DEFAULT_STATE: ProfileDailySavedState = { enabled: false, lastRolledAt: 0 };
const KEY = STATE_CACHE_KEYS.profileDailySaved;
const EVT = 'pd:profile-daily-saved-changed';

function read(): ProfileDailySavedState {
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

function write(state: ProfileDailySavedState) {
    try { window.localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushSettings({ profileDailySaved: state });
}

export function getProfileDailySaved(): ProfileDailySavedState {
    return read();
}

/** Flip the standing toggle. Turning ON stamps `lastRolledAt` to now — the
 *  caller performs an immediate pick too (see the pill's onClick), so "on"
 *  always means a fresh pick, not a stale one waiting out a window it was
 *  never part of. */
export function setProfileDailySavedEnabled(on: boolean): ProfileDailySavedState {
    const state: ProfileDailySavedState = {
        enabled: on,
        lastRolledAt: on ? Date.now() : read().lastRolledAt,
    };
    write(state);
    return state;
}

/** Stamp a fresh pick without touching the enabled flag — used by both the
 *  24h auto-reroll effect and a manual Roll tap while Daily is active. */
export function stampProfileDailySavedRoll(): ProfileDailySavedState {
    const state: ProfileDailySavedState = { enabled: true, lastRolledAt: Date.now() };
    write(state);
    return state;
}

export function useProfileDailySaved(): ProfileDailySavedState {
    const [v, setV] = useState<ProfileDailySavedState>(DEFAULT_STATE);
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
