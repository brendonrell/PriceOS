/*
 * Install-target platform detection for the PWA Step 3 prompt.
 *
 * Four buckets, because the "add to home screen" path differs per OS:
 *   ios     — iPhone Safari: Share → Add to Home Screen (no programmatic API)
 *   ipados  — iPad Safari: same, Share lives in the toolbar (and modern iPadOS
 *             reports as "Macintosh" with touch points, so sniff that too)
 *   android — Chrome: real native install prompt (beforeinstallprompt)
 *   desktop — macOS / Windows / Linux: pivot to "get it on your phone" + QR
 */

export type InstallOS = 'ios' | 'ipados' | 'android' | 'desktop';

/** True when the page is already running as the installed app. */
export function isStandalone(): boolean {
    if (typeof window === 'undefined') return false;
    // navigator.standalone is the iOS-only signal; display-mode covers the rest.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const iosStandalone = (window.navigator as any)?.standalone === true;
    const displayMode = window.matchMedia?.('(display-mode: standalone)')?.matches === true;
    return iosStandalone || displayMode;
}

export function detectInstallOS(): InstallOS {
    if (typeof navigator === 'undefined') return 'desktop';
    const ua = navigator.userAgent || '';
    // iPadOS 13+ Safari masquerades as macOS — disambiguate via touch points.
    const isIPad = /iPad/.test(ua) || (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);
    if (isIPad) return 'ipados';
    if (/iPhone|iPod/.test(ua)) return 'ios';
    if (/Android/.test(ua)) return 'android';
    return 'desktop';
}
