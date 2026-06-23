'use client';

/*
 * placements — the profile owner's HAND-PLACED sticker arrangement.
 *
 * Long-pressing a sticker on your own profile lifts it; dragging drops it at a
 * spot you choose. That spot is saved here as a percentage of the hero sticker
 * area (x,y in 0–100) plus a stacking order z (last-touched sits on top, so the
 * pile layers naturally). Placements STICK — they persist and follow the user.
 *
 * The ✕ removes a sticker from THIS arrangement only. Because the hero is
 * GENERATIVE, that removal is scoped to the current roll (a signature of the
 * arrangement settings + shuffle seed): re-rolling — Shuffle or any layout
 * setting change — starts a fresh arrangement, so an X'd sticker can come back.
 * It never touches the Settings "turn it off" switch or ownership.
 *
 * Persistence rides the same account blob as ownership (sticker_state), so a
 * customised profile follows the user across devices. No new table.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS } from '../state/userState';
import { pushStickerState } from './owned';

export interface Placement { x: number; y: number; z: number; }
export type PlacementMap = Record<string, Placement>;
/** ✕-removed ids, scoped to the arrangement signature they were removed from. */
export interface CompOff { sig: string; ids: string[]; }

const PLACE_KEY = STATE_CACHE_KEYS.stickerPlacements;
const COMP_OFF_KEY = STATE_CACHE_KEYS.stickerCompOff;
const EVT = 'pd:stickers-changed';

function readMap(): PlacementMap {
    if (typeof window === 'undefined') return {};
    try {
        const raw = window.localStorage.getItem(PLACE_KEY);
        const obj = raw ? JSON.parse(raw) : {};
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
        const out: PlacementMap = {};
        for (const [id, p] of Object.entries(obj as Record<string, unknown>)) {
            if (p && typeof p === 'object') {
                const { x, y, z } = p as Record<string, unknown>;
                if (typeof x === 'number' && typeof y === 'number') {
                    out[id] = { x, y, z: typeof z === 'number' ? z : 0 };
                }
            }
        }
        return out;
    } catch {
        return {};
    }
}

function readCompOff(): CompOff {
    if (typeof window === 'undefined') return { sig: '', ids: [] };
    try {
        const raw = window.localStorage.getItem(COMP_OFF_KEY);
        const obj = raw ? JSON.parse(raw) : null;
        if (obj && typeof obj === 'object' && typeof obj.sig === 'string' && Array.isArray(obj.ids)) {
            return { sig: obj.sig, ids: obj.ids.filter((x: unknown): x is string => typeof x === 'string') };
        }
        return { sig: '', ids: [] };
    } catch {
        return { sig: '', ids: [] };
    }
}

function writeMap(map: PlacementMap) {
    try { window.localStorage.setItem(PLACE_KEY, JSON.stringify(map)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushStickerState();
}
function writeCompOff(v: CompOff) {
    try { window.localStorage.setItem(COMP_OFF_KEY, JSON.stringify(v)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushStickerState();
}

export function getPlacements(): PlacementMap { return readMap(); }
export function getCompOff(): CompOff { return readCompOff(); }

/** Highest stacking order currently in use (0 when none placed). */
function topZ(map: PlacementMap): number {
    let z = 0;
    for (const p of Object.values(map)) if (p.z > z) z = p.z;
    return z;
}

/** Save a sticker at a spot, bumping it to the top of the pile. */
export function placeSticker(id: string, x: number, y: number) {
    const map = readMap();
    const z = topZ(map) + 1;
    map[id] = { x, y, z };
    writeMap(map);
}

/** Move an already-placed sticker without changing its stacking order — used
 *  while dragging so the live position tracks the finger. */
export function moveSticker(id: string, x: number, y: number) {
    const map = readMap();
    const prev = map[id];
    map[id] = { x, y, z: prev ? prev.z : topZ(map) + 1 };
    writeMap(map);
}

/** Bring a placed sticker to the front of the pile (last-touched on top). */
export function raiseSticker(id: string) {
    const map = readMap();
    if (!map[id]) return;
    map[id] = { ...map[id]!, z: topZ(map) + 1 };
    writeMap(map);
}

/** Remove a sticker from THIS arrangement only (scoped to the current roll's
 *  signature). A reroll changes the signature, so the removal lapses and the
 *  sticker can reappear. Never touches settings/ownership. */
export function removeFromComposition(id: string, sig: string) {
    const map = readMap();
    if (map[id]) { delete map[id]; writeMap(map); }
    const off = readCompOff();
    if (off.sig === sig) {
        if (!off.ids.includes(id)) writeCompOff({ sig, ids: [...off.ids, id] });
    } else {
        writeCompOff({ sig, ids: [id] });
    }
}

export interface PlacementState { placements: PlacementMap; compOff: CompOff; }

export function usePlacements(): PlacementState {
    const [v, setV] = useState<{ placements: PlacementMap; compOff: CompOff }>({ placements: {}, compOff: { sig: '', ids: [] } });
    useEffect(() => {
        const sync = () => setV({ placements: readMap(), compOff: readCompOff() });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => ({ placements: v.placements, compOff: v.compOff }), [v]);
}
