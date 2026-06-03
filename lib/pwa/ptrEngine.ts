/*
 * F43 / BUG-05 — PWA pull-to-refresh engine
 *
 * Sim 5637-5699. When the page runs in standalone PWA mode (iOS
 * home-screen install or Chrome installed-app), the native browser
 * pull-to-refresh gesture isn't available. Sim ports its own:
 * a touchstart→move→end gesture sampled at the document level, with
 * an ambient gradient overlay that fades in via a power curve and
 * triggers location.reload() once the threshold is exceeded.
 *
 * Engine ownership:
 *   - mountPtr() is idempotent — guards on a module flag so duplicate
 *     mounts (StrictMode double-effects, body-class flicker) don't
 *     install duplicate handlers.
 *   - The engine itself owns the overlay DOM node (creation +
 *     removal) — keeps cleanup atomic when the consumer unmounts.
 *   - PTR_THRESHOLD = 100, power curve Math.pow(raw, 2.5),
 *     overlay opacity gated to 0 below raw=0.2 then `eased * 0.92`.
 *     Threshold trigger sets opacity 0 and fires
 *     `setTimeout(location.reload, 380)` so the fade reads before
 *     the navigation. All values verbatim from sim.
 *
 * Sim reads --bg-color and --text-color from documentElement at
 * touchstart and uses the text-color rgb to build the gradient
 * (text always contrasts bg per the theme system). Same here.
 */

const PTR_THRESHOLD = 100;

let mounted = false;
let overlayEl: HTMLDivElement | null = null;
let cleanup: (() => void) | null = null;

export function mountPtr(): void {
    if (mounted) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    mounted = true;

    // Ambient pull overlay — color derived from current theme at touch time
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;top:0;left:0;right:0;' +
        'height:calc(env(safe-area-inset-top) + 72px);' +
        'opacity:0;z-index:99998;pointer-events:none;' +
        'transition:opacity 0.5s ease;';
    document.body.appendChild(overlay);
    overlayEl = overlay;

    let ptrStartY = 0;
    let ptrActive = false;
    let ptrTriggered = false;

    function setOverlayColor() {
        // Use the text color (always contrasts bg per colorway) for the
        // gradient so it works on every theme — sim 5650-5657.
        const txt = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color')
            .trim();
        const hex = txt.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) || 0;
        const g = parseInt(hex.substr(2, 2), 16) || 0;
        const b = parseInt(hex.substr(4, 2), 16) || 0;
        overlay.style.background =
            `linear-gradient(to bottom, rgba(${r},${g},${b},0.28) 0%, transparent 100%)`;
    }

    const onTouchStart = (e: TouchEvent) => {
        if (window.scrollY === 0) {
            ptrStartY = e.touches[0].clientY;
            ptrActive = true;
            ptrTriggered = false;
            setOverlayColor();
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!ptrActive) return;
        const dy = e.touches[0].clientY - ptrStartY;
        if (dy > 0) {
            // Power-curve easing — barely visible early, builds
            // deliberately near threshold.
            const raw = Math.min(dy / PTR_THRESHOLD, 1);
            const eased = Math.pow(raw, 2.5);
            overlay.style.transition = 'none';
            overlay.style.opacity = raw > 0.2 ? String(eased * 0.92) : '0';
        }
    };

    const onTouchEnd = (e: TouchEvent) => {
        if (!ptrActive) return;
        const dy = e.changedTouches[0].clientY - ptrStartY;
        if (dy > PTR_THRESHOLD && !ptrTriggered) {
            ptrTriggered = true;
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
            setTimeout(() => location.reload(), 380);
        } else {
            overlay.style.transition = 'opacity 0.5s ease';
            overlay.style.opacity = '0';
        }
        ptrActive = false;
    };

    const onTouchCancel = () => {
        ptrActive = false;
        overlay.style.transition = 'opacity 0.5s ease';
        overlay.style.opacity = '0';
    };

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: true });
    document.addEventListener('touchend', onTouchEnd, { passive: true });
    document.addEventListener('touchcancel', onTouchCancel, { passive: true });

    cleanup = () => {
        document.removeEventListener('touchstart', onTouchStart);
        document.removeEventListener('touchmove', onTouchMove);
        document.removeEventListener('touchend', onTouchEnd);
        document.removeEventListener('touchcancel', onTouchCancel);
        if (overlayEl && overlayEl.parentNode) {
            overlayEl.parentNode.removeChild(overlayEl);
        }
        overlayEl = null;
        mounted = false;
    };
}

export function unmountPtr(): void {
    if (cleanup) cleanup();
    cleanup = null;
}
