// Cloudflare Worker entrypoint — wraps the OpenNext-generated handler so the
// Worker can ALSO respond to Cron Triggers (wrangler.jsonc `triggers.crons`).
// Web traffic passes straight through to the Next.js app; the scheduled
// handler drives the indexer reconcile sweep by invoking the app's own
// /api/cron/indexer-reconcile route in-process (same fail-closed CRON_SECRET
// gate as an external call — no secret configured ⇒ the sweep never runs).
import { default as handler } from "./.open-next/worker.js";

export default {
  fetch: handler.fetch,

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
    // Economy conservation audit — once a day (KV gate; every other tick is
    // one KV read). Anomalies land in app_errors.
    call("/api/cron/economy-audit");
    // The war sweep — marks recorder every run (one probe when idle); the
    // grip/siege/conquest derivation at most every 5 min.
    call("/api/cron/war-sweep");
    // Dead-man switch: stamp the heartbeat so the app side can notice a
    // stalled Cron (lib/pings/heartbeat.ts checks it from the hot count poll).
    const kv = (env as unknown as {
      NEXT_INC_CACHE_KV?: { put(k: string, v: string): Promise<void> };
    }).NEXT_INC_CACHE_KV;
    if (kv) ctx.waitUntil(kv.put("pd:sweep-heartbeat", String(Date.now())));
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
