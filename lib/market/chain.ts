/*
 * lib/market/chain — chain constants for the real (Seaport) secondary market.
 *
 * Isomorphic (client + server). The chain profile is env-driven per the
 * Sepolia test-phase spec (docs/sepolia-test-phase.md §4): NEXT_PUBLIC_CHAIN_ID
 * selects mainnet (1, default) or Sepolia (11155111); the RPC URL is the same
 * NEXT_PUBLIC_ALCHEMY_RPC_URL the gas route already uses, re-pointed per env.
 *
 * SEAPORT_ADDRESS is Seaport 1.6 — the canonical cross-chain deployment,
 * identical on mainnet + Sepolia. Same constant the indexer decodes against.
 * WETH is the offers currency (bids escrow-free, OpenSea semantics); per-chain
 * addresses match the indexer's WETH_BY_CHAIN.
 */

export const CHAIN_ID: number = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? '1');

/** Seaport 1.6 — same address on mainnet and Sepolia. */
export const SEAPORT_ADDRESS = '0x0000000000000068F116a894984e2DB1123eB395';

export const WETH_BY_CHAIN: Record<number, string> = {
  1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  11155111: '0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14',
};

export const WETH_ADDRESS: string = WETH_BY_CHAIN[CHAIN_ID] ?? WETH_BY_CHAIN[1];

/** EIP-2981 on PDProject: flat 5% to the Project's PaymentSplitter. Every
 *  order PD's book accepts must carry at least this royalty consideration —
 *  Seaport does not read 2981 itself; the order is where royalty is enforced. */
export const ROYALTY_BPS = 500;

/** Listing/offer validity windows. Duration pills in the UI map to these;
 *  the server rejects orders that outlive the cap (stale orders are a
 *  cancellation-gas liability for sellers — same reason OpenSea caps at 6mo). */
export const DURATION_CHOICES: { label: string; seconds: number }[] = [
  { label: '1D', seconds: 86_400 },
  { label: '7D', seconds: 7 * 86_400 },
  { label: '30D', seconds: 30 * 86_400 },
  { label: '6MO', seconds: 182 * 86_400 },
];
export const DEFAULT_DURATION_SEC = 30 * 86_400;
export const MAX_DURATION_SEC = 190 * 86_400;

/** Seaport EIP-712 domain — order signature verification (server) and
 *  anything else that needs to talk about the typed data. */
export function seaportDomain(chainId: number = CHAIN_ID) {
  return {
    name: 'Seaport',
    version: '1.6',
    chainId,
    verifyingContract: SEAPORT_ADDRESS as `0x${string}`,
  } as const;
}

/** EIP-712 types for Seaport OrderComponents (single-order signatures). */
export const SEAPORT_ORDER_TYPES = {
  OrderComponents: [
    { name: 'offerer', type: 'address' },
    { name: 'zone', type: 'address' },
    { name: 'offer', type: 'OfferItem[]' },
    { name: 'consideration', type: 'ConsiderationItem[]' },
    { name: 'orderType', type: 'uint8' },
    { name: 'startTime', type: 'uint256' },
    { name: 'endTime', type: 'uint256' },
    { name: 'zoneHash', type: 'bytes32' },
    { name: 'salt', type: 'uint256' },
    { name: 'conduitKey', type: 'bytes32' },
    { name: 'counter', type: 'uint256' },
  ],
  OfferItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
  ],
  ConsiderationItem: [
    { name: 'itemType', type: 'uint8' },
    { name: 'token', type: 'address' },
    { name: 'identifierOrCriteria', type: 'uint256' },
    { name: 'startAmount', type: 'uint256' },
    { name: 'endAmount', type: 'uint256' },
    { name: 'recipient', type: 'address' },
  ],
} as const;
