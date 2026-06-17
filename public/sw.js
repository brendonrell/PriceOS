/*
 * PD service worker — INSTALLABILITY ONLY, ZERO CACHING (Brendon, 2026-06-17).
 *
 * PD must always be a LIVE site. A previous caching worker pinned stale builds
 * (new deploys wouldn't show), so it was ripped out. This worker exists for ONE
 * reason: Chrome/Android only offers the "Install app" / Add-to-Home-Screen
 * prompt when a service worker WITH a fetch handler controls the page. So we
 * ship the smallest possible one:
 *   - it caches NOTHING,
 *   - its fetch handler is a no-op, so every request falls through to the
 *     network exactly as if no worker existed (no staleness, ever),
 *   - it activates immediately and wipes any caches an old worker left behind.
 */
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    // Drop any caches a previous (caching) worker may have left behind.
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    } catch { /* ignore */ }
    try { await self.clients.claim(); } catch { /* ignore */ }
  })());
});

// No-op fetch handler: present so Chrome deems the app installable, but it never
// calls respondWith — the browser handles every request straight from the
// network. Nothing is cached or intercepted, so the site stays live.
self.addEventListener('fetch', () => { /* network passthrough */ });
