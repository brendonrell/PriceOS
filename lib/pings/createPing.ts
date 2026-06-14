// lib/pings/createPing.ts — server-only (service-role). Never import client-side.
//
// The single write path for DIRECTED pings (the inbox). One row per recipient,
// so there is no fan-out amplification here — the broadcast firehose is served
// at read time off `events` and never touches this table.
//
// Every call is BEST-EFFORT: a ping must never throw out of, or slow down, the
// user action that triggered it. All failures are swallowed (logged) and the
// function returns null. Producers call it fire-and-forget after their own
// write has succeeded.

import { getSupabaseService } from '@/lib/supabase';
import type { PingKind } from '@/lib/supabase';

type DB = ReturnType<typeof getSupabaseService>;

/** Kinds where the actor IS the recipient by design (you unlocking your own
 *  achievement). The self-suppression guard exempts these. */
const SELF_KINDS = new Set<PingKind>(['ACHIEVEMENT', 'STREAK']);

/** Default window for collapsing same-group_key pings into one rollup row. */
const DEFAULT_COLLAPSE_MS = 6 * 60 * 60 * 1000; // 6h
/** How many recent actor names to keep on a rollup row ("alex, mona +12"). */
const MAX_ROLLUP_ACTORS = 3;
/** Opportunistic prune fires on ~this fraction of writes (belt to pg_cron). */
const PRUNE_PROBABILITY = 0.02;
const PRUNE_AFTER_DAYS = 30;

export interface CreatePingInput {
  recipientAddress: string;
  kind: PingKind;
  actorAddress?: string | null;
  /** @handle snapshot. If omitted (and actorAddress is set) it's resolved. */
  actorName?: string | null;
  projectId?: string | null;
  tokenId?: string | null;
  amountEth?: number | string | null;
  data?: Record<string, unknown>;
  /** Rollup key — same key + still-unread inside the window bumps instead of
   *  inserting. Omit for one-off kinds (FOLLOW / PING / ACHIEVEMENT). */
  groupKey?: string | null;
  collapseWindowMs?: number;
}

/** Resolve a wallet → users.handle (null pre-claim). Mirrors the resolveHandle
 *  used in the follows routes. */
async function resolveHandle(db: DB, address: string): Promise<string | null> {
  const { data } = await db
    .from('users')
    .select('handle')
    .eq('address', address)
    .maybeSingle();
  return (data as { handle: string | null } | null)?.handle ?? null;
}

/** True when `recipient` has muted `actor`. */
async function isMuted(db: DB, recipient: string, actor: string): Promise<boolean> {
  const { data } = await db
    .from('muted')
    .select('muted_address')
    .eq('user_address', recipient)
    .eq('muted_address', actor)
    .maybeSingle();
  return !!data;
}

/**
 * Write ONE directed ping. Returns the row id, or null if suppressed (self-ping,
 * muted actor) or on any error. Collapses into a recent unread row sharing the
 * same group_key instead of inserting a duplicate.
 */
export async function createPing(input: CreatePingInput): Promise<string | null> {
  try {
    const db = getSupabaseService();
    const recipient = input.recipientAddress.toLowerCase();
    const actor = input.actorAddress ? input.actorAddress.toLowerCase() : null;

    // 1. Self-suppression — you don't ping yourself (except self-kinds).
    if (actor && actor === recipient && !SELF_KINDS.has(input.kind)) return null;

    // 2. Muted-suppression — recipient muted the actor.
    if (actor && (await isMuted(db, recipient, actor))) return null;

    // 3. Resolve the actor's @handle snapshot if not supplied.
    let actorName = input.actorName ?? null;
    if (actorName === undefined || actorName === null) {
      actorName = actor ? await resolveHandle(db, actor) : null;
    }

    const amount =
      input.amountEth === undefined || input.amountEth === null
        ? null
        : Number(input.amountEth);

    // 4. Rollup — bump an existing recent unread row with the same group_key.
    if (input.groupKey) {
      const windowMs = input.collapseWindowMs ?? DEFAULT_COLLAPSE_MS;
      const since = new Date(Date.now() - windowMs).toISOString();
      const { data: existing } = await db
        .from('pings')
        .select('id, data')
        .eq('recipient_address', recipient)
        .eq('group_key', input.groupKey)
        .eq('read', false)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const row = existing as { id: string; data: Record<string, unknown> } | null;
      if (row) {
        const prevData = (row.data ?? {}) as Record<string, unknown>;
        const prevCount = typeof prevData.count === 'number' ? prevData.count : 1;
        const prevActors = Array.isArray(prevData.actors)
          ? (prevData.actors as string[])
          : [];
        const actors = actorName
          ? [actorName, ...prevActors.filter((a) => a !== actorName)].slice(0, MAX_ROLLUP_ACTORS)
          : prevActors;
        const nowIso = new Date().toISOString();
        await db
          .from('pings')
          .update({
            // Resurface to the top + refresh the actor snapshot.
            created_at: nowIso,
            updated_at: nowIso,
            actor_address: actor,
            actor_name: actorName,
            amount_eth: amount as never,
            data: { ...prevData, ...(input.data ?? {}), count: prevCount + 1, actors },
          } as never)
          .eq('id', row.id);
        void maybePrune(db, recipient);
        return row.id;
      }
    }

    // 5. Fresh insert.
    const { data: inserted, error } = await db
      .from('pings')
      .insert({
        recipient_address: recipient,
        kind: input.kind,
        actor_address: actor,
        actor_name: actorName,
        project_id: input.projectId ?? null,
        token_id: input.tokenId ?? null,
        amount_eth: amount as never,
        data: input.groupKey ? { ...(input.data ?? {}), count: 1 } : (input.data ?? {}),
        group_key: input.groupKey ?? null,
        read: false,
      } as never)
      .select('id')
      .single();

    if (error) {
      console.error('[pings] createPing insert failed:', error.message);
      return null;
    }
    void maybePrune(db, recipient);
    return (inserted as { id: string }).id;
  } catch (err) {
    console.error('[pings] createPing error:', err instanceof Error ? err.message : err);
    return null;
  }
}

/** Occasionally delete this recipient's read pings older than the retention
 *  window. Scheduler-free retention that survives a paused free-tier project;
 *  the pg_cron job in the migration is the redundant nightly sweep. */
async function maybePrune(db: DB, recipient: string): Promise<void> {
  if (Math.random() > PRUNE_PROBABILITY) return;
  try {
    const cutoff = new Date(Date.now() - PRUNE_AFTER_DAYS * 86400_000).toISOString();
    await db
      .from('pings')
      .delete()
      .eq('recipient_address', recipient)
      .eq('read', true)
      .lt('created_at', cutoff);
  } catch {
    /* best-effort */
  }
}
