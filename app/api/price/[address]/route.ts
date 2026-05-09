// Chain read via Alchemy JSON-RPC. Set PRICE_TOKEN_ADDRESS in env once the
// $PRICE ERC-20 contract is deployed. No indexer required — this is a direct
// eth_call to the contract's balanceOf(address).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 10; // $PRICE balance: 10s

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

// keccak256("balanceOf(address)").slice(0, 10)
const BALANCE_OF_SELECTOR = '0x70a08231';
const PRICE_DECIMALS = 18;

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

export interface PriceBalanceResponse {
  address: string;
  token_address: string;
  balance_wei: string;
  balance_formatted: string;
  decimals: number;
}

function alchemyUrl(): string {
  const key = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;
  if (!key) throw new Error('NEXT_PUBLIC_ALCHEMY_API_KEY is not set');
  return `https://eth-mainnet.g.alchemy.com/v2/${key}`;
}

function tokenAddress(): string {
  const a = process.env.PRICE_TOKEN_ADDRESS;
  if (!a || !ADDRESS_RE.test(a)) {
    // Until the contract ships, return the zero address so callers get a
    // structured response with balance: 0 rather than a 500.
    return ZERO_ADDRESS;
  }
  return a.toLowerCase();
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

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  const contract = tokenAddress();

  // Pre-deployment short-circuit: contract not configured yet.
  if (contract === ZERO_ADDRESS) {
    const response: PriceBalanceResponse = {
      address,
      token_address: contract,
      balance_wei: '0',
      balance_formatted: '0',
      decimals: PRICE_DECIMALS,
    };
    return NextResponse.json(response);
  }

  try {
    const res = await fetch(alchemyUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'eth_call',
        params: [
          { to: contract, data: encodeBalanceOf(address) },
          'latest',
        ],
      }),
      next: { revalidate: 10 },
    });

    if (!res.ok) return serverError(`Alchemy returned ${res.status}`);
    const json = (await res.json()) as {
      result?: string;
      error?: { message: string };
    };
    if (json.error) return serverError(`Alchemy error: ${json.error.message}`);
    if (!json.result) return serverError('Alchemy returned no result');

    const response: PriceBalanceResponse = {
      address,
      token_address: contract,
      balance_wei: BigInt(json.result).toString(),
      balance_formatted: formatUnits(json.result, PRICE_DECIMALS),
      decimals: PRICE_DECIMALS,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
