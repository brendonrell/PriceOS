/*
 * Screen Wake Lock — keep the display awake during the moments that matter
 * (a mint in flight, a reveal), so the screen never dims/sleeps mid-action.
 *
 * Native-app feel: iOS 16.4+ PWAs and modern Chromium support the Wake Lock
 * API. Everywhere it's missing, every call is a silent no-op — the feature
 * simply doesn't engage, nothing breaks.
 *
 * Reference-counted: nested/overlapping holds (two mints at once) share ONE
 * underlying sentinel and only release when the last holder lets go. The OS
 * drops a wake lock whenever the tab is hidden; we re-acquire on the next
 * visibility-visible while any holder is still active, so a backgrounded-then-
 * foregrounded mint keeps the screen lit.
 */

type WakeLockSentinel = { released: boolean; release: () => Promise<void> };

let sentinel: WakeLockSentinel | null = null;
let holders = 0;
let visibilityBound = false;

function supported(): boolean {
  return typeof navigator !== 'undefined' && 'wakeLock' in navigator;
}

async function acquireSentinel(): Promise<void> {
  if (!supported() || sentinel || holders === 0) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = await (navigator as any).wakeLock.request('screen');
    sentinel = s as WakeLockSentinel;
    // If the OS auto-releases it (tab hidden), forget the stale handle so the
    // visibility handler knows to re-request.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s as any).addEventListener?.('release', () => {
      if (sentinel === s) sentinel = null;
    });
  } catch {
    /* user-agent refused (low battery, perms) — best-effort, no-op */
  }
}

function bindVisibility(): void {
  if (visibilityBound || typeof document === 'undefined') return;
  visibilityBound = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && holders > 0 && !sentinel) {
      void acquireSentinel();
    }
  });
}

/** Take a wake-lock hold. Returns a release() you MUST call (idempotent). */
export function acquireWakeLock(): () => void {
  if (!supported()) return () => {};
  bindVisibility();
  holders += 1;
  void acquireSentinel();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    holders = Math.max(0, holders - 1);
    if (holders === 0 && sentinel) {
      const s = sentinel;
      sentinel = null;
      void s.release().catch(() => {});
    }
  };
}
