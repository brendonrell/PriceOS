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
      const viewer = await verifySiweSession(req);
      const [listRes, offRes, evRes, lifeRes, wantRes, swapRes, mineRes, myWantRes] = await Promise.all([
        db.from('sticker_listings').select('sheet_id, price_eth, qty').eq('active', true).or(liveOr(now)),
        db.from('sticker_offers').select('sheet_id, price_eth, qty').eq('status', 'open').or(liveOr(now)),
        db.from('sticker_events').select('sheet_id, price_eth, qty, timestamp').eq('type', 'SALE').order('timestamp', { ascending: false }).limit(500),
        db.from('sticker_events').select('sheet_id, type, qty').in('type', ['CLAIM', 'PEEL']).limit(5000),
        db.from('sticker_wants').select('sheet_id'),
        db.from('sticker_swaps').select('give_sheet, want_sheet').eq('status', 'open').or(liveOr(now)),
        viewer
          ? db.from('sticker_holdings').select('sheet_id, qty').eq('owner_address', viewer)
          : Promise.resolve({ data: null, error: null } as never),
        viewer
          ? db.from('sticker_wants').select('sheet_id').eq('owner_address', viewer)
          : Promise.resolve({ data: null, error: null } as never),
      ]);
      if (listRes.error) return serverError(listRes.error.message);
      const bySheet: Record<string, { floor: number | null; listed: number; best_offer: number | null; bid_qty: number; last: number | null; volume: number; sales: number; claims: number; peels: number; sealed_pct: number | null; wanted_by: number; swaps: number }> = {};
      const slot = (id: string) => (bySheet[id] ??= { floor: null, listed: 0, best_offer: null, bid_qty: 0, last: null, volume: 0, sales: 0, claims: 0, peels: 0, sealed_pct: null, wanted_by: 0, swaps: 0 });
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
      for (const e of (lifeRes.data ?? []) as { sheet_id: string; type: string; qty: number }[]) {
        const s = slot(e.sheet_id);
        if (e.type === 'CLAIM') s.claims += e.qty; else s.peels += e.qty;
      }
      for (const w of (wantRes.data ?? []) as { sheet_id: string }[]) slot(w.sheet_id).wanted_by++;
      for (const sw of (swapRes.data ?? []) as { give_sheet: string; want_sheet: string }[]) {
        slot(sw.give_sheet).swaps++;
        if (sw.want_sheet !== sw.give_sheet) slot(sw.want_sheet).swaps++;
      }
      for (const k of Object.keys(bySheet)) {
        const s = bySheet[k];
        s.sealed_pct = s.claims > 0 ? Math.max(0, Math.round((1 - s.peels / s.claims) * 100)) : null;
      }
      const myHoldings: Record<string, number> = {};
      for (const h of ((mineRes.data ?? []) as { sheet_id: string; qty: number }[] | null) ?? []) {
        myHoldings[h.sheet_id] = h.qty;
      }
      const myWants = (((myWantRes.data ?? []) as { sheet_id: string }[] | null) ?? []).map((w) => w.sheet_id);
      return NextResponse.json({ sheets: bySheet, my_holdings: myHoldings, my_wants: myWants });
    }

    const sheet = url.searchParams.get('sheet');
    if (sheet) {
      if (!SHEET_IDS.has(sheet)) return badRequest('Unknown sheet');
      const viewer = await verifySiweSession(req);
      const [listRes, offRes, holdRes, lastRes, swapRes, wantRes] = await Promise.all([
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
        db.from('sticker_swaps')
          .select('id, proposer_address, give_sheet, give_qty, want_sheet, want_qty, end_time')
          .or(`give_sheet.eq.${sheet},want_sheet.eq.${sheet}`)
          .eq('status', 'open').or(liveOr(now)).limit(40),
        viewer
          ? db.from('sticker_wants').select('sheet_id').eq('owner_address', viewer).eq('sheet_id', sheet).maybeSingle()
          : Promise.resolve({ data: null, error: null } as never),
      ]);
      if (listRes.error) return serverError(listRes.error.message);
      if (offRes.error) return serverError(offRes.error.message);

      const addrs = Array.from(new Set([
        ...((listRes.data ?? []) as { seller_address: string }[]).map((l) => l.seller_address),
        ...((offRes.data ?? []) as { bidder_address: string }[]).map((o) => o.bidder_address),
        ...((swapRes.data ?? []) as { proposer_address: string }[]).map((w) => w.proposer_address),
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
        swaps: withHandle((swapRes.data ?? []) as Record<string, unknown>[], 'proposer_address'),
        viewer: viewer
          ? {
              address: viewer,
              holding: Number((holdRes.data as { qty?: number } | null)?.qty ?? 0),
              wants: !!wantRes.data,
            }
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
  action: 'claim' | 'claim_sync' | 'list' | 'cancel' | 'buy' | 'offer' | 'cancel_offer' | 'accept'
    | 'peel' | 'gift' | 'want' | 'unwant' | 'swap_propose' | 'swap_accept' | 'swap_cancel';
  sheet?: string;
  sheets?: string[];
  price?: number | string;
  qty?: number;
  durationSec?: number;
  listingId?: string;
  offerId?: string;
  to?: string;
  note?: string;
  giveSheet?: string;
  giveQty?: number;
  wantSheet?: string;
  wantQty?: number;
  swapId?: string;
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
        // Instant sticker wishlist: everyone WANTING this sheet gets pinged
        // the moment copies hit the book.
        const wanters = await db.from('sticker_wants').select('owner_address').eq('sheet_id', body.sheet).limit(50);
        for (const w of (wanters.data ?? []) as { owner_address: string }[]) {
          if (w.owner_address.toLowerCase() === address) continue;
          await createPing({
            recipientAddress: w.owner_address,
            kind: 'WISHLIST_HIT',
            actorAddress: address,
            projectId: 'stickers',
            tokenId: body.sheet,
            amountEth: price,
            groupKey: `STICKER_WANT:${body.sheet}`,
          });
        }
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
      // ── The Peel — burns sealed copies into the profile stickers (sim:
      //    records the burn; the chain peel does it for real at PDStickers).
      case 'peel': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        await db.from('sticker_events').insert({ type: 'PEEL', sheet_id: body.sheet, from_address: address, qty: 1, timestamp: now } as never);
        return NextResponse.json({ ok: true });
      }

      // ── Gifting — send sheets to a friend, with a note. Free transfer,
      //    wrapped ping on arrival.
      case 'gift': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        if (!(qty >= 1)) return badRequest('Bad qty');
        const toRaw = (body.to ?? '').trim().replace(/^@/, '').toLowerCase();
        if (!toRaw) return badRequest('Missing recipient');
        const u = toRaw.startsWith('0x')
          ? await db.from('users').select('address').ilike('address', toRaw).maybeSingle()
          : await db.from('users').select('address').ilike('handle', toRaw).maybeSingle();
        const toAddr = (u.data as { address?: string } | null)?.address?.toLowerCase() ?? null;
        if (!toAddr) return badRequest('Recipient not found');
        if (toAddr === address) return badRequest('Cannot gift yourself');
        const have = await holdingOf(body.sheet);
        if (have < qty) return badRequest('Not enough sheets');
        await setHolding(body.sheet, have - qty);
        const theirs = await db.from('sticker_holdings').select('qty').eq('owner_address', toAddr).eq('sheet_id', body.sheet).maybeSingle();
        const theirQty = Number((theirs.data as { qty?: number } | null)?.qty ?? 0);
        await db.from('sticker_holdings').upsert(
          { owner_address: toAddr, sheet_id: body.sheet, qty: theirQty + qty, updated_at: new Date().toISOString() } as never,
          { onConflict: 'owner_address,sheet_id' },
        );
        await db.from('sticker_events').insert({ type: 'GIFT', sheet_id: body.sheet, from_address: address, to_address: toAddr, qty, timestamp: now } as never);
        await createPing({
          recipientAddress: toAddr,
          kind: 'XFER',
          actorAddress: address,
          projectId: 'stickers',
          tokenId: body.sheet,
          data: { gift: true, note: String(body.note ?? '').slice(0, 140), qty },
        });
        return NextResponse.json({ ok: true, gifted: qty });
      }

      // ── Want-list (sticker wishlist + the matchmaking signal) ────────────
      case 'want': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        await db.from('sticker_wants').upsert(
          { owner_address: address, sheet_id: body.sheet } as never,
          { onConflict: 'owner_address,sheet_id' },
        );
        return NextResponse.json({ ok: true });
      }
      case 'unwant': {
        if (!body.sheet || !SHEET_IDS.has(body.sheet)) return badRequest('Unknown sheet');
        await db.from('sticker_wants').delete().eq('owner_address', address).eq('sheet_id', body.sheet);
        return NextResponse.json({ ok: true });
      }

      // ── Swaps — sticker-for-sticker, give-side escrowed at propose ───────
      case 'swap_propose': {
        const gs = body.giveSheet ?? '';
        const ws = body.wantSheet ?? '';
        const gq = Math.floor(Number(body.giveQty ?? 1));
        const wq = Math.floor(Number(body.wantQty ?? 1));
        if (!SHEET_IDS.has(gs) || !SHEET_IDS.has(ws)) return badRequest('Unknown sheet');
        if (gs === ws) return badRequest('Swap different sheets');
        if (!(gq >= 1) || !(wq >= 1)) return badRequest('Bad quantities');
        const have = await holdingOf(gs);
        if (have < gq) return badRequest('Not enough sheets');
        await setHolding(gs, have - gq); // escrow
        await db.from('sticker_swaps').insert({
          proposer_address: address, give_sheet: gs, give_qty: gq,
          want_sheet: ws, want_qty: wq, status: 'open',
          end_time: now + clampDuration(body.durationSec),
        } as never);
        return NextResponse.json({ ok: true });
      }
      case 'swap_cancel': {
        if (!body.swapId) return badRequest('Missing swap');
        const r = await db.from('sticker_swaps')
          .select('proposer_address, give_sheet, give_qty, status')
          .eq('id', body.swapId).maybeSingle();
        const row = r.data as { proposer_address?: string; give_sheet?: string; give_qty?: number; status?: string } | null;
        if (!row || row.status !== 'open' || row.proposer_address?.toLowerCase() !== address) {
          return badRequest('Only the proposer can cancel');
        }
        await db.from('sticker_swaps').update({ status: 'cancelled' } as never).eq('id', body.swapId);
        const have = await holdingOf(row.give_sheet as string);
        await setHolding(row.give_sheet as string, have + Number(row.give_qty ?? 0));
        return NextResponse.json({ ok: true });
      }
      case 'swap_accept': {
        if (!body.swapId) return badRequest('Missing swap');
        const { data, error } = await db.rpc('app_sticker_swap_accept', {
          p_acceptor: address, p_swap: body.swapId,
        } as never);
        if (error) return serverError(error.message);
        const r = data as { error?: string; proposer?: string; give_sheet?: string; give_qty?: number; want_sheet?: string; want_qty?: number };
        if (r.error === 'swap_not_open') return badRequest('Swap not open');
        if (r.error === 'own_swap') return badRequest('Cannot accept your own swap');
        if (r.error === 'not_owner') return badRequest('Not enough sheets');
        if (r.error) return badRequest(r.error);
        if (r.proposer) {
          await createPing({
            recipientAddress: r.proposer,
            kind: 'XFER',
            actorAddress: address,
            projectId: 'stickers',
            tokenId: r.want_sheet ?? null,
            data: { swap: true, give: r.give_sheet, giveQty: r.give_qty, want: r.want_sheet, wantQty: r.want_qty },
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
