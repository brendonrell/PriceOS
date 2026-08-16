// Volume Spent toast breakdown (Brendon, 2026-08-16) — top 5 projects by
// cumulative spend + top 5 individual Outputs by price paid, for the hero
// "Volume Spent" stat's tap toast. Same acquisition definition as the plain
// volume_spent_eth total (lib/profile/getUserHoldings::getUserSpendEth):
// mints + secondary buys, free mints excluded.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getUserSpendBreakdown, type SpendBreakdown } from '@/lib/profile/getUserHoldings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export type { SpendBreakdown };

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();

  try {
    const breakdown = await getUserSpendBreakdown(address);
    if (breakdown.topProjects.length === 0 && breakdown.topOutputs.length === 0 && !/^0x[a-f0-9]{40}$/.test(address)) {
      return badRequest('Invalid Ethereum address');
    }
    return NextResponse.json(breakdown);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
