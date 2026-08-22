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
const SPREADS_KEY = STATE_CACHE_KEYS.stickerSpreads;
const LOCK_KEY = STATE_CACHE_KEYS.stickerColourLock;
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
/* ── THE DRAFT GATE (Brendon, 2026-07-27) ──────────────────────────────────
   While the Sticker Manager is open, every change is a DRAFT: it shows on the
   hero immediately, but nothing is published to the account until SAVE. This
   flag holds the account write back for the duration; SAVE clears it and
   pushes once, closing without saving restores the snapshot instead. */
let pushHeld = false;
export function holdStickerPush(hold: boolean) { pushHeld = hold; }

/* ⛔ THE LOOK GOES TO THE ACCOUNT (Brendon, 2026-08-01: "my stickers don't
   stay… it reverts to one row without me having touched it… how is this not
   settled as db?? It lasts for days and then gone").
   It wasn't settled as db — the arrangement, rows, align, tilt, flip, density,
   border and the generative roll were the ONLY part of a decorated profile
   that never left the device. Ownership and the hand-placed spots were always
   synced, so when Safari cleared its storage those came back and the LOOK did
   not: the hero fell to its one-row default with nothing to restore it from.
   That is the "lasts for days and then gone". These keys ride the account blob
   now, written by the same writer as everything else.
   Read raw here, like the placement blobs above, so the writer keeps no
   dependency on the pref store that calls it. */
const LOOK_KEYS = [
    'pd_sticker_arrange', 'pd_sticker_tilt', 'pd_sticker_seed', 'pd_sticker_expand',
    'pd_sticker_rows', 'pd_sticker_align', 'pd_sticker_flip', 'pd_sticker_density',
    'pd_sticker_border',
] as const;

function readLook(): Record<string, string> {
    const out: Record<string, string> = {};
    if (typeof window === 'undefined') return out;
    for (const k of LOOK_KEYS) {
        try {
            const v = window.localStorage.getItem(k);
            if (v != null) out[k] = v;
        } catch { /* private mode */ }
    }
    return out;
}

export function pushStickerState(force = false) {
    /* SPREADS force their way through: a Spread has its OWN save button, so
       saving one is an explicit act that lands immediately — and a discarded
       look never takes a saved Spread down with it. */
    if (pushHeld && !force) return;
    const aspectRaw =typeof window !== 'undefined' ? parseFloat(window.localStorage.getItem(PLACE_ASPECT_KEY) || '') : NaN;
    pushState({
        sticker_state: {
            owned: readArr(OWNED_KEY),
            offSheets: readArr(OFF_SHEETS_KEY),
            offIds: readArr(OFF_IDS_KEY),
            placements: readJson(PLACEMENTS_KEY, {} as Record<string, { x: number; y: number; z: number; r?: number; sc?: number }>),
            ...(Number.isFinite(aspectRaw) && aspectRaw > 0 ? { placementAspect: aspectRaw } : {}),
            look: readLook(),
            spreads: readJson(SPREADS_KEY, [] as unknown[]),
            colourLock: readJson(LOCK_KEY, null as Record<string, unknown> | null) ?? undefined,
        },
    });
}

/* ── THE ONE-TAP COLOUR LOCK ───────────────────────────────────────────────
 * "Make my stickers Hothurt" (Brendon, 2026-07-24). A sticker's colour IS its
 * identity — each hue is its own sticker id and that id is what you own — so
 * this CANNOT and DOES NOT repaint anything. It narrows your profile to the
 * stickers you ALREADY OWN in that colour, and the manager quietly shows what
 * you're missing underneath. No paywall; the completionist does the selling.
 *
 * It is reversible by construction: applying stores the exact active-state it
 * was applied over, so turning it off puts every sticker back where you had it
 * — and the record rides the account, so the way out survives closing the
 * manager, reloading, or picking the app up on another device (Rule #-0.4: a
 * confirmed way on AND a confirmed way off, or it doesn't get built).
 */

type RawPlacements = Record<string, { x: number; y: number; z: number; r?: number; sc?: number }>;

export interface ColourLock {
    /** Which filter is on — the swatch hex, family or brand key. */
    key: string;
    /** What to call it in the pill + the toast. */
    label: string;
    /** The off-stickers list as it stood BEFORE the lock. The way back. */
    prevOffIds: string[];
    /** And the hand-placed composition as it stood before it, for the same
     *  reason — see the note on pruning below. */
    prevPlacements?: RawPlacements;
}

/* Raw placement passthrough — same reason the reads above are raw: the
   placement store imports pushStickerState from here, so importing it back
   would close a cycle. Writes fire the same change event + account push. */
function writePlacementsRaw(map: RawPlacements) {
    try {
        if (Object.keys(map).length === 0) window.localStorage.removeItem(PLACEMENTS_KEY);
        else window.localStorage.setItem(PLACEMENTS_KEY, JSON.stringify(map));
    } catch { /* quota */ }
}

