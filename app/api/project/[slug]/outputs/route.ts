// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to a `tokens` table (token-level state derived from chain
// events: minter, current owner, traits frozen at mint, current listing).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';

export const revalidate = 300; // Token traits: 5 min

export interface KikiTraits {
  Palette: string;
  Mode: string;
  Encounter: string;
  State: string;
}

export interface TokenSummary {
  id: string;
  project_id: string;
  edition: number;
  owner: string;
  minter: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: KikiTraits;
}

export interface ProjectOutputsResponse {
  project_id: string;
  total: number;
  page: number;
  page_size: number;
  tokens: TokenSummary[];
}

const PALETTES = ['Hothurt', 'Cool Bath', 'Swampcore', 'Static', 'Forest Floor', 'Citrus'];
const MODES = ['Hover', 'Tap', 'Hold', 'Spin', 'Dive'];
const ENCOUNTERS = ['Stranger', 'Familiar', 'Mirror', 'Ghost', 'Ally'];
const STATES = ['Calm', 'Buzzed', 'Aching', 'Curious', 'Tender'];

const MOCK_HOLDERS = [
  '0x9ab3f82a3c1e7b5dba8f2c6e1d4b7a9c3e6f0a8b',
  '0x5d4e2f1c8a7b6c9e3d0f2a8b5c7d4e1f9a6b3c2e',
  '0x2f8a5c1e7b3d9a6c4f0b8d2e5a1c7f4b9d3e6c0a',
  '0xe1c4a7d2f9b6e3a5c8f1d4b7e0a3c6f9b2d5e8a1',
];

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MOCK_TOTAL = 2222;

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!params.id) return badRequest('Missing project slug');

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get('page_size') ?? DEFAULT_PAGE_SIZE))
  );

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, MOCK_TOTAL);
  const count = Math.max(0, end - start);

  const tokens: TokenSummary[] = Array.from({ length: count }, (_, i) => {
    const edition = start + i + 1;
    return {
      id: `${params.id}-${edition}`,
      project_id: params.id,
      edition,
      owner: MOCK_HOLDERS[edition % MOCK_HOLDERS.length],
      minter: MOCK_HOLDERS[(edition + 1) % MOCK_HOLDERS.length],
      list_price_eth: edition % 7 === 0 ? '0.0091' : null,
      last_sale_eth: edition % 3 === 0 ? '0.0088' : null,
      traits: {
        Palette: PALETTES[edition % PALETTES.length],
        Mode: MODES[edition % MODES.length],
        Encounter: ENCOUNTERS[edition % ENCOUNTERS.length],
        State: STATES[edition % STATES.length],
      },
    };
  });

  const response: ProjectOutputsResponse = {
    project_id: params.id,
    total: MOCK_TOTAL,
    page,
    page_size: pageSize,
    tokens,
  };
  return NextResponse.json(response);
}
