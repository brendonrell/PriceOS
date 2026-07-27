// Cloudflare Worker entrypoint — wraps the OpenNext-generated handler so the
// Worker can ALSO respond to Cron Triggers (wrangler.jsonc `triggers.crons`).
// Web traffic passes straight through to the Next.js app; the scheduled
// handler drives the indexer reconcile sweep by invoking the app's own
// /api/cron/indexer-reconcile route in-process (same fail-closed CRON_SECRET
// gate as an external call — no secret configured ⇒ the sweep never runs).
import { default as handler } from "./.open-next/worker.js";

// ── EDGE-CACHED FIRST PAINT (Brendon, 2026-07-27 — "faster than Raster"). ──
// Measured before this: home TTFB 2.6–3.9s — every visit paid a full server
// render + DB round-trips before the first byte. Every PD page's HTML is
// viewer-independent (auth + live data hydrate client-side; the one header
// the layout reads is stamped by middleware from the URL), so page documents
// are safe to serve from the Cloudflare edge cache for a short TTL. Visitors
// get the page shell instantly; the client's own live fetches keep the data
// fresh exactly as they already did.
//
// Scope guards:
//   · GET page documents only — /api, /_next, /preview, and any dotted path
//     (static files) pass straight through untouched.
//   · Next's client-navigation data requests (RSC flight) carry their own
//     headers and BYPASS the cache entirely, so in-app navigation is
//     untouched — only full document loads are cached.
//   · Only 200 text/html responses with no Set-Cookie are stored.
// TTL 30s: worst case a cold visitor's shell is 30s stale, and the shell's
// numbers are re-fetched live on mount anyway.
const PAGE_CACHE_TTL_S = 30;

function isCacheablePageRequest(request: Request): boolean {
  if (request.method !== "GET") return false;
  // Client-side navigation / prefetch flight requests — never cache-mix
  // these with documents.
  if (
    request.headers.get("rsc") ||
    request.headers.get("next-router-prefetch") ||
    request.headers.get("next-router-state-tree") ||
    request.headers.get("next-url")
  ) {
    return false;
  }
  const p = new URL(request.url).pathname;
  if (p.startsWith("/api") || p.startsWith("/_next") || p.startsWith("/preview")) return false;
  if (p.includes(".")) return false; // static assets keep their own caching
  return true;
}

const cachedFetch = async (
  request: Request,
  env: unknown,
  ctx: { waitUntil(p: Promise<unknown>): void }
): Promise<Response> => {
  const upstream = handler.fetch as (
    r: Request,
    e: unknown,
    c: unknown
  ) => Promise<Response>;
  if (!isCacheablePageRequest(request)) return upstream(request, env, ctx);

  const cache = (caches as unknown as { default: Cache }).default;
  const key = new Request(new URL(request.url).toString(), { method: "GET" });
  try {
    const hit = await cache.match(key);
    if (hit) return hit;
  } catch {
    /* cache unavailable — serve live */
  }
  const res = await upstream(request, env, ctx);
  if (
    res.status === 200 &&
    (res.headers.get("content-type") ?? "").includes("text/html") &&
    !res.headers.has("set-cookie")
  ) {
    try {
      const copy = new Response(res.clone().body, res);
      // s-maxage governs the edge copy only — browsers ignore it, so
      // clients still revalidate every load and get the edge-fast answer.
      copy.headers.set("cache-control", `public, s-maxage=${PAGE_CACHE_TTL_S}`);
      ctx.waitUntil(cache.put(key, copy));
    } catch {
      /* body already consumed / cache write failed — the live response stands */
    }
  }
  return res;
};

export default {
  fetch: cachedFetch,

  async scheduled(
    controller: { cron?: string },
    env: Record<string, string | undefined> & { CRON_SECRET?: string },
    ctx: { waitUntil(p: Promise<unknown>): void }
  ) {
    const secret = env.CRON_SECRET;
    if (!secret) return; // fail closed — mirrors the route's own guard
    const call = (path: string) =>
      ctx.waitUntil(
        (handler.fetch as (r: Request, e: unknown, c: unknown) => Promise<Response>)(
          new Request(`https://cron.internal${path}`, {
            headers: { authorization: `Bearer ${secret}` },
          }),
          env,
          ctx
        )
      );
    // ONE every-minute schedule now drives BOTH the reminder sweep and the
    // indexer reconcile backstop (Brendon, 2026-07-11 — reconcile moved 2min →
    // 1min). Cloudflare cron granularity floors at 1 minute, so this is the
    // tightest cadence possible; the reconcile is only the catch-up net behind
    // the real-time Alchemy webhook, and one run is a handful of ≤10-block log
    // reads — far inside the RPC free tier even at 1-min. Both fail-closed on
    // CRON_SECRET and are idempotent/best-effort. `controller.cron` is ignored
    // now that there is a single schedule.
    void controller;
    call("/api/cron/todo-reminders");
    call("/api/cron/indexer-reconcile");
    // Rewind social tape — exits in one HEAD probe on all but the first run
    // of each PriceDay, so riding the 1-min schedule costs nothing.
    call("/api/cron/social-snapshot");
    // The Dispatch press run — prints once daily after 9AM Montreal; every
    // other run is a single HEAD probe.
    call("/api/cron/dispatch");
    // Hostile-takeover windows — resolves expired ones (one probe when idle).
    call("/api/cron/takeover-sweep");
    // The Dispatch DIGEST (email) — prints 3×/month after 9AM Montreal;
    // every other run exits on clock math alone.
    call("/api/cron/newsletter");
    // The Sentinel — BUY targets + armed workflows watched server-side;
    // crossings ping (inbox + native) exactly once via the fired-ledger.
    call("/api/cron/sentinel");
    // Economy conservation audit — once a day (KV gate; every other tick is
    // one KV read). Anomalies land in app_errors.
    call("/api/cron/economy-audit");
    // The war sweep — marks recorder every run (one probe when idle); the
    // grip/siege/conquest derivation at most every 5 min.
    call("/api/cron/war-sweep");
    // $PRICE Top Holders sweep — ranks named wallets by $PRICE held (KV-gated
    // to ~15 min; every other tick is one KV read).
    call("/api/cron/price-holdings");
    // Conviction Call Ledger — settles open calls CROWNED/REKT vs the floor
    // (KV-gated to ~15 min; every other tick is one KV read).
    call("/api/cron/calls-resolve");
    // Dead-man switch: stamp the heartbeat so the app side can notice a
    // stalled Cron (lib/pings/heartbeat.ts checks it from the hot count poll).
    const kv = (env as unknown as {
      NEXT_INC_CACHE_KV?: { put(k: string, v: string): Promise<void> };
    }).NEXT_INC_CACHE_KV;
    if (kv) ctx.waitUntil(kv.put("pd:sweep-heartbeat", String(Date.now())));
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
