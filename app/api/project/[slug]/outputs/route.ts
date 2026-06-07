// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to an `outputs` table (output-level state derived from chain
// events: minter, current owner, traits frozen at mint, current listing).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';

export const revalidate = 300; // Output traits: 5 min

export type OutputTraits = Record<string, string>;

export interface OutputSummary {
  id: string;
  project_id: string;
  token_id: number;
  owner: string;
  minter: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: OutputTraits;
}

export interface ProjectOutputsResponse {
  project_id: string;
  total: number;
  page: number;
  page_size: number;
  outputs: OutputSummary[];
}

const LAYERS = ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'];
const MINERALS = ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'];
const FATES = ['SOVEREIGN', 'ABUNDANT', 'FORTUNE', 'ASCENDANT', 'BALANCED', 'SHADOW', 'TRIBULATION', 'VOID'];

const MOCK_HOLDERS = [
  '0x9ab3f82a3c1e7b5dba8f2c6e1d4b7a9c3e6f0a8b',
  '0x5d4e2f1c8a7b6c9e3d0f2a8b5c7d4e1f9a6b3c2e',
  '0x2f8a5c1e7b3d9a6c4f0b8d2e5a1c7f4b9d3e6c0a',
  '0xe1c4a7d2f9b6e3a5c8f1d4b7e0a3c6f9b2d5e8a1',
];

const DEFAULT_PAGE_SIZE = 24;
const MAX_PAGE_SIZE = 100;
const MOCK_TOTAL = 500;

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  if (!params.slug) return badRequest('Missing project slug');

  const url = new URL(req.url);
  const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(url.searchParams.get('page_size') ?? DEFAULT_PAGE_SIZE))
  );

  const start = (page - 1) * pageSize;
  const end = Math.min(start + pageSize, MOCK_TOTAL);
  const count = Math.max(0, end - start);

  const outputs: OutputSummary[] = Array.from({ length: count }, (_, i) => {
    const tokenId = start + i + 1;
    return {
      id: `${params.slug}-${tokenId}`,
      project_id: params.slug,
      token_id: tokenId,
      owner: MOCK_HOLDERS[tokenId % MOCK_HOLDERS.length],
      minter: MOCK_HOLDERS[(tokenId + 1) % MOCK_HOLDERS.length],
      list_price_eth: tokenId % 7 === 0 ? '0.0091' : null,
      last_sale_eth: tokenId % 3 === 0 ? '0.0088' : null,
      traits: {
        Layer:   LAYERS[tokenId % LAYERS.length],
        Mineral: MINERALS[tokenId % MINERALS.length],
        Fate:    FATES[tokenId % FATES.length],
      },
    };
  });

  const response: ProjectOutputsResponse = {
    project_id: params.slug,
    total: MOCK_TOTAL,
    page,
    page_size: pageSize,
    outputs,
  };
  return NextResponse.json(response);
}
