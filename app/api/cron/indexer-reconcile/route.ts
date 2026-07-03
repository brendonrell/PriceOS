// ===========================================================================
// TRANSPLANT FILE — drop into PriceOS at:
//   app/api/cron/indexer-reconcile/route.ts
//
// Scheduled by vercel.json (see transplant/vercel.cron.json). The reconcile
// sweep is the best-effort-delivery backstop: it re-reads the recent chain
// window and replays anything the webhook missed. Idempotent, so re-runs are
// safe. Minute-level Vercel Cron requires the Pro plan (PriceOS is Pro).
// ===========================================================================

import { runReconcile } from "@/lib/indexer/runtime/runReconcile";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request): Promise<Response> {
  // Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Fail CLOSED: if the
  // secret is unset, reject every call rather than leaving the endpoint open —
  // an unauthenticated reconcile runs eth_getLogs + per-block RPC fetches, so a
  // public URL is a compute-burn / DoS lever. No secret configured = no sweep.
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const outcome = await runReconcile();
  const status = outcome.ok ? 200 : 500;
  return Response.json(outcome, { status });
}
