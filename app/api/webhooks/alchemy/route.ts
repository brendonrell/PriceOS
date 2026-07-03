// ===========================================================================
// TRANSPLANT FILE — drop into PriceOS at:  app/api/webhooks/alchemy/route.ts
//
// Pairs with the indexer core, which moves into PriceOS at  lib/indexer/
// (this repo's  src/  →  PriceOS  lib/indexer/ ; this repo's  abis/  →
// PriceOS  lib/indexer/abis/ ). The "@/lib/indexer/..." imports below assume
// PriceOS's existing "@/*" path alias. Not type-checked in this repo on
// purpose — it compiles in PriceOS, against PriceOS's Next.js types.
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
