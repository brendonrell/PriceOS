'use client';

/*
 * useListRowDrag — hold-and-drag reordering for the rows inside a List
 * (Brendon, 2026-07-25).
 *
 * The GESTURE is the app's existing one, deliberately: the same contract
 * useHoldDrag gives The Bench and the Showcase slots, so a drag inside a list
 * feels like every other drag in PD.
 *   - Press and HOLD ~320ms → the row lifts and follows your finger.
 *   - Moving more than ~12px BEFORE the hold fires re-reads the gesture as a
 *     scroll and cancels it, so the panel still scrolls normally.
 *   - Once engaged, page scroll is blocked (non-passive touchmove
 *     preventDefault) so the drag stays smooth on iOS.
 *   - A real drag swallows the trailing click, so the row doesn't also open its
 *     artwork; a quick tap falls straight through to the normal handler.
 *
 * What it does NOT reuse is useHoldDrag's ENGINE, which reports into the Bench
 * drag store and arms the Bench/Cart docks — a list reorder must not light
 * those up, and a list holds kinds (projects, people, transactions) that engine
 * has no concept of.
 *
 * Like that engine, the moving parts are painted STRAIGHT onto the elements
 * rather than through React state: a re-render per pointer move buries mobile
 * Safari. The lifted row rides a transform, the row under the finger wears a
 * class, and React only hears about it once — on drop.
 */

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';

const LONGPRESS_MS = 320;
/** Movement (px) before the hold fires that re-reads the gesture as a scroll. */
const MOVE_CANCEL_PX = 12;

/** Marks a row as both a drag handle and a drop zone. Value = its member key. */
export const ROW_KEY_ATTR = 'data-list-row';

export function useListRowDrag(onReorder: (fromKey: string, ontoKey: string) => void) {
    /* The callback lives in a ref so the window listeners keep stable
       identities — add/removeEventListener always match, and a fast re-render
       can never strand a listener or a captured pointer. */
    const cb = useRef(onReorder);
    useEffect(() => { cb.current = onReorder; }, [onReorder]);

    const state = useRef({
        pointerId: -1,
        startX: 0,
        startY: 0,
        engaged: false,
        fromKey: '',
        row: null as HTMLElement | null,
        armed: null as HTMLElement | null,
        timer: null as ReturnType<typeof setTimeout> | null,
        moved: false,
    });

    const paintArmed = (next: HTMLElement | null) => {
        const s = state.current;
        if (s.armed === next) return;
        s.armed?.classList.remove('lists-row-armed');
        next?.classList.add('lists-row-armed');
        s.armed = next;
    };

    const cleanup = () => {
        const s = state.current;
        if (s.timer) { clearTimeout(s.timer); s.timer = null; }
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('touchmove', onTouchMove);
        if (s.row) {
            s.row.classList.remove('lists-row-lifted');
            s.row.style.transform = '';
            if (s.pointerId !== -1) {
                try { s.row.releasePointerCapture(s.pointerId); } catch { /* never captured */ }
            }
        }
        paintArmed(null);
        document.body.classList.remove('lists-dragging');
        s.engaged = false;
        s.pointerId = -1;
        s.row = null;
        s.fromKey = '';
    };

    /* Non-passive so the drag can hold the page still under the finger. */
    const onTouchMove = (e: TouchEvent) => {
        if (state.current.engaged) e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
        const s = state.current;
        if (s.pointerId !== e.pointerId) return;
        const dy = e.clientY - s.startY;
        if (!s.engaged) {
            /* Still deciding: real movement before the hold fires means the
               user is scrolling, so let the browser have the gesture. */
            const dx = e.clientX - s.startX;
            if (dx * dx + dy * dy > MOVE_CANCEL_PX * MOVE_CANCEL_PX) cleanup();
            return;
        }
        s.moved = true;
        if (s.row) s.row.style.transform = `translateY(${dy}px)`;
        // What's under the finger — the row it would land on.
        const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
        const target = el?.closest(`[${ROW_KEY_ATTR}]`) as HTMLElement | null;
        paintArmed(target && target !== s.row ? target : null);
    };

    const onUp = (e: PointerEvent) => {
        const s = state.current;
        if (s.pointerId !== e.pointerId) return;
        const engaged = s.engaged;
        const from = s.fromKey;
        const onto = s.armed?.getAttribute(ROW_KEY_ATTR) ?? null;
        cleanup();
        if (engaged && from && onto && from !== onto) cb.current(from, onto);
    };

    /** Spread onto each row. The row must also carry ROW_KEY_ATTR. */
    const rowHandlers = (key: string) => ({
        onPointerDown: (e: ReactPointerEvent) => {
            // Only the primary button / a finger starts a drag.
            if (e.button != null && e.button !== 0) return;
            const s = state.current;
            cleanup();
            const row = (e.currentTarget as HTMLElement);
            s.pointerId = e.pointerId;
            s.startX = e.clientX;
            s.startY = e.clientY;
            s.fromKey = key;
            s.row = row;
            s.moved = false;
            window.addEventListener('pointermove', onMove);
            window.addEventListener('pointerup', onUp);
            window.addEventListener('pointercancel', onUp);
            window.addEventListener('touchmove', onTouchMove, { passive: false });
            s.timer = setTimeout(() => {
                s.timer = null;
                s.engaged = true;
                document.body.classList.add('lists-dragging');
                row.classList.add('lists-row-lifted');
                try { row.setPointerCapture(s.pointerId); } catch { /* not capturable */ }
            }, LONGPRESS_MS);
        },
        /* A completed drag swallows the click it rides in on, so the row never
           also opens its artwork. A plain tap never sets `moved`. */
        onClickCapture: (e: React.MouseEvent) => {
            if (state.current.moved) {
                e.preventDefault();
                e.stopPropagation();
                state.current.moved = false;
            }
        },
    });

    useEffect(() => cleanup, []);

    return { rowHandlers };
}
