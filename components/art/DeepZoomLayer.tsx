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
 *
 * THE LOUPE (Brendon greenlight 2026-07-26 — ClickUp "The Lens", the
 * jeweler's loupe artists asked for): press-and-hold on the art (any device)
 * — or hover + hold L on desktop — summons a circular lens showing the piece
 * at 4× under your finger/cursor, re-rendered live from the engine. Lift to
 * dismiss; nothing persists. Only at 1× (pinch owns the zoomed state). By
 * Brendon's call the long-press takes the gesture everywhere, including the
 * modal image (which previously fell through to the iOS save-sheet callout).
 *
 * onLongPress (2026-07-27, the Darkroom door — Brendon's call): a surface can
 * hand the press-and-hold to its own action instead of the loupe (the artwork
 * feature page long-press opens the Darkroom). Same arming/cancel mechanics;
 * hover + L keeps summoning the loupe on such surfaces.
 */

import { useEffect, useRef, type RefObject } from 'react';
import { paintOutput } from '../../lib/state/ProjectContext';

const MAX_ZOOM = 8;
/* Loupe: the specced 4× magnification, the lens diameter (CSS px, clamped to
   the art), and the press-and-hold arming time. */
const LOUPE_MAG = 4;
const LOUPE_D = 220;
const LONG_PRESS_MS = 400;
const PRESS_CANCEL_PX = 10;
/* Touch lifts the lens above the finger so it isn't under it; mouse doesn't. */
const LOUPE_TOUCH_LIFT = 80;
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
    onLongPress,
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
    /** When set, press-and-hold fires THIS instead of summoning the loupe
     *  (the Darkroom door on the feature page). Hover + L stays the loupe. */
    onLongPress?: () => void;
}) {
    const sharpRef = useRef<HTMLCanvasElement | null>(null);
    const readoutRef = useRef<HTMLDivElement | null>(null);
    const loupeRef = useRef<HTMLCanvasElement | null>(null);

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
    const onLongPressRef = useRef(onLongPress);
    onLongPressRef.current = onLongPress;
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

        /* ── THE LOUPE — press-and-hold (or hover + L) jeweler's lens. ── */
        const loupeSrc = { canvas: null as HTMLCanvasElement | null, key: '' };
        let loupeOn = false;
        let loupeIsTouch = false;
        let pressTimer: number | null = null;
        let pressAt = { x: 0, y: 0 };
        let lastTouch = { x: 0, y: 0 };
        let hovering = false;
        let lastMouse = { x: 0, y: 0 };
        /* True right after a surface-owned long-press fired (the Darkroom
           door) — the lift + click tail get swallowed so the tap action
           underneath never also fires. */
        let pressActionFired = false;

        const cancelPress = () => {
            if (pressTimer != null) { window.clearTimeout(pressTimer); pressTimer = null; }
        };

        /* Press-and-hold lands here: the surface's own action when it set one
           (the Darkroom door), the loupe otherwise. */
        const firePress = (cx: number, cy: number, touch: boolean) => {
            const action = onLongPressRef.current;
            if (action) {
                if (disabledRef.current || scaleRef.current > 1 || id == null) return;
                pressActionFired = true;
                lastGestureAt.current = Date.now();
                action();
                return;
            }
            loupeShow(cx, cy, touch);
        };

        /* The lens source — the whole piece re-rendered once at ~4× the
           displayed size (area-capped like the zoom overlay), then sampled
           per frame. One offscreen canvas, reused across summons. */
        const loupeEnsureSrc = (): HTMLCanvasElement | null => {
            if (id == null) return null;
            const box = baseBox();
            if (!box) return null;
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const aspect = box.w / box.h;
            const capW = Math.floor(Math.sqrt(AREA_MAX * aspect));
            const targetW = Math.min(Math.round(box.w * LOUPE_MAG * dpr), capW);
            const k = `${key}@loupe${targetW}`;
            if (loupeSrc.canvas && loupeSrc.key === k) return loupeSrc.canvas;
            const c = loupeSrc.canvas ?? document.createElement('canvas');
            try {
                paintOutput(c, slug, id, targetW, true);
            } catch {
                return null;
            }
            loupeSrc.canvas = c;
            loupeSrc.key = k;
            return c;
        };

        const loupeDraw = (cx: number, cy: number) => {
            const el = art();
            const lens = loupeRef.current;
            const src = loupeSrc.canvas;
            if (!el || !lens || !src || !loupeOn) return;
            const r = el.getBoundingClientRect();
            const contR = container.getBoundingClientRect();
            /* The focal point stays ON the art. */
            const fx = Math.max(r.left, Math.min(r.right, cx));
            const fy = Math.max(r.top, Math.min(r.bottom, cy));
            const dpr = Math.min(window.devicePixelRatio || 1, 2);
            const d = Math.min(LOUPE_D, Math.round(Math.min(contR.width, contR.height) * 0.7));
            const px = Math.round(d * dpr);
            if (lens.width !== px) { lens.width = px; lens.height = px; }
            lens.style.width = `${d}px`;
            lens.style.height = `${d}px`;
            /* Lens sits centred on the focal point — lifted above a finger so
               it's never under it — clamped inside the container. */
            const lift = loupeIsTouch ? LOUPE_TOUCH_LIFT : 0;
            const lx = Math.max(4, Math.min(contR.width - d - 4, fx - contR.left - d / 2));
            const ly = Math.max(4, Math.min(contR.height - d - 4, fy - contR.top - d / 2 - lift));
            lens.style.left = `${lx}px`;
            lens.style.top = `${ly}px`;
            /* Sample the window around the focal point at the specced 4×. */
            const S = src.width / r.width;
            let sw = (d / LOUPE_MAG) * S;
            sw = Math.min(sw, src.width, src.height);
            const sx = Math.max(0, Math.min(src.width - sw, (fx - r.left) * S - sw / 2));
            const sy = Math.max(0, Math.min(src.height - sw, (fy - r.top) * S - sw / 2));
            const g = lens.getContext('2d');
            if (!g) return;
            g.imageSmoothingEnabled = true;
            g.clearRect(0, 0, px, px);
            g.drawImage(src, sx, sy, sw, sw, 0, 0, px, px);
        };

        const loupeShow = (cx: number, cy: number, touch: boolean) => {
            if (disabledRef.current || scaleRef.current > 1 || id == null) return;
            const lens = loupeRef.current;
            if (!lens || !loupeEnsureSrc()) return;
            loupeOn = true;
            loupeIsTouch = touch;
            lastGestureAt.current = Date.now();
            lens.style.display = 'block';
            loupeDraw(cx, cy);
        };

        const loupeHide = () => {
            cancelPress();
            if (!loupeOn) return;
            loupeOn = false;
            lastGestureAt.current = Date.now();
            const lens = loupeRef.current;
            if (lens) lens.style.display = 'none';
        };

        /* The long-press takes the gesture on the art everywhere (Brendon's
           call) — including the modal image, whose iOS save-sheet callout it
           replaces. Idempotent; also re-applied at press time (the art
           element mounts after the layer in the modal). */
        const suppressCallout = () => {
            const el = art();
            if (!el) return;
            el.style.setProperty('-webkit-touch-callout', 'none');
            el.style.setProperty('-webkit-user-select', 'none');
            el.style.setProperty('user-select', 'none');
        };
        suppressCallout();

        /* ── Touch: pinch to zoom, one-finger pan while zoomed. ── */
        const dist = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);

        const onTouchStart = (e: TouchEvent) => {
            if (disabledRef.current) return;
            if (e.touches.length >= 2) {
                /* A second finger is a pinch, never a loupe press. */
                cancelPress();
                loupeHide();
            }
            if (e.touches.length === 1 && scaleRef.current <= 1) {
                /* Arm the loupe press — fires after a still hold; any real
                   movement (a swipe, a scroll) cancels it below. */
                const t = e.touches[0];
                const el = art();
                if (t && el) {
                    const r = el.getBoundingClientRect();
                    if (t.clientX >= r.left && t.clientX <= r.right && t.clientY >= r.top && t.clientY <= r.bottom) {
                        suppressCallout();
                        pressAt = { x: t.clientX, y: t.clientY };
                        lastTouch = { x: t.clientX, y: t.clientY };
                        cancelPress();
                        pressTimer = window.setTimeout(() => {
                            pressTimer = null;
                            firePress(lastTouch.x, lastTouch.y, true);
                        }, LONG_PRESS_MS);
                    }
                }
            }
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
            if (e.touches.length === 1) {
                const t = e.touches[0];
                lastTouch = { x: t.clientX, y: t.clientY };
                if (loupeOn) {
                    /* The lens follows the finger; the page must not scroll. */
                    loupeDraw(t.clientX, t.clientY);
                    lastGestureAt.current = Date.now();
                    e.stopPropagation();
                    e.preventDefault();
                    return;
                }
                if (pressTimer != null && Math.hypot(t.clientX - pressAt.x, t.clientY - pressAt.y) > PRESS_CANCEL_PX) {
                    cancelPress(); // it's a swipe/scroll, not a hold
                }
            }
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
            cancelPress();
            if (pressActionFired) {
                /* The door fired on the hold — swallow the lift so the tap
                   action underneath (open the modal) never also runs. */
                pressActionFired = false;
                e.stopPropagation();
                e.preventDefault();
                return;
            }
            if (loupeOn) {
                /* Lift = the lens goes away; swallow the tail so the tap
                   action underneath (open page / swipe nav) never fires. */
                loupeHide();
                e.stopPropagation();
                e.preventDefault();
                return;
            }
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
            if (disabledRef.current || e.button !== 0) return;
            if (scaleRef.current <= 1) {
                /* Hold-click arms the loupe on desktop — same press-and-hold
                   as touch; moving before it fires cancels into a normal
                   click/drag. */
                const el = art();
                if (el) {
                    const r = el.getBoundingClientRect();
                    if (e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) {
                        pressAt = { x: e.clientX, y: e.clientY };
                        lastMouse = { x: e.clientX, y: e.clientY };
                        cancelPress();
                        pressTimer = window.setTimeout(() => {
                            pressTimer = null;
                            firePress(lastMouse.x, lastMouse.y, false);
                        }, LONG_PRESS_MS);
                    }
                }
                return;
            }
            mouseDrag = { x: e.clientX, y: e.clientY };
            e.preventDefault();
            e.stopPropagation();
        };
        const onMouseMove = (e: MouseEvent) => {
            lastMouse = { x: e.clientX, y: e.clientY };
            if (loupeOn && !loupeIsTouch) {
                loupeDraw(e.clientX, e.clientY);
                lastGestureAt.current = Date.now();
                return;
            }
            if (pressTimer != null && Math.hypot(e.clientX - pressAt.x, e.clientY - pressAt.y) > PRESS_CANCEL_PX) {
                cancelPress();
            }
            if (!mouseDrag) return;
            txRef.current += e.clientX - mouseDrag.x;
            tyRef.current += e.clientY - mouseDrag.y;
            mouseDrag = { x: e.clientX, y: e.clientY };
            lastGestureAt.current = Date.now();
            clampPan();
            apply();
        };
        const onMouseUp = () => {
            cancelPress();
            if (pressActionFired) { pressActionFired = false; return; }
            if (loupeOn && !loupeIsTouch) { loupeHide(); return; }
            if (!mouseDrag) return;
            mouseDrag = null;
            settle();
        };

        /* Hover + L — the desktop hotkey summon (the specced pair). Held, not
           toggled: keydown shows while the cursor is over the art, keyup
           dismisses. Ignored while typing anywhere. */
        const onEnter = () => { hovering = true; };
        const onLeave = () => { hovering = false; loupeHide(); };
        const typing = () => {
            const a = document.activeElement;
            return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || (a as HTMLElement).isContentEditable);
        };
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'l' && e.key !== 'L') return;
            if (e.repeat || !hovering || typing() || disabledRef.current) return;
            loupeShow(lastMouse.x, lastMouse.y, false);
        };
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key !== 'l' && e.key !== 'L') return;
            if (loupeOn && !loupeIsTouch) loupeHide();
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
        container.addEventListener('mouseenter', onEnter);
        container.addEventListener('mouseleave', onLeave);
        window.addEventListener('keydown', onKeyDown);
        window.addEventListener('keyup', onKeyUp);
        /* The iOS long-press context menu on the art would race the loupe. */
        const onContextMenu = (e: Event) => {
            if (loupeOn || pressTimer != null) e.preventDefault();
        };
        container.addEventListener('contextmenu', onContextMenu);

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
            container.removeEventListener('mouseenter', onEnter);
            container.removeEventListener('mouseleave', onLeave);
            window.removeEventListener('keydown', onKeyDown);
            window.removeEventListener('keyup', onKeyUp);
            container.removeEventListener('contextmenu', onContextMenu);
            loupeHide();
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
            <canvas ref={loupeRef} className="dz-loupe" aria-hidden="true" />
        </>
    );
}
