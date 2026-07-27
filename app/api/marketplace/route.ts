// /api/marketplace — the Marketplace read: active listings across every
// project + the recent market tape + headline stats. Client refresh path for
// the /marketplace page and the data feed for Purchase Pal / Profit Pal.
// Core query lives in lib/marketplace/marketData (shared with the server-
// rendered page, the home pattern).

import { NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import { buildMarketplaceResponse } from '@/lib/marketplace/marketData';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(): Promise<NextResponse> {
  try {
    return NextResponse.json(await buildMarketplaceResponse());
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'marketplace read failed');
  }
}
