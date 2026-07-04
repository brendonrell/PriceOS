// GET /preview/{slug}/{id}.png — serves stored Artwork previews straight from R2
// via the worker's own binding. No public bucket, no token: NEXT_PUBLIC_ART_IMAGE_BASE
// points here (/preview), so reads are same-origin (clean canvases) and served by
// us. Long immutable cache so the browser + edge hold each image and R2 read-ops
// stay minimal. A missing key 404s; the render seam then falls back to the live
// engine. Deliberately NOT under /api (so it's outside the rate limiter) and NOT
// under /art (which is the Artwork page namespace).

import { getPreviewBucket } from '@/lib/cf/r2';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_req: Request, ctx: { params: Promise<{ key: string[] }> }) {
  const { key: parts } = await ctx.params;
  const key = (parts ?? []).join('/');
  if (!key.endsWith('.png') || key.includes('..')) {
    return new Response('Not found', { status: 404 });
  }

  const bucket = getPreviewBucket();
  if (!bucket) return new Response('Not found', { status: 404 });

  const obj = await bucket.get(key);
  if (!obj) return new Response('Not found', { status: 404 });

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  headers.set('cache-control', 'public, max-age=31536000, immutable');
  if (!headers.has('content-type')) headers.set('content-type', 'image/png');
  return new Response(obj.body, { headers });
}
