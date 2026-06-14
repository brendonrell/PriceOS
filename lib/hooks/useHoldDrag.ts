'use client';

/*
 * useHoldDrag — the unified hold-and-drag engine for The Bench / Cart docks.
 *
 * One gesture, both inputs:
 *   - Touch (iOS): press and HOLD ~320ms → the piece lifts into a ghost that
 *     follows your finger and the dock peeks up. Moving before the hold fires
 *     is a scroll/swipe and is left to the browser untouched, so the gallery
 *     still scrolls normally. Once engaged, page scroll is blocked (non-passive
 *     touchmove preventDefault) so the drag stays buttery.
 *   - Mouse (desktop): click and HOLD ~320ms → identical lift + follow.
 *
 * The engine reports the live drag to BenchContext (ghost position + which dock
 * is armed) and calls onDrop(target) when released over a dock. Hit testing is
 * elementFromPoint against the [data-bench-drop] zones the BenchDock
 * renders — so the ghost MUST be pointer-events:none. A real drag swallows the
 * trailing click so the piece doesn't also open its modal; a quick tap (no
 * hold) falls through to the normal open handler.
 *
 * The whole engine is built ONCE per host as a closure (module factory) so its
 * window listeners keep stable identities — add/removeEventListener always
 * match, and a fast re-render can never strand a listener or a captured pointer.
 */

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from 'react';
import { useBench, type BenchDragState, type DropTarget } from '../state/BenchContext';

const LONGPRESS_MS = 320;
/** Movement (px) before the hold fires that re-reads the gesture as a
 *  scroll/swipe and cancels the would-be drag. */
const MOVE_CANCEL_PX = 12;

interface HoldDragOpts {
    slug: string;
    id: number;
    /** Listed pieces also light up the Cart dock. */
    listed: boolean;
    /** Fired on release over a dock. */
    onDrop: (target: DropTarget) => void;
    /** Skip wiring entirely (e.g. multi-select mode owns the gesture). */
    enabled?: boolean;
}

function hitTest(x: number, y: number, listed: boolean): DropTarget | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const zone = el?.closest('[data-bench-drop]') as HTMLElement | null;
    const t = zone?.getAttribute('data-bench-drop') as DropTarget | null;
    if (!t) return null;
    if (t === 'cart' && !listed) return null;
    return t;
}

function createEngine(
    getOpts: () => HoldDragOpts,
    setDrag: (next: BenchDragState | null) => void,
) {
    let pointerId = -1;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;
    let engaged = false;
    let el: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const publish = (armed: DropTarget | null) => {
        const o = getOpts();
        setDrag({ slug: o.slug, id: o.id, listed: o.listed, x: lastX, y: lastY, engaged: true, armed });
    };

    const cleanup = () => {
        if (timer) { clearTimeout(timer); timer = null; }
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        window.removeEventListener('pointercancel', onPointerCancel);
        window.removeEventListener('touchmove', onTouchMove);
        if (el && pointerId !== -1) {
            try { el.releasePointerCapture(pointerId); } catch { /* never captured */ }
        }
        document.body.classList.remove('bench-dragging');
        engaged = false;
        pointerId = -1;
        el = null;
    };

    const swallowNextClick = () => {
        const swallow = (ev: MouseEvent) => {
            ev.stopPropagation();
            ev.preventDefault();
            window.removeEventListener('click', swallow, true);
        };
        window.addEventListener('click', swallow, true);
        setTimeout(() => window.removeEventListener('click', swallow, true), 350);
    };

    const engage = () => {
        engaged = true;
        if (el) {
            try { el.setPointerCapture(pointerId); } catch { /* unmounted */ }
        }
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
            try { navigator.vibrate(8); } catch { /* unsupported */ }
        }
        document.body.classList.add('bench-dragging');
        publish(hitTest(lastX, lastY, getOpts().listed));
    };

    const onTouchMove = (e: TouchEvent) => {
        if (engaged && e.cancelable) e.preventDefault();
    };

    const onPointerMove = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        lastX = e.clientX;
        lastY = e.clientY;
        if (!engaged) {
            if (Math.hypot(e.clientX - startX, e.clientY - startY) > MOVE_CANCEL_PX) {
                cleanup(); // scroll/swipe — bail, leave it native
            }
            return;
        }
        publish(hitTest(e.clientX, e.clientY, getOpts().listed));
    };

    const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const wasEngaged = engaged;
        const target = wasEngaged ? hitTest(e.clientX, e.clientY, getOpts().listed) : null;
        cleanup();
        if (wasEngaged) {
            swallowNextClick();
            setDrag(null);
            if (target) getOpts().onDrop(target);
        }
    };

    const onPointerCancel = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const wasEngaged = engaged;
        cleanup();
        if (wasEngaged) setDrag(null);
    };

    const onPointerDown = (e: ReactPointerEvent) => {
        if (!getOpts().enabled) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (pointerId !== -1) return; // a drag is already mid-flight

        pointerId = e.pointerId;
        startX = lastX = e.clientX;
        startY = lastY = e.clientY;
        engaged = false;
        el = e.currentTarget as HTMLElement;

        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
        window.addEventListener('pointercancel', onPointerCancel);
        window.addEventListener('touchmove', onTouchMove, { passive: false });

        if (timer) clearTimeout(timer);
        timer = setTimeout(engage, LONGPRESS_MS);
    };

    return { onPointerDown, destroy: cleanup };
}

export function useHoldDrag(opts: HoldDragOpts) {
    const { setDrag } = useBench();
    const optsRef = useRef(opts);
    optsRef.current = opts;
    const setDragRef = useRef(setDrag);
    setDragRef.current = setDrag;

    const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);
    if (!engineRef.current) {
        engineRef.current = createEngine(
            () => ({ enabled: true, ...optsRef.current }),
            (v) => setDragRef.current(v),
        );
    }

    useEffect(() => {
        const engine = engineRef.current;
        return () => engine?.destroy();
    }, []);

    return { onPointerDown: engineRef.current.onPointerDown };
}