export function getColourLock(): ColourLock | null {
    const raw = readJson(LOCK_KEY, null as unknown);
    if (!raw || typeof raw !== 'object') return null;
    const r = raw as Partial<ColourLock>;
    if (typeof r.key !== 'string' || typeof r.label !== 'string') return null;
    return {
        key: r.key,
        label: r.label,
        prevOffIds: Array.isArray(r.prevOffIds) ? r.prevOffIds.filter((x): x is string => typeof x === 'string') : [],
        prevPlacements: (r.prevPlacements && typeof r.prevPlacements === 'object' && !Array.isArray(r.prevPlacements))
            ? r.prevPlacements as RawPlacements : undefined,
    };
}

/**
 * Narrow the profile to `keepIds` — every OTHER owned sticker switches off.
 * Sheets are left exactly as they are: this is a colour lens over what you
 * own, not a re-run of your sheet choices.
 */
export function applyColourLock(key: string, label: string, keepIds: ReadonlyArray<string>, ownedIds: ReadonlyArray<string>) {
    const existing = getColourLock();
    /* Re-locking onto a different colour keeps the ORIGINAL way back, so two
       taps in a row can't strand you in a state you never chose. */
    const prevOffIds = existing ? existing.prevOffIds : readArr(OFF_IDS_KEY);
    const prevPlacements = existing ? existing.prevPlacements : readJson(PLACEMENTS_KEY, {} as RawPlacements);
    const keep = new Set(keepIds);
    const nextOff = ownedIds.filter((id) => !keep.has(id));
    /* A HAND-PLACED hero draws from the locked composition, not from the active
       set — so switching stickers off would visibly do nothing on exactly the
       profiles people care most about. Prune the composition to the kept
       stickers too, keeping the original here so turning the lock off restores
       every spot untouched. Contained to this feature: nothing else about how a
       locked composition behaves changes. */
    const pruned: RawPlacements = {};
    for (const [id, p] of Object.entries(prevPlacements ?? {})) if (keep.has(id)) pruned[id] = p;
    try {
        window.localStorage.setItem(LOCK_KEY, JSON.stringify({ key, label, prevOffIds, prevPlacements: prevPlacements ?? {} }));
    } catch { /* quota */ }
    writePlacementsRaw(pruned);
    writeArr(OFF_IDS_KEY, nextOff);
}

/** Turn the lock off — every sticker goes back exactly where it was, spots
 *  included. */
export function clearColourLock() {
    const lock = getColourLock();
    try { window.localStorage.removeItem(LOCK_KEY); } catch { /* ignore */ }
    if (lock) writePlacementsRaw(lock.prevPlacements ?? {});
    writeArr(OFF_IDS_KEY, lock ? lock.prevOffIds : readArr(OFF_IDS_KEY));
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

/** Grant every sticker in a sheet (simulated buy). Your FIRST sheet comes on by
 *  default; every sheet after that lands OFF (you opt it into your profile from
 *  the manager) so a new buy never auto-clutters a profile you've arranged. */
export function buySheet(sheetId: SheetId): string[] {
    const hadSheet = getOwnedIds().length > 0; // already owned a sheet before this buy
    const next = new Set(getOwnedIds());
    for (const s of stickersForSheet(sheetId)) next.add(s.id);
    const arr = [...next];
    writeArr(OWNED_KEY, arr);
    if (hadSheet) {
        const off = readArr(OFF_SHEETS_KEY);
        if (!off.includes(sheetId)) writeArr(OFF_SHEETS_KEY, [...off, sheetId]);
    }
    return arr;
}

function toggleIn(key: string, value: string) {
    const cur = readArr(key);
    const i = cur.indexOf(value);
    if (i >= 0) cur.splice(i, 1); else cur.push(value);
    writeArr(key, cur);
}
/** Turn a whole sheet's stickers off/on for the profile. At least one owned
 *  sheet must always stay on — turning off the last active sheet is refused. */
export function toggleSheetActive(sheetId: SheetId) {
    const off = readArr(OFF_SHEETS_KEY);
    const turningOff = !off.includes(sheetId);
    if (turningOff) {
        const ownedSheets = new Set(getOwnedIds().map((id) => stickerById(id)?.sheet).filter(Boolean) as string[]);
        if (ownedSheets.size > 0) {
            const willOff = new Set([...off, sheetId]);
            const anyOn = [...ownedSheets].some((sh) => !willOff.has(sh));
            if (!anyOn) return; // keep at least one sheet on
        }
    }
    toggleIn(OFF_SHEETS_KEY, sheetId);
}
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

/** The full set a profile owner holds: your live device ledger while you're
 *  actively editing in the manager (`preferLocal`), or the account-synced
 *  `sticker_state.owned` otherwise — which is every other case: the resting
 *  display on your own profile, any visitor, any device or browser context
 *  (Brendon, 2026-08-22: "stickers should have NO local reliance... we want
 *  no localStorage-only features" — the steady-state display never depends
 *  on what happens to be sitting in this browser's storage). */
export function useOwnedFor(handle: string | null | undefined, preferLocal: boolean, accountOwnedIds?: string[] | null): Sticker[] {
    const { owned } = useLedger();
    return useMemo(() => {
        const seed = ownedStickers(handle);
        const map = new Map<string, Sticker>(seed.map((s) => [s.id, s]));
        const extra = preferLocal ? owned : (accountOwnedIds ?? []);
        for (const id of extra) {
            const s = stickerById(id);
            if (s) map.set(id, s);
        }
        return [...map.values()];
    }, [handle, preferLocal, owned, accountOwnedIds]);
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
