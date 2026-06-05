// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to `events` table. Filter shape stays the same; the only
// change is swapping the Array.from() generator for a SELECT with WHERE
// type = ANY($types) AND project_id = $col (when present).

import { type NextRequest, NextResponse } from 'next/server';
import type { EventRow, EventType } from '@/lib/supabase';

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

const MOCK_ADDRS = [
  '0x9ab3f82a3c1e7b5dba8f2c6e1d4b7a9c3e6f0a8b',
  '0x5d4e2f1c8a7b6c9e3d0f2a8b5c7d4e1f9a6b3c2e',
  '0x2f8a5c1e7b3d9a6c4f0b8d2e5a1c7f4b9d3e6c0a',
  '0xe1c4a7d2f9b6e3a5c8f1d4b7e0a3c6f9b2d5e8a1',
  '0xc7e9b3f5a1d8c4b2e6f0a3d5b8c1e4f7a2d6b9c0',
];

const PROJECTS = ['prisms'];

function isEventType(s: string): s is EventType {
  return (ALL_TYPES as string[]).includes(s);
}

function priceFor(type: EventType): string | null {
  switch (type) {
    case 'MINT':
      return '0.0073';
    case 'LIST':
      return '0.0093';
    case 'SALE':
      return '0.0091';
    case 'XFER':
      return null;
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(
    100,
    Math.max(1, Number(url.searchParams.get('limit') ?? '20'))
  );
  const projectFilter = url.searchParams.get('project_id');
  const typesParam = url.searchParams.get('types');

  const types: EventType[] = typesParam
    ? typesParam.split(',').map((s) => s.trim()).filter(isEventType)
    : ALL_TYPES;

  if (types.length === 0) {
    // Fall back to ALL_TYPES if the caller passed e.g. types=garbage so the
    // route never returns an empty feed for invalid filters.
    types.push(...ALL_TYPES);
  }

  const now = Date.now();
  const events: EventRow[] = Array.from({ length: limit }, (_, i) => {
    const type = types[i % types.length];
    const project = projectFilter ?? PROJECTS[i % PROJECTS.length];
    const tokenIdNum = ((i * 11) % 222) + 1;
    return {
      id: `evt_global_${i}_${now}`,
      type,
      project_id: project,
      token_id: `${project}-${tokenIdNum}`,
      from_address: type === 'MINT' ? null : MOCK_ADDRS[i % MOCK_ADDRS.length],
      to_address: type === 'LIST' ? null : MOCK_ADDRS[(i + 1) % MOCK_ADDRS.length],
      price_eth: priceFor(type),
      timestamp: new Date(now - i * 31_000).toISOString(),
    };
  });

  const response: GlobalFeedResponse = {
    events,
    next_cursor: events.length === limit ? events[events.length - 1].timestamp : null,
    filter: { types, project_id: projectFilter },
  };
  return NextResponse.json(response);
}
