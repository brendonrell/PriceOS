// /api/market/orders — the market actions that span more than one token:
// batch listing (multi-select List/Re-List), criteria offers (collection /
// trait), sweep tickets + fill confirmations, and per-project market meta.
//
// Same two-rail model as /api/output/[id]/market: sim projects settle through
// the Supabase money RPCs; on-chain projects store wallet-signed Seaport
// orders and settle on-chain (the indexer books the sale — confirmations here
// only close book rows + fire the instant pings).

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type MoneyOpResult } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { createPing } from '@/lib/pings/createPing';
import { fanOutMarketPings } from '@/lib/pings/fanout';
import { checkListingOrder, checkOfferOrder, resolveRoyaltyReceiver } from '@/lib/market/orderCheck';
import { DEFAULT_DURATION_SEC, MAX_DURATION_SEC } from '@/lib/market/chain';
import { tokenMatchesTrait, traitIdentifiers } from '@/lib/market/traitMatch';
import type { OfferCriteria, SeaportOrderJson } from '@/lib/market/orderTypes';

export const dynamic = 'force-dynamic';

type DB = ReturnType<typeof getSupabaseService>;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function liveOr(now: number): string {
  return `end_time.is.null,end_time.gt.${now}`;
}

function clampDuration(durationSec: unknown): number {
  const n = Number(durationSec);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DURATION_SEC;
  return Math.min(Math.max(600, Math.floor(n)), MAX_DURATION_SEC);
}

async function projectMarket(db: DB, slug: string): Promise<{ contract: string | null } | null> {
  if (!getProject(slug)) return null;
  const r = await db.from('projects').select('contract_address').eq('id', slug).maybeSingle();
  if (!r.data) return null;
  return { contract: (r.data as { contract_address?: string | null }).contract_address ?? null };
}

async function ownerOf(db: DB, slug: string, tokenId: string): Promise<string | null> {
  const r = await db.from('holders').select('owner_address').eq('project_id', slug).eq('token_id', tokenId).maybeSingle();
  return (r.data as { owner_address?: string } | null)?.owner_address ?? null;
}

