// Marketplace — `/marketplace`.
// Server component: computes the live marketplace payload (listings + tape +
// stats) at request time and seeds MarketplacePageBody with it, so the
// carousels + stats are in the FIRST paint — the exact home pattern
// (app/page.tsx). The body keeps re-pulling /api/marketplace live after
// mount; a DB hiccup here degrades to the client-fetch path.
import type { Metadata } from 'next';
import MarketplacePageBody from '../../components/marketplace/MarketplacePageBody';
import { buildMarketplaceResponse, type MarketplaceResponse } from '../../lib/marketplace/marketData';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Marketplace — Price Discussion',
  alternates: { canonical: '/marketplace' },
};

export default async function MarketplacePage() {
  let initial: MarketplaceResponse | null = null;
  try {
    initial = await buildMarketplaceResponse();
  } catch {
    /* degraded: body's client fetch fills in */
  }
  return <MarketplacePageBody initial={initial} />;
}
