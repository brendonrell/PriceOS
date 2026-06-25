'use client';

/*
 * openExternal — force external links OUT of the iOS in-app browser.
 *
 * The problem (Brendon, 2026-06-13, iPhone 12 / iOS 26): in an installed PWA
 * (display: standalone), `target="_blank"` and `window.open(url, '_blank')`
 * spawn an in-app SFSafariViewController sheet that covers the app and has to
 * be manually dismissed. We want every external link to hand off to real
 * mobile Safari instead.
 *
 * The lever: iOS standalone web apps open a SAME-WINDOW top-level navigation to
 * an OUT-OF-ORIGIN URL in Safari (the standalone app itself stays put) — it's
 * the `_blank` target / window.open that triggers the in-app sheet. So in
 * standalone we assign location.href; everywhere else (desktop, mobile web) we
 * keep the normal new-tab behaviour.
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

/** Open an external URL. In a standalone PWA this hands off to Safari (no
    in-app sheet); otherwise it opens a normal new tab. */
export function openExternal(url: string): void {
    if (typeof window === 'undefined') return;
    if (isStandalonePWA()) {
        window.location.href = url;
        return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
}
