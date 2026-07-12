// /api/output/[id]/market — the secondary market for one Output.
// id = "{slug}-{tokenId}" (e.g. "oracle-12").
//
// TWO RAILS, one route, switched per project by projects.contract_address
// (the cutover flag):
//   - sim (contract_address NULL): the chainless market — money is the sim
//     ETH balance, settlement is the atomic Supabase RPCs. Actions:
//     list | cancel | buy | offer | accept.
//   - chain (contract_address set): the Seaport market — listings/offers are
//     wallet-signed orders posted here and stored on the SAME rows; fills
//     happen on-chain client-side (the indexer books the sale). Actions:
//     list_order | offer_order | cancel_order.
// Both rails share the reads, the events feed, and the pings — a listing
// pings wishlisters the instant it lands, either way.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type MoneyOpResult } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject, outputTraits } from '@/lib/project/registry';
import { createPing } from '@/lib/pings/createPing';
import { fanOutMarketPings } from '@/lib/pings/fanout';
import { checkListingOrder, checkOfferOrder, resolveRoyaltyReceiver } from '@/lib/market/orderCheck';
import { DEFAULT_DURATION_SEC, MAX_DURATION_SEC } from '@/lib/market/chain';
import type { OfferCriteria, SeaportOrderJson } from '@/lib/market/orderTypes';

export const dynamic = 'force-dynamic';

