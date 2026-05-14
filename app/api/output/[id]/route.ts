// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to `events` table (per-output history) and a derived
// outputs table or view (current owner, listing, traits frozen at mint).

import { type NextRequest, NextResponse } from 'next/server';
import type { EventRow } from '@/lib/supabase';
import { badRequest } from '@/lib/errors';

export const revalidate = 15;

export type OutputTraits = Record<string, string>;

export interface OutputDetailResponse {
  id: string;
  project_id: string;
  edition: number;
  owner: string;
  minter: string;
  minted_at: string;
  list_price_eth: string | null;
  last_sale_eth: string | null;
  traits: OutputTraits;
  history: EventRow[];
}

const PALETTES = ['Hothurt', 'Cool Bath', 'Swampcore', 'Static', 'Forest Floor', 'Citrus'];
const MODES = ['Hover', 'Tap', 'Hold', 'Spin', 'Dive'];
const ENCOUNTERS = ['Stranger', 'Familiar', 'Mirror', 'Ghost', 'Ally'];
const STATES = ['Calm', 'Buzzed', 'Aching', 'Curious', 'Tender'];

const MOCK_MINTER = '0x9ab3f82a3c1e7b5dba8f2c6e1d4b7a9c3e6f0a8b';
const MOCK_OWNER = '0x5d4e2f1c8a7b6c9e3d0f2a8b5c7d4e1f9a6b3c2e';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!params.id) return badRequest('Missing output id');

  // Output id convention: "{project_id}-{edition}". Fall back to "kiki" / 1.
  const dash = params.id.lastIndexOf('-');
  const projectId = dash > 0 ? params.id.slice(0, dash) : 'kiki';
  const edition = dash > 0 ? Number(params.id.slice(dash + 1)) || 1 : 1;
  const now = Date.now();

  const mintedAt = new Date(now - 14 * 86_400_000).toISOString();
  const listedAt = new Date(now - 7 * 86_400_000).toISOString();
  const soldAt = new Date(now - 3 * 86_400_000).toISOString();

  const response: OutputDetailResponse = {
    id: params.id,
    project_id: projectId,
    edition,
    owner: MOCK_OWNER,
    minter: MOCK_MINTER,
    minted_at: mintedAt,
    list_price_eth: '0.0091',
    last_sale_eth: '0.0088',
    traits: {
      Palette: PALETTES[edition % PALETTES.length],
      Mode: MODES[edition % MODES.length],
      Encounter: ENCOUNTERS[edition % ENCOUNTERS.length],
      State: STATES[edition % STATES.length],
    },
    history: [
      {
        id: `evt_${params.id}_mint`,
        type: 'MINT',
        project_id: projectId,
        token_id: params.id,
        from_address: null,
        to_address: MOCK_MINTER,
        price_eth: '0.0073',
        timestamp: mintedAt,
      },
      {
        id: `evt_${params.id}_list`,
        type: 'LIST',
        project_id: projectId,
        token_id: params.id,
        from_address: MOCK_MINTER,
        to_address: null,
        price_eth: '0.0091',
        timestamp: listedAt,
      },
      {
        id: `evt_${params.id}_sale`,
        type: 'SALE',
        project_id: projectId,
        token_id: params.id,
        from_address: MOCK_MINTER,
        to_address: MOCK_OWNER,
        price_eth: '0.0088',
        timestamp: soldAt,
      },
    ],
  };
  return NextResponse.json(response);
}
