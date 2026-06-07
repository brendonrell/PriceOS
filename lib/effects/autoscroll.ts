/*
 * Auto-Scroll mode helpers — Brendon list item 10.
 *
 * Sim refs: 9440-9456 (`window._applyAutoScroll`).
 *
 * Sim runs a setInterval at 40ms that walks the page down 1px per tick,
 * pausing when the tab is hidden (document.hidden) and looping back to
 * the top when it hits the bottom. No body class — the mode lives
 * entirely as a JS interval. (Sim 9958's `autoscroll-mode` body class
 * is set only by the Setup Code apply path as a decorative marker; it
 * has no CSS scoped to it.)
 *
 * Module-level interval handle so start is idempotent across React
 * StrictMode double-mount + survives the next render. Backgrounds.tsx
 * owns the lifecycle: useEffect on `notifs.autoscroll` → start on true,
 * stop on false, return stopAutoScroll on unmount.
 */

let _autoScrollInterval: number | null = null;

/** Start the auto-scroll interval. Idempotent — calls after the first
 *  one are no-ops until stopAutoScroll() runs. */
export function startAutoScroll(): void {
    if (typeof window === 'undefined') return;
    if (_autoScrollInterval !== null) return;
    _autoScrollInterval = window.setInterval(() => {
        if (document.hidden) return;
        // Sim 9446-9447 — when the page is at (or within 10px of) the
        // bottom, jump back to the top instantly. Otherwise scroll down
        // 1px per tick. behavior:'instant' avoids the smooth-scroll ramp
        // that would otherwise compound with the next tick's scrollBy.
        if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight - 10) {
            window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
        } else {
            window.scrollBy(0, 1);
        }
    }, 40);
}

/** Stop the auto-scroll interval. Idempotent. */
export function stopAutoScroll(): void {
    if (_autoScrollInterval !== null) {
        if (typeof window !== 'undefined') window.clearInterval(_autoScrollInterval);
        _autoScrollInterval = null;
    }
}
