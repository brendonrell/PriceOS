/*
 * lib/market/marketClient — the ONE client facade for every secondary-market
 * action. Every surface (artwork page CTA, output modal, multi-select bars,
 * cart sweep, StarredList offers) calls these; nothing else talks to the
 * market routes or the Seaport engine directly.
 *
 * The sim/chain split lives HERE, keyed on projects.contract_address (the
 * per-project cutover switch): a project with no contract trades on the sim
 * rail (Supabase money RPCs, exactly the flows that already exist); a project
 * with a contract trades on Seaport — wallet-signed orders stored in the same
 * tables, fills as real transactions. The UI above is identical either way.
 *
 * The heavy signing engine (ethers + seaport-js) loads via dynamic import at
 * action time only — nothing here weighs down the main bundle.
 */

import type { WalletClient } from 'viem';
import { DEFAULT_DURATION_SEC } from './chain';
import type { MarketOfferRow, SeaportOrderJson } from './orderTypes';

export type StepCb = (label: string) => void;

export interface MarketMeta {
  onChain: boolean;
  contract: string | null;
  royaltyReceiver: string | null;
}

/** GET /api/output/{slug}-{id}/market response (the market state one surface
 *  needs). Mirrors the route exactly — add there first, then here. */
export interface OutputMarketState {
  project_id: string;
  token_id: number;
  owner: string | null;
  owner_handle: string | null;
  listing: {
    price_eth: string;
    end_time: number | null;
    source: string;
    order_hash: string | null;
    order_json: SeaportOrderJson | null;
  } | null;
  offers: MarketOfferRow[];
  last_sale: string | null;
  floor: string | null;
  volume_eth: string | null;
  followers: number | null;
  on_chain: boolean;
  contract_address: string | null;
  royalty_receiver: string | null;
  viewer: { address: string; isOwner: boolean; balance: number } | null;
}

async function jsonOrThrow(r: Response): Promise<Record<string, unknown>> {
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(j?.error ? String(j.error) : 'Request failed');
  return j;
}

export async function fetchMarket(slug: string, id: number | string): Promise<OutputMarketState> {
  const r = await fetch(`/api/output/${slug}-${id}/market`, { cache: 'no-store' });
  return (await jsonOrThrow(r)) as unknown as OutputMarketState;
}

const metaCache = new Map<string, MarketMeta>();

export async function fetchMeta(slug: string): Promise<MarketMeta> {
  const hit = metaCache.get(slug);
  if (hit) return hit;
  const r = await fetch(`/api/market/orders?meta=${encodeURIComponent(slug)}`, { cache: 'no-store' });
  const j = await jsonOrThrow(r);
  const meta: MarketMeta = {
    onChain: !!j.on_chain,
    contract: (j.contract_address as string | null) ?? null,
    royaltyReceiver: (j.royalty_receiver as string | null) ?? null,
  };
  metaCache.set(slug, meta);
  return meta;
}

function needWallet(wallet: WalletClient | null | undefined): WalletClient {
  if (!wallet) throw new Error('Wallet: CONNECT TO TRADE');
  return wallet;
}

function windowFor(durationSec: number): { startTime: number; endTime: number } {
  const now = Math.floor(Date.now() / 1000);
  return { startTime: now - 60, endTime: now + Math.max(600, durationSec) };
}

function refreshMarketSurfaces(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event('pd:project-refresh'));
}

/* ── Listing ─────────────────────────────────────────────────────────────── */

export interface ListItemInput {
  slug: string;
  id: number | string;
  priceEth: string;
}

export interface ListResult {
  listed: number;
  failed: { slug: string; id: number | string; error: string }[];
}

/** List (or re-list — same motion, the book replaces the row) 1..n pieces.
 *  Chain projects sign all their orders in ONE wallet signature per project
 *  batch; sim projects post straight through. */
