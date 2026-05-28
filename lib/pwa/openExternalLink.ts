/**
 * openExternalLink
 *
 * iOS PWA (standalone mode) blocks `window.open` from triggering
 * universal links / native-app deep links — it drops into the in-app
 * WKWebView browser instead. The only reliable way to pop out to
 * Safari (and let iOS intercept universal links like YouTube, Discord,
 * etc.) is to programmatically click a real <a> element that has both
 * `target="_blank"` and `rel="noopener noreferrer"` set as DOM
 * attributes before the click fires.
 *
 * On non-PWA / non-iOS contexts the same approach works identically
 * to the old window.open call, so this is a safe universal replacement.
 *
 * Usage:
 *   import { openExternalLink } from '../../lib/pwa/openExternalLink';
 *   openExternalLink('https://youtube.com/...');
 */
export function openExternalLink(url: string): void {
  try {
    const a = document.createElement('a');
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // Must be in the DOM for iOS to honour it; hidden is fine.
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    // Clean up immediately after the click event is dispatched.
    document.body.removeChild(a);
  } catch {
    // Fallback for any unusual environment.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
