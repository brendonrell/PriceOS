'use client';

/*
 * placements — the profile owner's LOCKED sticker composition.
 *
 * The hero starts generative (auto-arranged, Shuffle re-rolls). The moment the
 * owner drags a sticker, the WHOLE current picture is frozen into a saved
 * composition: every sticker shown, exactly where/how it sits (x,y in % of the
 * sticker area, plus z stacking, rotation r and scale sc captured from screen so
 * the locked picture matches what was generated). `aspect` is the area's
 * width÷height at lock time, so the saved %-positions scale faithfully at any
 * screen width. While a composition exists the profile is LOCKED — what the
 * owner sees is exactly what every visitor sees. Dragging moves a sticker, the
 * ✕ prunes one, last-touched sits on top. Shuffle / picking a Layout clears it
 * back to generative.
 *
 * Persistence rides the same account blob as ownership (sticker_state), so a
 * decorated profile follows the user AND ships to every visitor. No new table.
 */

import { useEffect, useMemo, useState } from 'react';
import { STATE_CACHE_KEYS } from '../state/userState';
import { pushStickerState } from './owned';

export interface Placement { x: number; y: number; z: number; r?: number; sc?: number; }
export type PlacementMap = Record<string, Placement>;

const PLACE_KEY = STATE_CACHE_KEYS.stickerPlacements;
const ASPECT_KEY = STATE_CACHE_KEYS.stickerPlaceAspect;
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
                const { x, y, z, r, sc } = p as Record<string, unknown>;
                if (typeof x === 'number' && typeof y === 'number') {
                    out[id] = {
                        x, y,
                        z: typeof z === 'number' ? z : 0,
                        ...(typeof r === 'number' ? { r } : {}),
                        ...(typeof sc === 'number' ? { sc } : {}),
                    };
                }
            }
        }
        return out;
    } catch {
        return {};
    }
}

function readAspect(): number | null {
    if (typeof window === 'undefined') return null;
    try {
        const v = parseFloat(window.localStorage.getItem(ASPECT_KEY) || '');
        return Number.isFinite(v) && v > 0 ? v : null;
    } catch {
        return null;
    }
}

function writeMap(map: PlacementMap, aspect?: number | null) {
    try {
        window.localStorage.setItem(PLACE_KEY, JSON.stringify(map));
        if (aspect != null) window.localStorage.setItem(ASPECT_KEY, String(aspect));
    } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushStickerState();
}

export function getPlacements(): PlacementMap { return readMap(); }
export function getPlaceAspect(): number | null { return readAspect(); }

/** Highest stacking order currently in use (0 when none placed). */
function topZ(map: PlacementMap): number {
    let z = 0;
    for (const p of Object.values(map)) if (p.z > z) z = p.z;
    return z;
}

/** Freeze a whole composition (the first-drag lock): the full id→spot map plus
 *  the area's aspect ratio at capture time. */
export function setComposition(map: PlacementMap, aspect: number) {
    writeMap(map, aspect);
}

/** Clear the locked composition → back to generative (Shuffle / new Layout). */
export function clearPlacements() {
    try {
        window.localStorage.removeItem(PLACE_KEY);
        window.localStorage.removeItem(ASPECT_KEY);
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushStickerState();
}

/** Move a placed sticker, preserving its look (z / rotation / scale). */
export function moveSticker(id: string, x: number, y: number) {
    const map = readMap();
    const prev = map[id];
    if (!prev) return;
    map[id] = { ...prev, x, y };
    writeMap(map);
}

/** Bring a placed sticker to the front of the pile (last-touched on top). */
export function raiseSticker(id: string) {
    const map = readMap();
    if (!map[id]) return;
    map[id] = { ...map[id]!, z: topZ(map) + 1 };
    writeMap(map);
}

/** Prune a sticker from the locked composition (not settings/ownership). */
export function removeFromComposition(id: string) {
    const map = readMap();
    if (!map[id]) return;
    delete map[id];
    writeMap(map);
}

export interface PlacementState { placements: PlacementMap; aspect: number | null; }

export function usePlacements(): PlacementState {
    const [v, setV] = useState<PlacementState>({ placements: {}, aspect: null });
    useEffect(() => {
        const sync = () => setV({ placements: readMap(), aspect: readAspect() });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', sync); };
    }, []);
    return useMemo(() => v, [v]);
}
