// A user's collected Outputs — real `holders` rows for one wallet, across all
// projects. This is what the profile's Collected tab renders: empty at fresh
// state, populating the moment the wallet mints or buys (MINT/market writes
// to the same `holders` table). Service client (holders isn't anon-readable);
// this is a public read keyed on the address in the path.
//
// Core query lives in lib/profile/getUserHoldings (shared with the server-
// rendered profile page since the 2026-06-10 perf batch); this route stays
// the client-side refresh path ('pd:project-refresh' after mint / market
// actions). Response shape unchanged.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getUserHoldings, getUserHoldingsCount, getUserSpendEth, type UserHolding } from '@/lib/profile/getUserHoldings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type { UserHolding };

export interface UserOutputsResponse {
  address: string;
  total: number;
  holdings: UserHolding[];
  /** Cumulative ETH spent acquiring Outputs over the account's lifetime. */
  volume_spent_eth: number;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();

  try {
    const holdings = await getUserHoldings(address);
    if (holdings === null) return badRequest('Invalid Ethereum address');

    // Real owned total (exact count) — holdings caps at 1000 rows, so its
    // length under-reports for big collections (Brendon 2026-06-19).
    const [total, volumeSpent] = await Promise.all([
      getUserHoldingsCount(address),
      getUserSpendEth(address),
    ]);

    const response: UserOutputsResponse = {
      address,
      total,
      holdings,
      volume_spent_eth: volumeSpent,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