// ── GET — meta / sweep tickets / trait ids / project criteria offers ─────────
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseService();
    const url = new URL(req.url);
    const now = nowSec();

    // Per-project market meta — which rail + the royalty receiver a signer needs.
    const metaSlug = url.searchParams.get('meta');
    if (metaSlug) {
      const slug = metaSlug.toLowerCase();
      const pm = await projectMarket(db, slug);
      if (!pm) return badRequest('Unknown project');
      const royaltyReceiver = pm.contract ? await resolveRoyaltyReceiver(db, slug, pm.contract) : null;
      return NextResponse.json({
        project_id: slug,
        on_chain: !!pm.contract,
        contract_address: pm.contract,
        royalty_receiver: royaltyReceiver,
      });
    }

    // Sweep tickets — the active listing (fill ticket) per requested item.
    const ordersFor = url.searchParams.get('orders_for');
    if (ordersFor) {
      const items = ordersFor.split(',').map((k) => {
        const idx = k.lastIndexOf('-');
        return idx > 0 ? { slug: k.slice(0, idx).toLowerCase(), tokenId: k.slice(idx + 1) } : null;
      }).filter((x): x is { slug: string; tokenId: string } => !!x && !!getProject(x.slug));
      if (items.length === 0 || items.length > 100) return badRequest('Bad items');

      const bySlug = new Map<string, string[]>();
      for (const it of items) {
        const arr = bySlug.get(it.slug) ?? [];
        arr.push(it.tokenId);
        bySlug.set(it.slug, arr);
      }
      const tickets: unknown[] = [];
      for (const [slug, tokenIds] of bySlug) {
        const r = await db
          .from('listings')
          .select('project_id, token_id, seller_address, price_eth, source, order_hash, order_json, end_time')
          .eq('project_id', slug).eq('active', true).in('token_id', tokenIds)
          .or(liveOr(now));
        if (r.error) return serverError(r.error.message);
        for (const row of (r.data ?? []) as Record<string, unknown>[]) {
          tickets.push({
            slug,
            tokenId: String(row.token_id),
            price_eth: String(row.price_eth),
            seller_address: row.seller_address,
            source: row.source ?? 'sim',
            order_hash: row.order_hash ?? null,
            order_json: row.order_json ?? null,
          });
        }
      }
      return NextResponse.json({ tickets });
    }

    // Trait identifier set — the minted tokens matching {category: value}.
    const traitSlug = url.searchParams.get('trait_ids');
    if (traitSlug) {
      const slug = traitSlug.toLowerCase();
      const category = url.searchParams.get('category') ?? '';
      const value = url.searchParams.get('value') ?? '';
      if (!getProject(slug) || !category || !value) return badRequest('Bad trait query');
      const identifiers = await traitIdentifiers(db, slug, category, value);
      return NextResponse.json({ identifiers });
    }

    // Open offers on a project — criteria only by default (the trait-bid
    // chips), or the FULL book with `all=1` (the +More Offers tab).
    const projSlug = url.searchParams.get('project');
    if (projSlug) {
      const slug = projSlug.toLowerCase();
      if (!getProject(slug)) return badRequest('Unknown project');
      let q = db
        .from('offers')
        .select('id, project_id, token_id, bidder_address, price_eth, status, scope, criteria, end_time, currency, source, order_hash, order_json')
        .eq('project_id', slug).eq('status', 'open');
      if (url.searchParams.get('all') !== '1') q = q.in('scope', ['collection', 'trait']);
      const r = await q.or(liveOr(now)).order('price_eth', { ascending: false }).limit(100);
      if (r.error) return serverError(r.error.message);
      const rows = (r.data ?? []) as { bidder_address: string }[];
      const bidders = Array.from(new Set(rows.map((o) => o.bidder_address)));
      const handleByAddr = new Map<string, string | null>();
      if (bidders.length > 0) {
        const hs = await db.from('users').select('address, handle').in('address', bidders);
        for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
          handleByAddr.set(u.address, u.handle);
        }
      }
      return NextResponse.json({
        offers: rows.map((o) => ({ ...o, bidder_handle: handleByAddr.get(o.bidder_address) ?? null })),
      });
    }

    return badRequest('Missing query');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST (action-dispatched, SIWE-gated) ─────────────────────────────────────
interface SimListItem { slug: string; tokenId: string; priceEth: string }
interface ChainListItem extends SimListItem { order: SeaportOrderJson; orderHash: string }

