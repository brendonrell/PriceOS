'use client';

/*
 * owned — the simulated ownership + active-state ledger for stickers.
 *
 * "Real, as in simulated": buying a sheet grants its stickers (localStorage) and
 * they persist + drive your hero, no backend. On top of ownership sits an ACTIVE
 * layer — you can turn whole sheets off, or individual stickers off, and only the
 * active ones feed your profile. Keyed to the device (the current user).
 *
 * Real on-chain reads (ERC-1155 balanceOf) replace ownership later; the active
 * layer stays a local preference. Consumers use the hooks below, so the swap is
 * contained.
 */

import { useEffect, useMemo, useState } from 'react';
import {
    ownedStickers, stickerById, stickersForSheet,
    type Sticker, type SheetId,
} from './catalog';
import { pushState, STATE_CACHE_KEYS } from '../state/userState';

const OWNED_KEY = STATE_CACHE_KEYS.ownedStickers;
const OFF_SHEETS_KEY = STATE_CACHE_KEYS.stickerOffSheets;
const OFF_IDS_KEY = STATE_CACHE_KEYS.stickerOffIds;
const PLACEMENTS_KEY = STATE_CACHE_KEYS.stickerPlacements;
const PLACE_ASPECT_KEY = STATE_CACHE_KEYS.stickerPlaceAspect;
const EVT = 'pd:stickers-changed';

function readArr(key: string): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        return Array.isArray(arr) ? arr.filter((x): x is string => typeof x === 'string') : [];
    } catch {
        return [];
    }
}
function writeArr(key: string, arr: string[]) {
    try { window.localStorage.setItem(key, JSON.stringify(arr)); } catch { /* quota */ }
    window.dispatchEvent(new CustomEvent(EVT));
    pushStickerState();
}

/* Raw passthrough reads for the placement blobs — kept here (not imported from
   placements.ts) so the account-sync writer has no circular dependency on the
   placement store, which imports this function. */
function readJson<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    try {
        const raw = window.localStorage.getItem(key);
        return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
        return fallback;
    }
}

/* Write-through the full sticker state to the account so it follows the user
   across devices. No-op until the user's server snapshot has hydrated, so it
   never fires for a logged-out / boot-time device. Exported so the placement
   store reuses the exact same writer (one source of truth for the blob). */
export function pushStickerState() {
    const aspectRaw = typeof window !== 'undefined' ? parseFloat(window.localStorage.getItem(PLACE_ASPECT_KEY) || '') : NaN;
    pushState({
        sticker_state: {
            owned: readArr(OWNED_KEY),
            offSheets: readArr(OFF_SHEETS_KEY),
            offIds: readArr(OFF_IDS_KEY),
            placements: readJson(PLACEMENTS_KEY, {} as Record<string, { x: number; y: number; z: number; r?: number; sc?: number }>),
            ...(Number.isFinite(aspectRaw) && aspectRaw > 0 ? { placementAspect: aspectRaw } : {}),
        },
    });
}

/* One-time hard reset — wipe every owned + active-state key on this device, once.
   Clears the crash from over-stuffed test ownership and gives a clean slate.
   Bump the version string to force another clean wipe later. (Brendon 2026-06-22.) */
const RESET_VERSION = 'pd_stickers_reset_v2';
if (typeof window !== 'undefined') {
    try {
        if (window.localStorage.getItem(RESET_VERSION) !== '1') {
            window.localStorage.removeItem(OWNED_KEY);
            window.localStorage.removeItem(OFF_SHEETS_KEY);
            window.localStorage.removeItem(OFF_IDS_KEY);
            window.localStorage.setItem(RESET_VERSION, '1');
        }
    } catch { /* ignore */ }
}

export function getOwnedIds(): string[] { return readArr(OWNED_KEY); }
export function getOffSheets(): string[] { return readArr(OFF_SHEETS_KEY); }
export function getOffIds(): string[] { return readArr(OFF_IDS_KEY); }

/** True when every sticker in the sheet is already owned. */
export function ownsSheet(sheetId: SheetId, owned: string[] = getOwnedIds()): boolean {
    const set = new Set(owned);
    return stickersForSheet(sheetId).every((s) => set.has(s.id));
}

/** Grant every sticker in a sheet (simulated buy). */
export function buySheet(sheetId: SheetId): string[] {
    const next = new Set(getOwnedIds());
    for (const s of stickersForSheet(sheetId)) next.add(s.id);
    const arr = [...next];
    writeArr(OWNED_KEY, arr);
    return arr;
}

function toggleIn(key: string, value: string) {
    const cur = readArr(key);
    const i = cur.indexOf(value);
    if (i >= 0) cur.splice(i, 1); else cur.push(value);
    writeArr(key, cur);
}
/** Turn a whole sheet's stickers off/on for the profile. */
export function toggleSheetActive(sheetId: SheetId) { toggleIn(OFF_SHEETS_KEY, sheetId); }
/** Turn a single sticker off/on for the profile. */
export function toggleStickerActive(id: string) { toggleIn(OFF_IDS_KEY, id); }

/** A sticker is active when its sheet isn't off AND it isn't individually off. */
export function isActive(s: Sticker, offSheets: Set<string>, offIds: Set<string>): boolean {
    return !offSheets.has(s.sheet) && !offIds.has(s.id);
}

/* ── Hooks ───────────────────────────────────────────────────────────────── */
function useLedger() {
    // Start empty so SSR + first client render agree, then hydrate on mount.
    const [v, setV] = useState({ owned: [] as string[], offSheets: [] as string[], offIds: [] as string[] });
    useEffect(() => {
        const sync = () => setV({ owned: getOwnedIds(), offSheets: getOffSheets(), offIds: getOffIds() });
        sync();
        window.addEventListener(EVT, sync);
        window.addEventListener('storage', sync);
        return () => {
            window.removeEventListener(EVT, sync);
            window.removeEventListener('storage', sync);
        };
    }, []);
    return v;
}

export function useOwnedStickerIds(): string[] {
    return useLedger().owned;
}

/** The full set a profile owner holds: the seed (e.g. Brendon) plus, on your own
    profile, your simulated purchases. */
export function useOwnedFor(handle: string | null | undefined, isOwn: boolean): Sticker[] {
    const { owned } = useLedger();
    return useMemo(() => {
        const seed = ownedStickers(handle);
        if (!isOwn) return seed;
        const map = new Map<string, Sticker>(seed.map((s) => [s.id, s]));
        for (const id of owned) {
            const s = stickerById(id);
            if (s) map.set(id, s);
        }
        return [...map.values()];
    }, [handle, isOwn, owned]);
}

/** Non-reactive owned list (seed + purchases) — for the manager's local copy. */
export function computeOwnedFor(handle: string | null | undefined): Sticker[] {
    const seed = ownedStickers(handle);
    const map = new Map<string, Sticker>(seed.map((s) => [s.id, s]));
    for (const id of getOwnedIds()) {
        const s = stickerById(id);
        if (s) map.set(id, s);
    }
    return [...map.values()];
}

/** Owned + active sets for the current viewer, live. */
export function useStickerPrefs() {
    const { offSheets, offIds } = useLedger();
    return useMemo(() => ({
        offSheets: new Set(offSheets),
        offIds: new Set(offIds),
    }), [offSheets, offIds]);
}
