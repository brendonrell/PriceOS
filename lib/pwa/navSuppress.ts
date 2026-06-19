/*
 * navSuppress — a tiny shared latch to swallow the synthetic click that iOS
 * fires AFTER a long-press (Brendon 2026-06-19).
 *
 * The PWA external-link interceptor (PriceOSShell) runs in the capture phase, so
 * it routes an anchor to Safari BEFORE the anchor's own onClick can cancel it.
 * When a long-press already handled the gesture (e.g. star a soundtrack), the
 * trailing click must NOT also open the link. The long-press handler arms this
 * latch; the interceptor consumes it and swallows that one click.
 */

let suppressUntil = 0;

/** Arm: swallow the next external-nav click for a short window. */
export function suppressNav(ms = 700): void {
    suppressUntil = Date.now() + ms;
}

/** True while the latch is armed (the interceptor checks this). */
export function navSuppressed(): boolean {
    return Date.now() < suppressUntil;
}

/** Disarm immediately. */
export function clearNavSuppress(): void {
    suppressUntil = 0;
}
