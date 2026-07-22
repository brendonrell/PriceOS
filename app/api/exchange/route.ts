// /api/exchange — THE EXCHANGE ⇌: head-to-head bilateral trades
// (ClickUp 86ba0apqr). Sequential accept flow: propose → accept / decline /
// counter. Reads are party-scoped (you see your own trades only).
//
// TWO RAILS, same book, decided by the pieces' projects (contract_address —
// the per-project cutover switch):
//   - sim: every piece on a sim project — settlement is app_execute_trade
//     (atomic, row-locked). No fee, no royalty — barter moves no sale price.
//   - chain: every piece on an on-chain project — the proposer signs ONE
//     Seaport order (their pieces + WETH kicker for the requested pieces +
//     native ETH), the counterparty fills it on-chain, this route books it.
//   Mixing rails in one trade can't settle atomically — refused.

import { type NextRequest, NextResponse } from 'next/server';
import { parseEther } from 'viem';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth, verifySiweSession } from '@/lib/auth/siwe';
import { withIdempotency } from '@/lib/api/idempotency';
import { badRequest, serverError, unauthorized } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { createPing } from '@/lib/pings/createPing';
import { checkTradeOrder } from '@/lib/market/orderCheck';
import { verifySeaportFill } from '@/lib/market/verifyFill';
import { DEFAULT_DURATION_SEC, MAX_DURATION_SEC } from '@/lib/market/chain';
import type { SeaportOrderJson } from '@/lib/market/orderTypes';
import { TRADE_MAX_ITEMS_PER_SIDE, type TradeItem, type TradeRow } from '@/lib/market/tradeTypes';

export const dynamic = 'force-dynamic';

type DB = ReturnType<typeof getSupabaseService>;

function nowSec() {
  return Math.floor(Date.now() / 1000);
}

function clampDuration(durationSec: unknown): number {
  const n = Number(durationSec);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_DURATION_SEC;
  return Math.min(Math.max(600, Math.floor(n)), MAX_DURATION_SEC);
}

/** Parse + sanity-check one side's item list. Throws on malformed input. */
function parseItems(raw: unknown, label: string): TradeItem[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new Error(`Bad ${label} items`);
  if (raw.length > TRADE_MAX_ITEMS_PER_SIDE) throw new Error(`Max ${TRADE_MAX_ITEMS_PER_SIDE} pieces per side`);
  const seen = new Set<string>();
  const items: TradeItem[] = [];
  for (const r of raw) {
    const project_id = String((r as TradeItem)?.project_id ?? '').toLowerCase();
    const token_id = String((r as TradeItem)?.token_id ?? '');
    if (!getProject(project_id)) throw new Error(`Unknown project in ${label}`);
    if (!/^\d+$/.test(token_id)) throw new Error(`Bad token in ${label}`);
    const key = `${project_id}:${token_id}`;
    if (seen.has(key)) throw new Error(`Duplicate piece in ${label}`);
    seen.add(key);
    items.push({ project_id, token_id });
  }
  return items;
}

function parseEth(raw: unknown, label: string): number {
  if (raw == null || raw === '' || raw === 0) return 0;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0 || n > 100_000) throw new Error(`Bad ${label} ETH`);
  return n;
}

