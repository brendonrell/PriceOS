'use client';

/*
 * openExternal — open external links from the installed PWA in a real Safari
 * surface (with chrome + a way back), never trapped inside the app's webview.
 *
 * Hard platform reality (researched 2026-06-25): iOS gives an installed
 * standalone web app NO way to hand a link to the real Safari APP — every
 * navigation stays inside the app's own webview. The earlier attempt here
 * (assigning location.href in standalone) made that worst case: it loaded the
 * external site INSIDE the chrome-less PWA shell, with no address bar and no
 * back — the user was trapped (Brendon, 2026-06-25). The ceiling iOS actually
 * allows is the slide-up Safari panel (real Safari address bar + a Done button
 * to return), which `window.open(url, '_blank')` opens. So in standalone we use
 * that; everywhere else (desktop, mobile web) it's the normal new tab.
 */

/** True when running as an installed/standalone PWA (iOS or the standard
    display-mode query). SSR-safe. */
export function isStandalonePWA(): boolean {
    if (typeof window === 'undefined') return false;
    const iosStandalone =
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    const mq =
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(display-mode: standalone)').matches;
    return iosStandalone || mq;
}

/** Open an external URL. In a standalone PWA this opens the slide-up Safari
    panel (real Safari chrome + Done button), never trapping the user in the
    app's webview; everywhere else it opens a normal new tab. */
export function openExternal(url: string): void {
    if (typeof window === 'undefined') return;
    window.open(url, '_blank', 'noopener,noreferrer');
}
