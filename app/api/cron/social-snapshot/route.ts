// app/api/cron/social-snapshot/route.ts
//
// The Rewind ◄ — daily social tape. Once per PriceDay (idempotent: PK is
// address+day, re-runs upsert the same rows), records every known account's
// social/holdings numbers so profiles + leaderboard can rewind in v2.
// History not recorded is gone forever — this cron is the reason the Rewind
// spec shipped with a deadline. Fired by the Cloudflare Cron Trigger
// (custom-worker.ts), same Bearer CRON_SECRET gate as the other sweeps.
// Cheap by design: three table scans + one upsert per run, and the run
// exits early once today's rows exist.

import { getSupabaseService } from '@/lib/supabase';
import { priceDayNumber } from '@/lib/priceday/priceday';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return new Response('forbidden', { status: 403 });
  }
  try {
    const db = getSupabaseService();
    const day = priceDayNumber();

    // Idempotence fast-path: today already on tape → done.
    const probe = await db
      .from('social_snapshots')
      .select('address', { count: 'exact', head: true })
      .eq('day', day);
    if ((probe.count ?? 0) > 0) {
      return Response.json({ ok: true, day, skipped: true });
    }

    const [usersRes, followsRes, holdersRes] = await Promise.all([
      db.from('users').select('address, price_score'),
      db.from('follows').select('follower_address, following_address'),
      db.from('holders').select('owner_address'),
    ]);
    if (usersRes.error) throw new Error(usersRes.error.message);
    if (followsRes.error) throw new Error(followsRes.error.message);
    if (holdersRes.error) throw new Error(holdersRes.error.message);

    const followers = new Map<string, number>();
    const following = new Map<string, number>();
    for (const f of (followsRes.data ?? []) as { follower_address: string; following_address: string }[]) {
      const a = f.follower_address.toLowerCase();
      const b = f.following_address.toLowerCase();
      following.set(a, (following.get(a) ?? 0) + 1);
      followers.set(b, (followers.get(b) ?? 0) + 1);
    }
    const holdings = new Map<string, number>();
    for (const h of (holdersRes.data ?? []) as { owner_address: string }[]) {
      const a = h.owner_address.toLowerCase();
      holdings.set(a, (holdings.get(a) ?? 0) + 1);
    }

    // Every account that exists OR holds — wallets without a users row still
    // have a market life worth taping.
    const addrs = new Set<string>();
    for (const u of (usersRes.data ?? []) as { address: string }[]) addrs.add(u.address.toLowerCase());
    for (const a of holdings.keys()) addrs.add(a);

    const scoreByAddr = new Map<string, number>();
    for (const u of (usersRes.data ?? []) as { address: string; price_score: number | null }[]) {
      scoreByAddr.set(u.address.toLowerCase(), u.price_score ?? 0);
    }

    const rows = Array.from(addrs, (address) => ({
      address,
      day,
      followers: followers.get(address) ?? 0,
      following: following.get(address) ?? 0,
      holdings: holdings.get(address) ?? 0,
      price_score: scoreByAddr.get(address) ?? 0,
    }));

    if (rows.length > 0) {
      const up = await db.from('social_snapshots').upsert(rows as never[], { onConflict: 'address,day' });
      if (up.error) throw new Error(up.error.message);
    }
    return Response.json({ ok: true, day, taped: rows.length });
  } catch (err) {
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'unknown' },
      { status: 500 },
    );
  }
}