export async function listOutputs(
  items: ListItemInput[],
  opts: { durationSec?: number; wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<ListResult> {
  const durationSec = opts.durationSec ?? DEFAULT_DURATION_SEC;
  const result: ListResult = { listed: 0, failed: [] };

  // Group by project — meta (sim vs chain, royalty receiver) is per-project.
  const bySlug = new Map<string, ListItemInput[]>();
  for (const it of items) {
    const arr = bySlug.get(it.slug) ?? [];
    arr.push(it);
    bySlug.set(it.slug, arr);
  }

  const simBatch: { slug: string; tokenId: string; priceEth: string }[] = [];
  const chainBatch: {
    slug: string;
    tokenId: string;
    priceEth: string;
    order: SeaportOrderJson;
    orderHash: string;
  }[] = [];

  for (const [slug, group] of bySlug) {
    const meta = await fetchMeta(slug);
    if (!meta.onChain) {
      for (const it of group) simBatch.push({ slug, tokenId: String(it.id), priceEth: it.priceEth });
      continue;
    }
    if (!meta.contract || !meta.royaltyReceiver) {
      for (const it of group) result.failed.push({ slug, id: it.id, error: 'Project not tradeable yet' });
      continue;
    }
    const wallet = needWallet(opts.wallet);
    const eng = await import('./seaportClient');
    const { startTime, endTime } = windowFor(durationSec);
    const inputs = group.map((it) => ({
      contract: meta.contract as string,
      tokenId: String(it.id),
      priceEth: it.priceEth,
      royaltyReceiver: meta.royaltyReceiver as string,
      startTime,
      endTime,
    }));
    try {
      const signed =
        inputs.length === 1
          ? [await eng.createListing(wallet, inputs[0], opts.onStep)]
          : await eng.createBulkListings(wallet, inputs, opts.onStep);
      signed.forEach((s, i) =>
        chainBatch.push({
          slug,
          tokenId: String(group[i].id),
          priceEth: group[i].priceEth,
          order: s.order,
          orderHash: s.orderHash,
        }),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Signing failed';
      for (const it of group) result.failed.push({ slug, id: it.id, error: msg });
    }
  }

  if (simBatch.length + chainBatch.length > 0) {
    opts.onStep?.('POSTING');
    const r = await fetch('/api/market/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        action: 'batch_list',
        durationSec,
        sim: simBatch,
        chain: chainBatch,
      }),
    });
    const j = await jsonOrThrow(r);
    result.listed = Number(j.listed ?? 0);
    const failed = (j.failed ?? []) as { slug: string; tokenId: string; error: string }[];
    for (const f of failed) result.failed.push({ slug: f.slug, id: f.tokenId, error: f.error });
    refreshMarketSurfaces();
  }
  return result;
}

/** Cancel one listing. Chain listings cancel on-chain first (one tx), then
 *  the book row closes; sim listings just close. */
export async function cancelListing(
  slug: string,
  id: number | string,
  opts: { wallet?: WalletClient | null; onStep?: StepCb; listing?: OutputMarketState['listing'] } = {},
): Promise<void> {
  const listing = opts.listing ?? (await fetchMarket(slug, id)).listing;
  if (listing && listing.source !== 'sim' && listing.order_json) {
    const wallet = needWallet(opts.wallet);
    const eng = await import('./seaportClient');
    const txHash = await eng.cancelOrders(wallet, [listing.order_json], opts.onStep);
    opts.onStep?.('POSTING');
    await jsonOrThrow(
      await fetch(`/api/output/${slug}-${id}/market`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel_order', orderHash: listing.order_hash, txHash }),
      }),
    );
  } else {
    await jsonOrThrow(
      await fetch(`/api/output/${slug}-${id}/market`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      }),
    );
  }
  refreshMarketSurfaces();
}

/* ── Buying / the sweep ──────────────────────────────────────────────────── */

export interface SweepResult {
  bought: { slug: string; id: number }[];
  failed: { slug: string; id: number; error: string }[];
}

interface SweepTicket {
  slug: string;
  tokenId: string;
  price_eth: string;
  source: string;
  order_hash: string | null;
  order_json: SeaportOrderJson | null;
}

