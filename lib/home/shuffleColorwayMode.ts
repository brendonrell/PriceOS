'use client';

/*
 * shuffleColorwayMode — Home's Shuffle tab "colorway mode" (Brendon,
 * 2026-09-02). Long-press the Shuffle pill to toggle: ON makes each
 * shuffled project's own colorway paint the whole page (Mood Ring style,
 * see lib/state/ColorwayContext's setShuffleColorwayHex) for as long as
 * you're on the Shuffle tab. Navigate away and it reverts to the Mood Ring
 * immediately; come back to Shuffle without a fresh long-press and it's
 * still on. Only another long-press turns it off.
 *
 * ACCOUNT-ONLY persistence (Brendon: "All of it db not localstorage") — no
 * localStorage mirror, unlike every other toggle in the app. The flag rides
 * the settings envelope (`users.settings.homeShuffleColorway`) only, read
 * back purely from the in-memory server snapshot via getSettingsSnapshot().
 * Signed-out / not-yet-hydrated reads default OFF; writes before hydration
 * are no-ops via pushSettings' own guard.
 */

import { useEffect, useState } from 'react';
import { getSettingsSnapshot, isUserStateHydrated, pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';

const EVT = 'pd:home-shuffle-colorway-mode-changed';

let enabled = isUserStateHydrated() ? !!getSettingsSnapshot().homeShuffleColorway : false;

function emit() {
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent(EVT));
    }
}

if (typeof window !== 'undefined') {
    window.addEventListener(USERSTATE_HYDRATED_EVENT, () => {
        enabled = !!getSettingsSnapshot().homeShuffleColorway;
        emit();
    });
}

export function getShuffleColorwayModeEnabled(): boolean {
    return enabled;
}

export function setShuffleColorwayModeEnabled(on: boolean): void {
    enabled = on;
    pushSettings({ homeShuffleColorway: on });
    emit();
}

export function useShuffleColorwayMode(): boolean {
    const [v, setV] = useState(enabled);
    useEffect(() => {
        const sync = () => setV(enabled);
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener(USERSTATE_HYDRATED_EVENT, sync);
        return () => {
            window.removeEventListener(EVT, sync);
            window.removeEventListener(USERSTATE_HYDRATED_EVENT, sync);
        };
    }, []);
    return v;
}
