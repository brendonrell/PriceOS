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
import {
    setBenchDrag,
    type BenchDragState,
    type DropTarget,
} from '../state/benchDragStore';

const LONGPRESS_MS = 320;
/** Movement (px) before the hold fires that re-reads the gesture as a
 *  scroll/swipe and cancels the would-be drag. */
const MOVE_CANCEL_PX = 12;

interface HoldDragOpts {
    slug: string;
    id: number;
    /** Listed pieces also light up the Cart dock. */
    listed: boolean;
    /** Fired on release over a dock. `key` is the zone's own `slug:id` for
     *  Showcase slots (the reorder target), null for the docks. */
    onDrop: (target: DropTarget, key: string | null) => void;
    /** Skip wiring entirely (e.g. multi-select mode owns the gesture). */
    enabled?: boolean;
    /** Set (to this piece's `slug:id`) when the piece is itself a Showcase
     *  slot — only then do the OTHER slots arm as reorder targets. Its own
     *  slot never arms, so a lift-and-drop-in-place is a no-op. */
    reorderKey?: string | null;
    /** Fired the moment the long-press engages — the Showcase uses it to turn
     *  on iOS-style move mode (jiggle + the little ×). */
    onEngage?: () => void;
}

interface Hit { target: DropTarget; key: string | null; zone: HTMLElement | null }

function hitTest(x: number, y: number, listed: boolean, reorderKey: string | null): Hit | null {
    const el = document.elementFromPoint(x, y) as HTMLElement | null;
    const zone = el?.closest('[data-bench-drop]') as HTMLElement | null;
    const t = zone?.getAttribute('data-bench-drop') as DropTarget | null;
    if (!t) return null;
    if (t === 'cart' && !listed) return null;
    if (t === 'showcase') {
        if (!reorderKey) return null;
        const key = zone?.getAttribute('data-drop-key') ?? null;
        if (!key || key === reorderKey) return null;
        return { target: 'showcase', key, zone };
    }
    return { target: t, key: null, zone };
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

    const publish = (hit: Hit | null) => {
        const o = getOpts();
        setDrag({
            slug: o.slug, id: o.id, listed: o.listed,
            x: lastX, y: lastY, engaged: true,
            armed: hit?.target ?? null,
            armedKey: hit?.key ?? null,
        });
    };

    /* The hovered Showcase slot lights up. Painted straight onto the element
       rather than through React: the gallery deliberately does NOT subscribe to
       the drag store (a re-render per pointer move buries mobile Safari), so the
       highlight rides a class the engine adds and removes itself. */
    let armedEl: HTMLElement | null = null;
    const paintArmed = (next: HTMLElement | null) => {
        if (armedEl === next) return;
        armedEl?.classList.remove('sc-drop-armed');
        next?.classList.add('sc-drop-armed');
        armedEl = next;
    };

    const probe = (x: number, y: number): Hit | null => {
        const o = getOpts();
        const hit = hitTest(x, y, o.listed, o.reorderKey ?? null);
        paintArmed(hit?.target === 'showcase' ? hit.zone : null);
        return hit;
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
        paintArmed(null);
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
        getOpts().onEngage?.();
        publish(probe(lastX, lastY));
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
        publish(probe(e.clientX, e.clientY));
    };

    const onPointerUp = (e: PointerEvent) => {
        if (e.pointerId !== pointerId) return;
        const wasEngaged = engaged;
        const hit = wasEngaged ? probe(e.clientX, e.clientY) : null;
        cleanup();
        if (wasEngaged) {
            swallowNextClick();
            setDrag(null);
            if (hit) getOpts().onDrop(hit.target, hit.key);
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
    const optsRef = useRef(opts);
    optsRef.current = opts;

    const engineRef = useRef<ReturnType<typeof createEngine> | null>(null);
    if (!engineRef.current) {
        engineRef.current = createEngine(
            () => ({ enabled: true, ...optsRef.current }),
            setBenchDrag,
        );
    }

    useEffect(() => {
        const engine = engineRef.current;
        return () => engine?.destroy();
    }, []);

    return { onPointerDown: engineRef.current.onPointerDown };
}