/** Buy every item (the cart's BUY ALL). Sim pieces settle through the sim
 *  RPC one by one; chain pieces fill in ONE Seaport transaction. */
export async function sweepBuy(
  items: { slug: string; id: number }[],
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<SweepResult> {
  const result: SweepResult = { bought: [], failed: [] };
  if (items.length === 0) return result;

  const keys = items.map((it) => `${it.slug}-${it.id}`).join(',');
  const r = await fetch(`/api/market/orders?orders_for=${encodeURIComponent(keys)}`, { cache: 'no-store' });
  const j = await jsonOrThrow(r);
  const tickets = (j.tickets ?? []) as SweepTicket[];
  const byKey = new Map(tickets.map((t) => [`${t.slug}:${t.tokenId}`, t]));

  const chainFills: { item: { slug: string; id: number }; ticket: SweepTicket }[] = [];

  for (const it of items) {
    const ticket = byKey.get(`${it.slug}:${it.id}`);
    if (!ticket) {
      result.failed.push({ ...it, error: 'Not listed' });
      continue;
    }
    if (ticket.source !== 'sim' && ticket.order_json) {
      chainFills.push({ item: it, ticket });
      continue;
    }
    // Sim rail — the atomic RPC via the existing per-output action.
    try {
      opts.onStep?.('BUYING');
      await jsonOrThrow(
        await fetch(`/api/output/${it.slug}-${it.id}/market`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'buy' }),
        }),
      );
      result.bought.push(it);
    } catch (err) {
      result.failed.push({ ...it, error: err instanceof Error ? err.message : 'Buy failed' });
    }
  }

  if (chainFills.length > 0) {
    try {
      const wallet = needWallet(opts.wallet);
      const eng = await import('./seaportClient');
      const txHash = await eng.fulfillListings(
        wallet,
        chainFills.map((f) => f.ticket.order_json as SeaportOrderJson),
        opts.onStep,
      );
      opts.onStep?.('POSTING');
      await jsonOrThrow(
        await fetch('/api/market/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'confirm_fills',
            txHash,
            fills: chainFills.map((f) => ({
              slug: f.item.slug,
              tokenId: String(f.item.id),
              orderHash: f.ticket.order_hash,
            })),
          }),
        }),
      );
      for (const f of chainFills) result.bought.push(f.item);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sweep failed';
      for (const f of chainFills) result.failed.push({ ...f.item, error: msg });
    }
  }

  refreshMarketSurfaces();
  return result;
}

/* ── Offers ──────────────────────────────────────────────────────────────── */

export interface OfferTarget {
  kind: 'item' | 'collection' | 'trait';
  slug: string;
  id?: number | string;
  category?: string;
  value?: string;
}

/** Place an offer — item, collection-wide, or trait-scoped. Chain offers are
 *  WETH (the flow wraps the shortfall); sim offers ride the sim balance. */
