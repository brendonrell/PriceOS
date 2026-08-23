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

/* ⛔ ONE SHOVE PER FRAME, NOT ONE PER EVENT (Brendon, 2026-08-01). iOS fires
   scroll far faster than it paints, and every single one used to do this work
   AND wake the solver — so scrolling a long profile kept three chains solving
   flat out the whole way down, on top of whatever the page itself was doing.
   The shoves are summed and drunk once a frame instead. The chain feels the
   same total push; it just isn't recomputed between paints. */
let scrollRaf = 0;
function onScrollRaw() {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => { scrollRaf = 0; onScroll(); });
}

function onScroll() {
    const y = window.scrollY;
    let d = y - lastY;
    lastY = y;
    // The page accelerating under the charm throws it the other way, the way
    // a thing on a chain lags behind the hand carrying it.
    /* ⛔ CLAMP REVERTED 80→40 (Brendon, 2026-08-17: "shoddy scroll tilt" —
       not a tilt-combo problem, the scroll response itself). The 08-15 widen
       doubled the ceiling without touching anything downstream of it: this
       delta feeds kickY *= KICK (3.6, EquippedCharm.tsx) straight into link
       positions, then RELAX (7 constraint passes/frame) has to pull them
       back to their real length. 40px was already tuned against that 7-pass
       budget; 80px roughly doubles the displacement RELAX has to resolve
       on a fast flick, which it can't fully do in 7 passes — the chain
       overshoots and wobbles for a few frames instead of settling cleanly,
       which is exactly "glitchy." The "looks stuck on a flick" it was
       trying to fix is real but needs a fix that doesn't also double the
       energy RELAX has to absorb (raising RELAX, or easing the shove in
       over a couple of frames instead of dumping it in one) — flag for a
       follow-up rather than trading one visible bug for another here. */
    if (d > 40) d = 40;
    if (d < -40) d = -40;
    kickY -= d * 0.13;
    wake();
}

/* ⛔ PULL-TO-REFRESH FREEZES THE CHAIN WITHOUT THIS (Brendon, 2026-08-23).
   Near the top, the native rubber-band pull doesn't move window.scrollY —
   it's already pinned at 0 — so the 'scroll' listener above never fires
   once a pull-to-refresh gesture starts, and the chain just stops taking
   kicks mid-pull. This reads the raw touch travel directly, but ONLY while
   the page is genuinely at the top, so it only fills the gap the rubber-band
   leaves; the moment real scrolling is possible again onScroll takes back
   over and this stays quiet (no double-kicking). Same clamp/coefficient as
   onScroll so the feel matches. */
let touchLastY = 0;
let touchActive = false;

function atTopNow(): boolean {
    if (typeof window === 'undefined') return false;
    return (window.scrollY || document.scrollingElement?.scrollTop || 0) <= 0;
}

function onTouchStartRaw(e: TouchEvent) {
    if (e.touches.length !== 1) { touchActive = false; return; }
    touchLastY = e.touches[0].clientY;
    touchActive = atTopNow();
}

function onTouchMoveRaw(e: TouchEvent) {
    if (!touchActive || e.touches.length !== 1) return;
    if (!atTopNow()) { touchActive = false; return; } // real scroll took over
    const y = e.touches[0].clientY;
    let d = -(y - touchLastY); // finger down = as if scrollY dipped negative
    touchLastY = y;
    if (d > 40) d = 40;
    if (d < -40) d = -40;
    kickY -= d * 0.13;
    wake();
}

function onTouchEndRaw() { touchActive = false; }

/* ⛔ TILT NOW SHARES SCROLL'S ONE-PER-FRAME GATE (Brendon, 2026-08-17:
   "glitchy and freezes while scrolling" with tilt also on). The 08-15 patch
   just deleted scroll's "skip while tilt is granted" guard and left onTilt
   wired straight to the raw 'deviceorientation' listener — ungated. Chains
   don't actually re-solve more than once a frame (kick() below is a no-op
   once its rAF is already running), so extra wake() calls were cheap; the
   real cost is onTilt's own trig work (cos/sin/hypot + two new objects)
   running on EVERY raw orientation event instead of once per paint. Scroll
   already fires just as fast and was fixed the same way back on 08-01 —
   tilt just never got the same treatment. Batching it here means the two
   drives now cost the same, one frame's worth of work each, whether or not
   they're active together, instead of tilt's uncapped handler competing
   with the browser's own scroll compositing for the main thread. Scroll and
   tilt go back to always stacking — that combination isn't the problem;
   letting one of them run unthrottled was. */
