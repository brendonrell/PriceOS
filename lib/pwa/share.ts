/*
 * Native share — hand a URL to the OS share sheet (iOS/Android), falling back
 * to a clipboard copy where the Web Share API is absent (most desktop browsers).
 *
 * Returns how it resolved so the caller can toast the right line:
 *   'shared'    — the native sheet opened (and the user shared or dismissed it)
 *   'copied'    — no native sheet; the link was copied to the clipboard instead
 *   'unavailable' — neither path worked (very old browser / blocked clipboard)
 */

export type ShareResult = 'shared' | 'copied' | 'unavailable';

export async function shareLink(opts: {
  url: string;
  title?: string;
  text?: string;
}): Promise<ShareResult> {
  const { url, title, text } = opts;

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({ url, title, text });
      return 'shared';
    } catch (err) {
      // AbortError = the user dismissed the sheet on purpose. Treat that as a
      // completed share (no fallback copy, no error toast). Anything else falls
      // through to the clipboard path.
      if (err instanceof Error && err.name === 'AbortError') return 'shared';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      return 'copied';
    } catch {
      /* clipboard blocked — fall through */
    }
  }

  return 'unavailable';
}
