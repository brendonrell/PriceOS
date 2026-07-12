// lib/pings/fanout.ts — server-only. ONE call per market event fans every
// audience that cares, deduped:
//
//   1. Wishlisters of the exact piece (WISHLIST_HIT — the buy-intent signal,
//      strongest claim on the event).
//   2. Interest audiences (WATCH_HIT): the actor's mutuals, starred-artist
//      watchers, top-rarity project holders, starred-project watchers,
//      starred-trait watchers — see lib/pings/interest.ts.
//
// A wishlister never ALSO gets an interest ping for the same event. Producers
// (list / buy / accept / mint) call this once, fire-and-forget semantics,
// best-effort: it never throws into the user action it rides on.

import type { getSupabaseService } from '@/lib/supabase';
import { pingWishlisters } from '@/lib/pings/wishlist';
import { pingInterested, type InterestEvent } from '@/lib/pings/interest';

type DB = ReturnType<typeof getSupabaseService>;

export interface MarketFanoutArgs {
  slug: string;
  tokenId: string;
  event: InterestEvent; // 'minted' | 'listed' | 'sold'
  actorAddress: string;
  amountEth?: number | string | null;
  projectName?: string | null;
}

export async function fanOutMarketPings(db: DB, args: MarketFanoutArgs): Promise<void> {
  try {
    // Wishlist first (a fresh mint can't be on anyone's wishlist — skip).
    const wishlisted =
      args.event === 'minted'
        ? []
        : await pingWishlisters(db, {
            slug: args.slug,
            tokenId: args.tokenId,
            event: args.event,
            actorAddress: args.actorAddress,
            projectName: args.projectName ?? null,
            amountEth: args.amountEth ?? null,
          });

    await pingInterested(db, {
      slug: args.slug,
      tokenId: args.tokenId,
      event: args.event,
      actorAddress: args.actorAddress,
      amountEth: args.amountEth ?? null,
      projectName: args.projectName ?? null,
      exclude: new Set(wishlisted),
    });
  } catch (err) {
    console.error('[pings] fanOutMarketPings error:', err instanceof Error ? err.message : err);
  }
}
