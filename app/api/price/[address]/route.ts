// Chain read via Alchemy JSON-RPC. PRICE_TOKEN_ADDRESS defaults to the
// deployed $PRICE ERC-20; override in .env.local if needed.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 10; // $PRICE balance: 10s edge-cache

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// keccak256("balanceOf(address)").slice(0, 10)
const BALANCE_OF_SELECTOR = '0x70a08231';
// keccak256("decimals()").slice(0, 10)
const DECIMALS_SELECTOR = '0x313ce567';

const PRICE_DECIMALS_FALLBACK = 18;

export interface PriceBalanceResponse {
  address: string;
  token_address: string;
  balance_wei: string;
  balance_formatted: string;
  decimals: number;
}

function getAlchemyUrl(): string {
  // Prefer the full RPC URL (same env var the gas route uses) so both
  // routes work from a single env var. Fall back to constructing from
  // the bare API key if only that is set.
  const rpcUrl = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (rpcUrl) return rpcUrl;
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (key) return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
  throw new Error('Neither NEXT_PUBLIC_ALCHEMY_RPC_URL nor NEXT_PUBLIC_ALCHEMY_API_KEY is set');
}

function getTokenAddress(): string {
  const a = process.env.PRICE_TOKEN_ADDRESS;
  if (a && ADDRESS_RE.test(a)) return a.toLowerCase();
  // $PRICE ERC-20 on Ethereum mainnet. Override via PRICE_TOKEN_ADDRESS in .env.local.
  return '0x04da8100226f5c5ecdb0c08cfaf2b60277b94f87';
}

function encodeBalanceOf(address: string): string {
  const padded = address.slice(2).toLowerCase().padStart(64, '0');
  return BALANCE_OF_SELECTOR + padded;
}

function formatUnits(weiHex: string, decimals: number): string {
  const wei = BigInt(weiHex);
  if (wei === BigInt(0)) return '0';
  const divisor = BigInt(10) ** BigInt(decimals);
  const whole = wei / divisor;
  const fraction = wei % divisor;
  if (fraction === BigInt(0)) return whole.toString();
  const fractionStr = fraction.toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${whole.toString()}.${fractionStr}`;
}

async function fetchDecimals(
  contract: string,
  url: string,
  signal?: AbortSignal
): Promise<number> {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0', id: 2, method: 'eth_call',
        params: [{ to: contract, data: DECIMALS_SELECTOR }, 'latest'],
      }),
      signal,
    });
    const json = (await res.json()) as { result?: string };
    if (json.result && json.result !== '0x') return Number(BigInt(json.result));
  } catch { /* fall through to default */ }
  return PRICE_DECIMALS_FALLBACK;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  const contract = getTokenAddress();
  const url = getAlchemyUrl();

  // 8s abort guard — a hung Alchemy connection must not hold the request
  // open indefinitely. Shared across both parallel calls; on timeout the
  // catch below returns the same 500 shape as any other upstream failure.
  const abort = new AbortController();
  const abortTimer = setTimeout(() => abort.abort(), 8000);

  try {
    // Fetch balance and decimals in parallel
    const [balRes, decimals] = await Promise.all([
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 1, method: 'eth_call',
          params: [{ to: contract, data: encodeBalanceOf(address) }, 'latest'],
        }),
        next: { revalidate: 10 },
        signal: abort.signal,
      }),
      fetchDecimals(contract, url, abort.signal),
    ]);

    if (!balRes.ok) return serverError(`Alchemy returned ${balRes.status}`);
    const json = (await balRes.json()) as {
      result?: string;
      error?: { message: string };
    };
    if (json.error) return serverError(`Alchemy error: ${json.error.message}`);
    if (!json.result) return serverError('Alchemy returned no result');

    return NextResponse.json(
      {
        address,
        token_address: contract,
        balance_wei: BigInt(json.result).toString(),
        balance_formatted: formatUnits(json.result, decimals),
        decimals,
      } satisfies PriceBalanceResponse,
      {
        // Browser-side cache hint matching the 10s edge window — repeat
        // reads within the window skip the network without serving anything
        // staler than the edge cache already would.
        headers: {
          'Cache-Control':
            'public, max-age=10, s-maxage=10, stale-while-revalidate=20',
        },
      }
    );
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  } finally {
    clearTimeout(abortTimer);
  }
}
