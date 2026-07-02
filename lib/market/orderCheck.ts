/*
 * lib/market/orderCheck — SERVER-ONLY validation for posted Seaport orders.
 *
 * PD's book only stores orders that are safe to show and fill:
 *   - the SIWE session address IS the order's offerer (you sign your own book)
 *   - the traded token belongs to the project row being posted against
 *   - the 5% royalty to the Project's PaymentSplitter is IN the order
 *     (Seaport doesn't read EIP-2981 — the order is the enforcement)
 *   - sane validity window (no immortal orders; cap mirrors the UI choices)
 *   - the signature actually recovers to the offerer (single orders; bulk
 *     tree signatures are structurally checked and enforced by Seaport at
 *     fill time — a bad one is simply unfillable)
 *
 * Validation is pure viem — the heavy SDK never loads server-side. The
 * royalty receiver (per-project PaymentSplitter) is read from royaltyInfo
 * once and cached on projects.royalty_receiver.
 */

import { createPublicClient, formatEther, http, parseAbi } from 'viem';
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  CHAIN_ID,
  MAX_DURATION_SEC,
  ROYALTY_BPS,
  SEAPORT_ORDER_TYPES,
  WETH_ADDRESS,
  seaportDomain,
} from './chain';
import {
  ITEM_ERC20,
  ITEM_ERC721,
  ITEM_ERC721_CRITERIA,
  ITEM_NATIVE,
  type SeaportOrderJson,
} from './orderTypes';

const ROYALTY_ABI = parseAbi([
  'function royaltyInfo(uint256 tokenId, uint256 salePrice) view returns (address receiver, uint256 royaltyAmount)',
]);

function rpcClient() {
  const url = process.env.NEXT_PUBLIC_ALCHEMY_RPC_URL;
  if (!url) return null;
  return createPublicClient({ transport: http(url) });
}

/** Per-project royalty receiver — cached on the projects row, resolved from
 *  chain the first time an order for the project arrives. */
export async function resolveRoyaltyReceiver(
  db: SupabaseClient,
  slug: string,
  contract: string,
): Promise<string | null> {
  const row = await db.from('projects').select('royalty_receiver').eq('id', slug).maybeSingle();
  const cached = (row.data as { royalty_receiver?: string | null } | null)?.royalty_receiver;
  if (cached) return cached.toLowerCase();

  const client = rpcClient();
  if (!client) return null;
  try {
    const [receiver] = await client.readContract({
      address: contract as `0x${string}`,
      abi: ROYALTY_ABI,
      functionName: 'royaltyInfo',
      args: [1n, 10_000n],
    });
    const lower = (receiver as string).toLowerCase();
    await db.from('projects').update({ royalty_receiver: lower } as never).eq('id', slug);
    return lower;
  } catch {
    return null;
  }
}

export interface CheckedOrder {
  priceEth: string;
  startTime: number;
  endTime: number;
  currency: 'ETH' | 'WETH';
}

function fail(msg: string): never {
  throw new Error(msg);
}

function asBig(v: string | number): bigint {
  return BigInt(v);
}

function checkWindow(p: SeaportOrderJson['parameters']): { startTime: number; endTime: number } {
  const now = Math.floor(Date.now() / 1000);
  const startTime = Number(p.startTime);
  const endTime = Number(p.endTime);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime)) fail('Bad order window');
  if (startTime > now + 300) fail('Order starts in the future');
  if (endTime <= now) fail('Order already expired');
  if (endTime > now + MAX_DURATION_SEC) fail('Order duration too long');
  return { startTime, endTime };
}

function checkShell(order: SeaportOrderJson, address: string): void {
  const p = order.parameters;
  if (!p || !order.signature) fail('Malformed order');
  if (p.offerer.toLowerCase() !== address.toLowerCase()) fail('Order offerer mismatch');
  if (p.zone !== '0x0000000000000000000000000000000000000000') fail('Zoned orders not accepted');
  if (p.conduitKey !== '0x0000000000000000000000000000000000000000000000000000000000000000')
    fail('Conduit orders not accepted');
  const orderType = Number(p.orderType);
  if (orderType !== 0 && orderType !== 1) fail('Restricted orders not accepted');
}

/** Royalty consideration: at least ROYALTY_BPS of `total` in `token` to the
 *  receiver. Rounding-tolerant by 1 wei per the SDK's basis-point floor. */
function checkRoyalty(
  p: SeaportOrderJson['parameters'],
  receiver: string,
  token: string,
  itemType: number,
  total: bigint,
): void {
  const needed = (total * BigInt(ROYALTY_BPS)) / 10_000n;
  const paid = p.consideration
    .filter(
      (c) =>
        Number(c.itemType) === itemType &&
        c.token.toLowerCase() === token.toLowerCase() &&
        c.recipient.toLowerCase() === receiver.toLowerCase(),
    )
    .reduce((s, c) => s + asBig(c.startAmount), 0n);
  if (paid + 1n < needed) fail('Royalty missing from order');
}

/** Single-order signatures verify against the Seaport EIP-712 payload
 *  (including smart-wallet 1271 via the RPC). Bulk tree signatures (longer)
 *  skip crypto here — Seaport is the enforcer at fill time. */
