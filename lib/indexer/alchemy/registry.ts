// Keeps the live Alchemy webhook's watched-address set in sync with the PD
// Projects we index. When a new Project deploys, calling registerProjectAddress
// makes its Transfers start streaming immediately — without it, the Project is
// still picked up, just on the next reconcile sweep instead of in real time.
//
// Uses Alchemy's Notify API, which is idempotent (re-adding an address is a
// no-op). Requires a dashboard auth token + the target webhook id, both
// server-only env. The endpoint is overridable for the Custom-Webhook variant.
//
// Docs: https://www.alchemy.com/docs/data/webhooks/webhooks-api-endpoints/notify-api-endpoints/update-webhook-addresses

const NOTIFY_URL =
  process.env.ALCHEMY_NOTIFY_URL ??
  "https://dashboard.alchemy.com/api/update-webhook-addresses";

export interface RegistryResult {
  ok: boolean;
  status: number;
}

const EVM_ADDRESS = /^0x[0-9a-fA-F]{40}$/;

// Validate + normalize an address list before it touches the live webhook
// filter. This helper adds whatever it's given to the stream, so a junk value
// reaching it from a mis-wired call site (e.g. the Project-deploy flow) would
// silently widen what Alchemy pushes us. Reject anything that isn't a 20-byte
// hex address rather than forwarding it.
function cleanAddresses(addrs: string[]): string[] {
  return addrs.map((a) => {
    const trimmed = a.trim();
    if (!EVM_ADDRESS.test(trimmed)) {
      throw new Error(`Invalid EVM address for webhook registry: ${a}`);
    }
    return trimmed.toLowerCase();
  });
}

export async function updateWebhookAddresses(opts: {
  add?: string[];
  remove?: string[];
}): Promise<RegistryResult> {
  const token = process.env.ALCHEMY_AUTH_TOKEN;
  const webhookId = process.env.ALCHEMY_WEBHOOK_ID;
  if (!token || !webhookId) {
    throw new Error(
      "ALCHEMY_AUTH_TOKEN and ALCHEMY_WEBHOOK_ID are required to update webhook addresses",
    );
  }

  const res = await fetch(NOTIFY_URL, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
      "X-Alchemy-Token": token,
    },
    body: JSON.stringify({
      webhook_id: webhookId,
      addresses_to_add: cleanAddresses(opts.add ?? []),
      addresses_to_remove: cleanAddresses(opts.remove ?? []),
    }),
  });

  return { ok: res.ok, status: res.status };
}

// Register a single newly-deployed PD Project. Intended call site: the
// Project-deploy flow, right where the `projects` row is created.
export async function registerProjectAddress(
  address: string,
): Promise<RegistryResult> {
  return updateWebhookAddresses({ add: [address] });
}

// Re-publish a full set of Project addresses in one call (e.g. a backfill or
// a webhook-recreate). The caller controls exactly what's pushed.
export async function setWebhookAddresses(
  addresses: string[],
): Promise<RegistryResult> {
  return updateWebhookAddresses({ add: addresses });
}
