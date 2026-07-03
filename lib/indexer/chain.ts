import { createPublicClient, http } from "viem";

import { config } from "./config";

// Seaport 1.6 — same canonical address on Mainnet and Sepolia.
export const SEAPORT_ADDRESS =
  "0x0000000000000068F116a894984e2DB1123eB395" as const;

// WETH per chain. Wrapped ETH is 1:1 with native ETH, so formatEther on the
// amount gives the same number. Other ERC-20s (USDC, etc.) need decimals +
// a price feed and are deferred to v2.
export const WETH_BY_CHAIN: Record<number, string> = {
  1: "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2", // Mainnet
  11155111: "0xfff9976782d46cc05630d1f6ebab18b2324d6b14", // Sepolia
};

export function wethAddress(): string | undefined {
  return WETH_BY_CHAIN[config.chainId];
}

// Public client for the reconciliation sweep only. The webhook path is push,
// not pull, and never constructs this.
export function publicClient() {
  if (!config.alchemyRpcUrl) {
    throw new Error(
      "ALCHEMY_RPC_URL is required for the reconciliation sweep (chain reads)",
    );
  }
  return createPublicClient({ transport: http(config.alchemyRpcUrl) });
}
