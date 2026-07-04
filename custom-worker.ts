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
    // Dispatch by which schedule fired (wrangler.jsonc triggers.crons). At even
    // minutes both match and fire as two separate invocations, so the reminder
    // sweep runs every minute while the reconcile stays at 2. Both fail-closed on
    // CRON_SECRET and idempotent/best-effort.
    if (controller?.cron === "*/2 * * * *") {
      call("/api/cron/indexer-reconcile");
    } else {
      call("/api/cron/todo-reminders");
    }
  },
};

export { DOQueueHandler, DOShardedTagCache, BucketCachePurge } from "./.open-next/worker.js";
