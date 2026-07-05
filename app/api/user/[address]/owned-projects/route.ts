// /api/user/[address]/owned-projects — the DISTINCT project slugs a wallet owns
// ≥1 piece of. Powers the home "you own this" checks (Now Minting + New Gen Art).
// Ownership-only: no price/mint enrichment, paginated so it never drops a project
// past the page cap. Service client (holders isn't anon-readable); public read
// keyed on the address in the path.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getUserOwnedSlugs } from '@/lib/profile/getUserHoldings';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export interface OwnedProjectsResponse {
  address: string;
  slugs: string[];
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  try {
    const slugs = await getUserOwnedSlugs(address);
    if (slugs === null) return badRequest('Invalid Ethereum address');
    const response: OwnedProjectsResponse = { address, slugs };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
