// HOSTILE TAKEOVER — cast + read.
//
// One collector targets another's ENTIRE position in one project with a
// blanket per-piece premium offer. Public, inscribed, 72 hours, and the
// caster cannot back out (the cancel path refuses takeover offers — that
// is the point of running our own book).
//
//   POST { target, slug, priceEth }  → cast (auth; SIM rail)
//   GET  ?address=0x..               → takeovers touching a wallet (banners)
//   GET  ?slug=oracle                → active takeover on a project
//
// Mechanics per the ClickUp spec (86b9g6c7c): target must hold 3+ of the
// project; per-piece price must clear 1.2× the reference (target's lowest
// active listing, else project floor, else mint price); window is 72h.
// Each piece gets a REAL offer on the book (offers.takeover_id links them),
// so the target accepts piece-by-piece through the exact same flow as any
// other offer — cherry-picking is native, not a special case.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { withIdempotency } from '@/lib/api/idempotency';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { createPing } from '@/lib/pings/createPing';
import { isPlatformAccount } from '@/lib/platform/accounts';

export const dynamic = 'force-dynamic';

const WINDOW_SEC = 72 * 3600;
const PREMIUM = 1.2;

export interface TakeoverRow {
  id: string;
  caster_address: string;
  target_address: string;
  project_id: string;
  price_eth: number;
  token_count: number;
  accepted_count: number;
  status: string;
  cast_at: string;
  expires_at: string;
  caster_handle?: string | null;
  target_handle?: string | null;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const db = getSupabaseService();
    const url = new URL(req.url);
    const address = url.searchParams.get('address')?.toLowerCase() ?? null;
    const slug = url.searchParams.get('slug')?.toLowerCase() ?? null;

    // Cast sheet data: which of the target's positions are takeover-eligible
    // (3+ pieces) and what the 1.2× premium floor is for each.
    const castInfo = url.searchParams.get('castinfo')?.toLowerCase() ?? null;
    if (castInfo) {
      if (!/^0x[0-9a-f]{40}$/.test(castInfo)) return badRequest('Bad address');
      const nowSec = Math.floor(Date.now() / 1000);
      const hold = await db.from('holders').select('project_id').eq('owner_address', castInfo);
      if (hold.error) return serverError(hold.error.message);
      const counts = new Map<string, number>();
      for (const h of (hold.data ?? []) as { project_id: string }[]) {
        counts.set(h.project_id, (counts.get(h.project_id) ?? 0) + 1);
      }
      const eligible = Array.from(counts.entries()).filter(([, n]) => n >= 3);
      const out: { slug: string; title: string; pieces: number; min_price_eth: number | null }[] = [];
      for (const [pSlug, n] of eligible) {
        const def = getProject(pSlug);
        if (!def) continue;
        const [listRes, projRes] = await Promise.all([
          db.from('listings').select('price_eth')
            .eq('project_id', pSlug).eq('seller_address', castInfo).eq('active', true)
            .or(`end_time.is.null,end_time.gt.${nowSec}`)
            .order('price_eth', { ascending: true }).limit(1).maybeSingle(),
          db.from('projects').select('floor_price_eth, mint_price_eth').eq('id', pSlug).maybeSingle(),
        ]);
        const lowest = (listRes.data as { price_eth?: number } | null)?.price_eth ?? null;
        const pj = projRes.data as { floor_price_eth?: number | null; mint_price_eth?: number | null } | null;
        const ref = lowest ?? pj?.floor_price_eth ?? pj?.mint_price_eth ?? null;
        out.push({
          slug: pSlug,
          title: def.displayName,
          pieces: n,
          min_price_eth: ref != null && Number(ref) > 0 ? Number((Number(ref) * PREMIUM).toFixed(4)) : null,
        });
      }
      return NextResponse.json({ address: castInfo, positions: out });
    }

    let q = db.from('takeovers').select('*').order('cast_at', { ascending: false }).limit(12);
    if (address) q = q.or(`caster_address.eq.${address},target_address.eq.${address}`);
    else if (slug) q = q.eq('project_id', slug).eq('status', 'active');
    else return badRequest('address or slug required');

    const { data, error } = await q;
    if (error) return serverError(error.message);
    const rows = (data ?? []) as TakeoverRow[];

    // WITHSTOOD wears its mark for 180 days; other resolved states show 30.
    const now = Date.now();
    const keep = rows.filter((t) => {
      if (t.status === 'active') return true;
      const ended = Date.parse(t.expires_at);
      const days = (now - ended) / 86_400_000;
      return t.status === 'withstood' ? days <= 180 : days <= 30;
    });

