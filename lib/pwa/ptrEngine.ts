/*
 * PWA pull-to-refresh engine (rebuilt 2026-06-19 for reliability + feel).
 *
 * The old version only decided to refresh on touch-END, comparing the final
 * release delta to the threshold, then waited 380ms before reloading — so a
 * short or rubber-banded pull missed entirely ("works half the time") and the
 * ones that worked felt "hugely delayed". This version is a real pull-to-
 * refresh:
 *
 *   - It ARMS and fires the instant the pull crosses the threshold DURING the
 *     move — no waiting for release, no timeout. The reload commits on the next
 *     frame, so the loading screen appears immediately.
 *   - A haptic tick fires the moment it arms (Android via Vibration API; iOS
 *     17.4+ via the system "switch" control haptic — best-effort, since iOS
 *     web/PWA has no real haptics API).
 *   - The pull overlay responds from the first pixel (eased), so the gesture
 *     feels connected to the finger instead of dead until near the threshold.
 *   - It only engages when the page is genuinely at the top and no modal /
 *     Bench drag is in play, so it doesn't false-fire.
 */

const PTR_THRESHOLD = 80; // px of downward pull that arms the refresh

let mounted = false;
let overlayEl: HTMLDivElement | null = null;
let coverEl: HTMLDivElement | null = null;
let hapticLabel: HTMLLabelElement | null = null;
let cleanup: (() => void) | null = null;

export function mountPtr(): void {
    if (mounted) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    mounted = true;

    /* Pull overlay — a colorway-tinted band that fills as you pull. */
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;top:0;left:0;right:0;' +
        'height:calc(env(safe-area-inset-top) + 84px);' +
        'opacity:0;z-index:99998;pointer-events:none;' +
        'transition:opacity 0.3s ease;';
    document.body.appendChild(overlay);
    overlayEl = overlay;

    /* Hidden iOS switch control — toggling it inside the touch gesture fires
       the system haptic on iOS 17.4+ (the only web haptic iOS exposes). Kept
       off-screen; a no-op on browsers that don't support it. */
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.style.cssText =
        'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;';
    const sw = document.createElement('input');
    sw.type = 'checkbox';
    sw.setAttribute('switch', '');
    sw.tabIndex = -1;
    label.appendChild(sw);
    document.body.appendChild(label);
    hapticLabel = label;

    let startY = 0;
    let active = false;
    let armed = false;

    const atTop = (): boolean => {
        const y =
            window.scrollY ||
            document.scrollingElement?.scrollTop ||
            document.documentElement.scrollTop ||
            0;
        return y <= 0;
    };

    /* Don't fight the Bench hold-drag (a downward drag from the top) or a pull
       inside an open modal. */
    const blocked = (): boolean => {
        const cl = document.body.classList;
        return cl.contains('bench-dragging') || cl.contains('modal-open');
    };

    const fireHaptic = (): void => {
        try { navigator.vibrate?.(10); } catch { /* unsupported */ }
        try { hapticLabel?.click(); } catch { /* unsupported */ }
    };

    function setOverlayColor() {
        const txt = getComputedStyle(document.documentElement)
            .getPropertyValue('--text-color')
            .trim();
        const hex = txt.replace('#', '');
        const r = parseInt(hex.substr(0, 2), 16) || 0;
        const g = parseInt(hex.substr(2, 2), 16) || 0;
        const b = parseInt(hex.substr(4, 2), 16) || 0;
        overlay.style.background =
            `linear-gradient(to bottom, rgba(${r},${g},${b},0.34) 0%, transparent 100%)`;
    }

    const hideOverlay = () => {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
    };

    /* Commit the refresh: haptic + show the loading screen NOW, reload next
       frame so the screen actually paints before navigation. */
    const trigger = () => {
        if (armed) return;
        armed = true;
        active = false;
        fireHaptic();
        overlay.style.transition = 'opacity 0.15s ease';
        overlay.style.opacity = '1';

        const cover = document.createElement('div');
        cover.className = 'ptr-refresh-cover';
        cover.innerHTML =
            '<div class="route-loading" role="status" aria-label="Refreshing">' +
            '<span class="route-loading-dot"></span>' +
            '<span class="route-loading-dot"></span>' +
            '<span class="route-loading-dot"></span></div>';
        document.body.appendChild(cover);
        coverEl = cover;

        requestAnimationFrame(() =>
            requestAnimationFrame(() => location.reload()),
        );
    };

    const onTouchStart = (e: TouchEvent) => {
        if (armed) return;
        if (atTop() && !blocked()) {
            startY = e.touches[0].clientY;
            active = true;
            armed = false;
            setOverlayColor();
        } else {
            active = false;
        }
    };

    const onTouchMove = (e: TouchEvent) => {
        if (!active || armed) return;
        if (blocked()) { active = false; hideOverlay(); return; }
        const dy = e.touches[0].clientY - startY;
        if (dy <= 0) { overlay.style.opacity = '0'; return; }
        const raw = Math.min(dy / PTR_THRESHOLD, 1);
        // easeOutQuad — connected to the finger from the first pixel.
        const eased = 1 - (1 - raw) * (1 - raw);
        overlay.style.transition = 'none';
        overlay.style.opacity = String(eased);
        if (dy >= PTR_THRESHOLD) trigger();
    };

    const onTouchEnd = () => {
        if (armed) return;
        active = false;
        hideOverlay();
    };

    const onTouchCancel = () => {
        if (armed) return;
        active = false;
        hideOverlay();
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
        if (overlayEl?.parentNode) overlayEl.parentNode.removeChild(overlayEl);
        if (coverEl?.parentNode) coverEl.parentNode.removeChild(coverEl);
        if (hapticLabel?.parentNode) hapticLabel.parentNode.removeChild(hapticLabel);
        overlayEl = null;
        coverEl = null;
        hapticLabel = null;
        mounted = false;
    };
}

export function unmountPtr(): void {
    if (cleanup) cleanup();
    cleanup = null;
}