let tiltRaf = 0;
let pendingTilt: DeviceOrientationEvent | null = null;
function onTiltRaw(e: DeviceOrientationEvent) {
    pendingTilt = e;
    if (tiltRaf) return;
    tiltRaf = requestAnimationFrame(() => {
        tiltRaf = 0;
        if (pendingTilt) { onTilt(pendingTilt); pendingTilt = null; }
    });
}

function onTilt(e: DeviceOrientationEvent) {
    /* Gravity in the device's own frame, straight off the orientation angles:
       beta = front/back pitch, gamma = left/right roll. Held upright and
       level this is (0, 1) — dead down the screen. */
    const b = ((typeof e.beta === 'number' ? e.beta : 90) * Math.PI) / 180;
    const g = ((typeof e.gamma === 'number' ? e.gamma : 0) * Math.PI) / 180;
    const x = Math.cos(b) * Math.sin(g);
    let y = Math.sin(b);
    // Laid flat: almost all the gravity is going into the screen, so there's
    // no honest in-plane direction. Hang it gently down instead.
    if (Math.hypot(x, y) < 0.22) y = 0.22;
    /* EASED, NOT SNAPPED (Brendon, 2026-07-29) — the orientation sensor
       reports a jittery stream, and feeding it straight in made the chain
       twitch. Down moves toward the new reading instead of jumping to it. */
    const nx = gx + (x - gx) * 0.12;
    const ny = gy + (y - gy) * 0.12;
    /* ⛔ A STILL PHONE MUST LET THE CHAIN PARK (Brendon, 2026-08-01: "lag is
       now worse"). iOS streams orientation ~60×/s whether or not the phone has
       moved, and every reading used to wake the solver — so from the moment
       tilt was granted the chain re-solved every single frame for the life of
       the page, behind everything else. Sensor jitter is not motion: down only
       wakes it when the reading actually moves it. */
    const moved = Math.abs(nx - gx) + Math.abs(ny - gy);
    gx = nx;
    gy = ny;
    if (moved > 0.002) wake();
}

function onShake(e: DeviceMotionEvent) {
    const a = e.acceleration;
    if (!a) return;
    const ax = typeof a.x === 'number' ? a.x : 0;
    const ay = typeof a.y === 'number' ? a.y : 0;
    // Gravity is already excluded here — this is the shake alone.
    let kx = -ax * 0.20;
    let ky = ay * 0.20;
    if (kx > 1.6) kx = 1.6; if (kx < -1.6) kx = -1.6;
    if (ky > 1.6) ky = 1.6; if (ky < -1.6) ky = -1.6;
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
        window.addEventListener('scroll', onScrollRaw, { passive: true });
        window.addEventListener('touchstart', onTouchStartRaw, { passive: true });
        window.addEventListener('touchmove', onTouchMoveRaw, { passive: true });
        window.addEventListener('touchend', onTouchEndRaw, { passive: true });
        window.addEventListener('touchcancel', onTouchEndRaw, { passive: true });
        if (motion === 'granted') {
            window.addEventListener('deviceorientation', onTiltRaw);
            window.addEventListener('devicemotion', onShake);
        }
    }
    return () => {
        mounted -= 1;
        if (mounted > 0) return;
        window.removeEventListener('scroll', onScrollRaw);
        window.removeEventListener('touchstart', onTouchStartRaw);
        window.removeEventListener('touchmove', onTouchMoveRaw);
        window.removeEventListener('touchend', onTouchEndRaw);
        window.removeEventListener('touchcancel', onTouchEndRaw);
        if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = 0; }
        window.removeEventListener('deviceorientation', onTiltRaw);
        window.removeEventListener('devicemotion', onShake);
        if (tiltRaf) { cancelAnimationFrame(tiltRaf); tiltRaf = 0; pendingTilt = null; }
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
    window.addEventListener('deviceorientation', onTiltRaw);
    window.addEventListener('devicemotion', onShake);
}

