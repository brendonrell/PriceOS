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

/* ── 3D Pingtoasts — native push (Brendon, 2026-06-26) ─────────────────────────
 * The ONLY stateful job this worker has beyond installability. The server
 * (lib/push/webpush.ts) sends a JSON payload { title, body, tag, icon, badge,
 * url }; we surface it as a real OS notification. Title carries the recipient's
 * PriceSprite face, body carries the canonical ping glyph + content — all plain
 * text, so it renders on-brand on iOS, Android and desktop Chrome alike. */
self.addEventListener('push', (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || 'Price Discussion';
  const options = {
    body: data.body || '',
    tag: data.tag || 'pd-ping',
    icon: data.icon || '/icon-192px.png',
    badge: data.badge || '/icon-192-maskable.png',
    // renotify so a fresh ping in an existing tag still buzzes (not silently
    // replaced). data.url is where a tap lands.
    renotify: true,
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Tap a notification → focus an open PD window if there is one, else open it.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of all) {
      if ('focus' in client) {
        try { await client.focus(); } catch { /* ignore */ }
        if ('navigate' in client && url !== '/') {
          try { await client.navigate(url); } catch { /* ignore */ }
        }
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url);
  })());
});
