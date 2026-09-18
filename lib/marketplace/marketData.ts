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
  /** Unix ms the listing went up (Date sort). */
  listed_ms: number;
}

/** Per-project facts for the listed projects — feeds the home-style facet bar
    (PriceDay · Sun · Moon · Rising · Status). */
export interface MarketplaceProject {
  slug: string;
  uploaded_at: number | null;
  minted_count: number;
}

export interface StickerListing {
  sheet_id: string;
  /** PER SHEET. */
  price_eth: number;
  qty: number;
  listed_ms: number;
}

export interface GnomeListing {
  project_id: string;
  token_id: number;
  rarity: string;
  price_eth: number;
  listed_ms: number;
}

export interface CollectibleEvent {
  kind: 'sticker' | 'gnome';
  type: 'LIST' | 'SALE' | 'OFFER';
  /** sheet_id (sticker) or project_id (gnome). */
  ref: string;
  price_eth: number | null;
  ts: number;
}

/** Stickers + gnomes on the secondary (keychains have no secondary yet). */
export interface MarketplaceCollectibles {
  stickers: StickerListing[];
  gnomes: GnomeListing[];
  events: CollectibleEvent[];
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
  projects: MarketplaceProject[];
  collectibles: MarketplaceCollectibles;
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
      .select('project_id, token_id, price_eth, created_at')
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
    created_at: string | null;
  }[]).map((r) => ({
    slug: String(r.project_id).toLowerCase(),
    token_id: Number(r.token_id),
    price_eth: Number(r.price_eth),
    listed_ms: r.created_at ? Date.parse(r.created_at) || 0 : 0,
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

  /* Listed projects' birth facts (the facet bar's PriceDay/Sun/Moon/Status). */
  let projects: MarketplaceProject[] = [];
  const slugs = [...new Set(listings.map((l) => l.slug))];
  if (slugs.length > 0) {
    const pRes = await db.from('projects').select('id, uploaded_at, minted_count').in('id', slugs);
    projects = ((pRes.data ?? []) as {
      id: string; uploaded_at: string | null; minted_count: number | null;
    }[]).map((p) => ({
      slug: String(p.id).toLowerCase(),
      uploaded_at: p.uploaded_at ? Date.parse(p.uploaded_at) || null : null,
      minted_count: Number(p.minted_count) || 0,
    }));
  }

  return {
    listings,
    projects,
    collectibles: await buildCollectibles(),
    events,
    stats: {
      listed: listings.length,
      offers: offerRes.count ?? 0,
      volume_eth: volume,
    },
  };
}

/* Stickers + gnomes on the secondary. Each read is isolated: a hiccup in one
   returns empty for that piece and never takes the artwork market down. */
async function buildCollectibles(): Promise<MarketplaceCollectibles> {
  const db = getSupabaseService();
  const now = Math.floor(Date.now() / 1000);
  const ms = (v: string | null) => (v ? Date.parse(v) || 0 : 0);
  const [stRes, stEv, gnRes, gnDeals] = await Promise.all([
    db.from('sticker_listings').select('sheet_id, price_eth, qty, created_at')
      .eq('active', true).gt('qty', 0)
      .or(`end_time.is.null,end_time.gt.${now}`)
      .order('price_eth', { ascending: true }).limit(500),
    db.from('sticker_events').select('sheet_id, type, price_eth, timestamp')
      .in('type', ['LIST', 'SALE', 'OFFER'])
      .order('timestamp', { ascending: false }).limit(60),
    db.from('gnomes').select('project_id, token_id, rarity, ask_eth, listed_at')
      .not('ask_eth', 'is', null),
    db.from('gnome_deals').select('project_id, ask_eth, settled_at')
      .eq('status', 'settled').order('settled_at', { ascending: false }).limit(30),
  ]);

  const stickers: StickerListing[] = ((stRes.data ?? []) as {
    sheet_id: string; price_eth: number | string; qty: number; created_at: string | null;
  }[]).map((r) => ({
    sheet_id: r.sheet_id, price_eth: Number(r.price_eth), qty: Number(r.qty), listed_ms: ms(r.created_at),
  })).filter((r) => Number.isFinite(r.price_eth));

  const gnomes: GnomeListing[] = ((gnRes.data ?? []) as {
    project_id: string; token_id: number | string; rarity: string;
    ask_eth: number | string | null; listed_at: string | null;
  }[]).filter((r) => r.ask_eth != null).map((r) => ({
    project_id: String(r.project_id).toLowerCase(), token_id: Number(r.token_id), rarity: r.rarity,
    price_eth: Number(r.ask_eth), listed_ms: ms(r.listed_at),
  })).filter((r) => Number.isFinite(r.price_eth));

  const events: CollectibleEvent[] = [
    ...((stEv.data ?? []) as { sheet_id: string; type: 'LIST' | 'SALE' | 'OFFER'; price_eth: number | string | null; timestamp: number | string }[])
      .map((r): CollectibleEvent => ({
        kind: 'sticker', type: r.type, ref: r.sheet_id,
        price_eth: r.price_eth == null ? null : Number(r.price_eth), ts: Number(r.timestamp) * 1000,
      })),
    ...gnomes.filter((g) => g.listed_ms > 0).map((g): CollectibleEvent => ({
      kind: 'gnome', type: 'LIST', ref: g.project_id, price_eth: g.price_eth, ts: g.listed_ms,
    })),
    ...((gnDeals.data ?? []) as { project_id: string; ask_eth: number | string; settled_at: string }[])
      .map((r): CollectibleEvent => ({
        kind: 'gnome', type: 'SALE', ref: String(r.project_id).toLowerCase(),
        price_eth: Number(r.ask_eth), ts: ms(r.settled_at),
      })),
  ].filter((e) => Number.isFinite(e.ts) && e.ts > 0).sort((a, b) => b.ts - a.ts).slice(0, 80);

  return { stickers, gnomes, events };
}
