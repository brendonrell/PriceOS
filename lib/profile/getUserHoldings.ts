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
import { HIDDEN_PROJECTS_NOT_IN } from '../platform/hiddenProjects';

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
/**
 * EXACT count of a wallet's holdings. getUserHoldings returns at most 1000 rows
 * (the PostgREST page cap), so its length under-reports for big collections —
 * this head/count query gives the real "owned" total (Brendon 2026-06-19, his
 * 1234 showing as 1000). Returns 0 for a malformed address or on error.
 */
export async function getUserHoldingsCount(rawAddress: string): Promise<number> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return 0;
  const supabase = getSupabaseService();
  const { count, error } = await supabase
    .from('holders')
    .select('*', { count: 'exact', head: true })
    .eq('owner_address', address)
    // Hidden projects are not part of anyone's collection (see hiddenProjects).
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN);
  if (error) return 0;
  return count ?? 0;
}

/**
 * Count of DISTINCT projects a wallet owns pieces from — a real, reusable
 * capability (Brendon 2026-06-19, "X projects owned" for collectors). Distinct
 * projects are few (well under the 1000-row page cap), so deduping the
 * project_id column is exact. Returns 0 for a malformed address or on error.
 */
/**
 * Cumulative ETH this wallet has SPENT acquiring Outputs over the lifetime of
 * the account — every event where the wallet was the recipient and a price was
 * paid (mints + secondary buys), regardless of whether the piece is still held.
 * Free mints (null price) contribute nothing. Returns 0 for a malformed address
 * or on error. (Sums up to the 1000-row page cap — far beyond any real spend
 * history; revisit with a SQL SUM if a wallet ever crosses 1000 buys.)
 */
export async function getUserSpendEth(rawAddress: string): Promise<number> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return 0;
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('events')
    .select('price_eth')
    .eq('to_address', address)
    .not('price_eth', 'is', null)
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN);
  if (error) return 0;
  let sum = 0;
  for (const r of (data ?? []) as { price_eth: string | number | null }[]) {
    sum += Number(r.price_eth ?? 0);
  }
  return Number(sum.toFixed(4));
}

/**
 * The DISTINCT set of project slugs a wallet owns ≥1 piece of — the exact
 * source for the home "you own this" checks. Paginates the holders rows (so it
 * never misses a project past the 1000-row page cap) and dedupes to slugs. No
 * price/mint enrichment — this is the cheap ownership-only read (Brendon,
 * 2026-07-05: some owned projects were missing their check because the heavier
 * holdings read was reused here). Returns [] for a malformed address; throws on
 * a real DB error.
 */
export async function getUserOwnedSlugs(rawAddress: string): Promise<string[] | null> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;
  const supabase = getSupabaseService();
  const slugs = new Set<string>();
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from('holders')
      .select('project_id')
      .eq('owner_address', address)
      .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .range(from, from + PAGE - 1);
    if (error) throw new Error(error.message);
    const rows = (data ?? []) as { project_id: string }[];
    for (const r of rows) slugs.add(r.project_id);
    if (rows.length < PAGE) break;
  }
  return [...slugs];
}

export async function getUserOwnedProjectsCount(rawAddress: string): Promise<number> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return 0;
  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('holders')
    .select('project_id')
    .eq('owner_address', address)
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN);
  if (error) return 0;
  const set = new Set((data ?? []).map((r: { project_id: string }) => r.project_id));
  return set.size;
}

export async function getUserHoldings(
  rawAddress: string
): Promise<UserHolding[] | null> {
  const address = rawAddress.toLowerCase();
  if (!ADDRESS_RE.test(address)) return null;

  const supabase = getSupabaseService();
  const { data, error } = await supabase
    .from('holders')
    .select('project_id, token_id')
    .eq('owner_address', address)
    .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN);

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
