import { getIndexerSupabase } from "./supabase";

// ---------------------------------------------------------------------------
// Type contract — events table after migrations 0001 + 0004:
//   id, type (MINT/LIST/OFFER/XFER), project_id, token_id,
//   from_address, to_address, price_eth, timestamp, tx_hash, log_index,
//   sale_direction
//
// Idempotency: the webhook can deliver an event more than once and the
// reconcile sweep re-reads recent blocks. The unique constraint on
// (tx_hash, log_index) turns duplicate inserts into 23505 errors we swallow.
// ---------------------------------------------------------------------------

export type EventType = "MINT" | "LIST" | "OFFER" | "XFER";
export type SaleDirection = "LIST_FILL" | "OFFER_ACCEPT";

export interface InsertEventInput {
  type: EventType;
  project_id: string;
  token_id: string;
  from_address: string | null;
  to_address: string | null;
  price_eth: string | null;
  tx_hash: string;
  log_index: number;
  timestamp: number;
}

export async function insertEvent(
  input: InsertEventInput,
): Promise<string | null> {
  const { data, error } = await getIndexerSupabase()
    .from("events")
    .insert({
      type: input.type,
      project_id: input.project_id,
      token_id: input.token_id,
      from_address: input.from_address,
      to_address: input.to_address,
      price_eth: input.price_eth,
      timestamp: input.timestamp,
      tx_hash: input.tx_hash,
      log_index: input.log_index,
    })
    .select("id")
    .single();

  if (error) {
    if (error.code === "23505") return null;
    throw error;
  }
  return data.id as string;
}

// --- Projects aggregates ---------------------------------------------------

export async function bumpMintedCount(projectId: string): Promise<void> {
  const { error } = await getIndexerSupabase().rpc("increment_minted_count", {
    p_project_id: projectId,
  });
  if (error) throw error;
}

export async function recomputeFloor(projectId: string): Promise<void> {
  const { error } = await getIndexerSupabase().rpc("recompute_floor", {
    p_project_id: projectId,
  });
  if (error) throw error;
}

export async function applySale(
  projectId: string,
  priceEth: string,
): Promise<void> {
  const { error } = await getIndexerSupabase().rpc("apply_sale", {
    p_project_id: projectId,
    p_price_eth: priceEth,
  });
  if (error) throw error;
}

// --- sale enrichment ------------------------------------------------------

