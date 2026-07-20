/*
 * lib/market/tradeClient — THE EXCHANGE ⇌ client facade. Every Exchange
 * surface calls these; nothing else talks to /api/exchange or the Seaport
 * trade engine directly (the marketClient pattern, same discipline).
 *
 * The sim/chain split is decided server-side by the pieces' projects; the
 * client's only chain duty is signing (propose/counter) and filling (accept)
 * when every piece rides an on-chain project. The heavy engine loads via
 * dynamic import at action time only.
 */

import type { WalletClient } from 'viem';
import { fetchMeta, type StepCb } from './marketClient';
import type { SeaportOrderJson } from './orderTypes';
import type { TradeItem, TradeRow } from './tradeTypes';

export interface TradeSides {
  counterparty: string;
  give: TradeItem[];
  get: TradeItem[];
  giveEth: string; // '' or '0' = none
  getEth: string;
  durationSec?: number;
}

function moneyHeaders(): Record<string, string> {
  return { 'content-type': 'application/json', 'idempotency-key': crypto.randomUUID() };
}

async function jsonOrThrow(r: Response): Promise<Record<string, unknown>> {
  const j = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new Error(j?.error ? String(j.error) : 'Request failed');
  return j;
}

function refresh(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('pd:project-refresh'));
    window.dispatchEvent(new Event('pd:trades-changed'));
  }
}

export async function fetchTrades(): Promise<{ trades: TradeRow[]; viewer: string }> {
  const r = await fetch('/api/exchange', { cache: 'no-store' });
  return (await jsonOrThrow(r)) as unknown as { trades: TradeRow[]; viewer: string };
}

export async function fetchTrade(id: string): Promise<TradeRow | null> {
  const r = await fetch(`/api/exchange?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
  const j = (await jsonOrThrow(r)) as unknown as { trades: TradeRow[] };
  return j.trades[0] ?? null;
}

/** All pieces on-chain? (per-project cutover check, cached per fetchMeta).
 *  Mixed rails throw here with the same message the server would give. */
async function chainCheck(items: TradeItem[]): Promise<boolean> {
  const rails = new Set<boolean>();
  for (const slug of new Set(items.map((i) => i.project_id))) {
    rails.add((await fetchMeta(slug)).onChain);
  }
  if (rails.size > 1) throw new Error('Mixed on-chain and pre-chain pieces — trade them separately');
  return rails.has(true);
}

/** Sign the trade order when the pieces are on-chain (both sides need their
 *  contracts — read from per-project meta). */
async function signIfChain(
  sides: TradeSides,
  wallet: WalletClient | null | undefined,
  onStep?: StepCb,
): Promise<{ order: SeaportOrderJson; orderHash: string } | null> {
  const all = [...sides.give, ...sides.get];
  if (all.length === 0 || !(await chainCheck(all))) return null;
  if (!wallet) throw new Error('Wallet: CONNECT TO TRADE');
  const contractOf = new Map<string, string>();
  for (const slug of new Set(all.map((i) => i.project_id))) {
    const meta = await fetchMeta(slug);
    if (!meta.contract) throw new Error('Project not tradeable yet');
    contractOf.set(slug, meta.contract);
  }
  const eng = await import('./seaportClient');
  const now = Math.floor(Date.now() / 1000);
  const signed = await eng.createTradeOrder(
    wallet,
    {
      give: sides.give.map((i) => ({ contract: contractOf.get(i.project_id) as string, tokenId: i.token_id })),
      get: sides.get.map((i) => ({ contract: contractOf.get(i.project_id) as string, tokenId: i.token_id })),
      giveEth: sides.giveEth,
      getEth: sides.getEth,
      startTime: now - 60,
      endTime: now + (sides.durationSec ?? 30 * 86_400),
    },
    onStep,
  );
  return { order: signed.order, orderHash: signed.orderHash };
}

function sidesBody(sides: TradeSides): Record<string, unknown> {
  return {
    counterparty: sides.counterparty,
    give: sides.give,
    get: sides.get,
    giveEth: sides.giveEth ? Number(sides.giveEth) : 0,
    getEth: sides.getEth ? Number(sides.getEth) : 0,
    durationSec: sides.durationSec,
  };
}

/** Send a new trade proposal. Returns the trade id. */
export async function proposeTrade(
  sides: TradeSides,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<string> {
  const signed = await signIfChain(sides, opts.wallet, opts.onStep);
  opts.onStep?.('SENDING');
  const j = await jsonOrThrow(
    await fetch('/api/exchange', {
      method: 'POST',
      headers: moneyHeaders(),
      body: JSON.stringify({ action: 'propose', ...sidesBody(sides), ...(signed ?? {}) }),
    }),
  );
  refresh();
  return String(j.tradeId);
}

/** Counter an open trade — the counterer becomes the new proposer. */
export async function counterTrade(
  tradeId: string,
  sides: TradeSides,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<string> {
  const signed = await signIfChain(sides, opts.wallet, opts.onStep);
  opts.onStep?.('SENDING');
  const j = await jsonOrThrow(
    await fetch('/api/exchange', {
      method: 'POST',
      headers: moneyHeaders(),
      body: JSON.stringify({ action: 'counter', tradeId, ...sidesBody(sides), ...(signed ?? {}) }),
    }),
  );
  refresh();
  return String(j.tradeId);
}

/** Accept an open trade you're the counterparty of. Chain trades fill the
 *  proposer's signed order on-chain first (approvals + one tx). */
export async function acceptTrade(
  trade: TradeRow,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<void> {
  let txHash: string | undefined;
  if (trade.source !== 'sim' && trade.order_json) {
    if (!opts.wallet) throw new Error('Wallet: CONNECT TO TRADE');
    const eng = await import('./seaportClient');
    txHash = await eng.fulfillTrade(opts.wallet, trade.order_json, opts.onStep);
  }
  opts.onStep?.('POSTING');
  await jsonOrThrow(
    await fetch('/api/exchange', {
      method: 'POST',
      headers: moneyHeaders(),
      body: JSON.stringify({ action: 'accept', tradeId: trade.id, txHash }),
    }),
  );
  refresh();
}

export async function declineTrade(tradeId: string): Promise<void> {
  await jsonOrThrow(
    await fetch('/api/exchange', {
      method: 'POST',
      headers: moneyHeaders(),
      body: JSON.stringify({ action: 'decline', tradeId }),
    }),
  );
  refresh();
}

/** Cancel your own open proposal. Chain proposals cancel on-chain first so
 *  the signed order dies with the row. */
export async function cancelTrade(
  trade: TradeRow,
  opts: { wallet?: WalletClient | null; onStep?: StepCb } = {},
): Promise<void> {
  let txHash: string | undefined;
  if (trade.source !== 'sim' && trade.order_json) {
    if (!opts.wallet) throw new Error('Wallet: CONNECT TO TRADE');
    const eng = await import('./seaportClient');
    txHash = await eng.cancelOrders(opts.wallet, [trade.order_json], opts.onStep);
  }
  opts.onStep?.('POSTING');
  await jsonOrThrow(
    await fetch('/api/exchange', {
      method: 'POST',
      headers: moneyHeaders(),
      body: JSON.stringify({ action: 'cancel', tradeId: trade.id, txHash }),
    }),
  );
  refresh();
}
