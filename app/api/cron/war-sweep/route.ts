// app/api/cron/war-sweep/route.ts — THE WAR's single writer.
//
// FACTIONS spec v3.1: ONE new write path — the marks chain — fed by the
// ownership changes the events ledger already records; the war tables are
// the derivation's memory. Rides the 1-min Cron Trigger, probe-and-exit:
//
//   Phase A (every run, one indexed probe when idle): append marks for new
//   MINT / SALE / XFER events. One mark per wallet per token, EVER (wash
//   trading writes nothing after the first pass). Sales strike deep (SOLD),
//   private passes land faint (PASSED). A margin past 12 hands strikes the
//   oldest to the crypt — "struck from the stone" — and the Book remembers.
//
//   Phase B (at most every 5 min, or whenever Phase A wrote): derive grip
//   per collection per faction (time-under-flag × PriceRank standing, whale
//   damped), run the siege/conquest state machine, write the Book, ping the
//   combatants. Money never buys the war: stickers and balances appear
//   NOWHERE in this file.
//
// Constitution (lib/factions/factions.ts): defection cooldown 30d · siege
// window 72h · whale damping soft-caps past 5 pieces · standing = PriceRank
// tier (already the anti-sybil filter — fresh wallets weigh nothing).

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';
import {
  DEFECTION_COOLDOWN_DAYS,
  SIEGE_WINDOW_HOURS,
  SIEGE_THRESHOLD,
  STRONGHOLD_SHARE,
  STRONGHOLD_DAYS,
  WHALE_FULL_WEIGHT_PIECES,
  MARGIN_SLOTS,
} from '@/lib/factions/factions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type DB = ReturnType<typeof getSupabaseService>;

const DERIVE_EVERY_MS = 5 * 60 * 1000;
const MAX_PINGS_PER_EVENT = 50;

interface MetaRow { key: string; value: Record<string, unknown> }

async function getMeta(db: DB, key: string): Promise<Record<string, unknown> | null> {
  const { data } = await db.from('war_meta').select('key, value').eq('key', key).maybeSingle();
  return (data as MetaRow | null)?.value ?? null;
}
async function setMeta(db: DB, key: string, value: Record<string, unknown>): Promise<void> {
  await db.from('war_meta').upsert({ key, value } as never, { onConflict: 'key' });
}

async function bookWrite(
  db: DB,
  age: number,
  kind: string,
  line: string,
  extra: { project_id?: string | null; token_id?: string | null; faction?: string | null; rival?: string | null } = {},
): Promise<void> {
  await db.from('book_of_conquests').insert({ age, kind, line, ...extra } as never);
}

/* ── Phase A — the marks recorder ────────────────────────────────────────── */

interface Ev {
  id: string; type: string; project_id: string; token_id: string | null;
  from_address: string | null; to_address: string | null;
  price_eth: string | number | null; timestamp: number;
}

