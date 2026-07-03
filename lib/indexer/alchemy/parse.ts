import type { RawLog } from "../indexer/decode";

// Normalizes an Alchemy Custom Webhook (GraphQL) delivery into RawLog[].
//
// Expects the webhook's GraphQL query to select, per matched log:
//   block { number, timestamp, logs { account { address } topics data index
//           transaction { hash } } }
// (the exact query is in docs/ALCHEMY_SETUP.md). Alchemy posts one payload
// per canonical block, so block-level number/timestamp apply to every log in
// the batch. Field fallbacks tolerate minor schema variations.
export function parseCustomWebhook(payload: unknown): RawLog[] {
  const block = (payload as any)?.event?.data?.block;
  if (!block || !Array.isArray(block.logs)) return [];

  const blockNumber = Number(block.number);
  const blockTimestamp = Number(block.timestamp);
  // A malformed block header (NaN number/timestamp from schema drift) would
  // poison every row in the batch. Drop the whole delivery rather than write
  // garbage timestamps/heights; the reconcile sweep re-reads the window from
  // canonical chain data, so nothing is permanently lost.
  if (!Number.isFinite(blockNumber) || !Number.isFinite(blockTimestamp)) {
    return [];
  }

  return block.logs
    .map((log: any): RawLog => ({
      address: String(log.account?.address ?? log.address ?? "").toLowerCase(),
      topics: Array.isArray(log.topics) ? (log.topics as string[]) : [],
      data: String(log.data ?? "0x"),
      txHash: String(log.transaction?.hash ?? log.transactionHash ?? ""),
      logIndex: Number(log.index ?? log.logIndex ?? 0),
      blockNumber,
      blockTimestamp,
    }))
    // Skip logs that can't be safely routed/decoded: need a tx hash, a finite
    // log index, and at least topic0 to identify the event. A wrong-shape log
    // is dropped here instead of throwing deeper in viem's decoder.
    .filter(
      (l: RawLog) =>
        l.txHash !== "" && Number.isFinite(l.logIndex) && l.topics.length > 0,
    );
}
