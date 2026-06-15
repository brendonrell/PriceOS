'use client';

/*
 * SwRegistrar — now a KILLER (Brendon, 2026-06-15).
 *
 * Offline support was pinning stale builds on devices, so it's removed. This no
 * longer registers anything: it unregisters any existing service worker and
 * clears all caches on load, so the app always runs straight from the network.
 * public/sw.js is a matching self-destruct worker for devices still controlled
 * by the old one. (Component name kept so the layout import is unchanged.)
 */

import { useEffect } from 'react';

export default function SwRegistrar() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .getRegistrations?.()
      .then((regs) => regs.forEach((r) => r.unregister().catch(() => {})))
      .catch(() => {});

    if ('caches' in window) {
      caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {});
    }
  }, []);

  return null;
}
