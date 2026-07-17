// /api/project/[slug]/factions — the FACTION grouping's data: every holder in
// this project who has sworn an oath, as { ownerAddress: faction }. Two light
// reads (holders' addresses, then their faction_oaths rows); wallets with no
// oath are simply absent — the client reads them as Neutral. Fail-soft: any
// error returns an empty map so the grouping renders one honest Neutral group.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  const empty = NextResponse.json({ project_id: slug, owners: {} });
  if (!getProject(slug)) return empty;
  try {
    const db = getSupabaseService();
    const { data: holders } = await db
      .from('holders')
      .select('owner_address')
      .eq('project_id', slug)
      .limit(5000);
    const addrs = [...new Set(
      ((holders ?? []) as { owner_address: string | null }[])
        .map((h) => (h.owner_address ?? '').toLowerCase())
        .filter(Boolean),
    )];
    if (addrs.length === 0) return empty;
    const { data: oaths } = await db
      .from('faction_oaths')
      .select('address, faction')
      .in('address', addrs);
    const owners: Record<string, string> = {};
    for (const o of (oaths ?? []) as { address: string; faction: string | null }[]) {
      if (o.faction) owners[o.address.toLowerCase()] = o.faction;
    }
    const res = NextResponse.json({ project_id: slug, owners });
    // Oaths move slowly (30-day defection cooldown) — let the edge hold it a beat.
    res.headers.set('cache-control', 'public, max-age=300');
    return res;
  } catch {
    return empty;
  }
}
