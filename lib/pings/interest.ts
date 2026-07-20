// lib/pings/interest.ts — server-only. Starred-interest + mutuals fan-out.
//
// One market event → directed WATCH_HIT pings to every user whose declared
// taste it touches, exactly the wishlist fan-out contract (bulk, O(1)-ish
// queries, best-effort, never throws):
//
//   • MUTUAL  — the actor is one of your mutuals (you follow each other).
//   • ARTIST  — the actor is an artist you starred.
//   • PROJECT — the event is on a project you starred.
//   • TRAIT   — the piece carries a trait you starred.
//
// Stars live in users.settings (artistStars / projectStars / traitStars — the
// same envelope + GIN index the wishlist probe rides). Each recipient gets ONE
// ping per event: the strongest reason wins (mutual > artist > project >
// trait), so starring an artist AND their project never double-pings.
// Recipients already pinged by the wishlist fan-out are excluded by the
// orchestrator (lib/pings/fanout.ts).
//
// Rows are written through the same app_ping_wishlist_fanout RPC (it is
// kind-agnostic): per-row ON CONFLICT bumps a recipient's open rollup row
// instead of dropping the whole chunk.

import { getSupabaseService } from '@/lib/supabase';
import { outputTraits } from '@/lib/project/registry';
import { pdRarityRank } from '@/lib/output/rarity';
import { sendNativePing } from '@/lib/push/webpush';
import type { FeedItem } from '@/lib/pings/render';

type DB = ReturnType<typeof getSupabaseService>;

// Defensive ceilings — mirror the wishlist fan-out.
const MAX_RECIPIENTS = 5000;
const INSERT_CHUNK = 500;
/** Native pushes fanned per event (budget-gated per recipient besides). */
const MAX_PUSHES = 200;
/** Trait keys probed per event (a token carries ~a dozen traits). */
const MAX_TRAIT_KEYS = 16;

export type InterestEvent = 'minted' | 'listed' | 'sold';
export type InterestReason = 'nemesis' | 'mutual' | 'artist' | 'rarity' | 'project' | 'trait';

/** Reason precedence — strongest first. One ping per recipient per event.
 *  NEMESIS outranks everything: the declared rival moving is the whole point
 *  of the declaration (ClickUp 86b9jfjmu — "Nemesis Pings fire when the
 *  rival buys, lists a grail, or makes a major move"). */
const REASON_RANK: Record<InterestReason, number> = {
  nemesis: 0,
  mutual: 1,
  artist: 2,
  rarity: 3,
  project: 4,
  trait: 5,
};

/** RARITY pings — market action on a piece ranked inside this PD-Rarity top
 *  band fans to the project's HOLDERS ("a top piece in a project you hold
 *  moved" — the comp your bag cares about). Small editions skip it: below the
 *  floor the whole set is "top 10" and the signal is churn, not rarity. */
const RARITY_TOP_RANK = 10;
const RARITY_MIN_EDITION = 30;

export interface InterestArgs {
  slug: string;
  tokenId: string;
  event: InterestEvent;
  actorAddress: string;
  amountEth?: number | string | null;
  projectName?: string | null;
  /** Addresses already pinged for this event (wishlist hits) — skipped here. */
  exclude?: ReadonlySet<string>;
}

interface AddressRow {
  address: string;
}

/** users whose settings envelope CONTAINS the given jsonb fragment. */
async function usersContaining(
  db: DB,
  fragment: Record<string, unknown>,
  limit: number,
): Promise<string[]> {
  const { data, error } = await db
    .from('users')
    .select('address')
    .contains('settings', fragment)
    .limit(limit);
  if (error || !data) return [];
  return (data as AddressRow[]).map((r) => r.address.toLowerCase());
}