interface Body {
  action: 'batch_list' | 'batch_offer' | 'criteria_offer' | 'accept_criteria' | 'decline_offer' | 'cancel_offer' | 'counter_ping' | 'confirm_fills' | 'confirm_offer_fill';
  durationSec?: number;
  sim?: SimListItem[];
  chain?: ChainListItem[];
  slug?: string;
  scope?: 'collection' | 'trait';
  category?: string;
  value?: string;
  price?: number | string;
  order?: SeaportOrderJson;
  orderHash?: string;
  offerId?: string;
  tokenId?: string;
  txHash?: string;
  fills?: { slug: string; tokenId: string; orderHash: string | null }[];
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return badRequest('Invalid JSON body');
  }

  try {
    const db = getSupabaseService();

    switch (body.action) {
      // ── Multi-select List / Re-List — both rails in one post ─────────────
      case 'batch_list': {
        const sim = (body.sim ?? []).slice(0, 60);
        const chain = (body.chain ?? []).slice(0, 60);
        if (sim.length + chain.length === 0) return badRequest('Nothing to list');
        const endTime = nowSec() + clampDuration(body.durationSec);
        let listed = 0;
        const failed: { slug: string; tokenId: string; error: string }[] = [];

        const contractCache = new Map<string, string | null>();
        const contractOf = async (slug: string): Promise<string | null | undefined> => {
          if (!contractCache.has(slug)) {
            const pm = await projectMarket(db, slug);
            contractCache.set(slug, pm ? pm.contract : null);
            if (!pm) return undefined;
          }
          return contractCache.get(slug);
        };

        for (const item of sim) {
          const slug = item.slug.toLowerCase();
          const price = Number(item.priceEth);
          try {
            const contract = await contractOf(slug);
            if (contract === undefined) throw new Error('Unknown project');
            if (contract) throw new Error('Project is on-chain — trade on-chain');
            if (!(price > 0)) throw new Error('Bad price');
            const owner = await ownerOf(db, slug, item.tokenId);
            if (!owner || owner.toLowerCase() !== address) throw new Error('Only the owner can list');
            await db.from('listings').upsert(
              {
                project_id: slug, token_id: item.tokenId, seller_address: address,
                price_eth: price, active: true, end_time: endTime, listed_at: new Date().toISOString(),
                currency: 'ETH', source: 'sim', order_hash: null, order_json: null, tx_hash: null,
              } as never,
              { onConflict: 'project_id,token_id' },
            );
            await db.from('events').insert({ type: 'LIST', project_id: slug, token_id: item.tokenId, from_address: address, to_address: null, price_eth: price, timestamp: nowSec() } as never);
            await fanOutMarketPings(db, { slug, tokenId: item.tokenId, event: 'listed', actorAddress: address, amountEth: price });
            listed++;
          } catch (e) {
            failed.push({ slug, tokenId: item.tokenId, error: e instanceof Error ? e.message : 'List failed' });
          }
        }

        for (const item of chain) {
          const slug = item.slug.toLowerCase();
          try {
            const contract = await contractOf(slug);
            if (!contract) throw new Error('Project is not on-chain yet');
            const owner = await ownerOf(db, slug, item.tokenId);
            if (!owner || owner.toLowerCase() !== address) throw new Error('Only the owner can list');
            const royaltyReceiver = await resolveRoyaltyReceiver(db, slug, contract);
            if (!royaltyReceiver) throw new Error('Royalty receiver unavailable');
            const checked = await checkListingOrder(item.order, {
              address, contract, tokenId: item.tokenId, royaltyReceiver,
            });
            await db.from('listings').upsert(
              {
                project_id: slug, token_id: item.tokenId, seller_address: address,
                price_eth: Number(checked.priceEth), active: true, listed_at: new Date().toISOString(),
                start_time: checked.startTime, end_time: checked.endTime,
                currency: checked.currency, source: 'seaport',
                order_hash: item.orderHash, order_json: item.order, tx_hash: null,
              } as never,
              { onConflict: 'project_id,token_id' },
            );
            await db.from('events').insert({ type: 'LIST', project_id: slug, token_id: item.tokenId, from_address: address, to_address: null, price_eth: Number(checked.priceEth), timestamp: nowSec() } as never);
            await fanOutMarketPings(db, { slug, tokenId: item.tokenId, event: 'listed', actorAddress: address, amountEth: Number(checked.priceEth) });
            listed++;
          } catch (e) {
            failed.push({ slug, tokenId: item.tokenId, error: e instanceof Error ? e.message : 'List failed' });
          }
        }
        return NextResponse.json({ ok: true, listed, failed });
      }

      // ── Multi-select Make Offer — item offers on both rails ──────────────
      case 'batch_offer': {
        const sim = (body.sim ?? []).slice(0, 60);
        const chain = (body.chain ?? []).slice(0, 60);
        if (sim.length + chain.length === 0) return badRequest('Nothing to offer');
        const endTime = nowSec() + clampDuration(body.durationSec);
        let offered = 0;
        const failed: { slug: string; tokenId: string; error: string }[] = [];

        const contractCache = new Map<string, string | null>();
        const contractOf = async (slug: string): Promise<string | null | undefined> => {
          if (!contractCache.has(slug)) {
            const pm = await projectMarket(db, slug);
            contractCache.set(slug, pm ? pm.contract : null);
            if (!pm) return undefined;
          }
          return contractCache.get(slug);
        };

        const placeOffer = async (
          slug: string, tokenId: string, price: number,
          extra: Record<string, unknown>,
        ) => {
          const owner = await ownerOf(db, slug, tokenId);
          if (owner && owner.toLowerCase() === address) throw new Error('Cannot offer on your own Output');
          await db.from('offers').insert({
            project_id: slug, token_id: tokenId, bidder_address: address,
            price_eth: price, status: 'open', scope: 'item',
            ...extra,
          } as never);
          await db.from('events').insert({ type: 'OFFER', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: price, timestamp: nowSec() } as never);
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
        };

        for (const item of sim) {
          const slug = item.slug.toLowerCase();
          const price = Number(item.priceEth);
          try {
            const contract = await contractOf(slug);
            if (contract === undefined) throw new Error('Unknown project');
            if (contract) throw new Error('Project is on-chain — trade on-chain');
            if (!(price > 0)) throw new Error('Bad price');
            await placeOffer(slug, item.tokenId, price, {
              end_time: endTime, currency: 'ETH', source: 'sim',
            });
            offered++;
          } catch (e) {
            failed.push({ slug, tokenId: item.tokenId, error: e instanceof Error ? e.message : 'Offer failed' });
          }
        }

        for (const item of chain) {
          const slug = item.slug.toLowerCase();
          try {
            const contract = await contractOf(slug);
            if (!contract) throw new Error('Project is not on-chain yet');
            const royaltyReceiver = await resolveRoyaltyReceiver(db, slug, contract);
            if (!royaltyReceiver) throw new Error('Royalty receiver unavailable');
            const checked = await checkOfferOrder(item.order, {
              address, contract, royaltyReceiver, scope: 'item', tokenId: item.tokenId,
            });
            await placeOffer(slug, item.tokenId, Number(checked.priceEth), {
              start_time: checked.startTime, end_time: checked.endTime,
              currency: checked.currency, source: 'seaport',
              order_hash: item.orderHash, order_json: item.order,
            });
            offered++;
          } catch (e) {
            failed.push({ slug, tokenId: item.tokenId, error: e instanceof Error ? e.message : 'Offer failed' });
          }
        }
        return NextResponse.json({ ok: true, offered, failed });
      }

      // ── Collection / trait offers ─────────────────────────────────────────
      case 'criteria_offer': {
        const slug = (body.slug ?? '').toLowerCase();
        const scope = body.scope;
        if (!getProject(slug)) return badRequest('Unknown project');
        if (scope !== 'collection' && scope !== 'trait') return badRequest('Bad scope');
        if (scope === 'trait' && (!body.category || !body.value)) return badRequest('Missing trait');
        const pm = await projectMarket(db, slug);
        if (!pm) return badRequest('Unknown project');

        const criteria: OfferCriteria = scope === 'trait'
          ? { category: body.category, value: body.value }
          : {};

        if (!pm.contract) {
          const price = Number(body.price);
          if (!(price > 0)) return badRequest('Bad price');
          const endTime = nowSec() + clampDuration(body.durationSec);
          await db.from('offers').insert({
            project_id: slug, token_id: null, bidder_address: address,
            price_eth: price, status: 'open', end_time: endTime,
            currency: 'ETH', source: 'sim', scope, criteria,
          } as never);
          return NextResponse.json({ ok: true, offered: price });
        }

        if (!body.order || !body.orderHash) return badRequest('Missing order');
        const royaltyReceiver = await resolveRoyaltyReceiver(db, slug, pm.contract);
        if (!royaltyReceiver) return serverError('Royalty receiver unavailable');
        // Trait offers: the committed identifier set is re-derived HERE (never
        // trusted from the client) so accept-time proofs match our book.
        if (scope === 'trait') {
          criteria.identifiers = await traitIdentifiers(db, slug, body.category as string, body.value as string);
          if (criteria.identifiers.length === 0) return badRequest('No pieces match this trait');
        }
        let checked;
        try {
          checked = await checkOfferOrder(body.order, {
            address, contract: pm.contract, royaltyReceiver, scope,
          });
        } catch (e) {
          return badRequest(e instanceof Error ? e.message : 'Bad order');
        }
        await db.from('offers').insert({
          project_id: slug, token_id: null, bidder_address: address,
          price_eth: Number(checked.priceEth), status: 'open',
          start_time: checked.startTime, end_time: checked.endTime,
          currency: checked.currency, source: 'seaport', scope, criteria,
          order_hash: body.orderHash, order_json: body.order,
        } as never);
        return NextResponse.json({ ok: true, offered: Number(checked.priceEth) });
      }

      // ── Sim criteria accept — owner sells THIS token into the offer ──────
      case 'accept_criteria': {
        const slug = (body.slug ?? '').toLowerCase();
        const tokenId = body.tokenId ?? '';
        if (!getProject(slug) || !/^\d+$/.test(tokenId)) return badRequest('Bad target');
        if (!body.offerId) return badRequest('Missing offerId');

        const offerRow = await db
          .from('offers')
          .select('bidder_address, price_eth, scope, criteria, source')
          .eq('id', body.offerId)
          .maybeSingle();
        const offer = offerRow.data as {
          bidder_address?: string; price_eth?: number; scope?: string;
          criteria?: OfferCriteria | null; source?: string;
        } | null;
        if (!offer) return badRequest('Offer not open');
        if (offer.source !== 'sim') return badRequest('On-chain offer — accept on-chain');
        if (offer.scope === 'trait') {
          const c = offer.criteria;
          if (!c?.category || !c?.value) return badRequest('Offer criteria missing');
          const matches = await tokenMatchesTrait(db, slug, tokenId, c.category, c.value);
          if (!matches) return badRequest('This piece does not match the offer');
        }

        const { data, error } = await db.rpc('app_accept_criteria_offer', {
          p_owner: address, p_slug: slug, p_token: tokenId, p_offer_id: body.offerId,
        } as never);
        if (error) return serverError(error.message);
        const r = data as MoneyOpResult;
        if (r.error === 'not_owner') return badRequest('Only the owner can accept');
        if (r.error === 'offer_not_open') return badRequest('Offer not open');
        if (r.error === 'own_offer') return badRequest('Cannot accept your own offer');
        if (r.error === 'not_criteria' || r.error === 'wrong_project') return badRequest('Bad offer target');
        if (r.error) return badRequest(r.error);

        if (offer.bidder_address) {
          await createPing({
            recipientAddress: offer.bidder_address,
            kind: 'OFFER_ACCEPTED',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: offer.price_eth ?? null,
          });
        }
        return NextResponse.json({ ok: true, sold: r.sold });
      }

      // ── Owner hides an item offer from their book ─────────────────────────
      case 'decline_offer': {
        if (!body.offerId) return badRequest('Missing offerId');
        const r = await db
          .from('offers')
          .select('project_id, token_id, scope, status')
          .eq('id', body.offerId)
          .maybeSingle();
        const offer = r.data as { project_id?: string; token_id?: string | null; scope?: string; status?: string } | null;
        if (!offer || offer.status !== 'open') return badRequest('Offer not open');
        if (offer.scope !== 'item' || !offer.token_id) return badRequest('Only item offers can be declined');
        const owner = await ownerOf(db, offer.project_id as string, offer.token_id);
        if (!owner || owner.toLowerCase() !== address) return badRequest('Only the owner can decline');
        await db.from('offers').update({ status: 'declined', resolved_at: new Date().toISOString() } as never).eq('id', body.offerId);
        return NextResponse.json({ ok: true });
      }

      // ── Owner countered an offer — ping the bidder with the number ────────
      // The listing itself already landed via the normal list rail; this is
      // the instant "they countered at X" signal to the bidder.
      case 'counter_ping': {
        const slug = (body.slug ?? '').toLowerCase();
        const tokenId = body.tokenId ?? '';
        const price = Number(body.price);
        if (!getProject(slug) || !/^\d+$/.test(tokenId) || !(price > 0)) return badRequest('Bad counter');
        if (!body.offerId) return badRequest('Missing offerId');
        const r = await db
          .from('offers')
          .select('bidder_address, status, project_id')
          .eq('id', body.offerId)
          .maybeSingle();
        const offer = r.data as { bidder_address?: string; status?: string; project_id?: string } | null;
        if (!offer || offer.status !== 'open' || offer.project_id !== slug) return badRequest('Offer not open');
        const owner = await ownerOf(db, slug, tokenId);
        if (!owner || owner.toLowerCase() !== address) return badRequest('Only the owner can counter');
        if (offer.bidder_address) {
          await createPing({
            recipientAddress: offer.bidder_address,
            kind: 'COUNTER',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: price,
            groupKey: `COUNTER:${slug}:${tokenId}`,
          });
        }
        return NextResponse.json({ ok: true });
      }

      // ── Bidder withdraws their own offer ──────────────────────────────────
      case 'cancel_offer': {
        if (!body.offerId) return badRequest('Missing offerId');
        const r = await db
          .from('offers')
          .select('bidder_address, status')
          .eq('id', body.offerId)
          .maybeSingle();
        const offer = r.data as { bidder_address?: string; status?: string } | null;
        if (!offer || offer.status !== 'open') return badRequest('Offer not open');
        if (offer.bidder_address?.toLowerCase() !== address) return badRequest('Only the bidder can cancel');
        await db.from('offers')
          .update({ status: 'cancelled', tx_hash: body.txHash ?? null, resolved_at: new Date().toISOString() } as never)
          .eq('id', body.offerId);
        return NextResponse.json({ ok: true });
      }

      // ── Sweep confirmation — close filled chain listings optimistically ──
      // The indexer's on-chain sale row is authoritative (events / holders /
      // volume / seller ping); this just closes the book rows the buyer hit
      // and fires the instant wishlist pings.
      case 'confirm_fills': {
        const fills = (body.fills ?? []).slice(0, 60);
        if (fills.length === 0 || !body.txHash) return badRequest('Missing fills');
        let closed = 0;
        for (const f of fills) {
          const slug = f.slug.toLowerCase();
          if (!getProject(slug)) continue;
          const row = await db
            .from('listings')
            .select('price_eth, order_hash, source')
            .eq('project_id', slug).eq('token_id', f.tokenId).eq('active', true)
            .maybeSingle();
          const listing = row.data as { price_eth?: number; order_hash?: string | null; source?: string } | null;
          if (!listing || listing.source === 'sim') continue;
          if (f.orderHash && listing.order_hash && f.orderHash !== listing.order_hash) continue;
          await db.from('listings')
            .update({ active: false, tx_hash: body.txHash } as never)
            .eq('project_id', slug).eq('token_id', f.tokenId);
          await fanOutMarketPings(db, { slug, tokenId: f.tokenId, event: 'sold', actorAddress: address, amountEth: listing.price_eth ?? null });
          closed++;
        }
        return NextResponse.json({ ok: true, closed });
      }

      // ── Chain offer accepted — close the offer row + ping the bidder ─────
      case 'confirm_offer_fill': {
        const slug = (body.slug ?? '').toLowerCase();
        const tokenId = body.tokenId ?? '';
        if (!getProject(slug) || !/^\d+$/.test(tokenId)) return badRequest('Bad target');
        if (!body.offerId || !body.txHash) return badRequest('Missing offer');
        const r = await db
          .from('offers')
          .select('bidder_address, price_eth, status, source, project_id')
          .eq('id', body.offerId)
          .maybeSingle();
        const offer = r.data as {
          bidder_address?: string; price_eth?: number; status?: string; source?: string; project_id?: string;
        } | null;
        if (!offer || offer.status !== 'open') return badRequest('Offer not open');
        if (offer.source === 'sim') return badRequest('Sim offer — accept in-app');
        if (offer.project_id !== slug) return badRequest('Bad offer target');
        // The acceptor must be the token's owner on our book.
        const owner = await ownerOf(db, slug, tokenId);
        if (!owner || owner.toLowerCase() !== address) return badRequest('Only the owner can accept');

        await db.from('offers')
          .update({ status: 'accepted', token_id: tokenId, tx_hash: body.txHash, resolved_at: new Date().toISOString() } as never)
          .eq('id', body.offerId);
        await db.from('listings')
          .update({ active: false } as never)
          .eq('project_id', slug).eq('token_id', tokenId).eq('active', true);
        if (offer.bidder_address) {
          await createPing({
            recipientAddress: offer.bidder_address,
            kind: 'OFFER_ACCEPTED',
            actorAddress: address,
            projectId: slug,
            tokenId,
            amountEth: offer.price_eth ?? null,
          });
        }
        return NextResponse.json({ ok: true });
      }

      default:
        return badRequest('Unknown action');
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
