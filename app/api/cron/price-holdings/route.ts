// app/api/cron/price-holdings/route.ts
//
// The $PRICE Top Holders sweep. Reads every NAMED wallet's $PRICE balance from
// Alchemy, ranks them by amount held (most = #1, ties → earlier joiner), and
// writes price_held + price_hold_rank back to users. Drives the Top Holders
// board (/api/leaderboard/price + PriceLeaderboardModal) and the "$PRICE Top N
// · #r" earned profile tag (lib/tags/derive).
//
// KV-gated to ~15 min on the every-minute Cron Trigger (probe-and-exit
// otherwise — the economy-audit pattern); ?force=1 (still behind the secret)
// runs it on demand. Same fail-closed CRON_SECRET gate as every sweep. Only
// named accounts are read — an unclaimed wallet can hold $PRICE but never
// charts, exactly like the PriceScore board.

import { NextResponse } from 'next/server';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { getSupabaseService } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

const GATE_KEY = 'pd:price-holdings-at';
const GATE_MS = 15 * 60 * 1000; // ~15 min between real runs

// keccak256("balanceOf(address)").slice(0,10) / keccak256("decimals()").slice(0,10)
const BALANCE_OF_SELECTOR = '0x70a08231';
const DECIMALS_SELECTOR = '0x313ce567';
const PRICE_DECIMALS_FALLBACK = 18;
const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

function getAlchemyUrl(): string {
  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (rpcUrl) return rpcUrl;
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  throw new Error('Neither NEXT_PUBLIC_ALCHEMY_RPC_URL nor NEXT_PUBLIC_ALCHEMY_API_KEY is set');
}

function getTokenAddress(): string {
  const a = process.env.PRICE_TOKEN_ADDRESS;
  if (a && ADDRESS_RE.test(a)) return a.toLowerCase();
  // $PRICE ERC-20, DEPLOYED to Ethereum mainnet 2026-07-03 (CLAUDE.md §2).
  return '0x173a012c7c8ca3cfb531dcad84a40c53dbe74638';
}

function encodeBalanceOf(address: string): string {
  return BALANCE_OF_SELECTOR + address.slice(2).toLowerCase().padStart(64, '0');
}

/* Whole-token amount as a JS number, for display + ordering. A 100M fixed
   supply sits far inside Number's exact-integer range; the fractional part is
   cosmetic and ranking ties break on join date anyway. */
function toWholeTokens(weiHex: string, decimals: number): number {
  try {
    const wei = BigInt(weiHex);
    if (wei === BigInt(0)) return 0;
    const divisor = BigInt(10) ** BigInt(decimals);
    const whole = wei / divisor;
    const frac = wei % divisor;
    return Number(whole) + Number(frac) / Number(divisor);
  } catch {
    return 0;
  }
}

interface RpcCall {
  id: number;
  to: string;
  data: string;
}

/* One batched JSON-RPC round-trip (Alchemy accepts an array of eth_calls).
   Returns id → result hex for every call that answered. */
async function rpcBatch(
  url: string,
  calls: RpcCall[],
  signal?: AbortSignal
): Promise<Map<number, string>> {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(
      calls.map((c) => ({
        jsonrpc: '2.0',
        id: c.id,
        method: 'eth_call',
        params: [{ to: c.to, data: c.data }, 'latest'],
      }))
    ),
    signal,
  });
  if (!res.ok) throw new Error(`Alchemy returned ${res.status}`);
  const json = (await res.json()) as Array<{ id: number; result?: string }>;
  const out = new Map<number, string>();
  for (const r of json) if (r.result && r.result !== '0x') out.set(r.id, r.result);
  return out;
}

export async function GET(req: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // ~15-min gate — every other minute-tick exits on one KV read.
  const force = new URL(req.url).searchParams.get('force') === '1';
  interface KVLike {
    get(k: string): Promise<string | null>;
    put(k: string, v: string): Promise<void>;
  }
  let kv: KVLike | null = null;
  try {
    const { env } = getCloudflareContext() as unknown as {
      env: { NEXT_INC_CACHE_KV?: KVLike };
    };
    kv = env.NEXT_INC_CACHE_KV ?? null;
  } catch {
    /* non-CF runtime */
  }
  const now = Date.now();
  if (!force && kv) {
    const prev = await kv.get(GATE_KEY);
    if (prev && now - Number(prev) < GATE_MS) {
      return NextResponse.json({ ok: true, skipped: 'ran recently' });
    }
  }

  const abort = new AbortController();
  const abortTimer = setTimeout(() => abort.abort(), 25_000);
  try {
    const db = getSupabaseService();
    const usersRes = await db
      .from('users')
      .select('address, created_at')
      .not('handle', 'is', null);
    if (usersRes.error) throw new Error(usersRes.error.message);
    const users = (usersRes.data ?? []) as { address: string; created_at: string }[];

    if (users.length === 0) {
      if (kv) await kv.put(GATE_KEY, String(now));
      return NextResponse.json({ ok: true, named: 0, holders: 0 });
    }

    const url = getAlchemyUrl();
    const contract = getTokenAddress();

    // decimals() once (never changes).
    let decimals = PRICE_DECIMALS_FALLBACK;
    try {
      const d = await rpcBatch(url, [{ id: 0, to: contract, data: DECIMALS_SELECTOR }], abort.signal);
      const dh = d.get(0);
      if (dh) decimals = Number(BigInt(dh));
    } catch {
      /* keep fallback */
    }

    // balanceOf for every named wallet, in batches.
    const held = new Map<string, number>();
    const CHUNK = 100;
    for (let i = 0; i < users.length; i += CHUNK) {
      const slice = users.slice(i, i + CHUNK);
      const calls: RpcCall[] = slice.map((u, j) => ({
        id: j,
        to: contract,
        data: encodeBalanceOf(u.address),
      }));
      const out = await rpcBatch(url, calls, abort.signal);
      slice.forEach((u, j) => {
        const hex = out.get(j);
        held.set(u.address.toLowerCase(), hex ? toWholeTokens(hex, decimals) : 0);
      });
    }

    // Rank the holders: amount desc, ties → earlier joiner (the OG wins), same
    // grammar as the PriceScore board.
    const ranked = users
      .map((u) => ({
        address: u.address.toLowerCase(),
        created_at: u.created_at,
        amount: held.get(u.address.toLowerCase()) ?? 0,
      }))
      .filter((u) => u.amount > 0)
      .sort(
        (a, b) =>
          b.amount - a.amount ||
          (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0)
      );
    const rankByAddr = new Map<string, number>();
    ranked.forEach((u, i) => rankByAddr.set(u.address, i + 1));

    // One row per named wallet: rank + held for holders, null + 0 for the rest —
    // so anyone who sold out of the ranks is cleared in the same pass.
    const rows = users.map((u) => {
      const addr = u.address.toLowerCase();
      return {
        address: addr,
        price_held: held.get(addr) ?? 0,
        price_hold_rank: rankByAddr.get(addr) ?? null,
      };
    });
    for (let i = 0; i < rows.length; i += 500) {
      const up = await db.from('users').upsert(rows.slice(i, i + 500) as never[], { onConflict: 'address' });
      if (up.error) throw new Error(up.error.message);
    }

    if (kv) await kv.put(GATE_KEY, String(now));
    return NextResponse.json({ ok: true, named: users.length, holders: ranked.length });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'sweep failed' },
      { status: 500 }
    );
  } finally {
    clearTimeout(abortTimer);
  }
}
