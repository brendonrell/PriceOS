// A user's collected Outputs — real `holders` rows for one wallet, across all
// projects. This is what the profile's Collected tab renders: empty at fresh
// state, populating the moment the wallet mints or buys (MINT/market writes
// to the same `holders` table). Service client (holders isn't anon-readable);
// this is a public read keyed on the address in the path.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;

export interface UserHolding {
  /** Project slug (holders.project_id). */
  slug: string;
  token_id: number;
  /** Active listing price in ETH, or null if not listed. */
  list_price_eth: string | null;
}

export interface UserOutputsResponse {
  address: string;
  total: number;
  holdings: UserHolding[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const supabase = getSupabaseService();
    const { data, error } = await supabase
      .from('holders')
      .select('project_id, token_id')
      .eq('owner_address', address);

    if (error) return serverError(error.message);

    const rows = (data ?? []) as { project_id: string; token_id: string | number }[];

    // Active listing prices for the held Outputs (so the profile can sort/filter
    // by price). Fetch per held project (≤ a couple) and key by project:token.
    const heldProjects = [...new Set(rows.map((r) => r.project_id))];
    const priceByKey: Record<string, string> = {};
    if (heldProjects.length > 0) {
      const listRes = await supabase
        .from('listings')
        .select('project_id, token_id, price_eth')
        .in('project_id', heldProjects)
        .eq('active', true);
      for (const l of (listRes.data ?? []) as { project_id: string; token_id: string | number; price_eth: number | string }[]) {
        priceByKey[`${l.project_id}:${l.token_id}`] = String(l.price_eth);
      }
    }

    const holdings: UserHolding[] = rows
      .map((r) => ({
        slug: r.project_id,
        token_id: Number(r.token_id),
        list_price_eth: priceByKey[`${r.project_id}:${r.token_id}`] ?? null,
      }))
      .sort((a, b) => a.slug.localeCompare(b.slug) || a.token_id - b.token_id);

    const response: UserOutputsResponse = {
      address,
      total: holdings.length,
      holdings,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
