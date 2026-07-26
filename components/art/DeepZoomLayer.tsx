'use client';

/*
 * DeepZoomLayer — Deep Zoom (King Mode Keeper #4, approved 2026-07-26).
 * Pinch (touch), trackpad-pinch / wheel (desktop) into a piece of art and it
 * re-renders razor-sharp at the new scale from the deterministic engine —
 * there is no stored image to pixelate, only the math.
 *
 * Mounted as a SIBLING of the art element inside its existing positioned
 * container — it never wraps or re-lays-out the art. At rest (1×) it renders
 * nothing visible and intercepts nothing: taps, swipes and clicks pass
 * through untouched. All gesture listeners are native + non-passive (React
 * delegates passively, so preventDefault would be ignored) and they
 * stopPropagation ONLY while a zoom gesture is live or the art is zoomed,
 * which is what keeps the artwork modal's one-finger swipe nav byte-identical
 * at 1×.
 *
 * Sharpness: during the gesture the existing bitmap is CSS-transform scaled
 * (cheap, blurry is fine mid-pinch); on gesture END the engine re-renders the
 * piece at the new effective resolution into the overlay canvas
 * (paintOutput(..., live=true)) and the sharp frame swaps in. Pixel budget:
 * one reused canvas, area-capped (iOS Safari canvas memory), one render in
 * flight, newer gestures cancel pending renders.
 *
 * The door: pinch in — pinch back below 1× (or close/walk the surface) out.
 * Zoom never persists; every open starts at 1×. Max zoom 8×.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';

const MAX_ZOOM = 8;
/* Backing-store area budget for the sharp re-render — bounded well under the
   iOS Safari canvas ceiling; ~2900×2900 equivalent. */
const AREA_MAX = 8_400_000;
/* Don't burn a re-render for a hair over 1×. */
const SHARP_MIN_SCALE = 1.12;
/* Wheel zoom settles (and re-renders) this long after the last tick. */
const WHEEL_SETTLE_MS = 180;

interface Gesture {
    /* Pinch bookkeeping. */
    startDist: number;
    startScale: number;
    startTx: number;
    startTy: number;
    startMidX: number;
    startMidY: number;
    /* Single-pointer pan bookkeeping. */
    panLastX: number;
    panLastY: number;
    mode: 'pinch' | 'pan' | null;
}

