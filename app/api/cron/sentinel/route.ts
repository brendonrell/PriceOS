/*
 * THE SENTINEL, server-side (Brendon, 2026-07-13: "make sure sentinel works
 * and maybe it needs to be part of workflow"). Rides the 1-min Cron Trigger.
 *
 * Until now the Sentinel and price Workflows only watched while PD was open,
 * against prices loaded once per session — a crossing with the app closed
 * was silent. This sweep IS the merge of the two: one watcher evaluating
 * every push-subscriber's BUY-target to-dos AND armed workflows (price +
 * upload triggers) against the live ledger, firing a real ping (inbox +
 * native push via createPing — Pingtoasts/Silent gates respected) the
 * minute a trigger crosses.
 *
 * Exactly-once without touching the user's settings envelope (no clobber
 * risk): fires are recorded in `sentinel_fires` keyed by (wallet, id@target)
 * — first crossing pings, repeats no-op, retargeting re-arms with a new key.
 * The in-app READY flip stays as the open-app mirror.
 */

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';
import { getProject } from '@/lib/project/registry';
import { formatEth } from '@/lib/format/eth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Upload-trigger lookback (ms) — tiles with the 1-min cron; the fired-ledger
 *  backstops any overlap. */
const UPLOAD_WINDOW_MS = 90_000;

interface StoredTodo {
  id?: string;
  done?: boolean;
  kind?: string;
  priceEth?: number | null;
  source?: { slug?: string; tokenId?: number; verb?: string } | null;
}
interface StoredWorkflow {
  id?: string;
  firedAt?: number | null;
  trigger?:
    | { kind: 'price'; slug?: string; tokenId?: number | null; priceEth?: number }
    | { kind: 'upload'; artist?: string }
    | Record<string, unknown>;
}

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'unauthorized' }, { status: 401 });
  }
  try {
    const db = getSupabaseService();
    const nowIso = new Date().toISOString();

    // The live ask side, one read: cheapest active listing per piece and per
    // project (the same truth the in-app Sentinel reads via the outputs feed).
    const { data: listRows } = await db
      .from('listings')
      .select('project_id, token_id, price_eth')
      .eq('active', true)
      .or(`end_time.is.null,end_time.gt.${nowIso}`);
    const pieceAsk = new Map<string, number>();
    const projectFloor = new Map<string, number>();
    for (const r of (listRows ?? []) as { project_id: string; token_id: string; price_eth: string | number }[]) {
      const p = Number(r.price_eth);
      if (!Number.isFinite(p) || p <= 0) continue;
      const pk = `${r.project_id}:${r.token_id}`;
      if (!pieceAsk.has(pk) || p < pieceAsk.get(pk)!) pieceAsk.set(pk, p);
      if (!projectFloor.has(r.project_id) || p < projectFloor.get(r.project_id)!) projectFloor.set(r.project_id, p);
    }

    // Fresh uploads for the upload-trigger workflows (registry name resolves).
    const { data: freshRows } = await db
      .from('projects')
      .select('id, handle')
      .gte('uploaded_at', new Date(Date.now() - UPLOAD_WINDOW_MS).toISOString());
    const freshByArtist = new Map<string, string>(); // handle → slug
    for (const r of (freshRows ?? []) as { id: string; handle: string | null }[]) {
      const h = (r.handle ?? getProject(r.id)?.artistHandle ?? '').toLowerCase();
      if (h) freshByArtist.set(h, r.id);
    }

    // Only push subscribers — the same audience rule as the reminder sweep.
    const { data: subRows } = await db.from('push_subscriptions').select('user_address');
    const addresses = Array.from(
      new Set(((subRows ?? []) as { user_address?: string }[]).map((r) => r.user_address).filter(Boolean)),
    ) as string[];

    let fired = 0;
    const name = (slug: string) => getProject(slug)?.displayName ?? slug.toUpperCase();

    for (const address of addresses) {
      const { data: uRow } = await db
        .from('users')
        .select('settings')
        .eq('address', address)
        .maybeSingle();
      const settings = ((uRow as { settings?: Record<string, unknown> } | null)?.settings ?? {}) as {
        todos?: unknown; workflows?: unknown;
      };

      type Hit = { key: string; reminder: 'sentinel' | 'workflow'; text: string };
      const hits: Hit[] = [];

      const todos = Array.isArray(settings.todos) ? (settings.todos as StoredTodo[]) : [];
      for (const t of todos) {
        if (!t || t.done || t.kind !== 'output' || t.source?.verb !== 'BUY') continue;
        const target = Number(t.priceEth);
        const slug = t.source?.slug;
        const tokenId = t.source?.tokenId;
        if (!slug || tokenId == null || !Number.isFinite(target) || target <= 0) continue;
        const ask = pieceAsk.get(`${slug}:${tokenId}`);
        if (ask == null || ask > target) continue;
        hits.push({
          key: `todo:${t.id ?? `${slug}:${tokenId}`}@${target}`,
          reminder: 'sentinel',
          text: `READY — BUY ${name(slug)} #${tokenId}: asking ◊${formatEth(ask)}, your target ◊${formatEth(target)}`,
        });
      }

      const workflows = Array.isArray(settings.workflows) ? (settings.workflows as StoredWorkflow[]) : [];
      for (const w of workflows) {
        if (!w || w.firedAt != null || !w.trigger || typeof w.trigger !== 'object') continue;
        const trig = w.trigger as { kind?: string; slug?: string; tokenId?: number | null; priceEth?: number; artist?: string };
        if (trig.kind === 'price' && trig.slug && Number(trig.priceEth) > 0) {
          const ask = trig.tokenId != null
            ? pieceAsk.get(`${trig.slug}:${trig.tokenId}`)
            : projectFloor.get(trig.slug);
          if (ask == null || ask > Number(trig.priceEth)) continue;
          const what = trig.tokenId != null ? `${name(trig.slug)} #${trig.tokenId}` : name(trig.slug);
          hits.push({
            key: `wf:${w.id ?? `${trig.slug}:${trig.tokenId ?? 'floor'}`}@${trig.priceEth}`,
            reminder: 'workflow',
            text: `Workflow FIRED — ${what} at ◊${formatEth(ask)}, under your ◊${formatEth(Number(trig.priceEth))}`,
          });
        } else if (trig.kind === 'upload' && trig.artist) {
          const slug = freshByArtist.get(trig.artist.toLowerCase());
          if (!slug) continue;
          hits.push({
            key: `wf:${w.id ?? trig.artist}@upload:${slug}`,
            reminder: 'workflow',
            text: `Workflow FIRED — @${trig.artist} just uploaded ${name(slug)}`,
          });
        }
      }

      for (const h of hits) {
        // The fired-ledger is the exactly-once gate: only the sweep that
        // INSERTS the row sends the ping.
        const ins = await db
          .from('sentinel_fires')
          .insert({ wallet: address, fire_key: h.key } as never);
        if (ins.error) continue; // 23505 duplicate = already fired — silent
        await createPing({
          recipientAddress: address,
          kind: 'PING',
          data: { reminder: h.reminder, text: h.text },
        });
        fired += 1;
      }
    }

    return Response.json({ ok: true, subscribers: addresses.length, fired });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'sweep failed' },
      { status: 500 },
    );
  }
}
