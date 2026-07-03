import { verifyAlchemySignature } from "../alchemy/verify";
import { parseCustomWebhook } from "../alchemy/parse";
import { config } from "../config";
import { processLogs, type ProcessResult } from "../indexer/process";

export type WebhookOutcome =
  | { ok: true; status: 200; result: ProcessResult }
  | { ok: false; status: 400 | 401 | 413; error: string };

// Hard ceiling on the raw body we'll hash + parse. Alchemy block-log
// deliveries are well under this; anything larger is malformed or hostile and
// is rejected before the (full-body) HMAC hash runs.
const MAX_WEBHOOK_BYTES = 1_000_000; // 1 MB

// Framework-agnostic webhook entrypoint. The host route (Next.js / any
// serverless handler) only has to read the RAW body + the signature header
// and hand them here, then translate the outcome to an HTTP response.
//
// Always returns 200 on a verified, well-formed delivery — even an empty one —
// so Alchemy doesn't retry-storm. Genuine processing failures throw, so the
// host returns 5xx and Alchemy retries (the sweep is the longer-term backstop).
export async function handleWebhook(
  rawBody: string,
  signature: string | null | undefined,
): Promise<WebhookOutcome> {
  // Fail LOUD on a missing signing key. Without this, an unset key makes
  // verifyAlchemySignature return false for every delivery — the entire
  // real-time feed goes silently offline (everything 401s) while the operator
  // sees only "invalid signature" and no hint that the key itself is absent.
  // A thrown error surfaces as a 5xx with a clear cause instead.
  if (!config.webhookSigningKey) {
    throw new Error(
      "ALCHEMY_WEBHOOK_SIGNING_KEY is not set — refusing webhooks (an unset key would silently reject every delivery)",
    );
  }

  if (rawBody.length > MAX_WEBHOOK_BYTES) {
    return { ok: false, status: 413, error: "payload too large" };
  }

  if (!verifyAlchemySignature(rawBody, signature, config.webhookSigningKey)) {
    return { ok: false, status: 401, error: "invalid signature" };
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, error: "invalid JSON body" };
  }

  const logs = parseCustomWebhook(payload);
  const result = await processLogs(logs);
  return { ok: true, status: 200, result };
}
