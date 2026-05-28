// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to `events` table (project-scoped activity stream).

import { type NextRequest, NextResponse } from 'next/server';
import type { EventRow, EventType } from '@/lib/supabase';
import { badRequest } from '@/lib/errors';

export const revalidate = 5; // Feed events: 5s

export interface ProjectFeedResponse {
  project_id: string;
  events: EventRow[];
  next_cursor: string | null;
}

const TYPES: EventType[] = ['MINT', 'LIST', 'SALE', 'XFER'];

const MOCK_ADDRS = [
  '0x9ab3f82a3c1e7b5dba8f2c6e1d4b7a9c3e6f0a8b',
  '0x5d4e2f1c8a7b6c9e3d0f2a8b5c7d4e1f9a6b3c2e',
  '0x2f8a5c1e7b3d9a6c4f0b8d2e5a1c7f4b9d3e6c0a',
  '0xe1c4a7d2f9b6e3a5c8f1d4b7e0a3c6f9b2d5e8a1',
  '0xc7e9b3f5a1d8c4b2e6f0a3d5b8c1e4f7a2d6b9c0',
];

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

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  if (!params.slug) return badRequest('Missing project slug');

  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? '20'))
  );
  const now = Date.now();

  const events: EventRow[] = Array.from({ length: limit }, (_, i) => {
    const type = TYPES[i % TYPES.length];
    const tokenIdNum = ((i * 13) % 2222) + 1;
    return {
      id: `evt_${params.slug}_${i}_${now}`,
      type,
      project_id: params.slug,
      token_id: `${params.slug}-${tokenIdNum}`,
      from_address: type === 'MINT' ? null : MOCK_ADDRS[i % MOCK_ADDRS.length],
      to_address: type === 'LIST' ? null : MOCK_ADDRS[(i + 1) % MOCK_ADDRS.length],
      price_eth: priceFor(type),
      timestamp: new Date(now - i * 47_000).toISOString(),
    };
  });

  const response: ProjectFeedResponse = {
    project_id: params.slug,
    events,
    next_cursor: events.length === limit ? events[events.length - 1].timestamp : null,
  };
  return NextResponse.json(response);
}
