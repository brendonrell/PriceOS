// Central environment + tuning config for the serverless indexer.
//
// Every value has a safe default except the secrets (RPC URL, webhook
// signing key, Supabase creds), which are validated lazily in the code
// path that actually needs them — so the webhook path doesn't require the
// RPC URL, and the reconcile path doesn't require the webhook signing key.

export const config = {
  // 11155111 = Sepolia (current target), 1 = Mainnet. Selects the WETH
  // address used to value WETH-denominated sales 1:1 with ETH.
  chainId: Number(process.env.CHAIN_ID ?? 11155111),

  // Alchemy RPC URL — only used by the reconciliation sweep (eth_getLogs).
  // The webhook path never reads the chain; Alchemy pushes the logs to us.
  alchemyRpcUrl: process.env.ALCHEMY_RPC_URL ?? "",

  // Shared secret from the Alchemy webhook dashboard. Every incoming webhook
  // is HMAC-verified against this before any write happens.
  webhookSigningKey: process.env.ALCHEMY_WEBHOOK_SIGNING_KEY ?? "",

  // Reconciliation sweep: how many recent blocks the backstop re-reads each
  // run. The (tx_hash, log_index) idempotency guard makes overlap free, so a
  // generous window simply means "no dropped webhook survives one sweep".
  reconcileLookbackBlocks: Number(process.env.RECONCILE_LOOKBACK_BLOCKS ?? 50),

  // Reorg safety margin for the sweep: it ignores logs newer than this many
  // blocks from the chain head, so a sale on a block that later gets reorged
  // away is never written as final. Webhook-path writes are corrected by the
  // next sweep. Raise on mainnet, lower (even 0) is fine on a quiet testnet.
  confirmations: Number(process.env.INDEXER_CONFIRMATIONS ?? 2),
};
