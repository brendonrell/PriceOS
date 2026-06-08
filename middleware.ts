import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// /api rate limiter — 100 requests / 60s per IP.
// ─────────────────────────────────────────────────────────────────────────────
//
// Two backends, chosen at runtime:
//   • Upstash Redis REST (distributed — correct across every serverless
//     instance and edge region) when UPSTASH_REDIS_REST_URL +
//     UPSTASH_REDIS_REST_TOKEN are set. This is the production limiter.
//   • In-memory fallback (per-instance, best-effort) when they are not. Good
//     enough for dev; NOT a real limit in production (each warm instance keeps
//     its own counter), which is why the Upstash path exists.
//
// The limiter FAILS OPEN: if the Upstash call errors, the request is allowed
// rather than taking the whole API down with the limiter.
//
// To switch on the real limiter: create an Upstash Redis database and set
// UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in the environment. No
// code change needed — the middleware picks them up.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;
const WINDOW_S = 60;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  // Vercel sets x-forwarded-for with the client IP first, then any proxies.
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return 'unknown';
}

function rateLimited(resetMs: number): NextResponse {
  const retryAfter = Math.max(1, Math.ceil(resetMs / 1000));
  return NextResponse.json(
    { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
    { status: 429, headers: { 'Retry-After': String(retryAfter) } }
  );
}

// Distributed counter via Upstash REST. Returns the post-increment count, or
// null when Upstash isn't configured or the call failed (caller falls back to
// the in-memory limiter / allows the request).
async function upstashIncr(ip: string): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const key = `rl:${ip}`;
    // One round-trip: INCR the counter, and set a 60s TTL only if the key is
    // new (NX) so the window is fixed from the first hit.
    const res = await fetch(`${url}/pipeline`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify([
        ['INCR', key],
        ['EXPIRE', key, String(WINDOW_S), 'NX'],
      ]),
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const out = (await res.json()) as Array<{ result?: number }>;
    const count = out?.[0]?.result;
    return typeof count === 'number' ? count : null;
  } catch {
    return null; // fail open
  }
}

function inMemoryIncr(ip: string): { count: number; resetMs: number } {
  const now = Date.now();
  const bucket = buckets.get(ip);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { count: 1, resetMs: WINDOW_MS };
  }
  bucket.count += 1;
  return { count: bucket.count, resetMs: bucket.resetAt - now };
}

export async function middleware(req: NextRequest): Promise<NextResponse> {
  // Belt-and-suspenders: the matcher below already scopes to /api, but if the
  // matcher is ever broadened we don't want to rate-limit page navigations.
  if (!req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);

  // Prefer the distributed limiter when configured.
  const distributed = await upstashIncr(ip);
  if (distributed !== null) {
    if (distributed > RATE_LIMIT) return rateLimited(WINDOW_MS);
    return NextResponse.next();
  }

  // Fallback: per-instance, best-effort.
  const { count, resetMs } = inMemoryIncr(ip);
  if (count > RATE_LIMIT) return rateLimited(resetMs);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
