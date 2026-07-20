'use client';

/*
 * soundStore — the ONE flag for the PD sound layer (Brendon, 2026-07-20).
 *
 * localStorage 'pd_sound_on', DEFAULT OFF (Rule #-0.4: nothing is
 * default-on). The anchorStore idiom: read/write helpers + a
 * 'pd:sound-changed' event so the dots-row key restamps. Fresh key on
 * purpose — never reuse an old flag (the miniplayer stale-state lesson).
 */

const SOUND_KEY = 'pd_sound_on';

export function readSoundOn(): boolean {
    try {
        if (typeof window === 'undefined') return false;
        return window.localStorage.getItem(SOUND_KEY) === '1';
    } catch {
        return false;
    }
}

export function writeSoundOn(on: boolean): void {
    try {
        if (typeof window !== 'undefined') {
            if (on) window.localStorage.setItem(SOUND_KEY, '1');
            else window.localStorage.removeItem(SOUND_KEY);
        }
    } catch { /* swallow */ }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('pd:sound-changed', { detail: { on } }));
    }
}