/** The actor's mutuals (follow each other), as lowercase addresses. */
async function mutualAddressesOf(db: DB, actorHandle: string): Promise<string[]> {
  const [{ data: outRows }, { data: inRows }] = await Promise.all([
    db.from('follows').select('following_name').eq('follower_name', actorHandle),
    db.from('follows').select('follower_name').eq('following_name', actorHandle),
  ]);
  const iFollow = new Set(
    ((outRows ?? []) as Array<{ following_name: string | null }>)
      .map((r) => r.following_name)
      .filter((n): n is string => !!n),
  );
  const mutualNames = ((inRows ?? []) as Array<{ follower_name: string | null }>)
    .map((r) => r.follower_name)
    .filter((n): n is string => !!n && iFollow.has(n));
  if (mutualNames.length === 0) return [];
  const { data: uRows } = await db.from('users').select('address').in('handle', mutualNames);
  return ((uRows ?? []) as AddressRow[]).map((r) => r.address.toLowerCase());
}

/**
 * Fan one market event out to mutuals + starred-interest watchers. Returns the
 * addresses pinged (for downstream dedup). Best-effort; never throws.
 */
export async function pingInterested(db: DB, args: InterestArgs): Promise<string[]> {
  try {
    const actor = args.actorAddress.toLowerCase();

    // Actor handle — needed for both the mutuals graph and artistStars probe.
    const { data: aRow } = await db
      .from('users')
      .select('handle')
      .eq('address', actor)
      .maybeSingle();
    const actorName = (aRow as { handle: string | null } | null)?.handle ?? null;

    // The token's minted_at (feeds the mint-moment traits so starred natal /
    // PriceDay traits match too, exactly as the attribute sheet shows them).
    const { data: oRow } = await db
      .from('outputs')
      .select('minted_at')
      .eq('project_id', args.slug)
      .eq('token_id', args.tokenId)
      .maybeSingle();
    const mintedAt = (oRow as { minted_at: string | null } | null)?.minted_at ?? null;
    const mintMs = mintedAt ? Date.parse(mintedAt) : NaN;

    // Trait keys this piece carries, in the starred-trait key format.
    const traits = outputTraits(
      args.slug,
      Number(args.tokenId),
      Number.isFinite(mintMs) ? mintMs : undefined,
    );
    // Starred-trait key format — `${slug}|${category}|${value}`, the exact
    // shape traitStarStore persists (client store; format inlined here so the
    // server never imports a 'use client' module with storage side effects).
    const traitKeys = Object.entries(traits)
      .filter(([, v]) => typeof v === 'string' && v)
      .slice(0, MAX_TRAIT_KEYS)
      .map(([cat, v]) => `${args.slug}|${cat}|${v as string}`);

    // RARITY audience — the piece's PD-Rarity standing is deterministic, so
    // one memoised lookup decides whether this event is a top-band move.
    let rarityRank: { rank: number; total: number } | null = null;
    try {
      const r = pdRarityRank(args.slug, Number(args.tokenId));
      if (r && r.total >= RARITY_MIN_EDITION && r.rank <= RARITY_TOP_RANK) rarityRank = r;
    } catch {
      /* engine without rarity data — no rarity audience */
    }

    // ── Gather each audience in parallel ──
    const [rivals, mutuals, artistWatchers, projectWatchers, rarityHolders, ...traitBatches] =
      await Promise.all([
        // NEMESIS — everyone who declared THIS actor their rival.
        db
          .from('users')
          .select('address')
          .eq('nemesis_address', actor)
          .limit(MAX_RECIPIENTS)
          .then(({ data }) =>
            ((data ?? []) as AddressRow[]).map((r) => r.address.toLowerCase()),
          ),
        actorName ? mutualAddressesOf(db, actorName) : Promise.resolve([]),
        actorName
          ? usersContaining(db, { artistStars: [actorName] }, MAX_RECIPIENTS)
          : Promise.resolve([]),
        usersContaining(db, { projectStars: [args.slug] }, MAX_RECIPIENTS),
        rarityRank
          ? db
              .from('holders')
              .select('owner_address')
              .eq('project_id', args.slug)
              .limit(MAX_RECIPIENTS)
              .then(({ data }) =>
                Array.from(
                  new Set(
                    ((data ?? []) as Array<{ owner_address: string | null }>)
                      .map((r) => r.owner_address?.toLowerCase())
                      .filter((a): a is string => !!a),
                  ),
                ),
              )
          : Promise.resolve([] as string[]),
        ...traitKeys.map((k) => usersContaining(db, { traitStars: [k] }, MAX_RECIPIENTS)),
      ]);

    // ── Merge: strongest reason wins, one ping per recipient ──
    const reasonFor = new Map<string, InterestReason>();
    const claim = (addrs: string[], reason: InterestReason) => {
      for (const a of addrs) {
        if (a === actor) continue;
        if (args.exclude?.has(a)) continue;
        const prev = reasonFor.get(a);
        if (!prev || REASON_RANK[reason] < REASON_RANK[prev]) reasonFor.set(a, reason);
      }
    };
    claim(rivals, 'nemesis');
    claim(mutuals, 'mutual');
    claim(artistWatchers, 'artist');
    claim(rarityHolders, 'rarity');
    claim(projectWatchers, 'project');
    for (const batch of traitBatches) claim(batch, 'trait');
    if (reasonFor.size === 0) return [];

    let recipients = Array.from(reasonFor.keys()).slice(0, MAX_RECIPIENTS);

    // Drop anyone who muted the actor (one query for the whole set).
    const { data: mutedRows } = await db
      .from('muted')
      .select('user_address')
      .eq('muted_address', actor)
      .in('user_address', recipients);
    const muted = new Set(
      ((mutedRows ?? []) as Array<{ user_address: string }>).map((r) =>
        r.user_address.toLowerCase(),
      ),
    );
    recipients = recipients.filter((a) => !muted.has(a));
    if (recipients.length === 0) return [];

    // Project @name snapshot (social rendering, one lookup).
    let projectName = args.projectName ?? null;
    if (!projectName) {
      const { data: pr } = await db
        .from('projects')
        .select('handle')
        .eq('id', args.slug)
        .maybeSingle();
      projectName = (pr as { handle: string | null } | null)?.handle ?? null;
    }

    const amount = args.amountEth == null ? null : Number(args.amountEth);
    const rows = recipients.map((recipient) => {
      const reason = reasonFor.get(recipient) as InterestReason;
      return {
        recipient_address: recipient,
        kind: 'WATCH_HIT',
        actor_address: actor,
        actor_name: actorName,
        project_id: args.slug,
        token_id: args.tokenId,
        amount_eth: amount,
        data: {
          watch: reason,
          event: args.event,
          count: 1,
          ...(projectName ? { project_handle: projectName } : {}),
          ...(reason === 'rarity' && rarityRank
            ? { rank: rarityRank.rank, rank_total: rarityRank.total }
            : {}),
        },
        // Rollup per (piece, reason): a list→delist→relist churn bumps one open
        // row instead of stacking three.
        group_key: `WATCH:${reason}:${args.slug}:${args.tokenId}`,
      };
    });

    let written = 0;
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { data: n, error: e } = await db.rpc('app_ping_wishlist_fanout', {
        p_rows: rows.slice(i, i + INSERT_CHUNK),
      } as never);
      if (e) console.error('[pings] interest fan-out chunk failed:', e.message);
      else written += (n as number | null) ?? 0;
    }

    // Native (3D) delivery — budget-gated per recipient inside sendNativePing.
    // Capped so a huge audience can't stall the actor's request; the inbox row
    // is the guaranteed deliverable, the push is best-effort icing.
    const nowIso = new Date().toISOString();
    await Promise.all(
      rows.slice(0, MAX_PUSHES).map((r) =>
        sendNativePing(r.recipient_address, {
          id: `interest:${args.event}:${args.slug}:${args.tokenId}`,
          kind: 'WATCH_HIT',
          source: 'directed',
          actor_name: r.actor_name,
          project_id: r.project_id,
          token_id: r.token_id,
          amount_eth: amount == null ? null : String(amount),
          data: r.data as FeedItem['data'],
          read: false,
          created_at: nowIso,
        }),
      ),
    );

    void written;
    return recipients;
  } catch (err) {
    console.error('[pings] pingInterested error:', err instanceof Error ? err.message : err);
    return [];
  }
}