/**
 * THE ASK — must be called straight off a real tap, which is why it rides the
 * first EQUIP. iOS shows its own sheet ("…Would Like to Access Motion and
 * Orientation") and a refusal is final: it will not ask that site again. One
 * grant covers both orientation and motion.
 */
export async function requestMotion(): Promise<MotionState> {
    /* ⛔ ALREADY GRANTED SKIPS THE API ENTIRELY (Brendon, 2026-08-15: "it
       loads every keychain tap"). EquippedCharm and the Depanneur both call
       this on every single equip tap, unconditionally — with no guard here,
       that meant every tap re-invoked the native requestPermission() call
       even once already granted, which is what kept re-raising the sheet.
       Once granted, later taps are a no-op read of the cached state. */
    if (motion === 'granted') return motion;
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

/* ⛔ TILT HAS TO SURVIVE A RELOAD (Brendon, 2026-07-31: "I turned it on last
   night… this morning it doesn't work unless I unequip and re-equip"). iOS
   REMEMBERS the grant but still refuses to hand the sensor back when the
   re-arm is asked for cold — the ask has to sit inside a real tap, which is
   why re-equipping fixed it every time. So when the cold re-arm is refused we
   don't give up: we wait for the page's next genuine tap and re-arm off that,
   silently (an already-granted site shows no sheet), and keep waiting until it
   takes. Scroll-only motion holds the chain up in the meantime. */
/* ⛔ THE ASK RIDES A TAP ON THE KEYCHAIN — NOTHING ELSE, EVER (Brendon,
   2026-08-01: the iOS motion sheet fired when he opened the CONNECT MENU).
   The re-arm used to listen on the whole window, so the first thing he touched
   after a load carried the permission ask, whatever it was. It listens on the
   worn keychain itself now: touch your charms and tilt comes back, exactly as
   the first EQUIP asks. No other control on the site can raise that sheet. */
let retryWanted = false;
let retryArmed = false;
let retryInFlight = false;
let armTarget: HTMLElement | null = null;

function askAgain() {
    if (motion === 'granted') { disarm(); return; }
    if (retryInFlight) return;
    retryInFlight = true;
    void requestMotion()
        .then((m) => {
            retryInFlight = false;
            if (m === 'granted') { retryWanted = false; disarm(); }
        })
        .catch(() => { retryInFlight = false; });
}

function arm() {
    if (retryArmed || !retryWanted || !armTarget) return;
    retryArmed = true;
    armTarget.addEventListener('touchend', askAgain, true);
    armTarget.addEventListener('click', askAgain, true);
}

function disarm() {
    if (armTarget && retryArmed) {
        armTarget.removeEventListener('touchend', askAgain, true);
        armTarget.removeEventListener('click', askAgain, true);
    }
    retryArmed = false;
}

function retryOnTap() {
    if (typeof window === 'undefined') return;
    retryWanted = true;
    arm();
}

/** The worn keychain hands itself over as the ONLY thing that can re-ask. */
export function setMotionArmTarget(el: HTMLElement | null): void {
    if (armTarget === el) return;
    disarm();
    armTarget = el;
    arm();
}

/**
 * Re-arm a previously granted permission on a fresh page load. iOS resolves an
 * already-granted site without showing anything when the ask lands inside a
 * tap; asked cold it can refuse outright, so a refusal falls through to the
 * next-tap re-arm above rather than dropping tilt for the whole visit.
 */
export function resumeMotion(): void {
    if (typeof window === 'undefined' || motion === 'granted') return;
    let want = false;
    try { want = localStorage.getItem(KEY) === '1'; } catch { /* private mode */ }
    if (!want || !motionSupported()) return;
    /* ⛔ NO COLD ASK ON MOUNT (Brendon, 2026-08-15: "I have to do it every
       time I open the app"). This used to call requestPermission() straight
       off the mount effect, gesture-less — and on-device that doesn't resolve
       silently the way the API is meant to, it raises the real iOS sheet, so
       every fresh open showed the popup again regardless of a prior grant.
       Skip straight to the tap-armed retry: the same already-granted-site
       call, made inside a real touch on the worn charm, is what actually
       resolves quietly. */
    retryOnTap();
}