export default function DeepZoomLayer({
    containerRef,
    getArt,
    slug,
    id,
    disabled = false,
    wheelNeedsModifier = false,
}: {
    /** The positioned container that holds the art (listeners attach here). */
    containerRef: RefObject<HTMLElement | null>;
    /** The art element (img or canvas) to zoom. Re-read per gesture. */
    getArt: () => HTMLElement | null;
    slug: string;
    id: number | null;
    /** True while another paint mode owns the surface (ASCII / Degen / loading). */
    disabled?: boolean;
    /** Page contexts that scroll: only ctrl/⌘-wheel (trackpad pinch) zooms. */
    wheelNeedsModifier?: boolean;
}) {
    const sharpRef = useRef<HTMLCanvasElement | null>(null);
    const readoutRef = useRef<HTMLDivElement | null>(null);

    /* All live state on refs — the zoom loop never re-renders React. */
    const scaleRef = useRef(1);
    const txRef = useRef(0);
    const tyRef = useRef(0);
    const gestureRef = useRef<Gesture | null>(null);
    const lastGestureAt = useRef(0);
    const wheelTimer = useRef<number | null>(null);
    const renderTimer = useRef<number | null>(null);
    const sharpForKey = useRef<string | null>(null);
    const savedOverflow = useRef<string | null>(null);
    const disabledRef = useRef(disabled);
    disabledRef.current = disabled;
    const artKeyRef = useRef(`${slug}:${id}`);

    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const key = `${slug}:${id}`;
        artKeyRef.current = key;

        const art = () => getArt();

        /* Base (untransformed) layout box of the art — offsetWidth/Height
           ignore transforms, so this stays true mid-gesture. */
        const baseBox = () => {
            const el = art();
            if (!el) return null;
            const w = (el as HTMLElement).offsetWidth;
            const h = (el as HTMLElement).offsetHeight;
            return w > 0 && h > 0 ? { w, h, left: (el as HTMLElement).offsetLeft, top: (el as HTMLElement).offsetTop } : null;
        };

        const clampPan = () => {
            const box = baseBox();
            if (!box) return;
            const s = scaleRef.current;
            const maxX = ((s - 1) * box.w) / 2;
            const maxY = ((s - 1) * box.h) / 2;
            txRef.current = Math.max(-maxX, Math.min(maxX, txRef.current));
            tyRef.current = Math.max(-maxY, Math.min(maxY, tyRef.current));
        };

        const apply = () => {
            const el = art();
            const s = scaleRef.current;
            const t = s > 1 ? `translate(${txRef.current}px, ${tyRef.current}px) scale(${s})` : '';
            if (el) {
                el.style.transform = t;
                el.style.willChange = s > 1 ? 'transform' : '';
            }
            const sharp = sharpRef.current;
            if (sharp) sharp.style.transform = t;
            const readout = readoutRef.current;
            if (readout) {
                if (s > 1) {
                    readout.textContent = `${(Math.round(s * 10) / 10).toFixed(1)}×`;
                    readout.style.display = 'block';
                } else {
                    readout.style.display = 'none';
                }
            }
            /* Clip the zoomed art to its region; restore the container's own
               overflow the moment zoom ends. */
            if (s > 1) {
                if (savedOverflow.current == null) {
                    savedOverflow.current = container.style.overflow;
                    container.style.overflow = 'hidden';
                }
            } else if (savedOverflow.current != null) {
                container.style.overflow = savedOverflow.current;
                savedOverflow.current = null;
            }
        };

        const hideSharp = () => {
            const sharp = sharpRef.current;
            if (sharp) sharp.style.opacity = '0';
            sharpForKey.current = null;
        };

        const reset = () => {
            scaleRef.current = 1;
            txRef.current = 0;
            tyRef.current = 0;
            gestureRef.current = null;
            hideSharp();
            apply();
        };

        /* ── The sharp re-render — engine math at the new resolution. ── */
        const renderSharp = () => {
            if (disabledRef.current || id == null) return;
            const s = scaleRef.current;
            if (s < SHARP_MIN_SCALE) { hideSharp(); return; }
            const box = baseBox();
            const sharp = sharpRef.current;
            if (!box || !sharp) return;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const aspect = box.w / box.h;
            const areaCapW = Math.floor(Math.sqrt(AREA_MAX * aspect));
            const targetW = Math.min(Math.round(box.w * s * dpr), areaCapW);
            const renderKey = `${key}@${targetW}`;
            if (sharpForKey.current === renderKey) {
                sharp.style.opacity = '1';
                return;
            }
            try {
                paintOutput(sharp, slug, id, targetW, true);
            } catch {
                hideSharp();
                return;
            }
            /* Align the overlay to the art's base box; it wears the SAME
               transform, so it scales in lockstep and reads sharp. */
            sharp.style.left = `${box.left}px`;
            sharp.style.top = `${box.top}px`;
            sharp.style.width = `${box.w}px`;
            sharp.style.height = `${box.h}px`;
            sharp.style.transform = art()?.style.transform ?? '';
            sharp.style.opacity = '1';
            sharpForKey.current = renderKey;
        };

        const scheduleSharp = () => {
            if (renderTimer.current != null) window.clearTimeout(renderTimer.current);
            /* Let the (cheap) transformed frame paint first, then re-render. */
            renderTimer.current = window.setTimeout(() => {
                renderTimer.current = null;
                requestAnimationFrame(renderSharp);
            }, 30);
        };

        const settle = () => {
            if (scaleRef.current <= 1.04) reset();
            else { clampPan(); apply(); scheduleSharp(); }
        };

        /* ── Touch: pinch to zoom, one-finger pan while zoomed. ── */
        const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

        const onTouchStart = (e: TouchEvent) => {
            if (disabledRef.current) return;
            if (e.touches.length >= 2) {
                const [a, b] = [e.touches[0], e.touches[1]];
                gestureRef.current = {
                    startDist: dist(a, b),
                    startScale: scaleRef.current,
                    startTx: txRef.current,
                    startTy: tyRef.current,
                    startMidX: (a.clientX + b.clientX) / 2,
                    startMidY: (a.clientY + b.clientY) / 2,
                    panLastX: 0,
                    panLastY: 0,
                    mode: 'pinch',
                };
                lastGestureAt.current = Date.now();
                e.stopPropagation();
                e.preventDefault();
            } else if (scaleRef.current > 1 && e.touches.length === 1) {
                gestureRef.current = {
                    startDist: 0,
                    startScale: scaleRef.current,
                    startTx: txRef.current,
                    startTy: tyRef.current,
                    startMidX: 0,
                    startMidY: 0,
                    panLastX: e.touches[0].clientX,
                    panLastY: e.touches[0].clientY,
                    mode: 'pan',
                };
                lastGestureAt.current = Date.now();
                e.stopPropagation();
            }
        };

        const onTouchMove = (e: TouchEvent) => {
            const g = gestureRef.current;
            if (!g || disabledRef.current) return;
            lastGestureAt.current = Date.now();
            if (g.mode === 'pinch' && e.touches.length >= 2) {
                const [a, b] = [e.touches[0], e.touches[1]];
                const d = dist(a, b);
                const raw = g.startScale * (d / Math.max(1, g.startDist));
                const s = Math.max(1, Math.min(MAX_ZOOM, raw));
                const midX = (a.clientX + b.clientX) / 2;
                const midY = (a.clientY + b.clientY) / 2;
                /* Anchor the pinch midpoint: the art point under the fingers
                   stays under them as the scale changes. */
                const k = s / g.startScale;
                txRef.current = midX - g.startMidX + g.startTx * k + (1 - k) * (g.startMidX - centerX());
                tyRef.current = midY - g.startMidY + g.startTy * k + (1 - k) * (g.startMidY - centerY());
                scaleRef.current = s;
                clampPan();
                apply();
                e.stopPropagation();
                e.preventDefault();
            } else if (g.mode === 'pan' && e.touches.length === 1) {
                const t = e.touches[0];
                txRef.current += t.clientX - g.panLastX;
                tyRef.current += t.clientY - g.panLastY;
                g.panLastX = t.clientX;
                g.panLastY = t.clientY;
                clampPan();
                apply();
                e.stopPropagation();
                e.preventDefault();
            }
        };

        const onTouchEnd = (e: TouchEvent) => {
            const g = gestureRef.current;
            if (!g) return;
            e.stopPropagation();
            if (e.touches.length === 0) {
                gestureRef.current = null;
                settle();
            } else if (g.mode === 'pinch' && e.touches.length === 1) {
                /* One finger lifted mid-pinch → continue as a pan. */
                g.mode = 'pan';
                g.panLastX = e.touches[0].clientX;
                g.panLastY = e.touches[0].clientY;
            }
        };

        /* Container-center in viewport coords — the transform origin is the
           art's center (it's centered in the container). */
        const centerX = () => {
            const r = container.getBoundingClientRect();
            return r.left + r.width / 2;
        };
        const centerY = () => {
            const r = container.getBoundingClientRect();
            return r.top + r.height / 2;
        };

        /* ── Desktop: wheel / trackpad-pinch zoom, drag pan. ── */
        const onWheel = (e: WheelEvent) => {
            if (disabledRef.current) return;
            if (wheelNeedsModifier && !(e.ctrlKey || e.metaKey) && scaleRef.current <= 1) return;
            const el = art();
            if (!el) return;
            /* Only when the cursor is over the art itself. */
            const r = el.getBoundingClientRect();
            if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) {
                if (scaleRef.current <= 1) return;
            }
            e.preventDefault();
            e.stopPropagation();
            const unit = e.deltaMode === 1 ? 16 : 1;
            const factor = Math.exp(-e.deltaY * unit * 0.0022);
            const s0 = scaleRef.current;
            const s = Math.max(1, Math.min(MAX_ZOOM, s0 * factor));
            if (s === s0) return;
            const k = s / s0;
            /* Anchor under the cursor. */
            txRef.current = e.clientX - (e.clientX - txRef.current - centerX()) * k - centerX();
            tyRef.current = e.clientY - (e.clientY - tyRef.current - centerY()) * k - centerY();
            scaleRef.current = s;
            lastGestureAt.current = Date.now();
            clampPan();
            apply();
            if (wheelTimer.current != null) window.clearTimeout(wheelTimer.current);
            wheelTimer.current = window.setTimeout(() => {
                wheelTimer.current = null;
                settle();
            }, WHEEL_SETTLE_MS);
        };

        let mouseDrag: { x: number; y: number } | null = null;
        const onMouseDown = (e: MouseEvent) => {
            if (disabledRef.current || scaleRef.current <= 1 || e.button !== 0) return;
            mouseDrag = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            e.stopPropagation();
        };
        const onMouseMove = (e: MouseEvent) => {
            if (!mouseDrag) return;
            txRef.current += e.clientX - mouseDrag.x;
            tyRef.current += e.clientY - mouseDrag.y;
            mouseDrag = { x: e.clientX, y: e.clientY };
            lastGestureAt.current = Date.now();
            clampPan();
            apply();
        };
        const onMouseUp = () => {
            if (!mouseDrag) return;
            mouseDrag = null;
            settle();
        };

        /* While zoomed (or right after a gesture), a click must NOT fall
           through to the art's own tap action (open page / navigate). */
        const onClickCapture = (e: MouseEvent) => {
            if (scaleRef.current > 1 || Date.now() - lastGestureAt.current < 400) {
                e.stopPropagation();
                e.preventDefault();
            }
        };

        container.addEventListener('touchstart', onTouchStart, { passive: false });
        container.addEventListener('touchmove', onTouchMove, { passive: false });
        container.addEventListener('touchend', onTouchEnd, { passive: false });
        container.addEventListener('touchcancel', onTouchEnd, { passive: false });
        container.addEventListener('wheel', onWheel, { passive: false });
        container.addEventListener('mousedown', onMouseDown);
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
        container.addEventListener('click', onClickCapture, true);

        /* A new piece (or unmount) always starts back at 1×. */
        reset();

        return () => {
            container.removeEventListener('touchstart', onTouchStart);
            container.removeEventListener('touchmove', onTouchMove);
            container.removeEventListener('touchend', onTouchEnd);
            container.removeEventListener('touchcancel', onTouchEnd);
            container.removeEventListener('wheel', onWheel);
            container.removeEventListener('mousedown', onMouseDown);
            window.removeEventListener('mousemove', onMouseMove);
            window.removeEventListener('mouseup', onMouseUp);
            container.removeEventListener('click', onClickCapture, true);
            if (wheelTimer.current != null) window.clearTimeout(wheelTimer.current);
            if (renderTimer.current != null) window.clearTimeout(renderTimer.current);
            /* Leave the art exactly as found. */
            const el = getArt();
            if (el) { el.style.transform = ''; el.style.willChange = ''; }
            if (savedOverflow.current != null) {
                container.style.overflow = savedOverflow.current;
                savedOverflow.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [slug, id, wheelNeedsModifier]);

    /* Disabled mid-zoom (mode flip) → snap home. */
    useEffect(() => {
        if (!disabled) return;
        const el = getArt();
        if (el) { el.style.transform = ''; el.style.willChange = ''; }
        scaleRef.current = 1;
        txRef.current = 0;
        tyRef.current = 0;
        const sharp = sharpRef.current;
        if (sharp) sharp.style.opacity = '0';
        const readout = readoutRef.current;
        if (readout) readout.style.display = 'none';
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [disabled]);

    return (
        <>
            <canvas ref={sharpRef} className="dz-sharp" aria-hidden="true" />
            <div ref={readoutRef} className="dz-readout" aria-hidden="true" />
        </>
    );
}
