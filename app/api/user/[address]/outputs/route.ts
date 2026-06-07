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
    const holdings: UserHolding[] = rows
      .map((r) => ({ slug: r.project_id, token_id: Number(r.token_id) }))
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
