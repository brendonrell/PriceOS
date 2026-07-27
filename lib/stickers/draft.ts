'use client';

/*
 * draft — the Sticker Manager's SAVE system (Brendon, 2026-07-27).
 *
 * Opening the manager takes a snapshot of your stickers exactly as they stand.
 * Everything you touch after that is a DRAFT: it paints on your hero straight
 * away — you're looking at your real profile while you work — but it is NOT
 * published to your account until you hit SAVE and confirm. Close without
 * saving and the snapshot is put back, untouched, down to the last spot.
 *
 * Spreads are deliberately NOT in the snapshot: a Spread has its own SAVE and
 * is a separate act, so discarding a look must never delete one.
 */

import { STATE_CACHE_KEYS } from '../state/userState';
import { HERO_PREF_KEYS } from './heroPrefs';
import { holdStickerPush, pushStickerState } from './owned';

const EVT = 'pd:stickers-changed';

/** Everything a look is made of: the arrangement prefs, which stickers/sheets
 *  are on, the hand-placed composition, and the one-tap colour lock. */
const DRAFT_KEYS: string[] = [
    ...HERO_PREF_KEYS,
    STATE_CACHE_KEYS.stickerOffSheets,
    STATE_CACHE_KEYS.stickerOffIds,
    STATE_CACHE_KEYS.stickerPlacements,
    STATE_CACHE_KEYS.stickerPlaceAspect,
    STATE_CACHE_KEYS.stickerColourLock,
];

export type StickerSnapshot = Record<string, string | null>;

/** Freeze the committed state — the thing CANCEL puts back. */
export function snapshotStickers(): StickerSnapshot {
    const snap: StickerSnapshot = {};
    if (typeof window === 'undefined') return snap;
    for (const k of DRAFT_KEYS) {
        try { snap[k] = window.localStorage.getItem(k); } catch { snap[k] = null; }
    }
    return snap;
}

/** Put a snapshot back and repaint every sticker surface. */
export function restoreStickers(snap: StickerSnapshot) {
    if (typeof window === 'undefined') return;
    for (const [k, v] of Object.entries(snap)) {
        try {
            if (v == null) window.localStorage.removeItem(k);
            else window.localStorage.setItem(k, v);
        } catch { /* quota */ }
    }
    window.dispatchEvent(new CustomEvent(EVT));
}

/** True when the live state differs from the snapshot — drives the SAVE button. */
export function stickersDiffer(snap: StickerSnapshot): boolean {
    if (typeof window === 'undefined') return false;
    for (const k of DRAFT_KEYS) {
        let cur: string | null = null;
        try { cur = window.localStorage.getItem(k); } catch { /* ignore */ }
        if ((snap[k] ?? null) !== cur) return true;
    }
    return false;
}

/** Start drafting — account writes are held until save/discard. */
export function beginStickerDraft(): StickerSnapshot {
    holdStickerPush(true);
    return snapshotStickers();
}

/** Publish the draft: the account write that was held now fires, once. */
export function saveStickerDraft(): StickerSnapshot {
    holdStickerPush(false);
    pushStickerState();
    return snapshotStickers();
}

/** Throw the draft away — your stickers go back exactly as they were. */
export function discardStickerDraft(snap: StickerSnapshot) {
    restoreStickers(snap);
    holdStickerPush(false);
}