function parseId(id: string): { slug: string; tokenId: string } | null {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = id.slice(0, idx).toLowerCase();
  const tokenId = id.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

type DB = ReturnType<typeof getSupabaseService>;

async function ownerOf(db: DB, slug: string, tokenId: string): Promise<string | null> {
  const r = await db.from('holders').select('owner_address').eq('project_id', slug).eq('token_id', tokenId).maybeSingle();
  return (r.data as { owner_address?: string } | null)?.owner_address ?? null;
}

async function balanceOf(db: DB, address: string): Promise<{ has: boolean; bal: number }> {
  const r = await db.from('users').select('sim_eth_balance').eq('address', address).maybeSingle();
  if (!r.data) return { has: false, bal: 10 };
  return { has: true, bal: Number((r.data as { sim_eth_balance?: number }).sim_eth_balance ?? 0) };
}

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

/** Expiry filter fragment: no end_time (legacy/sim default) or still live. */
function liveOr(now: number): string {
  return `end_time.is.null,end_time.gt.${now}`;
}

function clampDuration(durationSec: unknown): number {
  const n = Number(durationSec);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DURATION_SEC;
  return Math.min(Math.max(600, Math.floor(n)), MAX_DURATION_SEC);
}

interface OfferRowDb {
  id: string;
  project_id: string;
  token_id: string | null;
  bidder_address: string;
  price_eth: number;
  status: string;
  scope: string | null;
  criteria: OfferCriteria | null;
  end_time: number | null;
  currency: string | null;
  source: string | null;
  order_hash: string | null;
  order_json: SeaportOrderJson | null;
}

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;
  try {
    const db = getSupabaseService();
    const now = nowSec();
    const [holder, listing, offers, lastSale, proj, vol, follows] = await Promise.all([
      db.from('holders').select('owner_address').eq('project_id', slug).eq('token_id', tokenId).maybeSingle(),
      db.from('listings')
        .select('price_eth, end_time, source, order_hash, order_json')
        .eq('project_id', slug).eq('token_id', tokenId).eq('active', true)
        .or(liveOr(now))
        .maybeSingle(),
      // Item offers on THIS token + criteria offers on the project (trait
      // offers filtered to ones this token satisfies, below).
      db.from('offers')
        .select('id, project_id, token_id, bidder_address, price_eth, status, scope, criteria, end_time, currency, source, order_hash, order_json')
        .eq('project_id', slug).eq('status', 'open')
        .or(`token_id.eq.${tokenId},scope.in.(collection,trait)`)
        .or(liveOr(now)),
      db.from('events').select('price_eth, timestamp').eq('project_id', slug).eq('token_id', tokenId).eq('type', 'XFER').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
      db.from('projects').select('floor_price_eth, contract_address, royalty_receiver').eq('id', slug).maybeSingle(),
      // All-time ETH that changed hands for THIS piece — primary (MINT) +
      // secondary (XFER) sales, mirroring the project-level Total Volume.
      db.from('events').select('price_eth').eq('project_id', slug).eq('token_id', tokenId).in('type', ['MINT', 'XFER']).not('price_eth', 'is', null),
      // Followers of THIS OUTPUT (shown on the Output page hero). The parent
      // project's parental-support follow is added below (+1), so never 0.
      db.from('output_follows').select('*', { count: 'exact', head: true }).eq('project_id', slug).eq('token_id', tokenId),
    ]);
    // Surface a real DB failure instead of silently returning empty market
    // state (which would paint a wrong owner / missing listing — e.g. a BUY
    // button where it should read LIST). Absent rows are not errors here
    // (maybeSingle returns null data, no error).
    if (holder.error) return serverError(holder.error.message);
    if (listing.error) return serverError(listing.error.message);
    if (offers.error) return serverError(offers.error.message);
    if (lastSale.error) return serverError(lastSale.error.message);
    if (proj.error) return serverError(proj.error.message);
    if (vol.error) return serverError(vol.error.message);

    const volumeEth = ((vol.data ?? []) as { price_eth: number | string | null }[])
      .reduce((s, e) => s + Number(e.price_eth ?? 0), 0);

    const owner = (holder.data as { owner_address?: string } | null)?.owner_address ?? null;
    let ownerHandle: string | null = null;
    if (owner) {
      const u = await db.from('users').select('handle').eq('address', owner).maybeSingle();
      if (u.error) return serverError(u.error.message);
      ownerHandle = (u.data as { handle?: string | null } | null)?.handle ?? null;
    }

    // Trait offers only count for this token when it MATCHES the criteria.
    // Chain trait offers carry the committed identifier set; sim trait offers
    // are checked against the token's server-computed traits.
    const rawOffers = (offers.data ?? []) as OfferRowDb[];
    let mintedAtMs: number | undefined;
    const needsTraits = rawOffers.some((o) => o.scope === 'trait' && !o.criteria?.identifiers);
    if (needsTraits) {
      const out = await db.from('outputs').select('minted_at').eq('project_id', slug).eq('token_id', tokenId).maybeSingle();
      const raw = (out.data as { minted_at?: string | null } | null)?.minted_at;
      const ms = raw ? Date.parse(raw) : NaN;
      mintedAtMs = Number.isFinite(ms) ? ms : undefined;
    }
    const tokenTraits = needsTraits ? outputTraits(slug, Number(tokenId), mintedAtMs) : null;
    const visibleOffers = rawOffers
      .filter((o) => {
        if (o.scope === 'trait') {
          if (o.criteria?.identifiers) return o.criteria.identifiers.includes(tokenId);
          if (o.criteria?.category && o.criteria?.value && tokenTraits)
            return tokenTraits[o.criteria.category] === o.criteria.value;
          return false;
        }
        return true; // item (token-matched by the query) + collection
      })
      .sort((a, b) => Number(b.price_eth) - Number(a.price_eth));

    // Handles for bidder rows (batched, one query).
    const bidders = Array.from(new Set(visibleOffers.map((o) => o.bidder_address)));
    const handleByAddr = new Map<string, string | null>();
    if (bidders.length > 0) {
      const hs = await db.from('users').select('address, handle').in('address', bidders);
      for (const row of (hs.data ?? []) as { address: string; handle: string | null }[]) {
        handleByAddr.set(row.address, row.handle);
      }
    }

    const projRow = proj.data as {
      floor_price_eth?: number;
      contract_address?: string | null;
      royalty_receiver?: string | null;
    } | null;

    const viewerAddr = await verifySiweSession(req);
    let viewer: { address: string; isOwner: boolean; balance: number } | null = null;
    if (viewerAddr) {
      const { bal } = await balanceOf(db, viewerAddr);
      viewer = { address: viewerAddr, isOwner: !!owner && owner.toLowerCase() === viewerAddr, balance: bal };
    }
    const listingRow = listing.data as {
      price_eth: number;
      end_time: number | null;
      source: string | null;
      order_hash: string | null;
      order_json: SeaportOrderJson | null;
    } | null;
    return NextResponse.json({
      project_id: slug,
      token_id: Number(tokenId),
      owner,
      owner_handle: ownerHandle,
      listing: listingRow
        ? {
            price_eth: String(listingRow.price_eth),
            end_time: listingRow.end_time,
            source: listingRow.source ?? 'sim',
            order_hash: listingRow.order_hash,
            order_json: listingRow.order_json,
          }
        : null,
      offers: visibleOffers.map((o) => ({
        id: o.id,
        project_id: o.project_id,
        token_id: o.token_id,
        bidder: o.bidder_address,
        bidder_address: o.bidder_address,
        bidder_handle: handleByAddr.get(o.bidder_address) ?? null,
        price_eth: String(o.price_eth),
        status: o.status,
        scope: (o.scope ?? 'item') as 'item' | 'collection' | 'trait',
        criteria: o.criteria,
        end_time: o.end_time,
        currency: o.currency ?? 'ETH',
        source: o.source ?? 'sim',
        order_hash: o.order_hash,
        order_json: o.order_json,
      })),
      last_sale: (lastSale.data as { price_eth?: number } | null)?.price_eth != null
        ? String((lastSale.data as unknown as { price_eth: number }).price_eth)
        : null,
      floor: projRow?.floor_price_eth != null ? String(projRow.floor_price_eth) : null,
      volume_eth: String(Number(volumeEth.toFixed(4))),
      followers: (follows.count ?? 0) + 1, // + the parent project (parental support)
      on_chain: !!projRow?.contract_address,
      contract_address: projRow?.contract_address ?? null,
      royalty_receiver: projRow?.royalty_receiver ?? null,
      viewer,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST (action-dispatched) ──────────────────────────────────────────────────
interface Body {
  action:
    | 'list' | 'cancel' | 'buy' | 'offer' | 'accept'
    | 'list_order' | 'offer_order' | 'cancel_order';
  price?: number | string;
  offerId?: string;
  durationSec?: number;
  order?: SeaportOrderJson;
  orderHash?: string;
  txHash?: string;
}

const SIM_MONEY_ACTIONS = new Set(['list', 'buy', 'offer', 'accept']);
const CHAIN_ACTIONS = new Set(['list_order', 'offer_order', 'cancel_order']);

export const POST = requireAuth<{ id: string }>(async (req, ctx, address) => {
  const parsed = parseId((await ctx.params).id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    const db = getSupabaseService();

    // Cutover guard, both directions: an ON-CHAIN project (contract_address
    // set) refuses sim money-writes — real trades settle on-chain and the
    // indexer records them; both paths writing would double-count volume.
    // A sim project refuses chain-order actions. `cancel` stays allowed
    // everywhere so stale sim listings can be cleaned up post-cutover.
    const { data: cutoverRow } = await db
      .from('projects')
      .select('contract_address')
      .eq('id', slug)
      .maybeSingle();
    const contract = (cutoverRow as { contract_address?: string | null } | null)?.contract_address ?? null;
    if (contract && SIM_MONEY_ACTIONS.has(body.action)) {
      return badRequest('Project is on-chain — trade on-chain');
    }
    if (!contract && CHAIN_ACTIONS.has(body.action)) {
      return badRequest('Project is not on-chain yet');
    }

    const owner = await ownerOf(db, slug, tokenId);
    const isOwner = !!owner && owner.toLowerCase() === address;
    const price = Number(body.price);

    switch (body.action) {
      case 'list': {
        if (!isOwner) return badRequest('Only the owner can list');
        if (!(price > 0)) return badRequest('Bad price');
        const endTime = nowSec() + clampDuration(body.durationSec);
        await db.from('listings').upsert(
          {
            project_id: slug, token_id: tokenId, seller_address: address,
            price_eth: price, active: true, end_time: endTime, listed_at: new Date().toISOString(),
            currency: 'ETH', source: 'sim', order_hash: null, order_json: null, tx_hash: null,
          } as never,
          { onConflict: 'project_id,token_id' },
        );
        await db.from('events').insert({ type: 'LIST', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: price, timestamp: nowSec() } as never);

        // Fan to everyone who cares: wishlisters ("buyable now"), mutuals,
        // starred artists/projects/traits, top-rarity holders.
        await fanOutMarketPings(db, { slug, tokenId, event: 'listed', actorAddress: address, amountEth: price });
        return NextResponse.json({ ok: true, listed: price });
      }
      case 'cancel': {
        if (!isOwner) return badRequest('Only the owner can cancel');
        await db.from('listings').update({ active: false } as never).eq('project_id', slug).eq('token_id', tokenId);
        return NextResponse.json({ ok: true });
      }
      case 'buy': {
        // Capture the listing price + seller BEFORE the buy clears the listing,
        // so the SALE ping carries the amount and reaches the right wallet.
        const listingRow = await db
          .from('listings')
          .select('price_eth')
          .eq('project_id', slug).eq('token_id', tokenId).eq('active', true)
          .maybeSingle();
        const salePrice = (listingRow.data as { price_eth?: number } | null)?.price_eth ?? null;
        const seller = owner;

        const { data, error } = await db.rpc('app_buy', {
          p_buyer: address, p_slug: slug, p_token: tokenId,
        } as never);
        if (error) return serverError(error.message);
        const r = data as MoneyOpResult;
        if (r.error === 'not_listed') return badRequest('Not listed');
        if (r.error === 'own_output') return badRequest('Cannot buy your own Output');
        if (r.error === 'insufficient_balance') return badRequest('Insufficient balance');
        if (r.error) return badRequest(r.error);

        // Ping the seller: "@buyer collected #12 · 0.5 ETH".
        if (seller) {
          await createPing({
            recipientAddress: seller,
            kind: 'SALE',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: salePrice,
          });
        }
        // Fan to everyone who cares: wishlisters ("it's gone") + interest audiences.
        await fanOutMarketPings(db, { slug, tokenId, event: 'sold', actorAddress: address, amountEth: salePrice });
        return NextResponse.json({ ok: true, bought: r.bought });
      }
      case 'offer': {
        if (isOwner) return badRequest('Cannot offer on your own Output');
        if (!(price > 0)) return badRequest('Bad price');
        const endTime = nowSec() + clampDuration(body.durationSec);
        await db.from('offers').insert({
          project_id: slug, token_id: tokenId, bidder_address: address,
          price_eth: price, status: 'open', end_time: endTime,
          currency: 'ETH', source: 'sim', scope: 'item',
        } as never);
        await db.from('events').insert({ type: 'OFFER', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: price, timestamp: nowSec() } as never);

        // Ping the token owner: "@bidder offered 0.5 ETH on #12" (rolled up).
        if (owner) {
          await createPing({
            recipientAddress: owner,
            kind: 'OFFER',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: price,
            groupKey: `OFFER:${slug}:${tokenId}`,
          });
        }
        return NextResponse.json({ ok: true, offered: price });
      }
      case 'accept': {
        if (!body.offerId) return badRequest('Missing offerId');
        // Capture the bidder + price before the RPC flips the offer state.
        const offerRow = await db
          .from('offers')
          .select('bidder_address, price_eth')
          .eq('id', body.offerId)
          .maybeSingle();
        const accepted = offerRow.data as { bidder_address?: string; price_eth?: number } | null;

        const { data, error } = await db.rpc('app_accept_offer', {
          p_owner: address, p_slug: slug, p_token: tokenId, p_offer_id: body.offerId,
        } as never);
        if (error) return serverError(error.message);
        const r = data as MoneyOpResult;
        if (r.error === 'not_owner') return badRequest('Only the owner can accept');
        if (r.error === 'offer_not_open') return badRequest('Offer not open');
        if (r.error === 'own_offer') return badRequest('Cannot accept your own offer');
        if (r.error) return badRequest(r.error);

        // Ping the bidder: "@owner accepted your 0.5 ETH offer on #12".
        if (accepted?.bidder_address) {
          await createPing({
            recipientAddress: accepted.bidder_address,
            kind: 'OFFER_ACCEPTED',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: accepted.price_eth ?? null,
          });
        }
        return NextResponse.json({ ok: true, sold: r.sold });
      }

      // ── Chain rail — signed Seaport orders on the same book ────────────────
      case 'list_order': {
        if (!isOwner) return badRequest('Only the owner can list');
        if (!body.order || !body.orderHash) return badRequest('Missing order');
        const royaltyReceiver = await resolveRoyaltyReceiver(db, slug, contract as string);
        if (!royaltyReceiver) return serverError('Royalty receiver unavailable');
        let checked;
        try {
          checked = await checkListingOrder(body.order, {
            address, contract: contract as string, tokenId, royaltyReceiver,
          });
        } catch (e) {
          return badRequest(e instanceof Error ? e.message : 'Bad order');
        }
        await db.from('listings').upsert(
          {
            project_id: slug, token_id: tokenId, seller_address: address,
            price_eth: Number(checked.priceEth), active: true, listed_at: new Date().toISOString(),
            start_time: checked.startTime, end_time: checked.endTime,
            currency: checked.currency, source: 'seaport',
            order_hash: body.orderHash, order_json: body.order, tx_hash: null,
          } as never,
          { onConflict: 'project_id,token_id' },
        );
        await db.from('events').insert({ type: 'LIST', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: Number(checked.priceEth), timestamp: nowSec() } as never);
        await fanOutMarketPings(db, { slug, tokenId, event: 'listed', actorAddress: address, amountEth: Number(checked.priceEth) });
        return NextResponse.json({ ok: true, listed: Number(checked.priceEth) });
      }
      case 'offer_order': {
        if (isOwner) return badRequest('Cannot offer on your own Output');
        if (!body.order || !body.orderHash) return badRequest('Missing order');
        const royaltyReceiver = await resolveRoyaltyReceiver(db, slug, contract as string);
        if (!royaltyReceiver) return serverError('Royalty receiver unavailable');
        let checked;
        try {
          checked = await checkOfferOrder(body.order, {
            address, contract: contract as string, royaltyReceiver, scope: 'item', tokenId,
          });
        } catch (e) {
          return badRequest(e instanceof Error ? e.message : 'Bad order');
        }
        await db.from('offers').insert({
          project_id: slug, token_id: tokenId, bidder_address: address,
          price_eth: Number(checked.priceEth), status: 'open',
          start_time: checked.startTime, end_time: checked.endTime,
          currency: checked.currency, source: 'seaport', scope: 'item',
          order_hash: body.orderHash, order_json: body.order,
        } as never);
        await db.from('events').insert({ type: 'OFFER', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: Number(checked.priceEth), timestamp: nowSec() } as never);
        if (owner) {
          await createPing({
            recipientAddress: owner,
            kind: 'OFFER',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: Number(checked.priceEth),
            groupKey: `OFFER:${slug}:${tokenId}`,
          });
        }
        return NextResponse.json({ ok: true, offered: Number(checked.priceEth) });
      }
      case 'cancel_order': {
        // The seller closes their own chain listing after cancelling on-chain
        // (or to sweep an expired row off the book).
        const row = await db
          .from('listings')
          .select('seller_address, order_hash')
          .eq('project_id', slug).eq('token_id', tokenId).eq('active', true)
          .maybeSingle();
        const seller = (row.data as { seller_address?: string; order_hash?: string | null } | null);
        if (!seller || seller.seller_address?.toLowerCase() !== address) {
          return badRequest('Only the seller can cancel');
        }
        if (body.orderHash && seller.order_hash && body.orderHash !== seller.order_hash) {
          return badRequest('Order mismatch');
        }
        await db.from('listings')
          .update({ active: false, tx_hash: body.txHash ?? null } as never)
          .eq('project_id', slug).eq('token_id', tokenId);
        return NextResponse.json({ ok: true });
      }
      default:
        return badRequest('Unknown action');
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
