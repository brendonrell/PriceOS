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
import {
  PING_EPHEMERAL_DAYS,
  PING_FINANCIAL_DAYS,
  STORED_EPHEMERAL_KINDS,
  STORED_FINANCIAL_KINDS,
} from '@/lib/pings/tiers';

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

export interface CreatePingInput {
  recipientAddress: string;
  kind: PingKind;
  actorAddress?: string | null;
  /** @handle snapshot. If omitted (and actorAddress is set) it's resolved. */
  actorName?: string | null;
  projectId?: string | null;
  /** Project @name snapshot. If omitted (and projectId is set) it's resolved,
   *  so every project-scoped ping renders socially (@oracle, not a raw id). */
  projectName?: string | null;
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

/** Resolve a project id → projects.handle (its @name), or null. */
async function resolveProjectHandle(db: DB, projectId: string): Promise<string | null> {
  const { data } = await db
    .from('projects')
    .select('handle')
    .eq('id', projectId)
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

    // Snapshot the project @name so every project-scoped ping reads socially.
    let projectName = input.projectName ?? null;
    if (input.projectId && !projectName) {
      projectName = await resolveProjectHandle(db, input.projectId);
    }
    const baseData: Record<string, unknown> = {
      ...(input.data ?? {}),
      ...(projectName ? { project_handle: projectName } : {}),
    };

    const amount =
      input.amountEth === undefined || input.amountEth === null
        ? null
        : Number(input.amountEth);

    // Bump an existing OPEN (unread) rollup row in-window, returning its id, or
    // null if there's none. A partial unique index on (recipient_address,
    // group_key) WHERE read=false guarantees at most one such row, so this can't
    // race into duplicates — a concurrent insert that beats us trips the unique
    // violation below and routes us back here to bump the row it created.
    const tryBump = async (): Promise<string | null> => {
      if (!input.groupKey) return null;
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
      if (!row) return null;
      const prevData = (row.data ?? {}) as Record<string, unknown>;
      const prevCount = typeof prevData.count === 'number' ? prevData.count : 1;
      const prevActors = Array.isArray(prevData.actors) ? (prevData.actors as string[]) : [];
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
          data: { ...prevData, ...baseData, count: prevCount + 1, actors },
        } as never)
        .eq('id', row.id);
      return row.id;
    };

    // 4. Rollup — bump first if an open row already exists.
    if (input.groupKey) {
      const bumped = await tryBump();
      if (bumped) {
        void maybePrune(db, recipient);
        return bumped;
      }
    }

    // 5. Fresh insert (guarded by the partial unique index).
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
        data: input.groupKey ? { ...baseData, count: 1 } : baseData,
        group_key: input.groupKey ?? null,
        read: false,
      } as never)
      .select('id')
      .single();

    if (error) {
      // A racing insert won the unique race for this group → bump its row.
      if (input.groupKey && (error as { code?: string }).code === '23505') {
        const bumped = await tryBump();
        if (bumped) {
          void maybePrune(db, recipient);
          return bumped;
        }
      }
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

/** Occasionally delete this recipient's READ pings past their retention window —
 *  ephemeral social pings after 30d, financial-signal pings after a year (the
 *  inbox is a financial ledger, not disposable alerts). Unread is never pruned.
 *  Scheduler-free so it survives a paused free-tier project; the pg_cron job is
 *  the redundant nightly sweep. */
async function maybePrune(db: DB, recipient: string): Promise<void> {
  if (Math.random() > PRUNE_PROBABILITY) return;
  try {
    const ephCutoff = new Date(Date.now() - PING_EPHEMERAL_DAYS * 86400_000).toISOString();
    const finCutoff = new Date(Date.now() - PING_FINANCIAL_DAYS * 86400_000).toISOString();
    await Promise.all([
      db.from('pings').delete()
        .eq('recipient_address', recipient).eq('read', true)
        .in('kind', STORED_EPHEMERAL_KINDS).lt('created_at', ephCutoff),
      db.from('pings').delete()
        .eq('recipient_address', recipient).eq('read', true)
        .in('kind', STORED_FINANCIAL_KINDS).lt('created_at', finCutoff),
    ]);
  } catch {
    /* best-effort */
  }
}
