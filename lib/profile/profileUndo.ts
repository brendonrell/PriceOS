'use client';

/*
 * profileUndo — one-step undo for the Presets row (Brendon, 2026-09-18:
 * "I've had a tragedy and lost an amazing roll... can be localstorage").
 *
 * Deliberately shallow: a SINGLE snapshot, swapped (not pushed) on every
 * capturing action, so pressing Undo always recovers the one look you just
 * replaced — never a deeper history. Device-local by design (localStorage
 * only, no settings-envelope sync) since it's a quick "oops" net, not a
 * cross-device feature.
 */

export interface ProfileLookSnapshot {
    hex: string;
    tagPaint: string;
    logoId: string | null;
    fontId: string | null;
}

const KEY = 'pd_profile_undo';
const HEX_RE = /^#[0-9A-F]{6}$/i;

function isSnapshot(v: unknown): v is ProfileLookSnapshot {
    if (!v || typeof v !== 'object') return false;
    const p = v as Partial<ProfileLookSnapshot>;
    return (
        typeof p.hex === 'string' && HEX_RE.test(p.hex) &&
        typeof p.tagPaint === 'string' && HEX_RE.test(p.tagPaint) &&
        (p.logoId === null || typeof p.logoId === 'string') &&
        (p.fontId === null || typeof p.fontId === 'string')
    );
}

/** Read the buffered look, or null if there isn't one yet. */
export function getProfileUndoBuffer(): ProfileLookSnapshot | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = window.localStorage.getItem(KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return isSnapshot(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

/** Capture the look that's about to be replaced. Call this BEFORE applying a
 *  roll / daily pick / preset load — never after, or the "before" look is
 *  already gone. */
export function captureProfileUndo(snap: ProfileLookSnapshot): void {
    try { window.localStorage.setItem(KEY, JSON.stringify(snap)); } catch { /* quota */ }
}

/** Pop the buffered look and hand it back so the caller can apply it AND
 *  swap the buffer to the look being replaced (the current live look), so a
 *  second Undo tap can flip right back — a toggle, not a dead end. */
export function swapProfileUndo(currentLook: ProfileLookSnapshot): ProfileLookSnapshot | null {
    const buffered = getProfileUndoBuffer();
    if (!buffered) return null;
    captureProfileUndo(currentLook);
    return buffered;
}
