import { decodeEventLog, toEventSelector } from "viem";

import { PDProjectAbi } from "../abis/PDProject";
import { SeaportAbi } from "../abis/Seaport";

// A chain log normalized to the minimum the indexer needs, regardless of
// whether it arrived via an Alchemy webhook push or an eth_getLogs sweep.
export interface RawLog {
  address: string;
  topics: string[];
  data: string;
  txHash: string;
  logIndex: number;
  blockNumber: number;
  blockTimestamp: number; // unix seconds
}

// topic0 identifies the event. Computed from the ABIs (not hard-coded hashes)
// so a typo can't silently mis-route logs.
export const TRANSFER_TOPIC = toEventSelector(PDProjectAbi[0]).toLowerCase();
export const ORDER_FULFILLED_TOPIC = toEventSelector(
  SeaportAbi[0],
).toLowerCase();

export function topic0(log: RawLog): string {
  return (log.topics[0] ?? "").toLowerCase();
}

export function isTransfer(log: RawLog): boolean {
  return topic0(log) === TRANSFER_TOPIC;
}

export function isOrderFulfilled(log: RawLog): boolean {
  return topic0(log) === ORDER_FULFILLED_TOPIC;
}

export function decodeTransfer(log: RawLog): {
  from: `0x${string}`;
  to: `0x${string}`;
  tokenId: bigint;
} {
  const { args } = decodeEventLog({
    abi: PDProjectAbi,
    data: log.data as `0x${string}`,
    topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
  });
  return args as { from: `0x${string}`; to: `0x${string}`; tokenId: bigint };
}

export interface SeaportItem {
  itemType: number;
  token: `0x${string}`;
  identifier: bigint;
  amount: bigint;
}

export function decodeOrderFulfilled(log: RawLog): {
  offerer: `0x${string}`;
  recipient: `0x${string}`;
  offer: readonly SeaportItem[];
  consideration: readonly SeaportItem[];
} {
  const { args } = decodeEventLog({
    abi: SeaportAbi,
    data: log.data as `0x${string}`,
    topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
  });
  const a = args as unknown as {
    offerer: `0x${string}`;
    recipient: `0x${string}`;
    offer: readonly SeaportItem[];
    consideration: readonly SeaportItem[];
  };
  return {
    offerer: a.offerer,
    recipient: a.recipient,
    offer: a.offer,
    consideration: a.consideration,
  };
}
