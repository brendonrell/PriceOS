// /api/project/[slug]/sentiment — the project's market mood, computed from
// the ledger alone (no model, $0): sales momentum week-over-week, offer
// pressure against open supply, and how long the room has been quiet.
// Honest and deterministic — the label only ever says what the numbers say.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  if (!getProject(slug)) return badRequest('Unknown project');
  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);
    const wk = 7 * 86400;

    const [salesRes, listingsRes, offersRes, lastEvRes, athRes, holdersRes] = await Promise.all([
      db.from('events')
        .select('price_eth, timestamp')
        .eq('project_id', slug).eq('type', 'XFER')
        .not('price_eth', 'is', null)
        .gte('timestamp', now - 2 * wk),
      db.from('listings')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', slug).eq('active', true)
        .or(`end_time.is.null,end_time.gt.${now}`),
      db.from('offers')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', slug).eq('status', 'open')
        .or(`end_time.is.null,end_time.gt.${now}`),
      db.from('events')
        .select('timestamp')
        .eq('project_id', slug)
        .order('timestamp', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('events')
        .select('price_eth, token_id, timestamp')
        .eq('project_id', slug).eq('type', 'XFER')
        .not('price_eth', 'is', null)
        .order('price_eth', { ascending: false })
        .limit(1)
        .maybeSingle(),
      db.from('holders').select('owner_address').eq('project_id', slug),
    ]);
    if (salesRes.error) return serverError(salesRes.error.message);

    const rows = (salesRes.data ?? []) as { price_eth: number | string; timestamp: number }[];
    const thisWk = rows.filter((r) => r.timestamp >= now - wk);
    const priorWk = rows.filter((r) => r.timestamp < now - wk);
    const vol = thisWk.reduce((s, r) => s + Number(r.price_eth), 0);
    const openListings = listingsRes.count ?? 0;
    const openOffers = offersRes.count ?? 0;
    const lastTs = (lastEvRes.data as { timestamp?: number } | null)?.timestamp ?? null;
    const athRow = athRes.data as { price_eth?: number; token_id?: string; timestamp?: number } | null;
    const holders = new Set(
      ((holdersRes.data ?? []) as { owner_address: string }[]).map((h) => h.owner_address.toLowerCase()),
    ).size;
    const quietDays = lastTs ? Math.floor((now - lastTs) / 86400) : null;

    let label: 'SURGING' | 'WARM' | 'COOL' | 'QUIET';
    if (thisWk.length >= 3 && thisWk.length >= priorWk.length * 2) label = 'SURGING';
    else if (thisWk.length > 0 || openOffers > 0) label = 'WARM';
    else if (quietDays != null && quietDays <= 30) label = 'COOL';
    else label = 'QUIET';

    const bits: string[] = [];
    if (thisWk.length > 0) bits.push(`${thisWk.length} sale${thisWk.length === 1 ? '' : 's'} · ${Number(vol.toFixed(3))} ETH this week`);
    if (openOffers > 0) bits.push(`${openOffers} open offer${openOffers === 1 ? '' : 's'} vs ${openListings} listing${openListings === 1 ? '' : 's'}`);
    if (bits.length === 0 && quietDays != null) bits.push(quietDays === 0 ? 'active today' : `no trades in ${quietDays} day${quietDays === 1 ? '' : 's'}`);

    return NextResponse.json({
      project_id: slug,
      label,
      detail: bits.join(' — ') || 'no market history yet',
      sales_7d: thisWk.length,
      volume_7d_eth: Number(vol.toFixed(4)),
      open_listings: openListings,
      open_offers: openOffers,
      quiet_days: quietDays,
      ath_eth: athRow?.price_eth != null ? Number(athRow.price_eth) : null,
      ath_token: athRow?.token_id ?? null,
      ath_ts: athRow?.timestamp ?? null,
      holders,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