/** Owner map for a set of pieces (one query per call). */
async function ownersOf(db: DB, items: TradeItem[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (items.length === 0) return map;
  const ors = items.map((i) => `and(project_id.eq.${i.project_id},token_id.eq.${i.token_id})`).join(',');
  const r = await db.from('holders').select('project_id, token_id, owner_address').or(ors);
  if (r.error) throw new Error(r.error.message);
  for (const row of (r.data ?? []) as { project_id: string; token_id: string; owner_address: string }[]) {
    map.set(`${row.project_id}:${row.token_id}`, row.owner_address.toLowerCase());
  }
  return map;
}

/** Per-project contract addresses for the pieces (the rail switch). */
async function contractsFor(db: DB, items: TradeItem[]): Promise<Map<string, string | null>> {
  const slugs = Array.from(new Set(items.map((i) => i.project_id)));
  const map = new Map<string, string | null>();
  if (slugs.length === 0) return map;
  const r = await db.from('projects').select('id, contract_address').in('id', slugs);
  if (r.error) throw new Error(r.error.message);
  for (const row of (r.data ?? []) as { id: string; contract_address: string | null }[]) {
    map.set(row.id, row.contract_address);
  }
  return map;
}

async function handleFor(db: DB, address: string): Promise<string | null> {
  const r = await db.from('users').select('handle').eq('address', address).maybeSingle();
  return (r.data as { handle?: string | null } | null)?.handle ?? null;
}

interface TradeDb {
  id: string;
  proposer_address: string;
  counterparty_address: string;
  status: string;
  give: TradeItem[];
  get: TradeItem[];
  give_eth: number;
  get_eth: number;
  end_time: number | null;
  source: string;
  order_hash: string | null;
  order_json: SeaportOrderJson | null;
  counter_of: string | null;
  created_at: string;
}

async function hydrate(db: DB, rows: TradeDb[]): Promise<TradeRow[]> {
  const addrs = Array.from(new Set(rows.flatMap((t) => [t.proposer_address, t.counterparty_address])));
  const byAddr = new Map<string, string | null>();
  if (addrs.length > 0) {
    const r = await db.from('users').select('address, handle').in('address', addrs);
    for (const row of (r.data ?? []) as { address: string; handle: string | null }[]) {
      byAddr.set(row.address, row.handle);
    }
  }
  return rows.map((t) => ({
    id: t.id,
    proposer_address: t.proposer_address,
    counterparty_address: t.counterparty_address,
    proposer_handle: byAddr.get(t.proposer_address) ?? null,
    counterparty_handle: byAddr.get(t.counterparty_address) ?? null,
    status: t.status as TradeRow['status'],
    give: t.give ?? [],
    get: t.get ?? [],
    give_eth: String(t.give_eth ?? 0),
    get_eth: String(t.get_eth ?? 0),
    end_time: t.end_time,
    source: t.source ?? 'sim',
    order_hash: t.order_hash,
    order_json: t.order_json,
    counter_of: t.counter_of,
    created_at: t.created_at,
  }));
}

// ── GET — my trades (party-scoped), or one trade by ?id= ─────────────────────
export async function GET(req: NextRequest) {
  const address = await verifySiweSession(req);
  if (!address) return unauthorized();
  try {
    const db = getSupabaseService();
    const id = req.nextUrl.searchParams.get('id');
    let q = db
      .from('trades')
      .select('id, proposer_address, counterparty_address, status, give, get, give_eth, get_eth, end_time, source, order_hash, order_json, counter_of, created_at')
      .or(`proposer_address.eq.${address},counterparty_address.eq.${address}`)
      .order('created_at', { ascending: false });
    if (id) q = q.eq('id', id);
    else q = q.limit(40);
    const r = await q;
    if (r.error) return serverError(r.error.message);
    const trades = await hydrate(db, (r.data ?? []) as unknown as TradeDb[]);
    return NextResponse.json({ trades, viewer: address });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

// ── POST (action-dispatched) ─────────────────────────────────────────────────
interface Body {
  action: 'propose' | 'accept' | 'decline' | 'cancel' | 'counter';
  tradeId?: string;
  counterparty?: string;
  give?: TradeItem[];
  get?: TradeItem[];
  giveEth?: number | string;
  getEth?: number | string;
  durationSec?: number;
  order?: SeaportOrderJson;
  orderHash?: string;
  txHash?: string;
}

/** Validate a proposal's sides + rails + ownership. Returns the insert row. */
async function buildProposal(
  db: DB,
  proposer: string,
  body: Body,
): Promise<Record<string, unknown> | { error: string }> {
  const counterparty = String(body.counterparty ?? '').toLowerCase();
  if (!/^0x[a-f0-9]{40}$/.test(counterparty)) return { error: 'Bad counterparty' };
  if (counterparty === proposer) return { error: 'Cannot trade with yourself' };

  let give: TradeItem[], get: TradeItem[], giveEth: number, getEth: number;
  try {
    give = parseItems(body.give, 'your');
    get = parseItems(body.get, 'their');
    giveEth = parseEth(body.giveEth, 'your');
    getEth = parseEth(body.getEth, 'their');
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'Bad trade' };
  }
  if (give.length + get.length === 0) return { error: 'A trade needs pieces' };
  if (give.length === 0 && giveEth <= 0) return { error: 'Your side is empty' };
  if (get.length === 0 && getEth <= 0) return { error: 'Their side is empty' };
  if (giveEth > 0 && getEth > 0) return { error: 'ETH rides one side only' };

  // Ownership right now (re-verified atomically at accept).
  const owners = await ownersOf(db, [...give, ...get]);
  for (const i of give) {
    if (owners.get(`${i.project_id}:${i.token_id}`) !== proposer)
      return { error: `You no longer hold ${i.project_id} #${i.token_id}` };
  }
  for (const i of get) {
    if (owners.get(`${i.project_id}:${i.token_id}`) !== counterparty)
      return { error: `They no longer hold ${i.project_id} #${i.token_id}` };
  }

  // Rail: all-sim or all-chain — a mixed trade can't settle atomically.
  const contracts = await contractsFor(db, [...give, ...get]);
  const rails = new Set([...give, ...get].map((i) => (contracts.get(i.project_id) ? 'chain' : 'sim')));
  if (rails.size > 1) return { error: 'Mixed on-chain and pre-chain pieces — trade them separately' };
  const onChain = rails.has('chain');

  const endTime = nowSec() + clampDuration(body.durationSec);
  const row: Record<string, unknown> = {
    proposer_address: proposer,
    counterparty_address: counterparty,
    status: 'open',
    give,
    get,
    give_eth: giveEth,
    get_eth: getEth,
    end_time: endTime,
    source: onChain ? 'seaport' : 'sim',
    order_hash: null,
    order_json: null,
  };

  if (onChain) {
    if (!body.order || !body.orderHash) return { error: 'Missing signed order' };
    try {
      const withContract = (items: TradeItem[]) =>
        items.map((i) => ({ contract: contracts.get(i.project_id) as string, tokenId: i.token_id }));
      const window = await checkTradeOrder(body.order, {
        address: proposer,
        give: withContract(give),
        get: withContract(get),
        giveEthWei: giveEth > 0 ? parseEther(String(giveEth)) : 0n,
        getEthWei: getEth > 0 ? parseEther(String(getEth)) : 0n,
      });
      row.end_time = window.endTime;
      row.order_hash = body.orderHash;
      row.order_json = body.order;
    } catch (e) {
      return { error: e instanceof Error ? e.message : 'Bad order' };
    }
  }
  return row;
}

/** Book a settled chain trade: flip holders, retire listings, write events.
 *  Idempotent — the indexer's transfer writes land on the same rows. */
async function bookChainSettle(db: DB, t: TradeDb, txHash: string | undefined): Promise<void> {
  const ts = nowSec();
  const flip = async (items: TradeItem[], from: string, to: string) => {
    for (const i of items) {
      await db.from('holders').update({ owner_address: to } as never)
        .eq('project_id', i.project_id).eq('token_id', i.token_id);
      await db.from('listings').update({ active: false } as never)
        .eq('project_id', i.project_id).eq('token_id', i.token_id).eq('active', true);
      await db.from('events').insert({
        type: 'XFER', project_id: i.project_id, token_id: i.token_id,
        from_address: from, to_address: to, price_eth: null, timestamp: ts,
        sale_direction: 'TRADE',
      } as never);
    }
  };
  await flip(t.give, t.proposer_address, t.counterparty_address);
  await flip(t.get, t.counterparty_address, t.proposer_address);
  await db.from('trades')
    .update({ status: 'accepted', decided_at: new Date().toISOString(), tx_hash: txHash ?? null } as never)
    .eq('id', t.id);
}

export const POST = requireAuth(async (req, _ctx, address) => {
  return withIdempotency(req, address, 'exchange', async () => {
    let body: Body;
    try {
      body = (await req.json()) as Body;
    } catch {
      return badRequest('Invalid JSON body');
    }

    try {
      const db = getSupabaseService();

      if (body.action === 'propose') {
        const row = await buildProposal(db, address, body);
        if ('error' in row && typeof row.error === 'string') return badRequest(row.error);
        const ins = await db.from('trades').insert(row as never).select('id').single();
        if (ins.error) return serverError(ins.error.message);
        const tradeId = (ins.data as { id: string }).id;
        await createPing({
          recipientAddress: String((row as Record<string, unknown>).counterparty_address),
          kind: 'TRADE',
          actorAddress: address,
          data: { trade_id: tradeId },
        });
        return NextResponse.json({ ok: true, tradeId });
      }

      // Everything else operates on one existing trade.
      if (!body.tradeId) return badRequest('Missing tradeId');
      const tr = await db
        .from('trades')
        .select('id, proposer_address, counterparty_address, status, give, get, give_eth, get_eth, end_time, source, order_hash, order_json, counter_of, created_at')
        .eq('id', body.tradeId)
        .maybeSingle();
      if (tr.error) return serverError(tr.error.message);
      const t = tr.data as unknown as TradeDb | null;
      if (!t) return badRequest('Trade not found');
      const isProposer = t.proposer_address.toLowerCase() === address;
      const isCounterparty = t.counterparty_address.toLowerCase() === address;
      if (!isProposer && !isCounterparty) return badRequest('Not your trade');

      switch (body.action) {
        case 'accept': {
          if (!isCounterparty) return badRequest('Only the counterparty can accept');
          if (t.status !== 'open') return badRequest('Trade not open');
          if (t.source === 'sim') {
            const { data, error } = await db.rpc('app_execute_trade', {
              p_acceptor: address, p_trade_id: t.id,
            } as never);
            if (error) return serverError(error.message);
            const r = data as { ok?: boolean; error?: string };
            if (r.error === 'trade_not_open') return badRequest('Trade not open');
            if (r.error === 'pieces_moved') return badRequest('A piece changed hands — trade is void');
            if (r.error === 'insufficient_balance') return badRequest('Insufficient balance');
            if (r.error) return badRequest(r.error);
          } else {
            // Chain: verify the counterparty actually filled the proposer's
            // signed order on-chain before booking. The old code trusted the
            // client's word and flipped the `holders` mirror with no proof,
            // letting a two-wallet "trade" that never settled mint permanent
            // achievements/PriceScore (security audit 2026-07-22).
            if (t.end_time != null && t.end_time <= nowSec()) return badRequest('Trade expired');
            if (!t.order_hash) return badRequest('Trade has no on-chain order to verify');
            const fill = await verifySeaportFill(String(body.txHash ?? ''));
            if (!fill.ok) {
              return fill.reason === 'pending'
                ? badRequest('Fill not yet confirmed on-chain — try again in a moment')
                : badRequest('On-chain fill could not be verified');
            }
            if (fill.from !== address) return badRequest('Fill was not sent from your wallet');
            if (!fill.orderHashes.has(t.order_hash.toLowerCase())) {
              return badRequest('That transaction did not fill this trade');
            }
            await bookChainSettle(db, t, String(body.txHash));
          }
          await createPing({
            recipientAddress: t.proposer_address,
            kind: 'TRADE_ACCEPTED',
            actorAddress: address,
            data: { trade_id: t.id },
          });
          return NextResponse.json({ ok: true });
        }
        case 'decline': {
          if (!isCounterparty) return badRequest('Only the counterparty can decline');
          if (t.status !== 'open') return badRequest('Trade not open');
          await db.from('trades')
            .update({ status: 'declined', decided_at: new Date().toISOString() } as never)
            .eq('id', t.id).eq('status', 'open');
          await createPing({
            recipientAddress: t.proposer_address,
            kind: 'TRADE_DECLINED',
            actorAddress: address,
            data: { trade_id: t.id },
          });
          return NextResponse.json({ ok: true });
        }
        case 'cancel': {
          if (!isProposer) return badRequest('Only the proposer can cancel');
          if (t.status !== 'open') return badRequest('Trade not open');
          await db.from('trades')
            .update({ status: 'cancelled', decided_at: new Date().toISOString(), tx_hash: body.txHash ?? null } as never)
            .eq('id', t.id).eq('status', 'open');
          return NextResponse.json({ ok: true });
        }
        case 'counter': {
          // Either party counters: the old window is superseded, the counterer
          // becomes the proposer of a fresh trade (roles flip when the
          // counterparty counters — the RuneScape re-offer).
          if (t.status !== 'open') return badRequest('Trade not open');
          const other = isProposer ? t.counterparty_address : t.proposer_address;
          const row = await buildProposal(db, address, { ...body, counterparty: other });
          if ('error' in row && typeof row.error === 'string') return badRequest(row.error);
          (row as Record<string, unknown>).counter_of = t.id;
          const ins = await db.from('trades').insert(row as never).select('id').single();
          if (ins.error) return serverError(ins.error.message);
          await db.from('trades')
            .update({ status: 'superseded', decided_at: new Date().toISOString() } as never)
            .eq('id', t.id).eq('status', 'open');
          const tradeId = (ins.data as { id: string }).id;
          await createPing({
            recipientAddress: other,
            kind: 'TRADE',
            actorAddress: address,
            data: { trade_id: tradeId, counter: true },
          });
          return NextResponse.json({ ok: true, tradeId });
        }
        default:
          return badRequest('Unknown action');
      }
    } catch (err) {
      return serverError(err instanceof Error ? err.message : 'Unknown error');
    }
  });
});