// Seaport's OrderFulfilled fires same tx as the NFT Transfer. Patch the
// XFER row's price_eth + sale_direction in, matched by (tx_hash, project,
// token) — tx_hash alone stamped ONE order's price onto EVERY null-price
// XFER in a sweep/bundle tx, mispricing every token but the first and
// never booking the other orders' volume.
//
// The `price_eth IS NULL` guard means the update matches only on the first
// enrichment of a given sale; a re-delivered webhook or an overlapping sweep
// matches zero rows. Returns true exactly on that one transition, which the
// caller uses to gate the (non-idempotent) volume booking in apply_sale.
export async function enrichXferWithPrice(
  txHash: string,
  projectId: string,
  tokenId: string,
  priceEth: string,
  saleDirection: SaleDirection,
): Promise<boolean> {
  const { data, error } = await getIndexerSupabase()
    .from("events")
    .update({ price_eth: priceEth, sale_direction: saleDirection })
    .eq("tx_hash", txHash)
    .eq("project_id", projectId)
    .eq("token_id", tokenId)
    .eq("type", "XFER")
    .is("price_eth", null)
    .select("id");
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

// --- holders --------------------------------------------------------------

export async function upsertHolder(
  projectId: string,
  tokenId: string,
  ownerAddress: string,
  blockTimestampSeconds: number,
): Promise<void> {
  const { error } = await getIndexerSupabase().rpc("upsert_holder", {
    p_project_id: projectId,
    p_token_id: tokenId,
    p_owner_address: ownerAddress,
    p_acquired_at: new Date(blockTimestampSeconds * 1000).toISOString(),
  });
  if (error) throw error;
}

export async function removeHolder(
  projectId: string,
  tokenId: string,
): Promise<void> {
  const { error } = await getIndexerSupabase()
    .from("holders")
    .delete()
    .eq("project_id", projectId)
    .eq("token_id", tokenId);
  if (error) throw error;
}

// --- tracked-projects cache ----------------------------------------------
//
// THE keying bridge. On-chain logs arrive keyed by CONTRACT ADDRESS; the
// entire app + DB key projects by SLUG (projects.id = 'oracle', 'cultivar').
// projects.contract_address (nullable, unique — set when a project goes
// on-chain, live since 2026-07-02) is the mapping: every handler resolves
// address → slug here and writes SLUGS. Pre-fix this cache loaded slugs and
// matched them against addresses — never matched, every event was silently
// dropped, and the reconcile sweep fed slugs to eth_getLogs as "addresses".
//
// The allow-list gates BOTH ingestion paths (see handleTransfer), so a
// never-refreshed cache in a warm serverless instance would silently drop a
// newly-deployed Project's first mints until the instance recycled. A short
// TTL bounds that staleness to one window; registerProjectAddress() at deploy
// time still starts the real-time stream, and the reconcile sweep backfills
// anything that lands inside the TTL gap.

const TRACKED_TTL_MS = 60_000;

let trackedProjects: Map<string, string> | null = null; // address → slug
let trackedAt = 0;

export async function getTrackedProjects(): Promise<Map<string, string>> {
  if (trackedProjects && Date.now() - trackedAt < TRACKED_TTL_MS) {
    return trackedProjects;
  }
  const { data, error } = await getIndexerSupabase()
    .from("projects")
    .select("id, contract_address")
    .not("contract_address", "is", null);
  if (error) {
    // Serve the stale map on a transient read failure rather than throwing
    // away the in-flight batch (the sweep re-covers anything missed).
    if (trackedProjects) return trackedProjects;
    throw error;
  }
  trackedProjects = new Map(
    (data ?? []).map((r) => [
      (r.contract_address as string).toLowerCase(),
      r.id as string,
    ]),
  );
  trackedAt = Date.now();
  return trackedProjects;
}

/** Resolve an on-chain contract address to its project slug, or null when
 *  the contract isn't a tracked PD Project. */
export async function slugForContract(
  contractAddress: string,
): Promise<string | null> {
  const tracked = await getTrackedProjects();
  return tracked.get(contractAddress.toLowerCase()) ?? null;
}

/** The on-chain addresses to watch (reconcile sweep's eth_getLogs filter). */
export async function trackedAddresses(): Promise<string[]> {
  const tracked = await getTrackedProjects();
  return [...tracked.keys()];
}

export function invalidateTrackedProjects(): void {
  trackedProjects = null;
  trackedAt = 0;
}

// --- @name resolution + follows write path --------------------------------
//
// Mirrors the exact semantics the May 13 `fan_out_event_notifications`
// trigger uses DB-side: resolve wallet → users.handle, silently skip on
// null handle (pre-claim wallets — direct mints via Etherscan, secondary
// buys on OpenSea, airdrops, etc.). Back-fill happens on first @name claim.
//
// Currently unconsumed — these helpers exist for upcoming handlers:
//   - Founding Follows (PDFactory.ProjectDeployed → seed artist + @brendon)
//   - @name claim back-fill job
//   - Future manual-follow write paths
// --------------------------------------------------------------------------

export async function resolveHandle(
  walletAddress: string,
): Promise<string | null> {
  const { data, error } = await getIndexerSupabase()
    .from("users")
    .select("handle")
    .eq("address", walletAddress.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return (data?.handle as string | null) ?? null;
}

// Insert a follow row keyed on @name. Resolves both wallets through
// users.handle; if either resolves to null (pre-claim), the insert is
// silently skipped — same semantics as the fan-out trigger.
//
// Returns true if the row was written, false if skipped (either side
// unresolved) or if the row already existed (23505 — PK on (follower_name,
// following_name) makes re-inserts no-ops).
export async function insertFollow(
  followerWallet: string,
  followingWallet: string,
): Promise<boolean> {
  const [followerName, followingName] = await Promise.all([
    resolveHandle(followerWallet),
    resolveHandle(followingWallet),
  ]);
  if (followerName === null || followingName === null) return false;

  const { error } = await getIndexerSupabase().from("follows").insert({
    follower_name: followerName,
    following_name: followingName,
  });
  if (error) {
    if (error.code === "23505") return false; // already followed
    throw error;
  }
  return true;
}
