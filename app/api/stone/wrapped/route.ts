// /api/stone/wrapped — PD WRAPPED: one wallet's own story over a period,
// straight from the ledger. Your recap vs the Dispatch's platform paper.
//   GET ?me=0x…&days=30 → pieces gained, deals, money in/out, the biggest
//   realized flip, the best revealed floor call, the top counterparty.
// ⛔ CADENCE-AGNOSTIC BY DESIGN (Brendon hasn't picked weekly/monthly/
// quarterly/annual): the period is a parameter clamped 7–365 — whichever
// cadence he lands on wires to this same read. Real events only; a quiet
// period reads honestly quiet.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-f0-9]{40}$/;
const ZERO = '0x0000000000000000000000000000000000000000';
const MIN_DAYS = 7;
const MAX_DAYS = 365;

export interface WrappedFlip {
  project_id: string;
  token_id: number | null;
  buy_eth: number;
  sell_eth: number;
  profit_eth: number;
}

export interface StoneWrappedResponse {
  address: string;
  days: number;
  /** Pieces gained in the period: mints + priced buys. */
  collected: number;
  minted: number;
  bought: number;
  sold: number;
  /** Deals settled through The Exchange ⇌. */
  trades: number;
  spent_eth: number;
  earned_eth: number;
  net_eth: number;
  /** Biggest realized in-period flip (bought AND sold inside the window). */
  flip: WrappedFlip | null;
  /** Closest revealed floor call whose window closed inside the period. */
  best_call: { project_id: string; window_key: string; gap_pct: number } | null;
  top_counterparty: { address: string; handle: string | null; deals: number } | null;
}

function montrealYM(at: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Montreal', year: 'numeric', month: '2-digit',
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? '00';
  return `${get('year')}-${get('month')}`;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const me = (req.nextUrl.searchParams.get('me') ?? '').toLowerCase();
  if (!ADDRESS_RE.test(me)) return badRequest('Invalid Ethereum address');
  const days = Math.min(MAX_DAYS, Math.max(MIN_DAYS, Number(req.nextUrl.searchParams.get('days')) || 30));
  const nowMs = Date.now();
  const cutoff = Math.floor(nowMs / 1000) - days * 86_400;

  try {
    const db = getSupabaseService();
    const [evRes, callRes] = await Promise.all([
      db.from('events')
        .select('type, sale_direction, project_id, token_id, from_address, to_address, price_eth, timestamp')
        .or(`from_address.eq.${me},to_address.eq.${me}`)
        .gte('timestamp', cutoff)
        .order('timestamp', { ascending: true })
        .limit(2000),
      db.from('price_predictions')
        .select('project_id, window_key, floor_eth')
        .eq('wallet', me)
        .order('window_key', { ascending: false })
        .limit(200),
    ]);

    let minted = 0, bought = 0, sold = 0, trades = 0;
    let spent = 0, earned = 0;
    const buys = new Map<string, number>(); // slug:token → in-period buy price
    let flip: WrappedFlip | null = null;
    const partners = new Map<string, number>();

    for (const e of (evRes.data ?? []) as {
      type: string; sale_direction: string | null; project_id: string;
      token_id: number | null; from_address: string | null; to_address: string | null;
      price_eth: number | string | null; timestamp: number;
    }[]) {
      const from = (e.from_address ?? '').toLowerCase();
      const to = (e.to_address ?? '').toLowerCase();
      const price = e.price_eth != null ? Number(e.price_eth) : 0;
      if (e.type === 'MINT' && to === me) {
        minted += 1;
        continue;
      }
      if (e.type !== 'XFER' && e.type !== 'SALE') continue;
      const other = from === me ? to : from;
      if (other && other !== ZERO && other !== me) {
        partners.set(other, (partners.get(other) ?? 0) + 1);
      }
      if (e.sale_direction === 'TRADE') trades += 1;
      const key = `${e.project_id}:${e.token_id ?? ''}`;
      if (to === me && price > 0) {
        bought += 1;
        spent += price;
        buys.set(key, price);
      } else if (from === me && price > 0) {
        sold += 1;
        earned += price;
        const buyPrice = buys.get(key);
        if (buyPrice != null) {
          const profit = price - buyPrice;
          if (!flip || profit > flip.profit_eth) {
            flip = {
              project_id: e.project_id,
              token_id: e.token_id,
              buy_eth: Number(buyPrice.toPrecision(4)),
              sell_eth: Number(price.toPrecision(4)),
              profit_eth: Number(profit.toPrecision(4)),
            };
          }
        }
      }
    }

    /* Best call — revealed windows that CLOSED inside the period, judged
       against today's floor (the targets route's own read). */
    const cur = montrealYM(new Date(nowMs));
    const startKey = montrealYM(new Date(nowMs - days * 86_400_000));
    const calls = ((callRes.data ?? []) as { project_id: string; window_key: string; floor_eth: number | string }[])
      .filter((c) => c.window_key < cur && c.window_key >= startKey);
    let best: StoneWrappedResponse['best_call'] = null;
    if (calls.length > 0) {
      const slugs = Array.from(new Set(calls.map((c) => c.project_id)));
      const { data: projRows } = await db
        .from('projects')
        .select('id, floor_price_eth')
        .in('id', slugs);
      const floors = new Map<string, number>();
      for (const p of (projRows ?? []) as { id: string; floor_price_eth: number | string | null }[]) {
        const f = p.floor_price_eth != null ? Number(p.floor_price_eth) : 0;
        if (f > 0) floors.set(p.id, f);
      }
      for (const c of calls) {
        const floor = floors.get(c.project_id);
        if (!floor) continue;
        const gap = Math.round(((Number(c.floor_eth) - floor) / floor) * 100);
        if (!best || Math.abs(gap) < Math.abs(best.gap_pct)) {
          best = { project_id: c.project_id, window_key: c.window_key, gap_pct: gap };
        }
      }
    }

    /* Top counterparty, handle resolved. */
    let top: StoneWrappedResponse['top_counterparty'] = null;
    if (partners.size > 0) {
      const [addr, deals] = Array.from(partners.entries()).sort((a, b) => b[1] - a[1])[0];
      let handle: string | null = null;
      const { data: u } = await db.from('users').select('handle').eq('address', addr).maybeSingle();
      handle = (u as { handle?: string | null } | null)?.handle ?? null;
      top = { address: addr, handle, deals };
    }

    const body: StoneWrappedResponse = {
      address: me,
      days,
      collected: minted + bought,
      minted,
      bought,
      sold,
      trades,
      spent_eth: Number(spent.toPrecision(4)),
      earned_eth: Number(earned.toPrecision(4)),
      net_eth: Number((earned - spent).toPrecision(4)),
      flip,
      best_call: best,
      top_counterparty: top,
    };
    return NextResponse.json(body);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
