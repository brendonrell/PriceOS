// A wallet's exact Collected count — a light head-count read (no rows returned),
// for gates that only need "how many pieces does this wallet hold" without the
// full holdings payload. Used by the Gen Curated showcase's 100-piece unlock.
// Service client (holders isn't anon-readable); a public read keyed on the path.

import { type NextRequest, NextResponse } from 'next/server';
import { getUserHoldingsCount } from '@/lib/profile/getUserHoldings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  try {
    const total = await getUserHoldingsCount(address);
    return NextResponse.json({ address, total });
  } catch {
    // Never fail a gate check over a count query — treat as "not yet unlocked".
    return NextResponse.json({ address, total: 0 });
  }
}
