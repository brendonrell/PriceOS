// lib/pings/tiers.ts — client-safe. The archival tiering.
//
// Not all pings are equal. SOCIAL pings (followed you, achievement, p2p, mint
// milestone) are ephemeral attention — they age out. FINANCIAL-SIGNAL pings
// (offer, sale, offer-accepted, transfer, wishlist listed/sold) are a RECORD
// you'll want to scroll back through, so they persist far longer and can be
// isolated with the "Money" filter in the inbox.

import type { PingKind } from '@/lib/supabase';
import type { RenderKind } from './render';

/** Kinds that are financial signal (kept long, shown by the Money filter).
 *  Includes LIST, which only appears in the broadcast firehose (never stored). */
export const FINANCIAL_KINDS: ReadonlySet<RenderKind> = new Set<RenderKind>([
  'OFFER',
  'OFFER_ACCEPTED',
  'SALE',
  'XFER',
  'WISHLIST_HIT',
  'WATCH_HIT',
  'LIST',
]);

export function isFinancial(kind: RenderKind): boolean {
  return FINANCIAL_KINDS.has(kind);
}

// Retention windows (READ pings only — unread is never auto-deleted).
export const PING_EPHEMERAL_DAYS = 30;   // social: follow, achievement, p2p, milestone
export const PING_FINANCIAL_DAYS = 365;  // financial signal: a year of history

/** Stored ping kinds by tier (LIST excluded — broadcast-only, never stored). */
export const STORED_FINANCIAL_KINDS: PingKind[] = [
  'OFFER', 'OFFER_ACCEPTED', 'SALE', 'XFER', 'WISHLIST_HIT', 'WATCH_HIT',
];
export const STORED_EPHEMERAL_KINDS: PingKind[] = [
  'PING', 'FOLLOW', 'PROJECT_FOLLOW', 'ACHIEVEMENT', 'STREAK', 'MINT',
];
