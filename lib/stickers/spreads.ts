'use client';

/*
 * spreads — SAVED, NAMED STICKER ARRANGEMENTS for the profile hero (Brendon,
 * 2026-07-24).
 *
 * ⛔ THE NAME IS LOCKED: **Spreads**. Not "Scenes" (ambient light owns Scenes)
 * and not "Layouts" (the sticker system already uses Layout for the generative
 * auto-arrangers). A spread is what a sticker collection is laid out on.
 *
 * Both halves of this already existed and only needed joining (Rule #0 — reuse,
 * never reinvent): lib/stickers/placements holds the LOCKED composition (every
 * sticker's spot, layer, rotation, scale, and the area's aspect at lock time),
 * and the Grid View Presets in lib/pins/presetStore are the proven
 * save-a-named-state pattern. A Spread is one snapshot of the WHOLE picture —
 * the hand-placed spots AND the generative look with its exact roll — so it
 * restores what you were looking at whether you arranged the hero by hand or
 * shuffled your way to it. Restoring is total: what you saved is what comes
 * back, for you and for every visitor.
 *
 * Persistence rides `sticker_state` exactly like placements do — no new table,
 * and a spread follows the account to any device.
 *
 * THREE SLOTS, matching the gallery's saved views. A fourth save replaces the
 * oldest, which is the same bargain the gallery already makes.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS } from '../state/userState';
import { pushStickerState } from './owned';
import {
    getPlacements, getPlaceAspect, setComposition, clearPlacements,
    type PlacementMap,
} from './placements';
import {
    getArrange, getTilt, getExpand, getRows, getAlign, getFlip, getDensity, getBorder, getSeed,
    setArrange, setTilt, setExpand, setRows, setAlign, setFlip, setDensity, setBorder, setSeed,
    ARRANGES,
} from './heroPrefs';
import type { StickerLook } from './setupCode';

export const MAX_SPREADS = 3;
/** Long enough to be descriptive, short enough that three pills fit the row. */
export const SPREAD_NAME_MAX = 18;

export interface Spread {
    id: string;
    name: string;
    created_at: number;
    /** The locked composition, if there was one. Empty = it was generative. */
    placements: PlacementMap;
    aspect: number | null;
    look: StickerLook;
}

const KEY = STATE_CACHE_KEYS.stickerSpreads;
const EVT = 'pd:stickers-changed';

function read(): Spread[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(KEY);
        const arr = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(arr)) return [];
        const out: Spread[] = [];
        for (const v of arr) {
            if (!v || typeof v !== 'object') continue;
            const s = v as Partial<Spread>;
            if (typeof s.id !== 'string' || !s.id) continue;
            const name = typeof s.name === 'string' ? s.name.trim().slice(0, SPREAD_NAME_MAX) : '';
            if (!name || !s.look || typeof s.look !== 'object') continue;
            out.push({
                id: s.id,
                name,
                created_at: typeof s.created_at === 'number' ? s.created_at : Date.now(),
                placements: (s.placements && typeof s.placements === 'object' && !Array.isArray(s.placements))
                    ? s.placements as PlacementMap : {},
                aspect: typeof s.aspect === 'number' && s.aspect > 0 ? s.aspect : null,
                look: s.look as StickerLook,
            });
        }
        return out.slice(0, MAX_SPREADS);
    } catch {
        return [];
    }
}

function write(list: Spread[]) {
    try { window.localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    /* Forced past the manager's draft hold — a Spread has its own SAVE, so it
       commits the moment you press it (Brendon, 2026-07-27). */
    pushStickerState(true);
}

export function getSpreads(): Spread[] { return read(); }

/** The look the hero is wearing right now — the generative half of a Spread. */
export function currentLook(): StickerLook {
    return {
        arrange: getArrange(), rows: getRows(), align: getAlign(), tilt: getTilt(),
        expand: getExpand(), flip: getFlip(), density: getDensity(), border: getBorder(),
        seed: getSeed(),
    };
}

/** A readable default name: what it is, and whether you placed it by hand. */
export function deriveName(look: StickerLook, placed: boolean): string {
    const label = ARRANGES.find((a) => a.id === look.arrange)?.label ?? String(look.arrange).toUpperCase();
    return `${label}${placed ? ' · PLACED' : ''}`.slice(0, SPREAD_NAME_MAX);
}

export type SaveResult = { spread: Spread; replaced: boolean };

/** Snapshot the hero exactly as it stands. A fourth save drops the oldest. */
export function saveSpread(name?: string): SaveResult {
    const placements = getPlacements();
    const look = currentLook();
    const spread: Spread = {
        id: `spr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
        name: (name?.trim().slice(0, SPREAD_NAME_MAX)) || deriveName(look, Object.keys(placements).length > 0),
        created_at: Date.now(),
        placements,
        aspect: getPlaceAspect(),
        look,
    };
    const list = read();
    const replaced = list.length >= MAX_SPREADS;
    const next = replaced ? [...list.slice(1), spread] : [...list, spread];
    write(next);
    return { spread, replaced };
}

export function renameSpread(id: string, raw: string): boolean {
    const name = raw.trim().slice(0, SPREAD_NAME_MAX);
    if (!name) return false;
    const list = read();
    const i = list.findIndex((s) => s.id === id);
    if (i < 0) return false;
    list[i] = { ...list[i]!, name };
    write(list);
    return true;
}

export function deleteSpread(id: string): boolean {
    const list = read();
    const next = list.filter((s) => s.id !== id);
    if (next.length === list.length) return false;
    write(next);
    return true;
}

/**
 * Put a Spread back on the hero. The look lands first (each setting clears any
 * locked composition on its way through, exactly as picking it by hand does),
 * and the saved composition goes back down afterwards — so a hand-placed
 * arrangement is restored spot-for-spot instead of being re-rolled underneath.
 */
export function applySpread(s: Spread) {
    const l = s.look;
    setArrange(l.arrange); setRows(l.rows); setAlign(l.align); setTilt(l.tilt);
    setExpand(l.expand); setFlip(l.flip); setDensity(l.density); setBorder(l.border);
    if (l.seed !== undefined) setSeed(l.seed);
    const ids = Object.keys(s.placements);
    if (ids.length > 0) setComposition(s.placements, s.aspect ?? 1);
    else clearPlacements();
}

/** Live list for the manager. */
export function useSpreads(): Spread[] {
    const [v, setV] = useState<Spread[]>([]);
    useEffect(() => {
        const sync = () => setV(read());
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => v, [v]);
}