    const addrs = Array.from(new Set(keep.flatMap((t) => [t.caster_address, t.target_address])));
    if (addrs.length > 0) {
      const hs = await db.from('users').select('address, handle').in('address', addrs);
      const by = new Map<string, string | null>();
      for (const u of (hs.data ?? []) as { address: string; handle: string | null }[]) {
        by.set(u.address.toLowerCase(), u.handle);
      }
      for (const t of keep) {
        t.caster_handle = by.get(t.caster_address.toLowerCase()) ?? null;
        t.target_handle = by.get(t.target_address.toLowerCase()) ?? null;
      }
    }
    return NextResponse.json({ takeovers: keep });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export const POST = requireAuth(async (req, _ctx, address) => {
  // Double-submit protection (§5.2): an Idempotency-Key header makes this
  // POST execute at most once; replays get the stored response.
  return withIdempotency(req, address, 'takeover', async () => {
  try {
    const body = (await req.json()) as { target?: string; slug?: string; priceEth?: number };
    const target = String(body.target ?? '').toLowerCase();
    const slug = String(body.slug ?? '').toLowerCase();
    const price = Number(body.priceEth);
    if (!/^0x[0-9a-f]{40}$/.test(target)) return badRequest('Bad target');
    if (target === address) return badRequest('Cannot take over yourself');
    /* A platform account (@price) is the token contract itself — never a
       counterparty. Refused at the route as well as in the UI. */
    if (isPlatformAccount(target)) return badRequest('That account cannot be taken over');
    if (!getProject(slug)) return badRequest('Unknown project');
    if (!(price > 0)) return badRequest('Bad price');

    const db = getSupabaseService();

    // Target's position — 3+ pieces or it isn't a takeover.
    const holdRes = await db
      .from('holders')
      .select('token_id')
      .eq('project_id', slug)
      .eq('owner_address', target);
    if (holdRes.error) return serverError(holdRes.error.message);
    const tokenIds = ((holdRes.data ?? []) as { token_id: string }[]).map((h) => h.token_id);
    if (tokenIds.length < 3) return badRequest('Target holds fewer than 3 pieces of this project');

    // Premium reference: target's lowest active listing → project floor → mint price.
    const nowSec = Math.floor(Date.now() / 1000);
    const [listRes, projRes] = await Promise.all([
      db.from('listings')
        .select('price_eth')
        .eq('project_id', slug)
        .eq('seller_address', target)
        .eq('active', true)
        .or(`end_time.is.null,end_time.gt.${nowSec}`)
        .order('price_eth', { ascending: true })
        .limit(1)
        .maybeSingle(),
      db.from('projects').select('floor_price_eth, mint_price_eth').eq('id', slug).maybeSingle(),
    ]);
    const lowestListed = (listRes.data as { price_eth?: number } | null)?.price_eth ?? null;
    const proj = projRes.data as { floor_price_eth?: number | null; mint_price_eth?: number | null } | null;
    const reference = lowestListed ?? proj?.floor_price_eth ?? proj?.mint_price_eth ?? null;
    if (reference == null || !(Number(reference) > 0)) {
      return badRequest('No reference price yet — this project has no listings, floor, or mint price');
    }
    const minPrice = Number(reference) * PREMIUM;
    if (price < minPrice - 1e-9) {
      return badRequest(`Premium not met — minimum is ${Number(minPrice.toFixed(4))} ETH (1.2× ${Number(Number(reference).toFixed(4))})`);
    }

    // One active takeover per caster→target per project.
    const dup = await db
      .from('takeovers')
      .select('id', { count: 'exact', head: true })
      .eq('caster_address', address)
      .eq('target_address', target)
      .eq('project_id', slug)
      .eq('status', 'active');
    if ((dup.count ?? 0) > 0) return badRequest('You already have an active takeover on this position');

    const expiresAt = new Date(Date.now() + WINDOW_SEC * 1000).toISOString();
    const ins = await db
      .from('takeovers')
      .insert({
        caster_address: address,
        target_address: target,
        project_id: slug,
        price_eth: price,
        token_ids: tokenIds,
        token_count: tokenIds.length,
        expires_at: expiresAt,
      } as never)
      .select('id')
      .single();
    if (ins.error) return serverError(ins.error.message);
    const takeoverId = (ins.data as { id: string }).id;

    // The blanket: one REAL offer per piece, all linked, all 72h.
    const endTime = nowSec + WINDOW_SEC;
    const offerRows = tokenIds.map((tokenId) => ({
      project_id: slug,
      token_id: tokenId,
      bidder_address: address,
      price_eth: price,
      status: 'open',
      end_time: endTime,
      currency: 'ETH',
      source: 'sim',
      scope: 'item',
      takeover_id: takeoverId,
    }));
    const offIns = await db.from('offers').insert(offerRows as never[]);
    if (offIns.error) {
      // Roll the inscription back rather than leave a bannered ghost.
      await db.from('takeovers').delete().eq('id', takeoverId);
      return serverError(offIns.error.message);
    }
    await db.from('events').insert(
      tokenIds.map((tokenId) => ({
        type: 'OFFER', project_id: slug, token_id: tokenId,
        from_address: address, to_address: target,
        price_eth: price, timestamp: nowSec,
      })) as never[],
    );

    // One ping, not N — the target learns they are UNDER TAKEOVER.
    await createPing({
      recipientAddress: target,
      kind: 'OFFER',
      actorAddress: address,
      projectId: slug,
      amountEth: price,
      data: { takeover: true, takeoverId, pieces: tokenIds.length },
    });

    return NextResponse.json({ ok: true, id: takeoverId, pieces: tokenIds.length, expires_at: expiresAt });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
  });
});
