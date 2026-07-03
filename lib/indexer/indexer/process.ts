import { formatEther, zeroAddress } from "viem";

import {
  insertEvent,
  bumpMintedCount,
  upsertHolder,
  removeHolder,
  enrichXferWithPrice,
  applySale,
  slugForContract,
  type SaleDirection,
} from "../lib/writes";
import { pingSellerOnSale, pingArtistOnMintMilestone } from "../lib/pings";
import { wethAddress } from "../chain";
import {
  type RawLog,
  decodeTransfer,
  decodeOrderFulfilled,
  isTransfer,
  isOrderFulfilled,
} from "./decode";

// Seaport item types (ConsiderationStructs.sol):
//   0 = NATIVE (ETH), 1 = ERC20, 2 = ERC721, 3 = ERC1155
const ITEM_NATIVE = 0;
const ITEM_ERC20 = 1;
const ITEM_ERC721 = 2;

export interface ProcessResult {
  transfers: number; // new Transfer rows written (mints + plain transfers)
  sales: number; // sales enriched with a price this pass
  ignored: number; // logs that were neither Transfer nor OrderFulfilled
}

// Apply a batch of logs. Both ingestion paths (webhook push, reconcile sweep)
// funnel through here, so the idempotency + ordering rules live in one place.
//
// Ordering: a Seaport sale emits BOTH the ERC-721 Transfer and OrderFulfilled
// in the same tx. The Transfer must land first (it creates the XFER row the
// sale then patches with a price), so we process all Transfers before any
// OrderFulfilled regardless of intra-tx log order.
export async function processLogs(logs: RawLog[]): Promise<ProcessResult> {
  const sorted = [...logs].sort(
    (a, b) => a.blockNumber - b.blockNumber || a.logIndex - b.logIndex,
  );
  const transfers = sorted.filter(isTransfer);
  const sales = sorted.filter(isOrderFulfilled);

  // Per-log fault isolation: a single malformed log (Alchemy schema drift, a
  // wrong-shape delivery that throws inside viem's decode) must not wedge the
  // whole batch or 5xx the webhook into a retry storm on the same poison
  // payload. We skip + log the bad one; the reconcile sweep re-reads the window
  // from canonical chain data, so a genuinely-missed log is still backfilled.
  let transferCount = 0;
  for (const log of transfers) {
    try {
      if (await handleTransfer(log)) transferCount++;
    } catch (err) {
      console.error(
        `indexer: skipped transfer log ${log.txHash}:${log.logIndex}`,
        err,
      );
    }
  }
  let saleCount = 0;
  for (const log of sales) {
    try {
      if (await handleOrderFulfilled(log)) saleCount++;
    } catch (err) {
      console.error(
        `indexer: skipped sale log ${log.txHash}:${log.logIndex}`,
        err,
      );
    }
  }

  return {
    transfers: transferCount,
    sales: saleCount,
    ignored: sorted.length - transfers.length - sales.length,
  };
}

// ERC-721 Transfer: mint (from 0x0), burn (to 0x0), or plain transfer.
// Returns true if this was the first time we saw the log.
async function handleTransfer(log: RawLog): Promise<boolean> {
  // Allow-list gate + keying bridge in one: resolve the emitting contract to
  // its project SLUG (the id the whole app + DB key on). The transfer path
  // MUST verify the emitting contract is a tracked PD Project before writing
  // anything — exactly as the sale path does below. Without it, a mis-scoped
  // or Address-Activity webhook (or any ERC-721 Transfer that reaches this
  // handler) would write fake mints, inflate minted_count, and forge
  // ownership/notifications for arbitrary contracts. `projects` rows with
  // contract_address set are the single source of truth for BOTH paths, so
  // correctness no longer depends on the webhook's address filter being
  // configured perfectly.
  const projectId = await slugForContract(log.address);
  if (!projectId) return false;

  const { from, to, tokenId } = decodeTransfer(log);
  const tokenIdStr = tokenId.toString();
  const isMint = from === zeroAddress;
  const isBurn = to === zeroAddress;

  // The events insert is the idempotency gate. A duplicate webhook delivery or
  // an overlapping sweep returns null here (unique (tx_hash, log_index)), and
  // we skip ALL side effects — critically the mint counter, which is a raw
  // increment and would double-count on replay.
  const eventId = await insertEvent({
    type: isMint ? "MINT" : "XFER",
    project_id: projectId,
    token_id: tokenIdStr,
    from_address: isMint ? null : from.toLowerCase(),
    to_address: isBurn ? null : to.toLowerCase(),
    price_eth: null, // patched in by the sale handler if this Transfer is a sale
    tx_hash: log.txHash,
    log_index: log.logIndex,
    timestamp: log.blockTimestamp,
  });
  if (eventId === null) return false; // already applied

  if (isMint) {
    await bumpMintedCount(projectId);
    // Artist milestone ping (1000-multiples, same rule as the app's mint
    // route). Fresh mints only — the replay gate above already ensured that.
    await pingArtistOnMintMilestone(projectId);
  }
  if (isBurn) await removeHolder(projectId, tokenIdStr);
  else await upsertHolder(projectId, tokenIdStr, to.toLowerCase(), log.blockTimestamp);

  return true;
}

