'use client';

/*
 * profilePresets — Profile customization SAVE SLOTS (Brendon, 2026-09-02:
 * "I want profile presets too, same UI as grid presets").
 *
 * Up to 3 numbered, FIXED-INDEX slots — a snapshot of the whole look
 * (colorway + tag paint + logo + name font). Unlike Grid Presets there is no
 * separate SAVE button: tapping an EMPTY slot captures the current look into
 * it directly; tapping a FILLED slot re-applies that exact look. There is no
 * name either — each pill wears its own saved colours (bg = colorway, text =
 * tag paint) so it reads at a glance without a label (Brendon: "that way you
 * can know which one it is without naming it").
 *
 * Persistence rides the settings envelope like Ambient Presets / Grid
 * Presets (device cache + account so a saved look follows the account to any
 * device). Slots are a fixed-length-3 array with null gaps so a slot's index
 * (and therefore its position in the row) never shifts when a sibling slot
 * is cleared.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS, pushSettings, USERSTATE_HYDRATED_EVENT } from '../state/userState';

export const MAX_PROFILE_PRESETS = 3;
export const PROFILE_PRESET_GLYPHS = ['①', '②', '③'] as const;

export interface ProfilePresetSlot {
    id: string;
    created_at: number;
    hex: string;
    tagPaint: string;
    logoId: string | null;
    fontId: string | null;
}

export type ProfilePresetSlots = ReadonlyArray<ProfilePresetSlot | null>;

export interface ProfilePresetSnapshot {
    hex: string;
    tagPaint: string;
    logoId: string | null;
    fontId: string | null;
}

const KEY = STATE_CACHE_KEYS.profilePresets;
const EVT = 'pd:profile-presets-changed';
const HEX_RE = /^#[0-9A-F]{6}$/i;

function emptySlots(): (ProfilePresetSlot | null)[] {
    return [null, null, null];
}

function read(): (ProfilePresetSlot | null)[] {
    if (typeof window === 'undefined') return emptySlots();
    try {
        const raw = window.localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return emptySlots();
        const out = emptySlots();
        arr.slice(0, MAX_PROFILE_PRESETS).forEach((v: unknown, i: number) => {
            if (!v || typeof v !== 'object') return;
            const p = v as Partial<ProfilePresetSlot>;
            if (typeof p.id !== 'string' || !p.id) return;
            if (typeof p.hex !== 'string' || !HEX_RE.test(p.hex)) return;
            if (typeof p.tagPaint !== 'string' || !HEX_RE.test(p.tagPaint)) return;
            out[i] = {
                id: p.id,
                created_at: typeof p.created_at === 'number' ? p.created_at : Date.now(),
                hex: p.hex.toUpperCase(),
                tagPaint: p.tagPaint.toUpperCase(),
                logoId: typeof p.logoId === 'string' ? p.logoId : null,
                fontId: typeof p.fontId === 'string' ? p.fontId : null,
            };
        });
        return out;
    } catch {
        return emptySlots();
    }
}

function write(slots: (ProfilePresetSlot | null)[]) {
    try { window.localStorage.setItem(KEY, JSON.stringify(slots)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushSettings({ profilePresets: slots });
}

export function getProfilePresets(): ProfilePresetSlots {
    return read();
}

/** Save the current look into slot `index` (0–2), overwriting whatever was
 *  there. Callers only ever call this on an EMPTY slot — a filled slot loads
 *  instead of saving (see the row's onClick in ProfilePageBody). */
export function saveProfilePreset(index: number, snap: ProfilePresetSnapshot): ProfilePresetSlots {
    const list = read();
    if (index < 0 || index >= MAX_PROFILE_PRESETS) return list;
    if (!HEX_RE.test(snap.hex) || !HEX_RE.test(snap.tagPaint)) return list;
    list[index] = {
        id: `pp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        created_at: Date.now(),
        hex: snap.hex.toUpperCase(),
        tagPaint: snap.tagPaint.toUpperCase(),
        logoId: snap.logoId,
        fontId: snap.fontId,
    };
    write(list);
    return list;
}

export function deleteProfilePreset(index: number): ProfilePresetSlots {
    const list = read();
    if (index < 0 || index >= MAX_PROFILE_PRESETS) return list;
    list[index] = null;
    write(list);
    return list;
}

/** Live slots for the presets row. */
export function useProfilePresets(): ProfilePresetSlots {
    const [v, setV] = useState<(ProfilePresetSlot | null)[]>(emptySlots());
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
