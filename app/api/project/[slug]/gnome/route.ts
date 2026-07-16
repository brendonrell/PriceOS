// /api/project/[slug]/gnome?address=0x… — the Gnome's Favour read.
//
// For one wallet's held pieces in one project: how long each has been held
// (acquired = the wallet's latest transfer-in event for the token) and
// whether it currently stands listed at the door. The Favour rule lives in
// lib/project/gnomeVoice (FAVOUR_DAYS): held ≥ N days, unbroken, unlisted.
// Ledger-only, deterministic, $0 — same discipline as /sentiment.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';
import { FAVOUR_DAYS } from '@/lib/project/gnomeVoice';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[0-9a-f]{40}$/;

export interface GnomeFavourPiece {
  token_id: number;
  /** Whole days the wallet has held the piece (latest transfer-in → now). */
  held_days: number;
  /** True when the piece has an active listing (favour withheld). */
  listed: boolean;
  /** held ≥ FAVOUR_DAYS and not listed. */
  favoured: boolean;
}

export interface GnomeFavourResponse {
  favour_days: number;
  pieces: GnomeFavourPiece[];
}

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  if (!getProject(slug)) return badRequest('Unknown project');
  const address = (req.nextUrl.searchParams.get('address') ?? '').toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const now = Math.floor(Date.now() / 1000);

    const heldRes = await db
      .from('holders')
      .select('token_id')
      .eq('project_id', slug)
      .eq('owner_address', address);
    if (heldRes.error) return serverError(heldRes.error.message);
    const tokenIds = ((heldRes.data ?? []) as { token_id: string | number }[]).map((r) => Number(r.token_id));
    if (tokenIds.length === 0) {
      return NextResponse.json({ favour_days: FAVOUR_DAYS, pieces: [] } satisfies GnomeFavourResponse);
    }

    const [evRes, listRes] = await Promise.all([
      db.from('events')
        .select('token_id, timestamp')
        .eq('project_id', slug)
        .eq('to_address', address)
        .in('token_id', tokenIds.map(String)),
      db.from('listings')
        .select('token_id')
        .eq('project_id', slug)
        .eq('active', true)
        .or(`end_time.is.null,end_time.gt.${now}`)
        .in('token_id', tokenIds.map(String)),
    ]);
    if (evRes.error) return serverError(evRes.error.message);
    if (listRes.error) return serverError(listRes.error.message);

    // Acquired = the LATEST transfer-in per token (a re-buy resets tenure).
    const acquired = new Map<number, number>();
    for (const e of (evRes.data ?? []) as { token_id: string | number; timestamp: number | string }[]) {
      const id = Number(e.token_id);
      const ts = Number(e.timestamp);
      if (!acquired.has(id) || ts > acquired.get(id)!) acquired.set(id, ts);
    }
    const listed = new Set(((listRes.data ?? []) as { token_id: string | number }[]).map((r) => Number(r.token_id)));

    const pieces: GnomeFavourPiece[] = tokenIds
      .map((id) => {
        const ts = acquired.get(id) ?? null;
        // No transfer-in on record → tenure unknown; count from nothing (0
        // days) rather than inventing history. Honest, never faked.
        const heldDays = ts != null ? Math.max(0, Math.floor((now - ts) / 86400)) : 0;
        const isListed = listed.has(id);
        return {
          token_id: id,
          held_days: heldDays,
          listed: isListed,
          favoured: heldDays >= FAVOUR_DAYS && !isListed,
        };
      })
      .sort((a, b) => b.held_days - a.held_days || a.token_id - b.token_id);

    return NextResponse.json({ favour_days: FAVOUR_DAYS, pieces } satisfies GnomeFavourResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