export async function makeOffer(
  target: OfferTarget,
  priceEth: string,
  opts: { durationSec?: number; wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<void> {
  const durationSec = opts.durationSec ?? DEFAULT_DURATION_SEC;
  const meta = await fetchMeta(target.slug);

  if (!meta.onChain) {
    opts.onStep?.('POSTING');
    if (target.kind === 'item') {
      await jsonOrThrow(
        await fetch(`/api/output/${target.slug}-${target.id}/market`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'offer', price: Number(priceEth), durationSec }),
        }),
      );
    } else {
      await jsonOrThrow(
        await fetch('/api/market/orders', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            action: 'criteria_offer',
            slug: target.slug,
            scope: target.kind,
            category: target.category,
            value: target.value,
            price: Number(priceEth),
            durationSec,
          }),
        }),
      );
    }
    refreshMarketSurfaces();
    return;
  }

  if (!meta.contract || !meta.royaltyReceiver) throw new Error('Project not tradeable yet');
  const wallet = needWallet(opts.wallet);

  // Trait offers commit to the matching token set (merkle) — server computes it.
  let identifiers: string[] | undefined;
  if (target.kind === 'trait') {
    const r = await fetch(
      `/api/market/orders?trait_ids=${encodeURIComponent(target.slug)}&category=${encodeURIComponent(target.category ?? '')}&value=${encodeURIComponent(target.value ?? '')}`,
      { cache: 'no-store' },
    );
    const j = await jsonOrThrow(r);
    identifiers = (j.identifiers ?? []) as string[];
    if (identifiers.length === 0) throw new Error('No pieces match this trait');
  }

  const eng = await import('./seaportClient');
  const { startTime, endTime } = windowFor(durationSec);
  const signed = await eng.createOffer(
    wallet,
    {
      contract: meta.contract,
      priceEth,
      royaltyReceiver: meta.royaltyReceiver,
      startTime,
      endTime,
      ...(target.kind === 'item'
        ? { tokenId: String(target.id) }
        : target.kind === 'trait'
          ? { identifiers }
          : { collection: true }),
    },
    opts.onStep,
  );

  opts.onStep?.('POSTING');
  if (target.kind === 'item') {
    await jsonOrThrow(
      await fetch(`/api/output/${target.slug}-${target.id}/market`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'offer_order',
          order: signed.order,
          orderHash: signed.orderHash,
        }),
      }),
    );
  } else {
    await jsonOrThrow(
      await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'criteria_offer',
          slug: target.slug,
          scope: target.kind,
          category: target.category,
          value: target.value,
          order: signed.order,
          orderHash: signed.orderHash,
          identifiers,
        }),
      }),
    );
  }
  refreshMarketSurfaces();
}

/** Accept an offer on a piece you own. Criteria offers accept WITH the piece
 *  (this page's token). Chain accepts are one transaction. */
export async function acceptOffer(
  slug: string,
  tokenId: number | string,
  offer: MarketOfferRow,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<void> {
  if (offer.source !== 'sim' && offer.order_json) {
    const wallet = needWallet(opts.wallet);
    const eng = await import('./seaportClient');
    const txHash = await eng.acceptOffer(
      wallet,
      offer.order_json,
      offer.scope === 'item'
        ? {}
        : { tokenId: String(tokenId), identifiers: offer.criteria?.identifiers },
      opts.onStep,
    );
    opts.onStep?.('POSTING');
    await jsonOrThrow(
      await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_offer_fill',
          offerId: offer.id,
          slug,
          tokenId: String(tokenId),
          txHash,
        }),
      }),
    );
  } else if (offer.scope === 'item') {
    opts.onStep?.('POSTING');
    await jsonOrThrow(
      await fetch(`/api/output/${slug}-${tokenId}/market`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'accept', offerId: offer.id }),
      }),
    );
  } else {
    opts.onStep?.('POSTING');
    await jsonOrThrow(
      await fetch('/api/market/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'accept_criteria',
          offerId: offer.id,
          slug,
          tokenId: String(tokenId),
        }),
      }),
    );
  }
  refreshMarketSurfaces();
}

/** Decline (hide) an offer on a piece you own — book-side only; a signed
 *  chain order stays technically valid until it expires or is cancelled. */
export async function declineOffer(offerId: string): Promise<void> {
  await jsonOrThrow(
    await fetch('/api/market/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'decline_offer', offerId }),
    }),
  );
  refreshMarketSurfaces();
}

/** Cancel your own offer. Chain offers cancel on-chain (one tx) then close. */
export async function cancelOffer(
  offer: MarketOfferRow,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<void> {
  let txHash: string | undefined;
  if (offer.source !== 'sim' && offer.order_json) {
    const wallet = needWallet(opts.wallet);
    const eng = await import('./seaportClient');
    txHash = await eng.cancelOrders(wallet, [offer.order_json], opts.onStep);
  }
  opts.onStep?.('POSTING');
  await jsonOrThrow(
    await fetch('/api/market/orders', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ action: 'cancel_offer', offerId: offer.id, txHash }),
    }),
  );
  refreshMarketSurfaces();
}
