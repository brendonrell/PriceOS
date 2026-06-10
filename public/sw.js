/*
 * PD service worker — offline support, network-first BY DESIGN.
 *
 * History: next-pwa's cache-first runtime caching pinned stale bundles on
 * devices (the "stuck sold-out / stuck colour" bug class), so it was removed
 * and SwKiller tore down its workers. This replacement is hand-written around
 * one invariant: WHEN ONLINE, EVERY PAGE COMES FROM THE NETWORK. The cache is
 * consulted only when the network is unreachable, so a stale pin is
 * structurally impossible.
 *
 * What it does:
 *  - Page navigations: network-first. Successful responses are copied into a
 *    small trimmed cache so recently-visited pages still open offline; if a
 *    page was never visited, fall back to /offline.
 *  - /_next/static/*: cache-first. Safe because Next content-hashes these
 *    filenames — a new deploy means new URLs, never a stale hit.
 *  - NEVER touched: non-GET requests, /api/*, and ALL cross-origin traffic
 *    (Supabase, Alchemy/RPC, WalletConnect) — those behave exactly as if no
 *    service worker existed.
 *  - On activate: deletes every cache from older versions (bump VERSION to
 *    wipe the slate) and takes over open tabs immediately.
 */

const VERSION = 'pd-sw-v1';
const PAGES = `${VERSION}-pages`;
const ASSETS = `${VERSION}-assets`;
const OFFLINE_URL = '/offline';
const MAX_PAGES = 30;

/* Cache /offline plus the build assets its HTML references, so the fallback
   renders (and hydrates) with no connection. Re-run once per SW wake so the
   asset references track the current deploy. */
async function precacheOffline() {
  try {
    const res = await fetch(OFFLINE_URL, { cache: 'no-store' });
    if (!res.ok) return;
    const html = await res.clone().text();
    const pages = await caches.open(PAGES);
    await pages.put(OFFLINE_URL, res);
    const assets = await caches.open(ASSETS);
    const urls = [...new Set(
      [...html.matchAll(/\/_next\/static\/[^"'\s>]+/g)].map((m) => m[0])
    )];
    await Promise.all(urls.map(async (u) => {
      try {
        const r = await fetch(u);
        if (r.ok) await assets.put(u, r);
      } catch { /* asset fetch failed — fallback degrades gracefully */ }
    }));
  } catch { /* offline at install time — nothing to precache */ }
}

self.addEventListener('install', (event) => {
  event.waitUntil(precacheOffline().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

async function cacheFirstAsset(req) {
  const cache = await caches.open(ASSETS);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) cache.put(req, res.clone());
  return res;
}

async function trimPages(cache) {
  const keys = await cache.keys();
  // insertion order — drop oldest first; never evict the offline fallback
  const evictable = keys.filter((k) => new URL(k.url).pathname !== OFFLINE_URL);
  for (let i = 0; i < evictable.length - MAX_PAGES; i++) {
    await cache.delete(evictable[i]);
  }
}

async function networkFirstPage(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) {
      cache.put(req, res.clone()).then(() => trimPages(cache)).catch(() => {});
    }
    return res;
  } catch {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    const offline = await cache.match(OFFLINE_URL);
    return offline || Response.error();
  }
}

let refreshedThisWake = false;

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // Supabase/RPC/etc: hands off
  if (url.pathname.startsWith('/api/')) return; // never cache the API

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirstAsset(req));
    return;
  }

  if (req.mode === 'navigate') {
    if (!refreshedThisWake) {
      refreshedThisWake = true;
      event.waitUntil(precacheOffline());
    }
    event.respondWith(networkFirstPage(req));
  }
  // anything else same-origin: untouched, normal network behaviour
});
