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
 * Sim has two near-identical rAF loops with a shared speed source
 * (window._pdTapeSpeed). We collapse them into a single engine with
 * subscribers — each registered rail tracks its own offset, lastTs,
 * and halfWidth, but they all run on one rAF cadence and share
 * speed().
 *
 * Speed: DESKTOP_PX_PER_SEC=45, MOBILE_PX_PER_SEC=28 (sim 13271-13272).
 * Mobile threshold: window.innerWidth <= 600 (sim 13278).
 *
 * prefers-reduced-motion: sim's menu loop respects it (sim 6059-6060);
 * the top loop doesn't. We respect it for both — same UX intent across
 * surfaces. When reduce-motion is on, no rAF fires; rails stay static
 * at translate3d(0,0,0).
 *
 * Resize: re-zero halfWidth for every subscriber (debounced 150ms,
 * matching sim 13386-13389). Each tick re-measures lazily when
 * halfWidth is 0 (sim 13329-13330 + 6048-6049) so a hidden rail
 * (display:none, dropdown closed, etc.) catches up to the right
 * width once it becomes visible.
 *
 * Cleanup: when the last subscriber unsubscribes, the rAF stops and
 * the rail's transform is reset to identity so an idle rail isn't
 * frozen mid-scroll.
 */

const DESKTOP_PX_PER_SEC = 45;
const MOBILE_PX_PER_SEC = 28;

interface Sub {
    rail: HTMLElement;
    offset: number;
    halfWidth: number;
    lastTs: number;
    /** Per-rail LOCKED speed (px/sec). When set, this rail ignores the shared
        Tape constants — a Tape retune can never drift it. The news banner pins
        its approved speed this way (Brendon, 2026-07-06). */
    speed?: { desktop: number; mobile: number };
}

const subs = new Set<Sub>();
let rafId: number | null = null;
let resizeAttached = false;
let resizeT: ReturnType<typeof setTimeout> | null = null;

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

function tick(ts: number): void {
    const sharedPxPerSec = getTapeSpeed();
    const mobile = isMobile();
    for (const s of subs) {
        if (!s.rail.isConnected) continue;
        const pxPerSec = s.speed ? (mobile ? s.speed.mobile : s.speed.desktop) : sharedPxPerSec;
        if (!s.halfWidth) {
            s.halfWidth = s.rail.scrollWidth / 2;
            if (!s.halfWidth) {
                // Rail not yet measurable (display:none / 0-width).
                // Skip transform write; retry next tick.
                continue;
            }
        }
        const dt = s.lastTs ? (ts - s.lastTs) / 1000 : 0;
        s.lastTs = ts;
        s.offset += pxPerSec * dt;
        if (s.halfWidth > 0 && s.offset >= s.halfWidth) {
            s.offset -= s.halfWidth;
        }
        s.rail.style.transform = `translate3d(${-s.offset}px, 0, 0)`;
    }
    rafId = requestAnimationFrame(tick);
}

function ensureLoop(): void {
    if (rafId != null) return;
    if (typeof window === 'undefined') return;
    if (prefersReducedMotion()) return;
    rafId = requestAnimationFrame(tick);
}

function stopLoop(): void {
    if (rafId != null) {
        cancelAnimationFrame(rafId);
        rafId = null;
    }
}

function ensureResizeListener(): void {
    if (resizeAttached || typeof window === 'undefined') return;
    resizeAttached = true;
    window.addEventListener(
        'resize',
        () => {
            if (resizeT) clearTimeout(resizeT);
            resizeT = setTimeout(() => {
                for (const s of subs) {
                    s.halfWidth = 0;
                }
            }, 150);
        },
        { passive: true },
    );
}

/**
 * Register a rail element with the engine. The element should already
 * have its content populated and doubled (so scrollWidth / 2 = one
 * full stream length).
 *
 * Returns an unsubscribe handler. When the last subscriber leaves,
 * the rAF loop stops and the rail transform is reset.
 */
export function subscribeTapeRail(
    rail: HTMLElement,
    speed?: { desktop: number; mobile: number },
): () => void {
    if (typeof window === 'undefined') return () => undefined;

    ensureResizeListener();

    const sub: Sub = {
        rail,
        offset: 0,
        halfWidth: 0,
        lastTs: 0,
        speed,
    };
    subs.add(sub);
    ensureLoop();

    return () => {
        subs.delete(sub);
        rail.style.transform = 'translate3d(0, 0, 0)';
        if (subs.size === 0) stopLoop();
    };
}
