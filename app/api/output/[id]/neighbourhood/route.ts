// /api/output/[id]/neighbourhood — THE TASTE NEIGHBOURHOOD for one Output
// (the Taste Cluster idea, ClickUp 86b9erkce): not "recommended for you" —
// "this is the taste neighbourhood this piece lives in." The wallets around
// this token (its keeper, its minter, every past hand in the ledger) and the
// OTHER pieces those wallets hold, straight from the real `holders` table.
// Cultural mapping only — nothing synthesized, nothing recommended.
//
// id = "{slug}-{tokenId}" (e.g. "prisms-12"), same convention as the other
// /api/output/[id] routes. Public read; service client (holders + events
// aren't anon-readable).

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { getProject } from '@/lib/project/registry';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 30;

const ZERO = '0x0000000000000000000000000000000000000000';
const MAX_WALLETS = 8;
const MAX_PIECES_PER_WALLET = 8;

export interface NeighbourPiece {
  slug: string;
  token_id: number;
}

export interface NeighbourWallet {
  address: string;
  handle: string | null;
  /** KEEPER = holds this piece now · MINTER = brought it into the world ·
   *  PAST HAND = held it once. One relation per wallet; keeper wins. */
  relation: 'KEEPER' | 'MINTER' | 'PAST HAND';
  /** Total pieces this wallet holds platform-wide (the honest count, even
   *  when `pieces` below is capped). */
  held: number;
  /** The wallet's other pieces (this token excluded), newest-acquired first. */
  pieces: NeighbourPiece[];
}

export interface NeighbourhoodResponse {
  project_id: string;
  token_id: number;
  wallets: NeighbourWallet[];
}

function parseId(id: string): { slug: string; tokenId: string } | null {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = id.slice(0, idx).toLowerCase();
  const tokenId = id.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

export async function GET(_req: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;

  try {
    const db = getSupabaseService();

    // The wallets around this piece: ledger hands + the current keeper.
    const [evRes, keeperRes] = await Promise.all([
      db.from('events')
        .select('type, from_address, to_address, timestamp')
        .eq('project_id', slug).eq('token_id', tokenId)
        .order('timestamp', { ascending: false })
        .limit(200),
      db.from('holders')
        .select('owner_address')
        .eq('project_id', slug).eq('token_id', tokenId)
        .maybeSingle(),
    ]);

    const keeper = ((keeperRes.data as { owner_address?: string } | null)?.owner_address ?? '').toLowerCase();
    const events = (evRes.data ?? []) as {
      type: string; from_address: string | null; to_address: string | null; timestamp: number;
    }[];

    // relation + recency per wallet (events arrive newest-first, so the first
    // sighting of a wallet IS its most recent involvement).
    const seen = new Map<string, { relation: NeighbourWallet['relation']; order: number }>();
    let order = 0;
    const note = (addr: string | null, relation: NeighbourWallet['relation']) => {
      const a = (addr ?? '').toLowerCase();
      if (!a || a === ZERO) return;
      const prior = seen.get(a);
      // KEEPER > MINTER > PAST HAND; recency keeps the first (newest) order.
      const rank = (r: NeighbourWallet['relation']) => (r === 'KEEPER' ? 2 : r === 'MINTER' ? 1 : 0);
      if (!prior) seen.set(a, { relation, order: order++ });
      else if (rank(relation) > rank(prior.relation)) seen.set(a, { relation, order: prior.order });
    };
    if (keeper) note(keeper, 'KEEPER');
    for (const e of events) {
      note(e.to_address, e.type === 'MINT' ? 'MINTER' : 'PAST HAND');
      note(e.from_address, 'PAST HAND');
    }
    // Keeper leads, then minter, then past hands by recency.
    const ranked = Array.from(seen.entries())
      .sort((a, b) => {
        const rank = (r: NeighbourWallet['relation']) => (r === 'KEEPER' ? 2 : r === 'MINTER' ? 1 : 0);
        const d = rank(b[1].relation) - rank(a[1].relation);
        return d !== 0 ? d : a[1].order - b[1].order;
      })
      .slice(0, MAX_WALLETS)
      .map(([addr, meta]) => ({ addr, relation: meta.relation }));

    if (ranked.length === 0) {
      return NextResponse.json({ project_id: slug, token_id: Number(tokenId), wallets: [] } satisfies NeighbourhoodResponse);
    }

    const addrs = ranked.map((w) => w.addr);
    const [holdRes, userRes] = await Promise.all([
      db.from('holders')
        .select('project_id, token_id, owner_address, acquired_at')
        .in('owner_address', addrs)
        .order('acquired_at', { ascending: false })
        .limit(1000),
      db.from('users')
        .select('address, handle')
        .in('address', addrs),
    ]);

    const handleBy = new Map<string, string | null>();
    for (const u of (userRes.data ?? []) as { address: string; handle: string | null }[]) {
      handleBy.set(u.address.toLowerCase(), u.handle);
    }

    const heldBy = new Map<string, NeighbourPiece[]>();
    const heldCount = new Map<string, number>();
    for (const h of (holdRes.data ?? []) as { project_id: string; token_id: string; owner_address: string }[]) {
      const a = h.owner_address.toLowerCase();
      heldCount.set(a, (heldCount.get(a) ?? 0) + 1);
      if (h.project_id === slug && h.token_id === tokenId) continue; // the piece itself
      const list = heldBy.get(a) ?? [];
      if (list.length < MAX_PIECES_PER_WALLET) {
        list.push({ slug: h.project_id, token_id: Number(h.token_id) });
        heldBy.set(a, list);
      }
    }

    const wallets: NeighbourWallet[] = ranked.map((w) => ({
      address: w.addr,
      handle: handleBy.get(w.addr) ?? null,
      relation: w.relation,
      held: heldCount.get(w.addr) ?? 0,
      pieces: heldBy.get(w.addr) ?? [],
    }));

    return NextResponse.json({ project_id: slug, token_id: Number(tokenId), wallets } satisfies NeighbourhoodResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
