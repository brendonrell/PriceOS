// Single Output detail — live read. Current owner from `holders`, full event
// history from `events`, active listing from `listings`, and the REAL platform
// traits computed from the registry (seeded by the mint timestamp). A priced
// transfer is surfaced as a SALE in the history. 404 if the token has never
// been minted.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type EventRow, type EventType } from '@/lib/supabase';
import { badRequest, notFound, serverError } from '@/lib/errors';
import { getProject, outputTraits } from '@/lib/project/registry';

export const revalidate = 15;

export type OutputTraits = Record<string, string>;

export interface OutputDetailResponse {
  id: string;
  project_id: string;
  token_id: number;
  owner: string;
  minter: string;
  minted_at: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: OutputTraits;
  history: EventRow[];
}

interface DbEvent {
  id: string;
  type: string;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  timestamp: number | string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  if (!params.id) return badRequest('Missing output id');
  const dash = params.id.lastIndexOf('-');
  if (dash <= 0) return badRequest('Bad output id');
  const slug = params.id.slice(0, dash).toLowerCase();
  const tokenId = params.id.slice(dash + 1);
  if (!/^\d+$/.test(tokenId)) return badRequest('Bad output id');
  if (!getProject(slug)) return badRequest('Unknown project');

  const idStr = `${slug}-${tokenId}`;

  try {
    const db = getSupabaseService();
    const [holderRes, listingRes, eventsRes] = await Promise.all([
      db.from('holders').select('owner_address').eq('project_id', slug).eq('token_id', tokenId).maybeSingle(),
      db.from('listings').select('price_eth').eq('project_id', slug).eq('token_id', tokenId).eq('active', true).maybeSingle(),
      db
        .from('events')
        .select('id, type, from_address, to_address, price_eth, timestamp')
        .eq('project_id', slug)
        .eq('token_id', tokenId)
        .order('timestamp', { ascending: true }),
    ]);

    const owner = (holderRes.data as { owner_address?: string } | null)?.owner_address ?? null;
    const events = (eventsRes.data ?? []) as DbEvent[];
    const mint = events.find((e) => e.type === 'MINT') ?? null;

    // Never minted (and not held) → it doesn't exist yet.
    if (!owner && !mint) return notFound('Output not minted');

    const minter = mint?.to_address ?? owner ?? '';
    const mintedAtMs = mint ? Number(mint.timestamp) * 1000 : null;

    // Last sale = the most recent priced transfer.
    let lastSale: string | null = null;
    for (let i = events.length - 1; i >= 0; i--) {
      const e = events[i];
      if (e.type === 'XFER' && e.price_eth != null) {
        lastSale = String(e.price_eth);
        break;
      }
    }

    const history: EventRow[] = events
      .map((e): EventRow | null => {
        let type: EventType;
        if (e.type === 'MINT') type = 'MINT';
        else if (e.type === 'LIST') type = 'LIST';
        else if (e.type === 'XFER') type = e.price_eth != null ? 'SALE' : 'XFER';
        else return null;
        return {
          id: e.id,
          type,
          project_id: slug,
          token_id: idStr,
          from_address: e.from_address,
          to_address: e.to_address,
          price_eth: e.price_eth != null ? String(e.price_eth) : null,
          timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
        };
      })
      .filter((e): e is EventRow => e !== null);

    const listing = listingRes.data as { price_eth?: number | string } | null;

    const response: OutputDetailResponse = {
      id: idStr,
      project_id: slug,
      token_id: Number(tokenId),
      owner: owner ?? '',
      minter,
      minted_at: mintedAtMs ? new Date(mintedAtMs).toISOString() : '',
      list_price_eth: listing?.price_eth != null ? String(listing.price_eth) : null,
      last_sale_eth: lastSale,
      traits: outputTraits(slug, Number(tokenId), mintedAtMs ?? undefined) as OutputTraits,
      history,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
