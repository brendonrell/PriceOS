import { NextRequest, NextResponse } from 'next/server';

// ─────────────────────────────────────────────────────────────────────────────
// /api rate limiter — 100 requests / 60s per IP.
// ─────────────────────────────────────────────────────────────────────────────
//
// This is a STUB. The in-memory Map is per-instance, lost on cold start, and
// not shared across Vercel edge regions, so the effective limit in prod is
// roughly N × 100 (where N = number of warm instances). It is good enough to
// blunt obvious abuse and to keep handlers honest during dev.
//
// Production swap: replace the bucket logic below with Upstash Redis (REST,
// edge-runtime safe). Pseudocode:
//
//   import { Redis } from '@upstash/redis';
//   const redis = Redis.fromEnv(); // UPSTASH_REDIS_REST_URL / _TOKEN
//   const key = `rl:${ip}`;
//   const count = await redis.incr(key);
//   if (count === 1) await redis.expire(key, 60);
//   if (count > 100) return rateLimited(...);
//
// Upstash isn't wired here because (a) it's a new dep and (b) the prompt
// says "stub". Add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to env
// when swapping in.
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

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

export function middleware(req: NextRequest): NextResponse {
  // Belt-and-suspenders: the matcher below already scopes to /api, but if the
  // matcher is ever broadened we don't want to rate-limit page navigations.
  if (!req.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  const ip = getClientIp(req);
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt < now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    console.log(`[rate-limit] ${ip} 1/${RATE_LIMIT}`);
    return NextResponse.next();
  }

  bucket.count += 1;

  if (bucket.count > RATE_LIMIT) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    console.warn(
      `[rate-limit] ${ip} exceeded ${RATE_LIMIT}/min (retry in ${retryAfter}s)`
    );
    return NextResponse.json(
      { error: 'Rate limit exceeded', code: 'RATE_LIMITED' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfter) },
      }
    );
  }

  console.log(`[rate-limit] ${ip} ${bucket.count}/${RATE_LIMIT}`);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
