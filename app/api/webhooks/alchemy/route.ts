// ===========================================================================
// POST /api/webhooks/alchemy — the indexer's real-time ingest door.
//
// Alchemy delivers chain activity here; handleWebhook (lib/indexer/runtime)
// verifies the HMAC signature over the RAW request bytes, then applies the
// events idempotently. The 1-minute reconcile sweep
// (/api/cron/indexer-reconcile) is the catch-up net behind this route.
// Fails closed: bad/missing signature never writes.
// ===========================================================================

import { handleWebhook } from "@/lib/indexer/runtime/handleWebhook";

export const runtime = "nodejs"; // node:crypto HMAC verification
export const dynamic = "force-dynamic";

export async function POST(req: Request): Promise<Response> {
  // Must verify against the RAW bytes — read text, never req.json().
  const rawBody = await req.text();
  const signature = req.headers.get("x-alchemy-signature");

  const outcome = await handleWebhook(rawBody, signature);
  if (!outcome.ok) {
    return Response.json({ error: outcome.error }, { status: outcome.status });
  }
  return Response.json({ ok: true, ...outcome.result }, { status: 200 });
}
