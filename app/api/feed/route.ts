// Global activity feed — live read over the chainless ledger `events` table.
// The mint + market routes write MINT / LIST / OFFER / XFER rows here; this
// surfaces them platform-wide. A priced transfer is presented as a SALE; an
// unpriced transfer as XFER. OFFER rows are kept off this typed feed (they
// live on the per-output market panel). Sparse until activity accrues.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type EventRow, type EventType } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const revalidate = 5; // Feed events: 5s

export interface GlobalFeedResponse {
  events: EventRow[];
  next_cursor: string | null;
  filter: {
    types: EventType[];
    project_id: string | null;
  };
}

const ALL_TYPES: EventType[] = ['MINT', 'LIST', 'SALE', 'XFER'];

function isEventType(s: string): s is EventType {
  return (ALL_TYPES as string[]).includes(s);
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

/** Map a stored event to the typed API row, or null if it has no feed type. */
function toEventRow(e: DbEvent): EventRow | null {
  let type: EventType;
  if (e.type === 'MINT') type = 'MINT';
  else if (e.type === 'LIST') type = 'LIST';
  else if (e.type === 'XFER') type = e.price_eth != null ? 'SALE' : 'XFER';
  else return null; // OFFER and anything else: off the typed feed.
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

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? '20')));
  const projectFilter = url.searchParams.get('project_id');
  const typesParam = url.searchParams.get('types');

  let types: EventType[] = typesParam
    ? typesParam.split(',').map((s) => s.trim()).filter(isEventType)
    : ALL_TYPES;
  if (types.length === 0) types = ALL_TYPES;
  const wanted = new Set(types);

  try {
    const db = getSupabaseService();
    let q = db
      .from('events')
      .select('id, type, project_id, token_id, from_address, to_address, price_eth, timestamp')
      .order('timestamp', { ascending: false })
      .limit(200);
    if (projectFilter) q = q.eq('project_id', projectFilter);
    const { data, error } = await q;
    if (error) return serverError(error.message);

    const events = ((data ?? []) as DbEvent[])
      .map(toEventRow)
      .filter((e): e is EventRow => e !== null && wanted.has(e.type))
      .slice(0, limit);

    const response: GlobalFeedResponse = {
      events,
      next_cursor: events.length === limit ? events[events.length - 1].timestamp : null,
      filter: { types, project_id: projectFilter },
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
