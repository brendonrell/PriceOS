/*
 * lib/keychains/sway.ts — THE HANG.
 *
 * The worn keychain hangs off its ring for real: one shared pendulum drives
 * every charm on the page (they're all on the same phone, so they all swing
 * together), written out as a single CSS variable the SVGs rotate by.
 *
 * TWO DRIVES, one of them free:
 *   • SCROLL — always on, no permission. Flicking the page shoves the charm
 *     and it swings out and settles. This is the fallback and the default.
 *   • TILT — how you're actually holding the phone, so the charm hangs down
 *     wherever "down" really is. iOS only hands motion data over after a
 *     deliberate tap (see requestMotion), so this is strictly an upgrade on
 *     top of scroll — never a replacement for it.
 *
 * Reduced motion: no sway at all, either drive.
 */

const VAR = '--charm-sway';
const KEY = 'pd_charm_motion';

type Listener = () => void;
const listeners = new Set<Listener>();

/** granted = tilt is live · denied = asked and refused (iOS won't re-ask) */
export type MotionState = 'unsupported' | 'idle' | 'granted' | 'denied';

let motion: MotionState = 'idle';
let tiltRest = 0;      // where "down" is right now, in degrees
let angle = 0;         // the pendulum
let vel = 0;
let raf = 0;
let lastY = 0;
let mounted = 0;

function emit() { for (const cb of listeners) cb(); }

function reduced(): boolean {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
}

/* ── the pendulum ────────────────────────────────────────────────────────
   Restoring pull toward rest, drag, and whatever the scroll just shoved in.
   Capped so a hard fling can't spin it round. */
function step() {
    const k = 0.055;      // stiffness
    const drag = 0.94;
    vel += (tiltRest - angle) * k;
    vel *= drag;
    angle += vel;
    if (angle > 15) { angle = 15; vel = 0; }
    if (angle < -15) { angle = -15; vel = 0; }

    document.documentElement.style.setProperty(VAR, `${angle.toFixed(2)}deg`);

    // Asleep and level — stop burning frames until something moves again.
    if (Math.abs(vel) < 0.008 && Math.abs(angle - tiltRest) < 0.05 && motion !== 'granted') {
        angle = tiltRest;
        document.documentElement.style.setProperty(VAR, `${angle.toFixed(2)}deg`);
        raf = 0;
        return;
    }
    raf = requestAnimationFrame(step);
}

function wake() {
    if (!raf) raf = requestAnimationFrame(step);
}

function onScroll() {
    const y = window.scrollY;
    const d = y - lastY;
    lastY = y;
    // Scrolling DOWN throws the charm up-and-back, the way a thing on a chain
    // lags behind the hand carrying it.
    let push = d * 0.05;
    if (push > 2.2) push = 2.2;
    if (push < -2.2) push = -2.2;
    vel -= push;
    wake();
}

function onTilt(e: DeviceOrientationEvent) {
    // gamma = left/right roll. The charm hangs toward true down, damped so a
    // phone held at an angle doesn't peg it against the cap.
    const g = typeof e.gamma === 'number' ? e.gamma : 0;
    let rest = g * 0.28;
    if (rest > 12) rest = 12;
    if (rest < -12) rest = -12;
    tiltRest = rest;
    wake();
}

/** Mount the shared driver. Returns the unmount. */
export function startSway(): () => void {
    if (typeof window === 'undefined') return () => {};
    mounted += 1;
    if (mounted === 1 && !reduced()) {
        lastY = window.scrollY;
        window.addEventListener('scroll', onScroll, { passive: true });
        if (motion === 'granted') window.addEventListener('deviceorientation', onTilt);
        wake();
    }
    return () => {
        mounted -= 1;
        if (mounted > 0) return;
        window.removeEventListener('scroll', onScroll);
        window.removeEventListener('deviceorientation', onTilt);
        if (raf) cancelAnimationFrame(raf);
        raf = 0;
    };
}

export function motionState(): MotionState { return motion; }

export function onMotionChange(cb: Listener): () => void {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
}

/** Is tilt even a thing on this device? */
export function motionSupported(): boolean {
    return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
}

type PermAPI = { requestPermission?: () => Promise<'granted' | 'denied'> };

/**
 * THE ASK — must be called straight off a real tap. iOS shows its own sheet
 * ("…Would Like to Access Motion and Orientation"), and a refusal is final:
 * it will not ask that site again.
 */
export async function requestMotion(): Promise<MotionState> {
    if (!motionSupported()) { motion = 'unsupported'; emit(); return motion; }
    const api = window.DeviceOrientationEvent as unknown as PermAPI;
    try {
        if (typeof api.requestPermission === 'function') {
            const r = await api.requestPermission();
            motion = r === 'granted' ? 'granted' : 'denied';
        } else {
            // Android / desktop: no gate, the events just fire.
            motion = 'granted';
        }
    } catch {
        motion = 'denied';
    }
    if (motion === 'granted') {
        try { localStorage.setItem(KEY, '1'); } catch { /* private mode */ }
        window.addEventListener('deviceorientation', onTilt);
        wake();
    }
    emit();
    return motion;
}

/** THE OFF SWITCH — back to scroll-only, and forget the choice. */
export function stopMotion(): void {
    window.removeEventListener('deviceorientation', onTilt);
    try { localStorage.removeItem(KEY); } catch { /* private mode */ }
    motion = 'idle';
    tiltRest = 0;
    wake();
    emit();
}

/**
 * Re-arm a previously granted permission on a fresh page load. iOS resolves an
 * already-granted site without showing anything, so this needs no tap — and if
 * it does balk, we simply stay on scroll.
 */
export function resumeMotion(): void {
    if (typeof window === 'undefined' || motion === 'granted') return;
    let want = false;
    try { want = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    if (!want || !motionSupported()) return;
    const api = window.DeviceOrientationEvent as unknown as PermAPI;
    if (typeof api.requestPermission !== 'function') {
        motion = 'granted';
        window.addEventListener('deviceorientation', onTilt);
        emit();
        return;
    }
    api.requestPermission().then((r) => {
        if (r !== 'granted') return;
        motion = 'granted';
        window.addEventListener('deviceorientation', onTilt);
        wake();
        emit();
    }).catch(() => { /* stay on scroll */ });
}
