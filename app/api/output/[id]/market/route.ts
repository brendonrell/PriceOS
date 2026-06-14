// /api/output/[id]/market — chainless secondary market for one Output.
// id = "{slug}-{tokenId}" (e.g. "oracle-12").
//
// Models Seaport / OpenSea order semantics (listings + item offers) so the
// real build swaps in the OpenSea SDK without reshaping the data:
//   GET            → owner, active listing, open offers, + viewer context.
//   POST {action}  → list | cancel | buy | offer | accept  (SIWE-gated).
//
// All money is the sim ETH balance on users.sim_eth_balance. No chain.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type MoneyOpResult } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { createPing } from '@/lib/pings/createPing';

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

// ── GET ──────────────────────────────────────────────────────────────────────
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;
  try {
    const db = getSupabaseService();
    const [holder, listing, offers, lastSale, proj] = await Promise.all([
      db.from('holders').select('owner_address').eq('project_id', slug).eq('token_id', tokenId).maybeSingle(),
      db.from('listings').select('price_eth').eq('project_id', slug).eq('token_id', tokenId).eq('active', true).maybeSingle(),
      db.from('offers').select('id, bidder_address, price_eth').eq('project_id', slug).eq('token_id', tokenId).eq('status', 'open').order('price_eth', { ascending: false }),
      db.from('events').select('price_eth, timestamp').eq('project_id', slug).eq('token_id', tokenId).eq('type', 'XFER').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
      db.from('projects').select('floor_price_eth').eq('id', slug).maybeSingle(),
    ]);
    const owner = (holder.data as { owner_address?: string } | null)?.owner_address ?? null;
    let ownerHandle: string | null = null;
    if (owner) {
      const u = await db.from('users').select('handle').eq('address', owner).maybeSingle();
      ownerHandle = (u.data as { handle?: string | null } | null)?.handle ?? null;
    }
    const viewerAddr = await verifySiweSession(req);
    let viewer: { address: string; isOwner: boolean; balance: number } | null = null;
    if (viewerAddr) {
      const { bal } = await balanceOf(db, viewerAddr);
      viewer = { address: viewerAddr, isOwner: !!owner && owner.toLowerCase() === viewerAddr, balance: bal };
    }
    return NextResponse.json({
      project_id: slug,
      token_id: Number(tokenId),
      owner,
      owner_handle: ownerHandle,
      listing: listing.data ? { price_eth: String((listing.data as { price_eth: number }).price_eth) } : null,
      offers: ((offers.data ?? []) as { id: string; bidder_address: string; price_eth: number }[]).map((o) => ({
        id: o.id,
        bidder: o.bidder_address,
        price_eth: String(o.price_eth),
      })),
      last_sale: (lastSale.data as { price_eth?: number } | null)?.price_eth != null
        ? String((lastSale.data as unknown as { price_eth: number }).price_eth)
        : null,
      floor: (proj.data as { floor_price_eth?: number } | null)?.floor_price_eth != null
        ? String((proj.data as unknown as { floor_price_eth: number }).floor_price_eth)
        : null,
      viewer,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST (action-dispatched) ──────────────────────────────────────────────────
interface Body {
  action: 'list' | 'cancel' | 'buy' | 'offer' | 'accept';
  price?: number | string;
  offerId?: string;
}

export const POST = requireAuth<{ id: string }>(async (req, ctx, address) => {
  const parsed = parseId(ctx.params.id);
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
    const owner = await ownerOf(db, slug, tokenId);
    const isOwner = !!owner && owner.toLowerCase() === address;
    const price = Number(body.price);

    switch (body.action) {
      case 'list': {
        if (!isOwner) return badRequest('Only the owner can list');
        if (!(price > 0)) return badRequest('Bad price');
        await db.from('listings').upsert(
          { project_id: slug, token_id: tokenId, seller_address: address, price_eth: price, active: true } as never,
          { onConflict: 'project_id,token_id' },
        );
        await db.from('events').insert({ type: 'LIST', project_id: slug, token_id: tokenId, from_address: address, to_address: null, price_eth: price, timestamp: nowSec() } as never);
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
        return NextResponse.json({ ok: true, bought: r.bought });
      }
      case 'offer': {
        if (isOwner) return badRequest('Cannot offer on your own Output');
        if (!(price > 0)) return badRequest('Bad price');
        await db.from('offers').insert({ project_id: slug, token_id: tokenId, bidder_address: address, price_eth: price, status: 'open' } as never);
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
      default:
        return badRequest('Unknown action');
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
