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
    _controller: unknown,
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
    // Indexer reconcile backstop + the closed-app To-Do reminder sweep. Both are
    // fail-closed on CRON_SECRET and idempotent/best-effort, safe to run together.
    call("/api/cron/indexer-reconcile");
    call("/api/cron/todo-reminders");
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
