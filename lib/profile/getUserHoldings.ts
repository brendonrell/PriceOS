// A user's collected Outputs — real `holders` rows for one wallet, across all
// projects, enriched with active listing price + mint timestamp. Extracted
// from /api/user/[address]/outputs (perf batch 2026-06-10) so the server-
// rendered profile page can fetch the same shape in-process and ship it with
// the first paint, while the API route keeps serving the client-side
// refreshes ('pd:project-refresh'). One source of truth, two callers.
//
// Service client (holders isn't anon-readable); this is a public read keyed
// on the wallet address — same access semantics as the route.

import { getSupabaseService } from '@/lib/supabase';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

export interface UserHolding {
  /** Project slug (holders.project_id). */
  slug: string;
  token_id: number;
  /** Active listing price in ETH, or null if not listed. */
  list_price_eth: string | null;
  /** Mint event timestamp (Unix seconds) — the Output's "birth", source for
   *  the PriceDay and Natal Chart platform traits. Null if no MINT event. */
  mint_ts: number | null;
}

/**
 * Fetch one wallet's holdings, sorted by project then token id. Throws on a
 * real DB error; returns [] for a valid address with no rows. Returns null
 * for a malformed address (callers map that to 400 / skip as appropriate).
 */
export async function getUserHoldings(
  rawAddress: string
): Promise<UserHolding[] | null> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('holders')
    .select('project_id, token_id')
    .eq('owner_address', address);

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as { project_id: string; token_id: string | number }[];

  // Active listing prices for the held Outputs (so the profile can sort/filter
  // by price). Fetch per held project (≤ a couple) and key by project:token.
  const heldProjects = [...new Set(rows.map((r) => r.project_id))];
  const priceByKey: Record<string, string> = {};
  const mintTsByKey: Record<string, number> = {};
  if (heldProjects.length > 0) {
    const [listRes, mintRes] = await Promise.all([
      supabase
        .from('listings')
        .select('project_id, token_id, price_eth')
        .in('project_id', heldProjects)
        .eq('active', true),
      supabase
        .from('events')
        .select('project_id, token_id, timestamp')
        .in('project_id', heldProjects)
        .eq('type', 'MINT'),
    ]);
    for (const l of (listRes.data ?? []) as { project_id: string; token_id: string | number; price_eth: number | string }[]) {
      priceByKey[`${l.project_id}:${l.token_id}`] = String(l.price_eth);
    }
    for (const m of (mintRes.data ?? []) as { project_id: string; token_id: string | number; timestamp: number | string }[]) {
      mintTsByKey[`${m.project_id}:${m.token_id}`] = Number(m.timestamp);
    }
  }

  return rows
    .map((r) => ({
      slug: r.project_id,
      token_id: Number(r.token_id),
      list_price_eth: priceByKey[`${r.project_id}:${r.token_id}`] ?? null,
      mint_ts: mintTsByKey[`${r.project_id}:${r.token_id}`] ?? null,
    }))
    .sort((a, b) => a.slug.localeCompare(b.slug) || a.token_id - b.token_id);
}