async function recordMarks(db: DB, age: number): Promise<number> {
  const wm = (await getMeta(db, 'marks_watermark')) as { ts?: number } | null;
  const since = wm?.ts ?? 0;

  const { data, error } = await db
    .from('events')
    .select('id, type, project_id, token_id, from_address, to_address, price_eth, timestamp')
    .gt('timestamp', since)
    .in('type', ['MINT', 'SALE', 'XFER'])
    .order('timestamp', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  const evs = (data ?? []) as Ev[];
  if (evs.length === 0) return 0;

  let wrote = 0;
  for (const ev of evs) {
    if (!ev.token_id || !ev.to_address) continue;
    const owner = ev.to_address.toLowerCase();
    const kind = ev.type === 'MINT' ? 'MINT' : Number(ev.price_eth ?? 0) > 0 ? 'SOLD' : 'PASSED';

    // One mark per wallet per token, ever (struck rows keep counting).
    const { data: chain } = await db
      .from('marks')
      .select('seq, owner_address, struck, ts')
      .eq('project_id', ev.project_id)
      .eq('token_id', ev.token_id)
      .order('seq', { ascending: true });
    const rows = (chain ?? []) as { seq: number; owner_address: string; struck: boolean; ts: number }[];
    if (rows.some((r) => r.owner_address === owner)) continue;

    const seq = rows.length > 0 ? rows[rows.length - 1].seq + 1 : 1;
    const { error: insErr } = await db.from('marks').insert({
      project_id: ev.project_id, token_id: ev.token_id, seq,
      owner_address: owner, kind, ts: ev.timestamp,
    } as never);
    if (insErr) continue; // race-safe: unique constraints make re-runs no-ops
    wrote += 1;

    const unstruck = rows.filter((r) => !r.struck);
    if (unstruck.length + 1 === MARGIN_SLOTS) {
      // The margin just filled — a Relic is sealed.
      await bookWrite(db, age, 'RELIC_SEALED',
        `The margin of ${ev.project_id} ${shortToken(ev.token_id)} is full — twelve hands, a RELIC.`,
        { project_id: ev.project_id, token_id: ev.token_id });
    } else if (unstruck.length + 1 > MARGIN_SLOTS) {
      // Overflow: the oldest hand is struck from the stone. Permanent crypt.
      const oldest = unstruck[0];
      await db.from('marks').update({ struck: true } as never)
        .eq('project_id', ev.project_id).eq('token_id', ev.token_id).eq('seq', oldest.seq);
      await db.from('marks_crypt').upsert({
        project_id: ev.project_id, token_id: ev.token_id,
        owner_address: oldest.owner_address, original_seq: oldest.seq, struck_by: owner,
      } as never, { onConflict: 'project_id,token_id,owner_address', ignoreDuplicates: true });
      await bookWrite(db, age, 'STONE_STRUCK',
        `A hand was struck from the stone of ${ev.project_id} ${shortToken(ev.token_id)}.`,
        { project_id: ev.project_id, token_id: ev.token_id });
      // The gut-punch ping that brings players back.
      void createPing({
        recipientAddress: oldest.owner_address,
        kind: 'PING',
        projectId: ev.project_id,
        tokenId: ev.token_id,
        data: { war: 'STONE_STRUCK', message: `Stone: STRUCK — your mark on ${shortToken(ev.token_id)} was struck from the stone` },
      });
    }
  }
  await setMeta(db, 'marks_watermark', { ts: evs[evs.length - 1].timestamp });
  return wrote;
}

function shortToken(tokenId: string): string {
  const i = tokenId.lastIndexOf('-');
  return `#${i >= 0 ? tokenId.slice(i + 1) : tokenId}`;
}

/* ── Phase B — grip, sieges, conquests, the Book ─────────────────────────── */

interface OathRow { address: string; faction: string; sworn_at: string; defected_at: string | null }
interface HolderRow { project_id: string; token_id: string; owner_address: string; acquired_at: string | null }
interface WarStateRow {
  project_id: string; status: string; leader_faction: string | null; leader_since: string | null;
  siege_faction: string | null; siege_since: string | null;
  conquered_by: string | null; conquered_at: string | null;
}

export interface FactionGrip { grip: number; members: number; pieces: number }

async function deriveWar(db: DB, age: number): Promise<void> {
  const now = Date.now();

  const [oathRes, holdRes, userRes, wsRes] = await Promise.all([
    db.from('faction_oaths').select('address, faction, sworn_at, defected_at'),
    db.from('holders').select('project_id, token_id, owner_address, acquired_at'),
    db.from('users').select('address, price_rank'),
    db.from('war_state').select('project_id, status, leader_faction, leader_since, siege_faction, siege_since, conquered_by, conquered_at'),
  ]);
  const oaths = new Map(((oathRes.data ?? []) as OathRow[]).map((o) => [o.address.toLowerCase(), o]));
  const holders = (holdRes.data ?? []) as HolderRow[];
  const rank = new Map(((userRes.data ?? []) as { address: string; price_rank: number }[])
    .map((u) => [u.address.toLowerCase(), u.price_rank ?? 0]));
  const prevStates = new Map(((wsRes.data ?? []) as WarStateRow[]).map((w) => [w.project_id, w]));

  // wallet → its held pieces per collection, with hours-under-flag each.
  interface Contribution { faction: string; hours: number[]; addr: string }
  const perCollection = new Map<string, Map<string, Contribution>>(); // project → wallet → contribution

  for (const h of holders) {
    const addr = h.owner_address.toLowerCase();
    const oath = oaths.get(addr);
    if (!oath) continue;
    const standing = rank.get(addr) ?? 0;
    if (standing <= 0) continue; // fresh wallets weigh nothing
    // Defection cooldown: the new flag doesn't count yet.
    if (oath.defected_at && now - Date.parse(oath.defected_at) < DEFECTION_COOLDOWN_DAYS * 86400_000) continue;
    const start = Math.max(
      Date.parse(oath.sworn_at) || now,
      h.acquired_at ? Date.parse(h.acquired_at) || 0 : 0,
    );
    const hours = Math.max(0, (now - start) / 3600_000);
    if (hours <= 0) continue;
    let coll = perCollection.get(h.project_id);
    if (!coll) { coll = new Map(); perCollection.set(h.project_id, coll); }
    const c = coll.get(addr);
    if (c) c.hours.push(hours);
    else coll.set(addr, { faction: oath.faction, hours: [hours], addr });
  }

  for (const [projectId, wallets] of perCollection) {
    // Grip per faction: Σ per wallet of (damped Σ piece-hours) × standing.
    const grips = new Map<string, FactionGrip>();
    for (const c of wallets.values()) {
      const standing = rank.get(c.addr) ?? 0;
      c.hours.sort((a, b) => b - a);
      let walletHours = 0;
      c.hours.forEach((hrs, i) => {
        const damp = i < WHALE_FULL_WEIGHT_PIECES ? 1 : Math.sqrt(WHALE_FULL_WEIGHT_PIECES / (i + 1));
        walletHours += hrs * damp;
      });
      const g = grips.get(c.faction) ?? { grip: 0, members: 0, pieces: 0 };
      g.grip += walletHours * standing;
      g.members += 1;
      g.pieces += c.hours.length;
      grips.set(c.faction, g);
    }
    if (grips.size === 0) continue;

    const ranked = [...grips.entries()].sort((a, b) => b[1].grip - a[1].grip);
    const [topFaction, topGrip] = ranked[0];
    const total = ranked.reduce((s, [, g]) => s + g.grip, 0);
    const share = total > 0 ? topGrip.grip / total : 0;
    const rival = ranked.length > 1 ? ranked[1] : null;

    const prev = prevStates.get(projectId) ?? null;
    const next: WarStateRow = {
      project_id: projectId,
      status: prev?.status ?? 'OPEN',
      leader_faction: prev?.leader_faction ?? null,
      leader_since: prev?.leader_since ?? null,
      siege_faction: prev?.siege_faction ?? null,
      siege_since: prev?.siege_since ?? null,
      conquered_by: prev?.conquered_by ?? null,
      conquered_at: prev?.conquered_at ?? null,
    };
    const nowIso = new Date(now).toISOString();

    if (!next.leader_faction) {
      // First hold — the land rush. Quiet in the Book (day one is thousands
      // of these); the map shows it.
      next.leader_faction = topFaction;
      next.leader_since = nowIso;
      next.status = 'HELD';
    } else if (next.leader_faction === topFaction) {
      // Leader stands. Stronghold hardening?
      const leadMs = now - (Date.parse(next.leader_since ?? nowIso) || now);
      if (
        next.status === 'HELD' &&
        share >= STRONGHOLD_SHARE &&
        leadMs >= STRONGHOLD_DAYS * 86400_000
      ) {
        next.status = 'STRONGHOLD';
        await bookWrite(db, age, 'STRONGHOLD',
          `${topFaction} raised a STRONGHOLD over ${projectId}.`,
          { project_id: projectId, faction: topFaction });
      }
      // Siege bookkeeping against the standing leader.
      const challenger = rival && rival[1].grip >= SIEGE_THRESHOLD * topGrip.grip ? rival[0] : null;
      if (challenger && !next.siege_faction) {
        next.siege_faction = challenger;
        next.siege_since = nowIso;
        await bookWrite(db, age, 'SIEGE_RAISED',
          `${challenger} raised a SIEGE against ${topFaction} at ${projectId}.`,
          { project_id: projectId, faction: challenger, rival: topFaction });
        await pingFaction(wallets, topFaction,
          `Siege: RAISED — your corner at ${projectId} is under siege`, projectId, 'SIEGE_RAISED');
      } else if (!challenger && next.siege_faction) {
        const held = next.siege_faction;
        next.siege_faction = null;
        next.siege_since = null;
        await bookWrite(db, age, 'SIEGE_REPELLED',
          `${topFaction} repelled the siege of ${held} at ${projectId}.`,
          { project_id: projectId, faction: topFaction, rival: held });
        await pingFaction(wallets, topFaction,
          `Siege: REPELLED — ${projectId} holds the line`, projectId, 'SIEGE_REPELLED');
      }
    } else {
      // The computed leader flipped. A conquest only lands if the challenger
      // kept a siege open for the full window — every siege is visible
      // coming. Otherwise the old leader keeps the ground and the siege
      // clock runs.
      const siegeOpenMs = next.siege_faction === topFaction && next.siege_since
        ? now - (Date.parse(next.siege_since) || now)
        : -1;
      if (siegeOpenMs >= SIEGE_WINDOW_HOURS * 3600_000) {
        const fallen = next.leader_faction;
        next.conquered_by = topFaction;
        next.conquered_at = nowIso;
        next.leader_faction = topFaction;
        next.leader_since = nowIso;
        next.siege_faction = null;
        next.siege_since = null;
        next.status = 'HELD';
        await bookWrite(db, age, 'CONQUEST',
          `CONQUEST — ${topFaction} took ${projectId} from ${fallen}. The corners fell.`,
          { project_id: projectId, faction: topFaction, rival: fallen });
        await pingFaction(wallets, topFaction,
          `CONQUEST — your banner flies over ${projectId}`, projectId, 'CONQUEST');
        // First Conquest ever turns the Age (spec §9.5 — Ages are declared at
        // platform milestones; the chronicle is the leaderboard).
        const ageMeta = (await getMeta(db, 'age')) as { n?: number } | null;
        if ((ageMeta?.n ?? 1) === 1) {
          await setMeta(db, 'age', { n: 2, name: 'THE AGE OF BANNERS' });
          await bookWrite(db, 2, 'AGE_DECLARED', 'AGE II — THE AGE OF BANNERS. The first banner swept four corners.');
        }
      } else if (next.siege_faction !== topFaction) {
        // A rival now out-grips the leader with no siege on record — open one;
        // the window starts now (no sniping, ever).
        next.siege_faction = topFaction;
        next.siege_since = nowIso;
        await bookWrite(db, age, 'SIEGE_RAISED',
          `${topFaction} raised a SIEGE against ${next.leader_faction} at ${projectId}.`,
          { project_id: projectId, faction: topFaction, rival: next.leader_faction });
        await pingFaction(wallets, next.leader_faction!,
          `Siege: RAISED — your corner at ${projectId} is under siege`, projectId, 'SIEGE_RAISED');
      }
    }

    const gripsJson: Record<string, unknown> = { total, share: Number(share.toFixed(4)), factions: {} as Record<string, FactionGrip> };
    for (const [k, g] of grips) {
      (gripsJson.factions as Record<string, FactionGrip>)[k] = {
        grip: Number(g.grip.toFixed(2)), members: g.members, pieces: g.pieces,
      };
    }
    await db.from('war_state').upsert({
      project_id: projectId,
      status: next.status,
      leader_faction: next.leader_faction,
      leader_since: next.leader_since,
      siege_faction: next.siege_faction,
      siege_since: next.siege_since,
      conquered_by: next.conquered_by,
      conquered_at: next.conquered_at,
      grips: gripsJson,
      updated_at: new Date(now).toISOString(),
    } as never, { onConflict: 'project_id' });
  }
}

/** Ping every enlisted member of `faction` holding ground in this collection
 *  (capped — war pings are ambience-class, never a flood). */
async function pingFaction(
  wallets: Map<string, { faction: string; addr: string }>,
  faction: string,
  message: string,
  projectId: string,
  warKind: string,
): Promise<void> {
  let sent = 0;
  for (const c of wallets.values()) {
    if (c.faction !== faction) continue;
    if (sent >= MAX_PINGS_PER_EVENT) break;
    sent += 1;
    void createPing({
      recipientAddress: c.addr,
      kind: 'PING',
      projectId,
      data: { war: warKind, faction, message },
    });
  }
}

/* ── the route ───────────────────────────────────────────────────────────── */

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const db = getSupabaseService();

    // Age (and the founding declaration on the very first run — day one IS
    // the land rush; every faction starts at zero).
    let ageMeta = (await getMeta(db, 'age')) as { n?: number } | null;
    if (!ageMeta) {
      ageMeta = { n: 1 };
      await setMeta(db, 'age', { n: 1, name: 'THE FOUNDING' });
      await bookWrite(db, 1, 'AGE_DECLARED', 'AGE I — THE FOUNDING. Every flag at zero; the map lies open.');
    }
    const age = ageMeta.n ?? 1;

    const wrote = await recordMarks(db, age);

    const last = (await getMeta(db, 'war_last_derive')) as { at?: number } | null;
    const due = !last?.at || Date.now() - last.at >= DERIVE_EVERY_MS;
    if (wrote > 0 || due) {
      await deriveWar(db, age);
      await setMeta(db, 'war_last_derive', { at: Date.now() });
    }

    return Response.json({ ok: true, marks: wrote, derived: wrote > 0 || due });
  } catch (err) {
    console.error('[war-sweep]', err instanceof Error ? err.message : err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
