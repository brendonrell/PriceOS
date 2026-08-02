/*
 * F52 / BUG-16+17 — Tape animation engine
 *
 * Sim 6045-6067 (menu tape rAF, `_menuTapeStep` + `_startMenuTapeLoop`
 * + `_stopMenuTapeLoop`) and sim 13325-13345 (top tape rAF, `tick` +
 * `start` + `stop`). Both tapes scroll horizontally at a shared
 * px/sec, with offset accumulation modulo `rail.scrollWidth / 2`
 * for a seamless loop (consumers double their rail content at
 * populate time — see Ticker.tsx and TapeBox.tsx).
 *
 * ⛔ REBUILT 2026-08-02 (battery pass, Brendon): the per-frame rAF drive
 * is gone. The top tape rides EVERY page, so the old loop woke the main
 * thread 60–120×/sec for the whole session writing transforms. The scroll
 * is now a pure compositor CSS animation (`pd-tape-scroll` keyframes in
 * globals.css) — the SAME px/sec, the same seamless modulo-halfWidth loop,
 * zero JS wakeups while it runs. Each rail carries its distance in
 * `--tape-half` and its duration from the shared speed; a ResizeObserver
 * per rail re-measures when the rail's size changes (window resize, the
 * dropdown revealing a hidden rail, content landing async) — event-driven,
 * no polling.
 *
 * Speed: DESKTOP_PX_PER_SEC=45, MOBILE_PX_PER_SEC=28 (sim 13271-13272).
 * Mobile threshold: window.innerWidth <= 600 (sim 13278).
 *
 * prefers-reduced-motion: sim's menu loop respects it (sim 6059-6060);
 * the top loop doesn't. We respect it for both — same UX intent across
 * surfaces. When reduce-motion is on, no animation is applied; rails stay
 * static at translate3d(0,0,0).
 *
 * Cleanup: unsubscribe clears the rail's animation + var so an idle rail
 * isn't frozen mid-scroll.
 */

const DESKTOP_PX_PER_SEC = 45;
const MOBILE_PX_PER_SEC = 28;

function isMobile(): boolean {
    return typeof window !== 'undefined' && window.innerWidth <= 600;
}

/** Px/sec — exposed so consumers (or tests) can read the same value
 *  the engine drives subscribers with. Mirrors sim's `window._pdTapeSpeed`. */
export function getTapeSpeed(): number {
    return isMobile() ? MOBILE_PX_PER_SEC : DESKTOP_PX_PER_SEC;
}

function prefersReducedMotion(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
}

/** Measure the rail and (re)apply the compositor animation. A rail that
 *  isn't measurable yet (display:none / 0-width) gets no animation; its
 *  ResizeObserver re-fires this the moment it gains real size. */
function applyScroll(rail: HTMLElement, lastHalf: { w: number }): void {
    const half = rail.scrollWidth / 2;
    if (half === lastHalf.w) return;
    lastHalf.w = half;
    if (!half) {
        rail.style.animation = 'none';
        return;
    }
    rail.style.setProperty('--tape-half', `${half}px`);
    rail.style.animation = `pd-tape-scroll ${half / getTapeSpeed()}s linear infinite`;
}

/**
 * Register a rail element with the engine. The element should already
 * have its content populated and doubled (so scrollWidth / 2 = one
 * full stream length).
 *
 * Returns an unsubscribe handler that stops the scroll and resets the rail.
 */
export function subscribeTapeRail(rail: HTMLElement): () => void {
    if (typeof window === 'undefined') return () => undefined;
    if (prefersReducedMotion()) return () => undefined;

    /* The engine used to write inline transforms — clear any leftover so the
       keyframe owns the movement. */
    rail.style.transform = '';

    const lastHalf = { w: -1 };
    applyScroll(rail, lastHalf);

    /* Size changes (window resize, hidden→shown, async content) re-measure.
       The observer only fires on real change — nothing ticks in between. */
    const ro = new ResizeObserver(() => applyScroll(rail, lastHalf));
    ro.observe(rail);

    return () => {
        ro.disconnect();
        rail.style.animation = 'none';
        rail.style.removeProperty('--tape-half');
        rail.style.transform = 'translate3d(0, 0, 0)';
    };
}
