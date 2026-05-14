// BLOCKED: requires indexer. Replace mock data with Supabase queries
// once indexer writes to `projects` table (see lib/supabase.ts:ProjectRow).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';

export const revalidate = 15; // Project stats: 15s

export interface ProjectTraitDef {
  name: string;
  values: string[];
}

export interface ProjectResponse {
  id: string;
  artist_address: string;
  title: string;
  description: string;
  minted_count: number;
  max_supply: number;
  floor_price_eth: string;
  volume_eth: string;
  all_time_high_eth: string;
  cooldown_until: string | null;
  primary_active: boolean;
  traits: ProjectTraitDef[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  if (!params.slug) return badRequest('Missing project slug');

  // Mock — placeholder shape; real values come from the indexer.
  const response: ProjectResponse = {
    id: params.slug,
    artist_address: '0xc7e9b3f5a1d8c4b2e6f0a3d5b8c1e4f7a2d6b9c0',
    title: 'PRISMS',
    description:
      'Preview project on Price Discussion. 222 Outputs, each with a Layer, a Mineral, and a Fate.',
    minted_count: 187,
    max_supply: 222,
    floor_price_eth: '0.0091',
    volume_eth: '24.713',
    all_time_high_eth: '0.42',
    cooldown_until: null, // null until indexer wires lastProjectTimestamp + 60 days from chain
    primary_active: true,
    traits: [
      { name: 'Layer',   values: ['Crust', 'Mantle', 'Bedrock', 'Sediment', 'Vein', 'Drift'] },
      { name: 'Mineral', values: ['Quartz', 'Schist', 'Slate', 'Pyrite', 'Onyx', 'Mica'] },
      { name: 'Fate',    values: ['SOVEREIGN', 'ABUNDANT', 'FORTUNE', 'ASCENDANT', 'BALANCED', 'SHADOW', 'TRIBULATION', 'VOID'] },
    ],
  };
  return NextResponse.json(response);
}
