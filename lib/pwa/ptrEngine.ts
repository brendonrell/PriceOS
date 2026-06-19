/*
 * PWA pull-to-refresh engine (rebuilt 2026-06-19 — release-to-refresh + feel).
 *
 * A real pull-to-refresh, decided on RELEASE — not mid-pull (mid-pull firing is
 * what made the previous build feel "way too sensitive"):
 *
 *   - While dragging from the top, a colorway-tinted band follows the pull with
 *     rubber-band RESISTANCE (a damping curve: it moves less the further you
 *     pull). The arming THRESHOLD is measured against raw finger travel; once
 *     past it the band snaps to a full "release to refresh" state.
 *   - The refresh commits ONLY on touchend, and ONLY if the pull passed the
 *     threshold at release. Released early → snaps back, nothing happens.
 *   - On a valid release it shows the full-screen loading cover and reloads on
 *     the next frame (the cover paints first) — no timeout, instant feedback.
 *   - Engages only when the document is genuinely at the top, the gesture
 *     didn't start inside a scrolled inner scroller, it's a single finger, and
 *     no modal / Bench drag is in play — so it never false-fires.
 *   - Listeners stay PASSIVE and we never preventDefault: the native iOS
 *     document rubber-band IS the visible pull (the page follows the finger).
 *     An earlier build suppressed it, which left nothing moving — "doesn't pull".
 *
 * Haptics: a short Vibration-API buzz fires on commit. That's a real haptic on
 * Android; iOS ignores it (no web haptics in an iOS PWA) — harmless either way.
 */

const PTR_THRESHOLD = 80;   // px of RAW downward pull (at release) that refreshes
const TOP_EPSILON = 2;      // px slop on "at top" (sub-pixel scroll offsets)
const MAX_PULL = 150;       // px the damped band asymptotes toward

let mounted = false;
let overlayEl: HTMLDivElement | null = null;
let coverEl: HTMLDivElement | null = null;
let cleanup: (() => void) | null = null;

export function mountPtr(): void {
    if (mounted) return;
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    mounted = true;

    /* Pull overlay — a colorway-tinted band that grows with the damped pull. */
    const overlay = document.createElement('div');
    overlay.style.cssText =
        'position:fixed;top:0;left:0;right:0;' +
        'height:calc(env(safe-area-inset-top) + 84px);' +
        'opacity:0;z-index:99998;pointer-events:none;' +
        'transition:opacity 0.3s ease;';
    document.body.appendChild(overlay);
    overlayEl = overlay;

    let startY = 0;
    let active = false;     // a valid pull is in progress (started at top)
    let pulling = false;    // finger has moved downward past the start
    let committed = false;  // refresh fired — ignore everything else
    let lastRaw = 0;        // raw finger travel at the most recent move

    /* The document is the scroller (body is a flex column, main is flex:1 — no
       inner page-scroll container). "At top" = document scroll offset ~0. */
    const atTop = (): boolean => {
        const y =
            window.scrollY ||
            document.scrollingElement?.scrollTop ||
            document.documentElement.scrollTop ||
            0;
        return y <= TOP_EPSILON;
    };

    /* Don't fight the Bench hold-drag or a pull inside an open modal. */
    const blocked = (): boolean => {
        const cl = document.body.classList;
        return cl.contains('bench-dragging') || cl.contains('modal-open');
    };

    /* Bail if the gesture began inside an inner overflow scroller that is itself
       scrolled down (lists, modal bodies) — only the page top should pull. */
    const startedInScrolledInner = (target: EventTarget | null): boolean => {
        let node = target as HTMLElement | null;
        while (node && node !== document.body) {
            if (node.scrollTop > TOP_EPSILON) {
                const oy = getComputedStyle(node).overflowY;
                if (oy === 'auto' || oy === 'scroll') return true;
            }
            node = node.parentElement;
        }
        return false;
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

    /* Linear, 1:1 tracking (capped at MAX_PULL) — a NORMAL pull, not the old
       exponential rubber-band that fought the finger and read as "aggressive"
       (Brendon 2026-06-19). */
    const damp = (raw: number): number => Math.min(raw, MAX_PULL);
    const armedVisual = damp(PTR_THRESHOLD);

    const resetGesture = () => { active = false; pulling = false; lastRaw = 0; };

    const snapBack = () => {
        overlay.style.transition = 'opacity 0.3s ease';
        overlay.style.opacity = '0';
    };

    /* Commit: haptic + show the loading cover NOW, reload next frame so the
       cover paints before navigation. */
    const commit = () => {
        if (committed) return;
        committed = true;
        resetGesture();
        try { navigator.vibrate?.(12); } catch { /* unsupported (iOS) */ }

        overlay.style.transition = 'opacity 0.15s ease';
        overlay.style.opacity = '1';

        const cover = document.createElement('div');
        cover.className = 'ptr-refresh-cover';
        cover.setAttribute('role', 'status');
        cover.setAttribute('aria-label', 'Refreshing');
        cover.innerHTML =
            '<span class="pd-load-panel"><span class="pd-load-text">' +
            '<span>L</span><span>o</span><span>a</span><span>d</span><span>i</span><span>n</span><span>g</span>' +
            '</span></span>';
        document.body.appendChild(cover);
        coverEl = cover;

        requestAnimationFrame(() => location.reload());
    };

    const onTouchStart = (e: TouchEvent) => {
        if (committed) return;
        resetGesture();
        if (e.touches.length !== 1) return;            // ignore multi-touch
        if (blocked()) return;
        if (!atTop()) return;                           // started mid-scroll
        if (startedInScrolledInner(e.target)) return;   // inner scroller
        startY = e.touches[0].clientY;
        active = true;
    };

    const onTouchMove = (e: TouchEvent) => {
        if (committed || !active) return;
        if (e.touches.length !== 1 || blocked()) { resetGesture(); snapBack(); return; }

        const raw = e.touches[0].clientY - startY;
        lastRaw = raw;

        if (raw <= 0) {                  // pulling up / not moved down — let scroll be
            pulling = false;
            overlay.style.opacity = '0';
            return;
        }

        pulling = true;
        /* Listener stays PASSIVE — we do NOT preventDefault. The native iOS
           document rubber-band IS the pull (the page visibly follows the
           finger); suppressing it left nothing moving, so it felt dead. We just
           read the travel and ramp the tint; the decision happens on release. */

        const visual = damp(raw);
        overlay.style.transition = 'none';
        // Build toward 0.7 as you near the threshold, then snap to full when
        // armed — the "release to refresh" affordance (no haptics on iOS).
        overlay.style.opacity =
            raw >= PTR_THRESHOLD ? '1' : String(Math.min(visual / armedVisual, 1) * 0.7);
    };

    const onTouchEnd = () => {
        if (committed || !active) return;
        const shouldRefresh = pulling && lastRaw >= PTR_THRESHOLD;
        resetGesture();
        if (shouldRefresh) commit();
        else snapBack();
    };

    const onTouchCancel = () => {
        if (committed) return;
        resetGesture();
        snapBack();
    };

    setOverlayColor();

    document.addEventListener('touchstart', onTouchStart, { passive: true });
    // Passive — we never preventDefault; the native rubber-band is the pull.
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
        overlayEl = null;
        coverEl = null;
        mounted = false;
    };
}

export function unmountPtr(): void {
    if (cleanup) cleanup();
    cleanup = null;
}
