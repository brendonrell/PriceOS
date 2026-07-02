// lib/pings/wishlist.ts — server-only. Wishlist-hit fan-out.
//
// When a token on people's WISHLISTS gets listed or sold, ping those wishlisters
// ("a piece you want got listed / sold"). Wishlists live per-user in
// users.settings.wishlist as `${slug}:${id}` keys, so "who is wishlisting this
// token" is a single jsonb-containment query (GIN-indexed).
//
// Performance: this runs on the LISTER/BUYER's request path, so it must NOT be
// an N+1. We resolve everything ONCE (wishlisters, muted set, project + actor
// @names) and BULK-INSERT the ping rows in chunks — a handful of queries total,
// regardless of how many wishlisters a token has. Best-effort; never throws.

import { getSupabaseService } from '@/lib/supabase';

type DB = ReturnType<typeof getSupabaseService>;

// Defensive ceiling — no single token fans out beyond this.
const MAX_WISHLISTERS = 5000;
const INSERT_CHUNK = 500;

export interface WishlistHitArgs {
  slug: string;
  tokenId: string;
  /** 'listed' = now buyable; 'sold' = gone. */
  event: 'listed' | 'sold';
  actorAddress: string;       // the lister / buyer (excluded; muters excluded)
  projectName?: string | null;
  amountEth?: number | string | null;
}

export async function pingWishlisters(db: DB, args: WishlistHitArgs): Promise<number> {
  try {
    const key = `${args.slug}:${args.tokenId}`;
    const actor = args.actorAddress.toLowerCase();

    // 1. Who is wishlisting this exact token (jsonb @> via GIN index).
    const { data, error } = await db
      .from('users')
      .select('address')
      .contains('settings', { wishlist: [key] })
      .limit(MAX_WISHLISTERS);
    if (error || !data) return 0;

    let recipients = (data as Array<{ address: string }>)
      .map((r) => r.address.toLowerCase())
      .filter((a) => a !== actor); // never self-ping
    if (recipients.length === 0) return 0;

    // 2. Drop anyone who muted the actor (one query for the whole set).
    const { data: mutedRows } = await db
      .from('muted')
      .select('user_address')
      .eq('muted_address', actor)
      .in('user_address', recipients);
    const muted = new Set(
      ((mutedRows ?? []) as Array<{ user_address: string }>).map((r) => r.user_address.toLowerCase())
    );
    recipients = recipients.filter((a) => !muted.has(a));
    if (recipients.length === 0) return 0;

    // 3. Resolve project + actor @names ONCE (snapshotted onto every row).
    let projectName = args.projectName ?? null;
    if (!projectName) {
      const { data: pr } = await db.from('projects').select('handle').eq('id', args.slug).maybeSingle();
      projectName = (pr as { handle: string | null } | null)?.handle ?? null;
    }
    const { data: au } = await db.from('users').select('handle').eq('address', actor).maybeSingle();
    const actorName = (au as { handle: string | null } | null)?.handle ?? null;

    const amount = args.amountEth == null ? null : Number(args.amountEth);
    const rows = recipients.map((recipient) => ({
      recipient_address: recipient,
      kind: 'WISHLIST_HIT',
      actor_address: actor,
      actor_name: actorName,
      project_id: args.slug,
      token_id: args.tokenId,
      amount_eth: amount,
      data: { event: args.event, count: 1, ...(projectName ? { project_handle: projectName } : {}) },
      group_key: `WISHLIST_HIT:${args.slug}:${args.tokenId}:${args.event}`,
    }));

    // 4. Bulk write in chunks — O(1) queries, not O(recipients). Goes through
    // the app_ping_wishlist_fanout RPC (per-row ON CONFLICT) because a plain
    // multi-row INSERT is atomic: one recipient still holding an unread row
    // for this group_key (relist / re-sale) used to kill the whole chunk —
    // everyone else's ping silently dropped. The RPC bumps that recipient's
    // open row (count+1, resurfaced) and inserts fresh rows for the rest.
    let written = 0;
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { data: n, error: e } = await db.rpc('app_ping_wishlist_fanout', {
        p_rows: rows.slice(i, i + INSERT_CHUNK),
      } as never);
      if (e) console.error('[pings] wishlist fan-out chunk failed:', e.message);
      else written += (n as number | null) ?? 0;
    }
    return written;
  } catch (err) {
    console.error('[pings] pingWishlisters error:', err instanceof Error ? err.message : err);
    return 0;
  }
}
