import { createHmac, timingSafeEqual } from "node:crypto";

// Alchemy signs every webhook with HMAC-SHA256 over the raw request body,
// keyed by the webhook's signing key (from the dashboard). We must verify
// against the EXACT bytes received — parse/re-stringify would change them and
// break the check — so the caller passes the untouched raw body string.
export function verifyAlchemySignature(
  rawBody: string,
  signature: string | null | undefined,
  signingKey: string,
): boolean {
  if (!signature || !signingKey) return false;

  const expected = createHmac("sha256", signingKey)
    .update(rawBody, "utf8")
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
