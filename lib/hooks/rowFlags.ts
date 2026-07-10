'use client';

/*
 * Row state-flag helpers shared by the Starred / History (StarredList) and
 * Wishlist (WishlistList) row components, so the long-press-to-star gesture and
 * the per-Output note reader are byte-identical everywhere.
 *
 *   useStarLongPress(fire) — the SAME gesture as the activity-feed Starred Tx
 *     rows: hold ~460ms to toggle the star, a ★ floats up to confirm (down on
 *     un-star); a >10px drag cancels it (so scrolling never fires). `fire` does
 *     the toggle + toast and returns whether the item is now starred (for the
 *     float direction). `longFired` lets the row suppress the tap that follows.
 *
 *   useTokenNote(slug, id) — the viewer's private note text for one Output, read
 *     from the SAME `pd_token_notes` store the gallery caption + Notes list use,
 *     live across edits. Project-exact key first, legacy bare-id fallback
 *     (per-project keying split, 2026-07-10). Empty string = no note.
 */

import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react';
import { readNoteFor } from '../notes/tokenNotes';

export function useStarLongPress(fire: () => boolean) {
    const timerRef = useRef<number | null>(null);
    const longFired = useRef(false);
    const startPt = useRef<{ x: number; y: number } | null>(null);
    const [floatId, setFloatId] = useState(0);
    const [floatDown, setFloatDown] = useState(false);
    const clearTimer = () => { if (timerRef.current != null) { window.clearTimeout(timerRef.current); timerRef.current = null; } };
    const onPointerDown = (e: ReactPointerEvent) => {
        longFired.current = false;
        startPt.current = { x: e.clientX, y: e.clientY };
        clearTimer();
        timerRef.current = window.setTimeout(() => {
            longFired.current = true;
            timerRef.current = null;
            const nowOn = fire();
            setFloatDown(!nowOn);
            setFloatId((n) => n + 1);
        }, 460);
    };
    const onPointerMove = (e: ReactPointerEvent) => {
        if (timerRef.current == null || !startPt.current) return;
        const dx = e.clientX - startPt.current.x;
        const dy = e.clientY - startPt.current.y;
        if (dx * dx + dy * dy > 100) clearTimer();
    };
    const endPress = () => clearTimer();
    const handlers = {
        onPointerDown, onPointerMove,
        onPointerUp: endPress, onPointerLeave: endPress, onPointerCancel: endPress,
        onContextMenu: (e: ReactMouseEvent) => e.preventDefault(),
    };
    return { longFired, floatId, floatDown, handlers };
}

export function useTokenNote(slug: string, id: number): string {
    const [note, setNote] = useState('');
    useEffect(() => {
        const read = () => setNote(readNoteFor(slug, id));
        read();
        window.addEventListener('pd:notes-changed', read);
        window.addEventListener('storage', read);
        return () => {
            window.removeEventListener('pd:notes-changed', read);
            window.removeEventListener('storage', read);
        };
    }, [slug, id]);
    return note;
}
