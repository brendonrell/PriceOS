// lib/pings/wishlist.ts — server-only. Wishlist-hit fan-out.
//
// When a token that sits on people's WISHLISTS gets listed or sold, ping those
// wishlisters ("a piece you want just got listed / sold"). Wishlists are stored
// per-user in users.settings.wishlist as `${slug}:${id}` keys, so the reverse
// lookup "who is wishlisting this token" is a single jsonb-containment query
// (backed by the GIN index in 20260614_pings_wishlist.sql).
//
// This is a DIRECTED, BOUNDED fan-out: one row per wishlister of THAT token (a
// small set — a token isn't a whale), so it stays cheap. Best-effort.

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';

type DB = ReturnType<typeof getSupabaseService>;

// Defensive ceiling — no single token should fan out beyond this.
const MAX_WISHLISTERS = 5000;

export interface WishlistHitArgs {
  slug: string;
  tokenId: string;
  /** 'listed' = now buyable; 'sold' = gone. */
  event: 'listed' | 'sold';
  actorAddress: string;       // the lister / buyer (self-suppressed)
  projectName?: string | null;
  amountEth?: number | string | null;
}

export async function pingWishlisters(db: DB, args: WishlistHitArgs): Promise<number> {
  try {
    const key = `${args.slug}:${args.tokenId}`;
    const { data, error } = await db
      .from('users')
      .select('address')
      .contains('settings', { wishlist: [key] })
      .limit(MAX_WISHLISTERS);
    if (error || !data) return 0;

    const recipients = (data as Array<{ address: string }>).map((r) => r.address);
    let written = 0;
    for (const recipient of recipients) {
      const id = await createPing({
        recipientAddress: recipient,
        kind: 'WISHLIST_HIT',
        actorAddress: args.actorAddress,
        projectId: args.slug,
        projectName: args.projectName ?? null,
        tokenId: args.tokenId,
        amountEth: args.amountEth ?? null,
        data: { event: args.event },
        // Separate group per token + event so listed vs sold never merge.
        groupKey: `WISHLIST_HIT:${args.slug}:${args.tokenId}:${args.event}`,
      });
      if (id) written += 1;
    }
    return written;
  } catch (err) {
    console.error('[pings] pingWishlisters error:', err instanceof Error ? err.message : err);
    return 0;
  }
}
