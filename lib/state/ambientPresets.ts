'use client';

/*
 * Ambient Light PRESETS — the user's saved, named looks for the LED bar
 * (Brendon, 2026-07-27: "we have ambient light setup codes but not presets
 * yet, similar to our sticker 'spreads'").
 *
 * The sticker Spreads pattern, ported verbatim (Rule #0 — reuse, never
 * reinvent): SAVE snapshots the WHOLE current options blob — colour, pattern,
 * speed, dim, the atmosphere set, light FX, realism source, even the sphere
 * egg — into one of THREE numbered, nameable slots; tapping a slot puts that
 * exact look back on the bar. A fourth save replaces the oldest, the same
 * bargain Spreads and the gallery's saved views already make.
 *
 * Naming: the curated one-tap bundles are SCENES (that name is taken — see
 * lib/stickers/spreads.ts's name lock); these user-saved ones are PRESETS.
 *
 * Persistence rides the settings envelope like the ambient options themselves
 * (device cache + account), so presets follow the account to any device.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS, pushSettings, USERSTATE_HYDRATED_EVENT } from './userState';
import type { AmbientOpts } from './AmbientCode';

export const MAX_AMBIENT_PRESETS = 3;
/** Same bound as Spreads — descriptive, but three pills still fit the row. */
export const AMBIENT_PRESET_NAME_MAX = 18;

export interface AmbientPreset {
    id: string;
    name: string;
    created_at: number;
    /** The full options snapshot, exactly as the bar wore it at save time. */
    opts: Partial<AmbientOpts>;
}

const KEY = STATE_CACHE_KEYS.ambientPresets;
const EVT = 'pd:ambient-presets-changed';

function read(): AmbientPreset[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        const out: AmbientPreset[] = [];
        for (const v of arr) {
            if (!v || typeof v !== 'object') continue;
            const p = v as Partial<AmbientPreset>;
            if (typeof p.id !== 'string' || !p.id) continue;
            const name = typeof p.name === 'string' ? p.name.trim().slice(0, AMBIENT_PRESET_NAME_MAX) : '';
            if (!name || !p.opts || typeof p.opts !== 'object' || Array.isArray(p.opts)) continue;
            out.push({
                id: p.id,
                name,
                created_at: typeof p.created_at === 'number' ? p.created_at : Date.now(),
                opts: p.opts as Partial<AmbientOpts>,
            });
        }
        return out.slice(0, MAX_AMBIENT_PRESETS);
    } catch {
        return [];
    }
}

function write(list: AmbientPreset[]) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushSettings({ ambientPresets: list });
}

export function getAmbientPresets(): AmbientPreset[] { return read(); }

/** A readable default name off the look itself: "AURORA · WAVE". */
export function deriveAmbientPresetName(opts: Partial<AmbientOpts>): string {
    const pal = String(opts.palette ?? 'aurora').toUpperCase();
    const pat = String(opts.pattern ?? 'wave').toUpperCase();
    return `${pal} · ${pat}`.slice(0, AMBIENT_PRESET_NAME_MAX);
}

export type AmbientPresetSaveResult = { preset: AmbientPreset; replaced: boolean };

/** Snapshot the bar exactly as it stands. A fourth save drops the oldest. */
export function saveAmbientPreset(opts: AmbientOpts, name?: string): AmbientPresetSaveResult {
    const preset: AmbientPreset = {
        id: `amp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: (name?.trim().slice(0, AMBIENT_PRESET_NAME_MAX)) || deriveAmbientPresetName(opts),
        created_at: Date.now(),
        opts: { ...opts },
    };
    const list = read();
    const replaced = list.length >= MAX_AMBIENT_PRESETS;
    const next = replaced ? [...list.slice(1), preset] : [...list, preset];
    write(next);
    return { preset, replaced };
}

export function renameAmbientPreset(id: string, raw: string): boolean {
    const name = raw.trim().slice(0, AMBIENT_PRESET_NAME_MAX);
    if (!name) return false;
    const list = read();
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return false;
    list[i] = { ...list[i]!, name };
    write(list);
    return true;
}

export function deleteAmbientPreset(id: string): boolean {
    const list = read();
    const next = list.filter((p) => p.id !== id);
    if (next.length === list.length) return false;
    write(next);
    return true;
}

/** Live list for the popup. */
export function useAmbientPresets(): AmbientPreset[] {
    const [v, setV] = useState<AmbientPreset[]>([]);
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
