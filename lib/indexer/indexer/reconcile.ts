import { publicClient, SEAPORT_ADDRESS } from "../chain";
import { config } from "../config";
import { PDProjectAbi } from "../abis/PDProject";
import { SeaportAbi } from "../abis/Seaport";
import { trackedAddresses } from "../lib/writes";
import { type RawLog } from "./decode";
import { processLogs, type ProcessResult } from "./process";

/** Alchemy's FREE tier caps eth_getLogs at a 10-block range (verified live
 *  2026-07-11), so the sweep reads the window in ≤10-block sips. Sequential,
 *  and capped so one sweep can never burst the Worker subrequest budget:
 *  40 windows × 2 log queries = 400 blocks (~80 min of chain) per run max —
 *  far beyond what the 2-minute cadence ever needs. */
const GETLOGS_MAX_RANGE = 10n;
const MAX_WINDOWS = 40;

export interface ReconcileRange {
  /** Explicit replay range (inclusive) — the targeted-backfill door the
   *  cron route exposes as ?fromBlock=&toBlock= (still CRON_SECRET-gated). */
  fromBlock: number;
  toBlock: number;
}

export interface ReconcileSummary {
  fromBlock: number;
  toBlock: number;
  scanned: number;
  result: ProcessResult;
}

// The backstop. Webhook delivery is best-effort, so this periodically re-reads
// the chain for the recent window and replays anything missing. Every write is
// idempotent, so re-processing already-seen logs is a no-op — the sweep only
// fills gaps. It also re-reads canonical state, which is what corrects any
// log that a reorg orphaned after a webhook already delivered it.
export async function reconcile(range?: ReconcileRange): Promise<ReconcileSummary> {
  const client = publicClient();

  let fromBlock: bigint;
  let toBlock: bigint;
  if (range) {
    fromBlock = BigInt(range.fromBlock);
    toBlock = BigInt(range.toBlock);
  } else {
    const head = await client.getBlockNumber();
    toBlock = head - BigInt(config.confirmations);
    fromBlock = toBlock - BigInt(config.reconcileLookbackBlocks) + 1n;
  }
  if (toBlock < fromBlock || toBlock < 0n) {
    return {
      fromBlock: Number(fromBlock < 0n ? 0n : fromBlock),
      toBlock: Number(toBlock < 0n ? 0n : toBlock),
      scanned: 0,
      result: { transfers: 0, sales: 0, ignored: 0 },
    };
  }

  // The CONTRACT ADDRESSES to watch (projects.contract_address) — pre-fix
  // this fed project slugs to eth_getLogs as "addresses", failing the sweep.
  const addresses = (await trackedAddresses()) as `0x${string}`[];

  // Transfers from our Project contracts; sales from the single Seaport
  // contract (decode-time tracked-set filter drops non-PD fills). Each query
  // walks the window in ≤10-block sips (Alchemy free-tier ceiling).
  const windows: Array<{ from: bigint; to: bigint }> = [];
  for (
    let w = fromBlock;
    w <= toBlock && windows.length < MAX_WINDOWS;
    w += GETLOGS_MAX_RANGE
  ) {
    windows.push({ from: w, to: w + GETLOGS_MAX_RANGE - 1n > toBlock ? toBlock : w + GETLOGS_MAX_RANGE - 1n });
  }

  const transferLogs = [] as Awaited<ReturnType<typeof client.getLogs>>;
  const saleLogs = [] as Awaited<ReturnType<typeof client.getLogs>>;
  for (const w of windows) {
    const [t, s] = await Promise.all([
      addresses.length
        ? client.getLogs({
            address: addresses,
            event: PDProjectAbi[0],
            fromBlock: w.from,
            toBlock: w.to,
          })
        : Promise.resolve([]),
      client.getLogs({
        address: SEAPORT_ADDRESS,
        event: SeaportAbi[0],
        fromBlock: w.from,
        toBlock: w.to,
      }),
    ]);
    transferLogs.push(...(t as typeof transferLogs));
    saleLogs.push(...(s as typeof saleLogs));
  }

  const all = [...transferLogs, ...saleLogs];

  // getLogs omits block timestamps; fetch the distinct blocks once each.
  // Bounded concurrency: an unbounded Promise.all over every distinct block
  // would burst hundreds of RPC calls at once if the lookback window or block
  // density grows, spiking the Alchemy compute budget. Cap in-flight fetches.
  const blockNumbers = [...new Set(all.map((l) => l.blockNumber!))];
  const tsByBlock = new Map<bigint, number>();
  const BLOCK_FETCH_CONCURRENCY = 8;
  for (let i = 0; i < blockNumbers.length; i += BLOCK_FETCH_CONCURRENCY) {
    const chunk = blockNumbers.slice(i, i + BLOCK_FETCH_CONCURRENCY);
    await Promise.all(
      chunk.map(async (bn) => {
        const blk = await client.getBlock({ blockNumber: bn });
        tsByBlock.set(bn, Number(blk.timestamp));
      }),
    );
  }

  const raws: RawLog[] = all.map((l) => ({
    address: l.address,
    topics: l.topics as string[],
    data: l.data,
    txHash: l.transactionHash!,
    logIndex: l.logIndex!,
    blockNumber: Number(l.blockNumber!),
    blockTimestamp: tsByBlock.get(l.blockNumber!) ?? 0,
  }));

  const result = await processLogs(raws);
  return {
    fromBlock: Number(fromBlock),
    toBlock: Number(toBlock),
    scanned: raws.length,
    result,
  };
}
