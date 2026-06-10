'use client';

/*
 * useDragScroll — desktop drag-to-pan for horizontal scroll rows.
 *
 * Mouse users without a horizontal scroll gesture (no trackpad, no
 * tilt-wheel) had NO way to move rows like the expanded ENS selector
 * (Brendon 2026-06-10 — "how do I scroll horizontally? I don't want
 * more icons"). This adds click-drag panning, mouse-only:
 *   - pointerType 'mouse' only — touch keeps native momentum scrolling.
 *   - A real drag (>4px) suppresses the click that fires on release so
 *     pills don't activate when the user was panning, not tapping.
 *   - Cursor flips to grabbing during a drag via [data-dragging].
 *
 * Attach the returned ref to the overflow-x container.
 */

import { useEffect, useRef } from 'react';

const DRAG_THRESHOLD_PX = 4;

export function useDragScroll<T extends HTMLElement>() {
    const ref = useRef<T | null>(null);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;

        let startX = 0;
        let startScroll = 0;
        let dragging = false;
        let moved = false;

        const onPointerDown = (e: PointerEvent) => {
            if (e.pointerType !== 'mouse' || e.button !== 0) return;
            dragging = true;
            moved = false;
            startX = e.clientX;
            startScroll = el.scrollLeft;
        };

        const onPointerMove = (e: PointerEvent) => {
            if (!dragging) return;
            const dx = e.clientX - startX;
            if (!moved && Math.abs(dx) > DRAG_THRESHOLD_PX) {
                moved = true;
                el.setAttribute('data-dragging', '');
                el.setPointerCapture(e.pointerId);
            }
            if (moved) el.scrollLeft = startScroll - dx;
        };

        const endDrag = (e: PointerEvent) => {
            if (!dragging) return;
            dragging = false;
            el.removeAttribute('data-dragging');
            if (moved && el.hasPointerCapture(e.pointerId)) {
                el.releasePointerCapture(e.pointerId);
            }
        };

        /* After a real drag, the browser still fires a click on the
           element under the pointer — swallow exactly that one. */
        const onClickCapture = (e: MouseEvent) => {
            if (!moved) return;
            moved = false;
            e.preventDefault();
            e.stopPropagation();
        };

        el.addEventListener('pointerdown', onPointerDown);
        el.addEventListener('pointermove', onPointerMove);
        el.addEventListener('pointerup', endDrag);
        el.addEventListener('pointercancel', endDrag);
        el.addEventListener('click', onClickCapture, true);
        return () => {
            el.removeEventListener('pointerdown', onPointerDown);
            el.removeEventListener('pointermove', onPointerMove);
            el.removeEventListener('pointerup', endDrag);
            el.removeEventListener('pointercancel', endDrag);
            el.removeEventListener('click', onClickCapture, true);
        };
    }, []);

    return ref;
}
