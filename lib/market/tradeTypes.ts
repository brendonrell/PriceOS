/*
 * lib/market/tradeTypes — THE EXCHANGE ⇌ shapes (client + server safe).
 *
 * A trade is a two-sided proposal: the proposer's pieces (+ optional ETH on
 * exactly one side) against the counterparty's pieces. Sequential accept flow
 * (propose → accept / decline / counter) — mirrors the ClickUp spec 86ba0apqr.
 */

/** One committed piece on either side of the window. */
export interface TradeItem {
  project_id: string;
  token_id: string;
}

export type TradeStatus = 'open' | 'accepted' | 'declined' | 'cancelled' | 'superseded';

/** One trade as the Exchange surfaces consume it (subset of the row). */
export interface TradeRow {
  id: string;
  proposer_address: string;
  counterparty_address: string;
  proposer_handle: string | null;
  counterparty_handle: string | null;
  status: TradeStatus;
  give: TradeItem[];
  get: TradeItem[];
  give_eth: string;
  get_eth: string;
  end_time: number | null;
  source: string;
  order_hash: string | null;
  order_json: import('./orderTypes').SeaportOrderJson | null;
  counter_of: string | null;
  created_at: string;
}

/** Per-side cap — the window stays readable on a portrait phone. */
export const TRADE_MAX_ITEMS_PER_SIDE = 12;
