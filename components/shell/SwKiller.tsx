'use client';

/*
 * SwKiller — actively unregisters any previously-installed service worker and
 * clears its caches. We shipped next-pwa earlier; its caches could pin an old
 * app bundle on a device across reloads / phone resets (the "stuck sold-out /
 * stuck colour" class of bug). During the test phase we want fresh code to
 * always win, so the SW is disabled in next.config AND any already-installed SW
 * is torn down here. Runs once on mount, no-ops where unsupported.
 */

import { useEffect } from 'react';

export default function SwKiller() {
  useEffect(() => {
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations()
          .then((regs) => regs.forEach((r) => r.unregister()))
          .catch(() => {});
      }
      if (typeof caches !== 'undefined') {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
      }
    } catch {
      /* ignore */
    }
  }, []);
  return null;
}
