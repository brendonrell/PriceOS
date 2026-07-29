/*
 * lib/keychains/sway.ts — WHERE DOWN IS.
 *
 * The shared motion source the worn keychain hangs off. It does NOT animate
 * anything itself: it publishes the real gravity direction in screen space
 * plus the kicks the page is taking, and the chain solver (EquippedCharm)
 * turns those into a hanging, jangling chain.
 *
 * TWO DRIVES:
 *   • GRAVITY — how the phone is actually held, so the chain hangs toward
 *     true down. iOS only hands orientation over after a deliberate tap, so
 *     the ask rides the first EQUIP (Brendon, 2026-07-29: tilt is always on,
 *     the permission is asked once when you first put a charm on).
 *   • KICKS — scrolling shoves the chain, and a real shake (device motion)
 *     jangles it. Scroll needs no permission, so the chain always moves.
 *
 * Reduced motion: gravity is pinned straight down and kicks are dropped.
 */

const KEY = 'pd_charm_motion';

type Listener = () => void;
const listeners = new Set<Listener>();
/* Solvers park themselves when the chain settles; anything that moves the
   phone or the page wakes them back up. */
const wakers = new Set<Listener>();

export function onWake(cb: Listener): () => void {
    wakers.add(cb);
    return () => { wakers.delete(cb); };
}
function wake() { for (const cb of wakers) cb(); }

/** granted = orientation is live · denied = asked and refused (iOS won't re-ask) */
export type MotionState = 'unsupported' | 'idle' | 'granted' | 'denied';

let motion: MotionState = 'idle';

/* Screen-space gravity: +x right, +y down. Straight down until told otherwise. */
let gx = 0;
let gy = 1;

/* Kicks the page has taken since the solver last drank them. */
let kickX = 0;
let kickY = 0;

let lastY = 0;
let mounted = 0;

function emit() { for (const cb of listeners) cb(); }

export function reducedMotion(): boolean {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/* ── the drives ─────────────────────────────────────────────────────────── */

function onScroll() {
    const y = window.scrollY;
    let d = y - lastY;
    lastY = y;
    // The page accelerating under the charm throws it the other way, the way
    // a thing on a chain lags behind the hand carrying it.
    if (d > 60) d = 60;
    if (d < -60) d = -60;
    kickY -= d * 0.30;
    wake();
}

function onTilt(e: DeviceOrientationEvent) {
    /* Gravity in the device's own frame, straight off the orientation angles:
       beta = front/back pitch, gamma = left/right roll. Held upright and
       level this is (0, 1) — dead down the screen. */
    const b = ((typeof e.beta === 'number' ? e.beta : 90) * Math.PI) / 180;
    const g = ((typeof e.gamma === 'number' ? e.gamma : 0) * Math.PI) / 180;
    const x = Math.cos(b) * Math.sin(g);
    const y = Math.sin(b);
    const m = Math.hypot(x, y);
    if (m < 0.22) {
        // Laid flat: almost all the gravity is going into the screen, so
        // there's no honest in-plane direction. Hang it gently down.
        gx = x; gy = 0.22;
        wake();
        return;
    }
    gx = x; gy = y;
    wake();
}

function onShake(e: DeviceMotionEvent) {
    const a = e.acceleration;
    if (!a) return;
    const ax = typeof a.x === 'number' ? a.x : 0;
    const ay = typeof a.y === 'number' ? a.y : 0;
    // Gravity is already excluded here — this is the shake alone.
    let kx = -ax * 0.55;
    let ky = ay * 0.55;
    if (kx > 4) kx = 4; if (kx < -4) kx = -4;
    if (ky > 4) ky = 4; if (ky < -4) ky = -4;
    kickX += kx;
    kickY += ky;
    if (kx > 0.05 || kx < -0.05 || ky > 0.05 || ky < -0.05) wake();
}

/* ── what the solver reads ──────────────────────────────────────────────── */

/** Screen-space gravity direction (+y = down the page). */
export function gravity(): { x: number; y: number } {
    if (reducedMotion()) return { x: 0, y: 1 };
    return { x: gx, y: gy };
}

/** Drink the accumulated kicks — reading them clears them. */
export function takeKick(): { x: number; y: number } {
    if (reducedMotion()) { kickX = 0; kickY = 0; return { x: 0, y: 0 }; }
    const k = { x: kickX, y: kickY };
    kickX = 0; kickY = 0;
    return k;
}

/** Mount the shared listeners. Returns the unmount. */
export function startSway(): () => void {
    if (typeof window === 'undefined') return () => {};
    mounted += 1;
    if (mounted === 1) {
        lastY = window.scrollY;
        window.addEventListener('scroll', onScroll, { passive: true });
        if (motion === 'granted') {
            window.addEventListener('deviceorientation', onTilt);
            window.addEventListener('devicemotion', onShake);
        }
    }
    return () => {
        mounted -= 1;
        if (mounted > 0) return;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('deviceorientation', onTilt);
        window.removeEventListener('devicemotion', onShake);
    };
}

export function motionState(): MotionState { return motion; }

export function onMotionChange(cb: Listener): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

/** Is orientation even a thing on this device? */
export function motionSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

type PermAPI = { requestPermission?: () => Promise<'granted' | 'denied'> };

function attach() {
    window.addEventListener('deviceorientation', onTilt);
    window.addEventListener('devicemotion', onShake);
}

/**
 * THE ASK — must be called straight off a real tap, which is why it rides the
 * first EQUIP. iOS shows its own sheet ("…Would Like to Access Motion and
 * Orientation") and a refusal is final: it will not ask that site again. One
 * grant covers both orientation and motion.
 */
export async function requestMotion(): Promise<MotionState> {
    if (!motionSupported()) { motion = 'unsupported'; emit(); return motion; }
    const dm = (typeof DeviceMotionEvent !== 'undefined'
        ? (DeviceMotionEvent as unknown as PermAPI)
        : null);
    const dor = window.DeviceOrientationEvent as unknown as PermAPI;
    try {
        if (typeof dm?.requestPermission === 'function') {
            motion = (await dm.requestPermission()) === 'granted' ? 'granted' : 'denied';
        } else if (typeof dor.requestPermission === 'function') {
            motion = (await dor.requestPermission()) === 'granted' ? 'granted' : 'denied';
        } else {
            // Android / desktop: no gate, the events just fire.
            motion = 'granted';
        }
    } catch {
        motion = 'denied';
    }
    if (motion === 'granted') {
        try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
        attach();
    }
    emit();
    return motion;
}

/**
 * Re-arm a previously granted permission on a fresh page load. iOS resolves an
 * already-granted site without showing anything, so this needs no tap — and if
 * it does balk, the chain simply hangs on scroll alone.
 */
export function resumeMotion(): void {
    if (typeof window === 'undefined' || motion === 'granted') return;
    let want = false;
    try { want = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    if (!want || !motionSupported()) return;
    const dm = (typeof DeviceMotionEvent !== 'undefined'
        ? (DeviceMotionEvent as unknown as PermAPI)
        : null);
    const ask = typeof dm?.requestPermission === 'function'
        ? dm.requestPermission()
        : typeof (window.DeviceOrientationEvent as unknown as PermAPI).requestPermission === 'function'
            ? (window.DeviceOrientationEvent as unknown as PermAPI).requestPermission!()
            : null;
    if (!ask) {
        motion = 'granted';
        attach();
        emit();
        return;
    }
    ask.then((r) => {
        if (r !== 'granted') return;
        motion = 'granted';
        attach();
        emit();
    }).catch(() => { /* stay on scroll */ });
}