async function checkSignature(order: SeaportOrderJson, address: string): Promise<void> {
  const sigBytes = (order.signature.length - 2) / 2;
  if (sigBytes !== 64 && sigBytes !== 65) return; // bulk-signed — structural only
  const client = rpcClient();
  if (!client) return; // no RPC in this env — Seaport still enforces at fill
  const p = order.parameters;
  const message = {
    offerer: p.offerer as `0x${string}`,
    zone: p.zone as `0x${string}`,
    offer: p.offer.map((o) => ({
      itemType: Number(o.itemType),
      token: o.token as `0x${string}`,
      identifierOrCriteria: asBig(o.identifierOrCriteria),
      startAmount: asBig(o.startAmount),
      endAmount: asBig(o.endAmount),
    })),
    consideration: p.consideration.map((c) => ({
      itemType: Number(c.itemType),
      token: c.token as `0x${string}`,
      identifierOrCriteria: asBig(c.identifierOrCriteria),
      startAmount: asBig(c.startAmount),
      endAmount: asBig(c.endAmount),
      recipient: c.recipient as `0x${string}`,
    })),
    orderType: Number(p.orderType),
    startTime: asBig(p.startTime),
    endTime: asBig(p.endTime),
    zoneHash: p.zoneHash as `0x${string}`,
    salt: asBig(p.salt),
    conduitKey: p.conduitKey as `0x${string}`,
    counter: asBig(p.counter),
  };
  const ok = await client
    .verifyTypedData({
      address: address as `0x${string}`,
      domain: seaportDomain(CHAIN_ID),
      types: SEAPORT_ORDER_TYPES,
      primaryType: 'OrderComponents',
      message,
      signature: order.signature as `0x${string}`,
    })
    .catch(() => false);
  if (!ok) fail('Order signature invalid');
}

/** A listing: [ERC721 tokenId] for [native ETH incl. royalty]. */
export async function checkListingOrder(
  order: SeaportOrderJson,
  opts: { address: string; contract: string; tokenId: string; royaltyReceiver: string },
): Promise<CheckedOrder> {
  checkShell(order, opts.address);
  const p = order.parameters;
  const window = checkWindow(p);

  if (p.offer.length !== 1) fail('Listing must offer exactly one piece');
  const nft = p.offer[0];
  if (Number(nft.itemType) !== ITEM_ERC721) fail('Listing must offer the token');
  if (nft.token.toLowerCase() !== opts.contract.toLowerCase()) fail('Wrong contract');
  if (asBig(nft.identifierOrCriteria) !== asBig(opts.tokenId)) fail('Wrong token');

  if (p.consideration.length === 0 || p.consideration.length > 4) fail('Bad consideration');
  let total = 0n;
  for (const c of p.consideration) {
    if (Number(c.itemType) !== ITEM_NATIVE) fail('Listings settle in ETH only');
    if (asBig(c.startAmount) !== asBig(c.endAmount)) fail('Ascending prices not accepted');
    total += asBig(c.startAmount);
  }
  if (total <= 0n) fail('Bad price');
  checkRoyalty(p, opts.royaltyReceiver, '0x0000000000000000000000000000000000000000', ITEM_NATIVE, total);

  await checkSignature(order, opts.address);
  return { priceEth: formatEther(total), currency: 'ETH', ...window };
}

/** An offer: [WETH] for [ERC721 item OR criteria] + WETH royalty. */
export async function checkOfferOrder(
  order: SeaportOrderJson,
  opts: {
    address: string;
    contract: string;
    royaltyReceiver: string;
    scope: 'item' | 'collection' | 'trait';
    tokenId?: string;
  },
): Promise<CheckedOrder> {
  checkShell(order, opts.address);
  const p = order.parameters;
  const window = checkWindow(p);

  if (p.offer.length !== 1) fail('Offer must be a single amount');
  const money = p.offer[0];
  if (Number(money.itemType) !== ITEM_ERC20 || money.token.toLowerCase() !== WETH_ADDRESS.toLowerCase())
    fail('Offers are WETH only');
  const total = asBig(money.startAmount);
  if (total <= 0n || asBig(money.endAmount) !== total) fail('Bad offer amount');

  const nfts = p.consideration.filter((c) => {
    const t = Number(c.itemType);
    return t === ITEM_ERC721 || t === ITEM_ERC721_CRITERIA;
  });
  if (nfts.length !== 1) fail('Offer must ask for exactly one piece');
  const nft = nfts[0];
  if (nft.token.toLowerCase() !== opts.contract.toLowerCase()) fail('Wrong contract');
  if (nft.recipient.toLowerCase() !== opts.address.toLowerCase()) fail('Offer must deliver to the bidder');
  if (opts.scope === 'item') {
    if (Number(nft.itemType) !== ITEM_ERC721) fail('Item offer must name the token');
    if (asBig(nft.identifierOrCriteria) !== asBig(opts.tokenId ?? '-1')) fail('Wrong token');
  } else if (opts.scope === 'collection') {
    if (Number(nft.itemType) !== ITEM_ERC721_CRITERIA || asBig(nft.identifierOrCriteria) !== 0n)
      fail('Collection offer must be open-criteria');
  } else {
    if (Number(nft.itemType) !== ITEM_ERC721_CRITERIA) fail('Trait offer must be criteria-based');
    if (asBig(nft.identifierOrCriteria) === 0n) fail('Trait offer missing criteria');
  }

  checkRoyalty(p, opts.royaltyReceiver, WETH_ADDRESS, ITEM_ERC20, total);
  await checkSignature(order, opts.address);
  return { priceEth: formatEther(total), currency: 'WETH', ...window };
}
