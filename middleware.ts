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
// Sensitive routes — auth, identity creation, and the free social/scoring
// actions an attacker would script to brute-force or sybil-farm — get a much
// tighter per-IP cap. Even on the in-memory fallback this raises the bar.
const SENSITIVE_LIMIT = 15;
// Sensitive for EVERY method — auth flows and the enumeration-shaped checks.
const SENSITIVE_PREFIXES = [
  '/api/auth',
  '/api/users/create',
  '/api/anoint',
  '/api/streak',
  '/api/achievements/evaluate',
  '/api/handle/check',
  '/api/project-handle/check',
];
// Sensitive for WRITES only. The follow surfaces serve heavy legitimate GET
// traffic (every follow button + follower modal reads them) — counting those
// reads against the 15/min budget let one profile page 429 itself and every
// button silently render "not following". Reads ride the normal bucket; the
// scriptable POST/DELETE actions keep the tight cap. Also covers the outputs
// self-population writes (now authed) so they can't be sprayed.
const SENSITIVE_WRITE_PREFIXES = [
  '/api/follows',
  '/api/project-follows',
  '/api/output-follows',
  '/api/outputs/color',
  '/api/outputs/traits',
];
const WINDOW_MS = 60_000;
const WINDOW_S = 60;

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

function getClientIp(req: NextRequest): string {
  // Prefer the platform-trusted IP. Vercel populates x-real-ip at the edge with
  // the true client IP — this replaced the removed `req.ip` in Next 15 and
  // carries the same value. The x-forwarded-for header is client-spoofable, so
  // it's only a fallback for non-Vercel/local runs — never the primary source.
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
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
async function upstashIncr(bucketKey: string): Promise<number | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const key = `rl:${bucketKey}`;
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

function inMemoryIncr(bucketKey: string): { count: number; resetMs: number } {
  const now = Date.now();
  const bucket = buckets.get(bucketKey);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + WINDOW_MS });
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

  // Sensitive routes get a tighter cap and a SEPARATE counter bucket, so heavy
  // legitimate read traffic can't mask an auth/sybil-farming burst.
  const isRead = req.method === 'GET' || req.method === 'HEAD';
  const sensitive =
    SENSITIVE_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p)) ||
    (!isRead &&
      SENSITIVE_WRITE_PREFIXES.some((p) => req.nextUrl.pathname.startsWith(p)));
  const limit = sensitive ? SENSITIVE_LIMIT : RATE_LIMIT;
  const bucketKey = `${sensitive ? 's' : 'n'}:${ip}`;

  // Prefer the distributed limiter when configured.
  const distributed = await upstashIncr(bucketKey);
  if (distributed !== null) {
    if (distributed > limit) return rateLimited(WINDOW_MS);
    return NextResponse.next();
  }

  // Fallback: per-instance, best-effort.
  const { count, resetMs } = inMemoryIncr(bucketKey);
  if (count > limit) return rateLimited(resetMs);
  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
