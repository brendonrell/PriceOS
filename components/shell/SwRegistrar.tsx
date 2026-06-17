'use client';

/*
 * SwRegistrar — registers the zero-cache installability worker.
 *
 * History: offline caching pinned stale builds, so the worker was ripped out and
 * this file became a killer. We now register a deliberately minimal worker
 * (public/sw.js) whose ONLY job is to make Chrome/Android offer the "Install
 * app" / Add-to-Home-Screen prompt. It caches nothing and never intercepts
 * responses, so the site stays live — no return of the stale-build problem.
 */

import { useEffect } from 'react';

export default function SwRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    // Defensive: clear any caches a previous (caching) worker may have left, so
    // a device upgrading from the old build can never serve stale assets.
    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {});
  }, []);

  return null;
}
