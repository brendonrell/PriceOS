'use client';

/*
 * SwRegistrar — registers the offline service worker (public/sw.js) and nudges
 * the browser to check for a newer worker whenever the app returns to the
 * foreground (matters for the iOS home-screen PWA, where hard navigations —
 * the usual update trigger — are rare).
 *
 * Replaces SwKiller (2026-06-10): the killer existed because next-pwa's
 * cache-first worker pinned stale bundles. The new worker is network-first for
 * all pages — fresh code always wins while online — so registration is safe
 * again. See public/sw.js for the full design notes.
 */

import { useEffect } from 'react';

export default function SwRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;

    let reg: ServiceWorkerRegistration | undefined;
    navigator.serviceWorker
      .register('/sw.js')
      .then((r) => { reg = r; })
      .catch(() => { /* registration failure = no offline support, app unaffected */ });

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        reg?.update().catch(() => {});
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  return null;
}
