// /api/output/[id]/feed — activity feed for ONE Output, scoped to a single
// token over the chainless ledger `events` table. Same shape and mapping as the
// project feed (/api/project/[slug]/feed) so the two read identically; the only
// difference is the token_id filter. id = "{slug}-{tokenId}" (e.g. "prisms-12").

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type EventRow, type EventType } from '@/lib/supabase';
import { attachHandles } from '@/lib/feed/handles';
import { getProject } from '@/lib/project/registry';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 5; // Feed events: 5s

export interface OutputFeedResponse {
  project_id: string;
  token_id: number;
  events: EventRow[];
  next_cursor: string | null;
}

interface DbEvent {
  id: string;
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  timestamp: number | string;
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

function toEventRow(e: DbEvent): EventRow | null {
  let type: EventType;
  if (e.type === 'MINT') type = 'MINT';
  else if (e.type === 'LIST') type = 'LIST';
  else if (e.type === 'XFER') type = e.price_eth != null ? 'SALE' : 'XFER';
  else return null;
  return {
    id: e.id,
    type,
    project_id: e.project_id,
    token_id: e.token_id != null ? `${e.project_id}-${e.token_id}` : null,
    from_address: e.from_address,
    to_address: e.to_address,
    price_eth: e.price_eth != null ? String(e.price_eth) : null,
    timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
  };
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;
  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? '20')),
  );

  try {
    const db = getSupabaseService();
    const { data, error } = await db
      .from('events')
      .select('id, type, project_id, token_id, from_address, to_address, price_eth, timestamp')
      .eq('project_id', slug)
      .eq('token_id', tokenId)
      .order('timestamp', { ascending: false })
      .limit(200);
    if (error) return serverError(error.message);

    const events = ((data ?? []) as DbEvent[])
      .map(toEventRow)
      .filter((e): e is EventRow => e !== null)
      .slice(0, limit);
    await attachHandles(db, events);

    const response: OutputFeedResponse = {
      project_id: slug,
      token_id: Number(tokenId),
      events,
      next_cursor: events.length === limit ? events[events.length - 1].timestamp : null,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
