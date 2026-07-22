/*
 * lib/market/verifyFill — server-side proof that a Seaport order was really
 * filled on-chain, by a specific wallet.
 *
 * Security audit 2026-07-22: two book mutations trusted the client's word that
 * an on-chain fill had happened — the Exchange chain-rail accept (flips the
 * `holders` mirror → feeds achievements/PriceScore) and the market
 * `confirm_fills` (closes listings + fires SOLD pings). Both are now bound to
 * a REAL fill of a SPECIFIC order hash by the SIWE session's own wallet.
 *
 * Reuses the indexer's canonical Seaport decode (same ABI, same
 * topic-from-ABI derivation) and the gnome-deal confirm's on-chain rigor —
 * no new chain plumbing.
 */

import { decodeEventLog, toEventSelector } from 'viem';
import { publicClient, SEAPORT_ADDRESS } from '@/lib/indexer/chain';
import { SeaportAbi } from '@/lib/indexer/abis/Seaport';

// topic0 for Seaport's OrderFulfilled, derived from the ABI (never a hard-coded
// hash) — the same source the indexer decodes against.
const ORDER_FULFILLED_TOPIC = toEventSelector(SeaportAbi[0]).toLowerCase();

export type FillCheck =
  | { ok: true; from: string; orderHashes: Set<string> }
  | { ok: false; reason: 'pending' | 'failed' | 'bad_hash' };

/**
 * Read a Seaport fulfillment transaction and return every order hash it
 * fulfilled (lowercased) plus the sender (lowercased). A single sweep tx can
 * fulfil many orders, so this returns the whole set; the caller checks that the
 * order it cares about is present.
 *
 * `pending`  — not mined / not visible yet (the client's engine waits for one
 *              confirmation before calling us, so this is rare; the caller asks
 *              the user to retry rather than booking anything).
 * `failed`   — the transaction reverted.
 * `bad_hash` — not a 32-byte tx hash.
 */
export async function verifySeaportFill(txHash: string): Promise<FillCheck> {
  const hash = (txHash ?? '').toLowerCase();
  if (!/^0x[0-9a-f]{64}$/.test(hash)) return { ok: false, reason: 'bad_hash' };

  const client = publicClient();
  let tx: Awaited<ReturnType<typeof client.getTransaction>> | undefined;
  let receipt: Awaited<ReturnType<typeof client.getTransactionReceipt>> | undefined;
  try {
    [tx, receipt] = await Promise.all([
      client.getTransaction({ hash: hash as `0x${string}` }),
      client.getTransactionReceipt({ hash: hash as `0x${string}` }),
    ]);
  } catch {
    return { ok: false, reason: 'pending' }; // not mined / not seen yet
  }
  if (!tx || !receipt) return { ok: false, reason: 'pending' };
  if (receipt.status !== 'success') return { ok: false, reason: 'failed' };

  const seaport = SEAPORT_ADDRESS.toLowerCase();
  const orderHashes = new Set<string>();
  for (const log of receipt.logs) {
    if (log.address.toLowerCase() !== seaport) continue;
    if ((log.topics[0] ?? '').toLowerCase() !== ORDER_FULFILLED_TOPIC) continue;
    try {
      const { args } = decodeEventLog({
        abi: SeaportAbi,
        data: log.data,
        topics: log.topics as [`0x${string}`, ...`0x${string}`[]],
      });
      const oh = (args as { orderHash?: string }).orderHash;
      if (oh) orderHashes.add(oh.toLowerCase());
    } catch {
      // Not a decodable OrderFulfilled — ignore.
    }
  }
  return { ok: true, from: tx.from.toLowerCase(), orderHashes };
}
