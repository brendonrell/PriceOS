// /api/user/[address]/targets — one wallet's PRICE TARGET record: every
// 30-day floor call it has cast (price_predictions), split by window.
//
// THE SEAL HOLDS HERE TOO: an open window's value is returned ONLY when the
// SIWE caller IS the profile wallet — everyone else sees the call exists,
// sealed. Closed windows are revealed for all (your track record against
// reality is the public point of the game), priced against where the
// project's floor stands today. Service client — the table has zero public
// policies by design.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getSession } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

function montrealYM(at = new Date()): { y: number; m: number } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return { y: get('year'), m: get('month') };
}

export interface TargetRow {
  project_id: string;
  /** 'YYYY-MM' (America/Montreal). */
  window_key: string;
  /** True while the window is still running. */
  open: boolean;
  /** The call. Null when sealed for this viewer (open window, not yours). */
  floor_call_eth: number | null;
  /** Where the floor stands today (revealed rows; null when unfloored). */
  floor_now_eth: number | null;
  /** (call − floor) / floor, % — the honest gap. Null when either side is unknown. */
  gap_pct: number | null;
}

export interface TargetsResponse {
  address: string;
  open_count: number;
  revealed_count: number;
  /** Mean |gap| across revealed, floor-priced calls. Null with none. */
  avg_abs_gap_pct: number | null;
  /** "AUG 1" — when the current window unseals. */
  reveals_on: string;
  rows: TargetRow[];
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }) {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) return badRequest('Invalid Ethereum address');

  try {
    const db = getSupabaseService();
    const { y, m } = montrealYM();
    const cur = `${y}-${String(m).padStart(2, '0')}`;
    const revealsOn = `${MONTHS[m % 12]} 1`;

    // Whose eyes? Your own open calls come back unsealed.
    let viewer: string | null = null;
    try {
      const session = await getSession();
      viewer = session.address?.toLowerCase() ?? null;
    } catch { /* signed out */ }
    const own = viewer === address;

    const { data } = await db
      .from('price_predictions')
      .select('project_id, window_key, floor_eth')
      .eq('wallet', address)
      .order('window_key', { ascending: false })
      .limit(500);
    const calls = (data ?? []) as { project_id: string; window_key: string; floor_eth: number | string }[];

    // Floors for the revealed rows' projects, one query.
    const revealedSlugs = Array.from(new Set(calls.filter((c) => c.window_key < cur).map((c) => c.project_id)));
    const floors = new Map<string, number>();
    if (revealedSlugs.length > 0) {
      const { data: projRows } = await db
        .from('projects')
        .select('id, floor_price_eth')
        .in('id', revealedSlugs);
      for (const p of (projRows ?? []) as { id: string; floor_price_eth: number | string | null }[]) {
        const f = p.floor_price_eth != null ? Number(p.floor_price_eth) : 0;
        if (f > 0) floors.set(p.id, f);
      }
    }

    const rows: TargetRow[] = calls.map((c) => {
      const open = c.window_key >= cur;
      const call = Number(c.floor_eth);
      if (open) {
        return {
          project_id: c.project_id, window_key: c.window_key, open: true,
          floor_call_eth: own ? Number(call.toPrecision(4)) : null,
          floor_now_eth: null, gap_pct: null,
        };
      }
      const floor = floors.get(c.project_id) ?? null;
      const gap = floor != null && floor > 0 ? ((call - floor) / floor) * 100 : null;
      return {
        project_id: c.project_id, window_key: c.window_key, open: false,
        floor_call_eth: Number(call.toPrecision(4)),
        floor_now_eth: floor != null ? Number(floor.toPrecision(4)) : null,
        gap_pct: gap != null ? Math.round(gap) : null,
      };
    });

    const revealed = rows.filter((r) => !r.open);
    const gaps = revealed.map((r) => r.gap_pct).filter((g): g is number => g != null).map(Math.abs);
    const avg = gaps.length > 0 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;

    return NextResponse.json({
      address,
      open_count: rows.length - revealed.length,
      revealed_count: revealed.length,
      avg_abs_gap_pct: avg,
      reveals_on: revealsOn,
      rows,
    } satisfies TargetsResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
