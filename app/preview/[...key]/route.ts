// GET /preview/{slug}/{id}.png — serves stored Artwork previews straight from R2
// via the worker's own binding. No public bucket, no token: NEXT_PUBLIC_ART_IMAGE_BASE
// points here (/preview), so reads are same-origin (clean canvases) and served by
// us. Long immutable cache so the browser + edge hold each image and R2 read-ops
// stay minimal. A missing key 404s; the render seam then falls back to the live
// engine. Deliberately NOT under /api (so it's outside the rate limiter) and NOT
// under /art (which is the Artwork page namespace).
//
// Also serves the small tile thumbnail ({slug}/{id}.t256.png) and the ASCII
// Backup artifact ({slug}/{id}.ascii.json) pinned beside each preview PNG.
//
// EDGE CACHE (Brendon 2026-07-07): the R2 read + Node serialize cost ~1.5s per
// image and Cloudflare was NOT holding the dynamic response at the edge, so every
// load — and every visitor — re-pulled each image from R2 in full. The home
// page's dozens of tiles trickled in over minutes. We now store each served
// image in the Workers edge cache (caches.default), keyed by URL, so a warm edge
// returns it in ~tens of ms without touching R2. The content is immutable, so
// the cached copy never goes stale.

import { getPreviewBucket } from '@/lib/cf/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The Workers global edge cache, when present (absent in local dev / tests). */
function edgeCache(): { match(req: Request): Promise<Response | undefined>; put(req: Request, res: Response): Promise<void> } | null {
  const c = (globalThis as unknown as { caches?: { default?: unknown } }).caches?.default;
  return (c as ReturnType<typeof edgeCache>) ?? null;
}

export async function GET(req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params;
  const key = (parts ?? []).join('/');
  if ((!key.endsWith('.png') && !key.endsWith('.ascii.json')) || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  // Serve a warm edge copy when we have one (keyed by the full request URL).
  const cache = edgeCache();
  const cacheKey = new Request(new URL(req.url).toString());
  if (cache) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const bucket = getPreviewBucket();
  if (!bucket) return new Response('Not found', { status: 404 });

  const obj = await bucket.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  // Buffer the R2 stream once so the body is reusable — one copy to return, one
  // for the edge cache (a ReadableStream can only be consumed a single time).
  const buf = await new Response(obj.body).arrayBuffer();

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!headers.has('content-type')) {
    headers.set('content-type', key.endsWith('.ascii.json') ? 'application/json' : 'image/png');
  }

  if (cache) {
    // Best-effort — never let a cache write delay or fail the response.
    try { await cache.put(cacheKey, new Response(buf, { headers })); } catch { /* ignore */ }
  }
  return new Response(buf, { headers });
}
