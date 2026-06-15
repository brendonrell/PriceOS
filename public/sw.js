/*
 * PD service worker — DISABLED / SELF-DESTRUCT (Brendon, 2026-06-15).
 *
 * Offline caching was handing devices stale builds (a new deploy wouldn't show
 * until the cached copy was evicted) — not worth it. This worker no longer
 * caches anything. Kept as a file (not deleted) so already-installed workers
 * fetch THIS on their next update check and tear themselves down: it clears
 * every cache, unregisters itself, and reloads open tabs so they run straight
 * from the network. After that no service worker controls the app at all.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    try { await self.registration.unregister(); } catch { /* ignore */ }
    try {
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach((c) => c.navigate(c.url));
    } catch { /* ignore */ }
  })());
});

// No fetch handler — every request goes straight to the network, as if no
// service worker existed.
