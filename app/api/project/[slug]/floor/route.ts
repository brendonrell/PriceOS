// /api/project/[slug]/floor — the project's floor: the lowest ACTIVE listing
// price. A light single-row read for gates/filters that only need the floor
// (the Offer Shield spell hides offers under 50% of it). Service client
// (listings isn't anon-readable); a public read keyed on the path.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  if (!getProject(slug)) return NextResponse.json({ project_id: slug, floor_eth: null });
  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);
    const { data } = await db
      .from('listings')
      .select('price_eth')
      .eq('project_id', slug)
      .eq('active', true)
      .or(`end_time.is.null,end_time.gt.${now}`)
      .order('price_eth', { ascending: true })
      .limit(1)
      .maybeSingle();
    const floor = (data as { price_eth?: number | string } | null)?.price_eth;
    return NextResponse.json({ project_id: slug, floor_eth: floor != null ? Number(floor) : null });
  } catch {
    // Never fail a filter over a floor query — null = "no floor known" (shows the offer).
    return NextResponse.json({ project_id: slug, floor_eth: null });
  }
}
