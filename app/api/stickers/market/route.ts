// /api/stickers/market — the sheet market. Lives ONLY behind the Sticker
// Exchange's MARKET view (and OpenSea once PDStickers is on-chain) — no other
// surface trades sheets.
//
// ERC-1155 semantics on the sim rail: per-sheet balances (sticker_holdings),
// per-sheet-priced listings/offers with quantities, PARTIAL fills, listing
// escrow (LIST decrements your balance; CANCEL returns it). Money is the same
// sim ETH balance the art market uses, moved by the atomic RPCs. Primary sheet
// buys now also record a CLAIM here so sellers provably hold what they list
// (claim_sync migrates a device's pre-existing sheets, once, qty 1).

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { createPing } from '@/lib/pings/createPing';
import { SHEETS } from '@/lib/stickers/catalog';
import { DEFAULT_DURATION_SEC, MAX_DURATION_SEC } from '@/lib/market/chain';

export const dynamic = 'force-dynamic';

const SHEET_IDS = new Set<string>(SHEETS.map((s) => s.id));

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

// ── GET — the store's market read ────────────────────────────────────────────
// ?summary=1        → per-sheet floor / best offer / listed qty / last / volume
// ?sheet={id}       → the full book for one sheet (+ viewer position)
export async function GET(req: NextRequest) {
  try {
    const db = getSupabaseService();
    const url = new URL(req.url);
    const now = nowSec();

    if (url.searchParams.get('summary') === '1') {
      const [listRes, offRes, evRes] = await Promise.all([
        db.from('sticker_listings').select('sheet_id, price_eth, qty').eq('active', true).or(liveOr(now)),
        db.from('sticker_offers').select('sheet_id, price_eth, qty').eq('status', 'open').or(liveOr(now)),
        db.from('sticker_events').select('sheet_id, price_eth, qty, timestamp').eq('type', 'SALE').order('timestamp', { ascending: false }).limit(500),
      ]);
      if (listRes.error) return serverError(listRes.error.message);
      const bySheet: Record<string, { floor: number | null; listed: number; best_offer: number | null; bid_qty: number; last: number | null; volume: number; sales: number }> = {};
      const slot = (id: string) => (bySheet[id] ??= { floor: null, listed: 0, best_offer: null, bid_qty: 0, last: null, volume: 0, sales: 0 });
      for (const l of (listRes.data ?? []) as { sheet_id: string; price_eth: number; qty: number }[]) {
        const s = slot(l.sheet_id);
        const p = Number(l.price_eth);
        s.listed += l.qty;
        if (s.floor == null || p < s.floor) s.floor = p;
      }
      for (const o of (offRes.data ?? []) as { sheet_id: string; price_eth: number; qty: number }[]) {
        const s = slot(o.sheet_id);
        const p = Number(o.price_eth);
        s.bid_qty += o.qty;
        if (s.best_offer == null || p > s.best_offer) s.best_offer = p;
      }
      for (const e of (evRes.data ?? []) as { sheet_id: string; price_eth: number | null; qty: number }[]) {
        const s = slot(e.sheet_id);
        if (e.price_eth != null) {
          if (s.last == null) s.last = Number(e.price_eth); // newest-first
          s.volume += Number(e.price_eth) * e.qty;
          s.sales += e.qty;
        }
      }
      return NextResponse.json({ sheets: bySheet });
    }

    const sheet = url.searchParams.get('sheet');
    if (sheet) {
      if (!SHEET_IDS.has(sheet)) return badRequest('Unknown sheet');
      const viewer = await verifySiweSession(req);
      const [listRes, offRes, holdRes, lastRes] = await Promise.all([
        db.from('sticker_listings')
          .select('id, sheet_id, seller_address, price_eth, qty, end_time, source')
          .eq('sheet_id', sheet).eq('active', true).or(liveOr(now))
          .order('price_eth', { ascending: true }).limit(60),
        db.from('sticker_offers')
          .select('id, sheet_id, bidder_address, price_eth, qty, end_time, source')
          .eq('sheet_id', sheet).eq('status', 'open').or(liveOr(now))
          .order('price_eth', { ascending: false }).limit(60),
        viewer
          ? db.from('sticker_holdings').select('qty').eq('owner_address', viewer).eq('sheet_id', sheet).maybeSingle()
          : Promise.resolve({ data: null, error: null } as never),
        db.from('sticker_events').select('price_eth, timestamp').eq('sheet_id', sheet).eq('type', 'SALE').order('timestamp', { ascending: false }).limit(1).maybeSingle(),
      ]);
      if (listRes.error) return serverError(listRes.error.message);
      if (offRes.error) return serverError(offRes.error.message);

      const addrs = Array.from(new Set([
        ...((listRes.data ?? []) as { seller_address: string }[]).map((l) => l.seller_address),
        ...((offRes.data ?? []) as { bidder_address: string }[]).map((o) => o.bidder_address),
      ]));
      const handleByAddr = new Map<string, string | null>();
      if (addrs.length > 0) {
        const hs = await db.from('users').select('address, handle').in('address', addrs);
        for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
          handleByAddr.set(u.address, u.handle);
        }
      }
      const withHandle = <T extends { [k: string]: unknown }>(rows: T[], key: string) =>
        rows.map((r) => ({ ...r, handle: handleByAddr.get(r[key] as string) ?? null }));

      return NextResponse.json({
        sheet,
        listings: withHandle((listRes.data ?? []) as Record<string, unknown>[], 'seller_address'),
        offers: withHandle((offRes.data ?? []) as Record<string, unknown>[], 'bidder_address'),
        last_sale: (lastRes.data as { price_eth?: number } | null)?.price_eth ?? null,
        viewer: viewer
          ? { address: viewer, holding: Number((holdRes.data as { qty?: number } | null)?.qty ?? 0) }
          : null,
      });
    }

    return badRequest('Missing query');
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST — SIWE-gated actions ────────────────────────────────────────────────
interface Body {
  action: 'claim' | 'claim_sync' | 'list' | 'cancel' | 'buy' | 'offer' | 'cancel_offer' | 'accept';
  sheet?: string;
  sheets?: string[];
  price?: number | string;
  qty?: number;
  durationSec?: number;
  listingId?: string;
  offerId?: string;
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
    const now = nowSec();
    const qty = Math.floor(Number(body.qty ?? 1));
    const price = Number(body.price);

    const holdingOf = async (sheet: string): Promise<number> => {
      const r = await db.from('sticker_holdings').select('qty').eq('owner_address', address).eq('sheet_id', sheet).maybeSingle();
      return Number((r.data as { qty?: number } | null)?.qty ?? 0);
    };
    const setHolding = async (sheet: string, next: number) => {
      await db.from('sticker_holdings').upsert(
        { owner_address: address, sheet_id: sheet, qty: next, updated_at: new Date().toISOString() } as never,
        { onConflict: 'owner_address,sheet_id' },
      );
    };

    switch (body.action) {
      // Primary grant record — BuySheetButton posts this alongside the local
      // grant, so the server knows what you hold. Idempotent (qty stays 1 on
      // repeat claims of the same sheet).
      case 'claim': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        const have = await holdingOf(body.sheet);
        if (have === 0) {
          await setHolding(body.sheet, 1);
          await db.from('sticker_events').insert({ type: 'CLAIM', sheet_id: body.sheet, to_address: address, qty: 1, timestamp: now } as never);
        }
        return NextResponse.json({ ok: true });
      }
      // One-time device migration: pre-market sheets become server holdings.
      case 'claim_sync': {
        const sheets = (body.sheets ?? []).filter((s) => SHEET_IDS.has(s)).slice(0, 32);
        for (const sheet of sheets) {
          const have = await holdingOf(sheet);
          if (have === 0) await setHolding(sheet, 1);
        }
        return NextResponse.json({ ok: true, synced: sheets.length });
      }
      case 'list': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        if (!(price > 0)) return badRequest('Bad price');
        if (!(qty >= 1)) return badRequest('Bad qty');
        const have = await holdingOf(body.sheet);
        if (have < qty) return badRequest('Not enough sheets');
        // Escrow: the listed copies leave your balance until cancel/sale.
        await setHolding(body.sheet, have - qty);
        await db.from('sticker_listings').insert({
          sheet_id: body.sheet, seller_address: address, price_eth: price,
          qty, qty_start: qty, active: true,
          end_time: now + clampDuration(body.durationSec),
          currency: 'ETH', source: 'sim',
        } as never);
        await db.from('sticker_events').insert({ type: 'LIST', sheet_id: body.sheet, from_address: address, qty, price_eth: price, timestamp: now } as never);
        return NextResponse.json({ ok: true, listed: qty });
      }
      case 'cancel': {
        if (!body.listingId) return badRequest('Missing listing');
        const r = await db.from('sticker_listings')
          .select('sheet_id, seller_address, qty')
          .eq('id', body.listingId).eq('active', true).maybeSingle();
        const row = r.data as { sheet_id?: string; seller_address?: string; qty?: number } | null;
        if (!row || row.seller_address?.toLowerCase() !== address) return badRequest('Only the seller can cancel');
        await db.from('sticker_listings').update({ active: false } as never).eq('id', body.listingId);
        const have = await holdingOf(row.sheet_id as string);
        await setHolding(row.sheet_id as string, have + Number(row.qty ?? 0));
        return NextResponse.json({ ok: true });
      }
      case 'buy': {
        if (!body.listingId || !(qty >= 1)) return badRequest('Bad buy');
        const { data, error } = await db.rpc('app_sticker_buy', {
          p_buyer: address, p_listing: body.listingId, p_qty: qty,
        } as never);
        if (error) return serverError(error.message);
        const r = data as { error?: string; bought?: number; total?: number; sheet?: string; seller?: string };
        if (r.error === 'not_listed') return badRequest('Not listed');
        if (r.error === 'own_listing') return badRequest('Cannot buy your own listing');
        if (r.error === 'insufficient_balance') return badRequest('Insufficient balance');
        if (r.error === 'not_enough') return badRequest('Not enough left');
        if (r.error) return badRequest(r.error);
        if (r.seller) {
          await createPing({
            recipientAddress: r.seller,
            kind: 'SALE',
            actorAddress: address,
            projectId: 'stickers',
            tokenId: r.sheet ?? null,
            amountEth: r.total ?? null,
            groupKey: `STICKER_SALE:${r.sheet}`,
          });
        }
        return NextResponse.json({ ok: true, bought: r.bought, total: r.total });
      }
      case 'offer': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        if (!(price > 0) || !(qty >= 1)) return badRequest('Bad offer');
        await db.from('sticker_offers').insert({
          sheet_id: body.sheet, bidder_address: address, price_eth: price,
          qty, qty_start: qty, status: 'open',
          end_time: now + clampDuration(body.durationSec),
          currency: 'ETH', source: 'sim',
        } as never);
        await db.from('sticker_events').insert({ type: 'OFFER', sheet_id: body.sheet, from_address: address, qty, price_eth: price, timestamp: now } as never);
        return NextResponse.json({ ok: true, offered: qty });
      }
      case 'cancel_offer': {
        if (!body.offerId) return badRequest('Missing offer');
        const r = await db.from('sticker_offers').select('bidder_address, status').eq('id', body.offerId).maybeSingle();
        const row = r.data as { bidder_address?: string; status?: string } | null;
        if (!row || row.status !== 'open' || row.bidder_address?.toLowerCase() !== address) {
          return badRequest('Only the bidder can cancel');
        }
        await db.from('sticker_offers').update({ status: 'cancelled' } as never).eq('id', body.offerId);
        return NextResponse.json({ ok: true });
      }
      case 'accept': {
        if (!body.offerId || !(qty >= 1)) return badRequest('Bad accept');
        const { data, error } = await db.rpc('app_sticker_accept', {
          p_seller: address, p_offer: body.offerId, p_qty: qty,
        } as never);
        if (error) return serverError(error.message);
        const r = data as { error?: string; sold?: number; total?: number; sheet?: string; bidder?: string };
        if (r.error === 'offer_not_open') return badRequest('Offer not open');
        if (r.error === 'own_offer') return badRequest('Cannot accept your own offer');
        if (r.error === 'not_owner') return badRequest('Not enough sheets');
        if (r.error === 'not_enough') return badRequest('Not enough left on the offer');
        if (r.error) return badRequest(r.error);
        if (r.bidder) {
          await createPing({
            recipientAddress: r.bidder,
            kind: 'OFFER_ACCEPTED',
            actorAddress: address,
            projectId: 'stickers',
            tokenId: r.sheet ?? null,
            amountEth: r.total ?? null,
          });
        }
        return NextResponse.json({ ok: true, sold: r.sold, total: r.total });
      }
      default:
        return badRequest('Unknown action');
    }
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
