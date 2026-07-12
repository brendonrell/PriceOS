/*
 * lib/market/orderTypes — the Seaport order shapes PD stores and moves around.
 *
 * Mirrors seaport-js's OrderWithCounter without importing the SDK (the server
 * validates orders with viem only; the heavy SDK stays client-side behind a
 * dynamic import). A stored order row's order_json column holds exactly one
 * SeaportOrderJson — the complete fill ticket any buyer needs.
 */

export interface SeaportItemJson {
  itemType: number;
  token: string;
  identifierOrCriteria: string;
  startAmount: string;
  endAmount: string;
}

export interface SeaportConsiderationItemJson extends SeaportItemJson {
  recipient: string;
}

export interface SeaportOrderParametersJson {
  offerer: string;
  zone: string;
  orderType: number;
  startTime: string | number;
  endTime: string | number;
  zoneHash: string;
  salt: string;
  offer: SeaportItemJson[];
  consideration: SeaportConsiderationItemJson[];
  totalOriginalConsiderationItems: string | number;
  conduitKey: string;
  counter: string | number;
}

export interface SeaportOrderJson {
  parameters: SeaportOrderParametersJson;
  signature: string;
}

/** Item types per the Seaport spec. */
export const ITEM_NATIVE = 0;
export const ITEM_ERC20 = 1;
export const ITEM_ERC721 = 2;
export const ITEM_ERC721_CRITERIA = 4;

/** Offer scope on PD's book. */
export type OfferScope = 'item' | 'collection' | 'trait';

/** Trait criteria stored on a criteria offer row. `identifiers` is the token
 *  set that matched at offer time (chain orders commit to it via merkle root;
 *  sim offers re-validate the chosen token server-side at accept). */
export interface OfferCriteria {
  category?: string;
  value?: string;
  identifiers?: string[];
}

/** One listing/offer as market surfaces consume it (subset of the row). */
export interface MarketOfferRow {
  id: string;
  project_id: string;
  token_id: string | null;
  bidder_address: string;
  price_eth: string;
  status: string;
  scope: OfferScope;
  criteria: OfferCriteria | null;
  end_time: number | null;
  currency: string;
  source: string;
  order_hash: string | null;
  order_json: SeaportOrderJson | null;
  /** Set when this offer is one piece of a HOSTILE TAKEOVER blanket. */
  takeover_id?: string | null;
  bidder_handle?: string | null;
}

export interface MarketListingRow {
  project_id: string;
  token_id: string;
  seller_address: string;
  price_eth: string;
  active: boolean;
  end_time: number | null;
  currency: string;
  source: string;
  order_hash: string | null;
  order_json: SeaportOrderJson | null;
}