// Seaport OrderFulfilled: patches the matching XFER row with price + direction
// and books the sale into Project volume/ATH. Returns true only on the first
// enrichment, which is what gates the (non-idempotent) volume increment.
async function handleOrderFulfilled(log: RawLog): Promise<boolean> {
  const { offerer, recipient, offer, consideration } = decodeOrderFulfilled(log);

  // ERC-721 in `offer` → seller listed, buyer hit it (LIST_FILL).
  // ERC-721 in `consideration` → buyer offered, seller accepted (OFFER_ACCEPT).
  const nftFromOffer = offer.find((i) => Number(i.itemType) === ITEM_ERC721);
  const nftFromConsid = consideration.find(
    (i) => Number(i.itemType) === ITEM_ERC721,
  );
  const nft = nftFromOffer ?? nftFromConsid;
  if (!nft) return false;

  const direction: SaleDirection = nftFromOffer ? "LIST_FILL" : "OFFER_ACCEPT";

  // Cheap skip for non-PD Projects (Seaport carries the whole market's
  // volume) + the keying bridge: resolve the NFT contract to its SLUG.
  const projectId = await slugForContract(nft.token);
  if (!projectId) return false;
  const tokenId = nft.identifier.toString();

  const paymentSide = nftFromOffer ? consideration : offer;
  const weth = wethAddress();

  // Sum native ETH + WETH (1:1). Other ERC-20-denominated sales are deferred.
  const totalWei = paymentSide
    .filter((i) => {
      const it = Number(i.itemType);
      if (it === ITEM_NATIVE) return true;
      if (it === ITEM_ERC20 && weth) return i.token.toLowerCase() === weth;
      return false;
    })
    .reduce((sum, i) => sum + i.amount, 0n);

  if (totalWei === 0n) return false; // ERC-20-denominated sale, punt to v2
  const priceEth = formatEther(totalWei);

  // enrichXferWithPrice only updates the row while price_eth IS NULL — and
  // matches per (tx, project, token) — so it returns true exactly once per
  // sale, and a sweep/bundle tx prices each token from ITS order. Booking
  // volume strictly on that transition keeps replays and matchOrders' second
  // OrderFulfilled from double-counting.
  const enriched = await enrichXferWithPrice(
    log.txHash,
    projectId,
    tokenId,
    priceEth,
    direction,
  );
  if (!enriched) return false;

  await applySale(projectId, priceEth);

  // Inbox ping for the seller (mirrors the app's SALE ping). Sides:
  // LIST_FILL  → the offerer GAVE the NFT (listed it) → offerer = seller.
  // OFFER_ACCEPT → the offerer RECEIVES the NFT (they bid for it) →
  //                offerer = buyer, the fulfilling recipient = seller.
  const seller = nftFromOffer ? offerer : recipient;
  const buyer = nftFromOffer ? recipient : offerer;
  await pingSellerOnSale({ seller, buyer, projectId, tokenId, priceEth });

  return true;
}
