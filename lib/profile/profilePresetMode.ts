'use client';

/*
 * profilePresetMode — remembers which Presets-row mode pill (Match / Accent /
 * Pair / Random) the owner last had selected, so closing and reopening the
 * @name customization menu comes back exactly where they left it instead of
 * resetting to "nothing picked" (Brendon, 2026-09-18: "if they were on accent
 * ... and reopen it should be where they left it").
 *
 * Persistence rides the settings envelope (device cache + account) — same
 * pattern as profileGenerative / profileDailySaved — so it follows the
 * account across devices, not just this browser.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS, pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';
import type { PresetMode } from './presetRoll';

const VALID_MODES: readonly PresetMode[] = ['random', 'match', 'accent', 'pair'];
const KEY = STATE_CACHE_KEYS.profilePresetMode;
const EVT = 'pd:profile-preset-mode-changed';

function normalize(v: unknown): PresetMode | null {
    return typeof v === 'string' && (VALID_MODES as readonly string[]).includes(v) ? (v as PresetMode) : null;
}

function read(): PresetMode | null {
    if (typeof window === 'undefined') return null;
    try {
        return normalize(window.localStorage.getItem(KEY));
    } catch {
        return null;
    }
}

function write(mode: PresetMode | null) {
    try {
        if (mode) window.localStorage.setItem(KEY, mode);
        else window.localStorage.removeItem(KEY);
    } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushSettings({ profilePresetMode: mode });
}

export function getProfilePresetMode(): PresetMode | null {
    return read();
}

export function setProfilePresetMode(mode: PresetMode | null): void {
    write(mode);
}

export function useProfilePresetMode(): [PresetMode | null, (mode: PresetMode | null) => void] {
    const [v, setV] = useState<PresetMode | null>(null);
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
    const setMode = (mode: PresetMode | null) => write(mode);
    return useMemo(() => [v, setMode] as [PresetMode | null, (mode: PresetMode | null) => void], [v]);
}
