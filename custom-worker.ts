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
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
