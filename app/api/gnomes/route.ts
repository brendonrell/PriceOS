// /api/gnomes?address=0x… — the wallet's gnomes (the GNOMEWALLET read).
//
// Every gnome this wallet has awakened (its mint struck a project's hidden
// waking hour). Owning ≥1 unlocks the gnomewallet in settings. Read-only;
// awakenings are written by the project gnome route.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import type { GnomeAwakening } from '@/lib/project/gnomeWorld';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export interface GnomesResponse {
  gnomes: GnomeAwakening[];
}

export async function GET(req: NextRequest) {
  const address = (req.nextUrl.searchParams.get('address') ?? '').toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const res = await db
      .from('gnomes')
      .select('project_id, awakened_at, owner_address, token_id, rarity, ask_eth, listed_at')
      .eq('owner_address', address)
      .order('awakened_at', { ascending: true });
    if (res.error) return serverError(res.error.message);

    const handleRes = await db.from('users').select('handle').ilike('address', address).maybeSingle();
    const handle = (handleRes.data as { handle?: string } | null)?.handle ?? null;

    const gnomes: GnomeAwakening[] = ((res.data ?? []) as {
      project_id: string; awakened_at: string; owner_address: string;
      token_id: number | string; rarity: string;
      ask_eth: number | string | null; listed_at: string | null;
    }[]).map((r) => ({
      project_id: r.project_id,
      awakened_at: r.awakened_at,
      owner_address: r.owner_address,
      owner_handle: handle,
      token_id: Number(r.token_id),
      rarity: r.rarity as GnomeAwakening['rarity'],
      ask_eth: r.ask_eth == null ? null : Number(r.ask_eth),
      listed_at: r.listed_at ?? null,
    }));

    return NextResponse.json({ gnomes } satisfies GnomesResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
