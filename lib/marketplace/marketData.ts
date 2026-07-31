// The Marketplace payload — every ACTIVE listing across every project, the
// recent market tape (LIST · SALE · OFFER events), and the headline stats.
// One read serves both callers: the server-rendered /marketplace page (seeded
// into the first paint, the home pattern) and /api/marketplace (the client
// refresh path). Same two-caller shape as lib/home/homeData.

import { getSupabaseService } from '@/lib/supabase';
import { HIDDEN_PROJECTS_NOT_IN } from '../platform/hiddenProjects';

export interface MarketplaceListing {
  slug: string;
  token_id: number;
  price_eth: number;
}

export interface MarketplaceEvent {
  slug: string;
  token_id: number | null;
  type: 'LIST' | 'SALE' | 'OFFER';
  price_eth: number | null;
  /** Unix ms — events store seconds; normalized here so the UI formats
      viewer-local dates the same way the home feeds do. */
  ts: number;
}

export interface MarketplaceStats {
  listed: number;
  offers: number;
  volume_eth: number;
}

export interface MarketplaceResponse {
  listings: MarketplaceListing[];
  events: MarketplaceEvent[];
  stats: MarketplaceStats;
}

const TAPE_SIZE = 80;

export async function buildMarketplaceResponse(): Promise<MarketplaceResponse> {
  const db = getSupabaseService();
  const now = Math.floor(Date.now() / 1000);

  const [listRes, evRes, offerRes, volRes] = await Promise.all([
    db
      .from('listings')
      .select('project_id, token_id, price_eth')
      .eq('active', true)
      .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .or(`end_time.is.null,end_time.gt.${now}`)
      .order('price_eth', { ascending: true })
      .limit(2000),
    db
      .from('events')
      .select('project_id, token_id, type, price_eth, timestamp')
      .in('type', ['LIST', 'SALE', 'OFFER'])
      .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN)
      .order('timestamp', { ascending: false })
      .limit(TAPE_SIZE),
    db
      .from('offers')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'open')
      .or(`end_time.is.null,end_time.gt.${now}`),
    db.from('events').select('price_eth').not('price_eth', 'is', null)
      .not('project_id', 'in', HIDDEN_PROJECTS_NOT_IN),
  ]);
  if (listRes.error) throw new Error(listRes.error.message);
  if (evRes.error) throw new Error(evRes.error.message);

  const listings: MarketplaceListing[] = ((listRes.data ?? []) as {
    project_id: string; token_id: number | string; price_eth: number | string;
  }[]).map((r) => ({
    slug: String(r.project_id).toLowerCase(),
    token_id: Number(r.token_id),
    price_eth: Number(r.price_eth),
  })).filter((r) => Number.isFinite(r.token_id) && Number.isFinite(r.price_eth));

  const events: MarketplaceEvent[] = ((evRes.data ?? []) as {
    project_id: string; token_id: number | string | null;
    type: 'LIST' | 'SALE' | 'OFFER'; price_eth: number | string | null;
    timestamp: number | string;
  }[]).map((r) => ({
    slug: String(r.project_id).toLowerCase(),
    token_id: r.token_id == null ? null : Number(r.token_id),
    type: r.type,
    price_eth: r.price_eth == null ? null : Number(r.price_eth),
    ts: Number(r.timestamp) * 1000,
  })).filter((r) => Number.isFinite(r.ts));

  const volume = ((volRes.data ?? []) as { price_eth: number | string }[])
    .reduce((a, r) => a + (Number(r.price_eth) || 0), 0);

  return {
    listings,
    events,
    stats: {
      listed: listings.length,
      offers: offerRes.count ?? 0,
      volume_eth: volume,
    },
  };
}
