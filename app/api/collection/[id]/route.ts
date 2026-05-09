// BLOCKED: requires indexer. Replace mock data with Supabase queries
// once indexer writes to `collections` table (see lib/supabase.ts:CollectionRow).

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';

export const revalidate = 15; // Collection stats: 15s

export interface CollectionTraitDef {
  name: string;
  values: string[];
}

export interface CollectionResponse {
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
  traits: CollectionTraitDef[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
): Promise<NextResponse> {
  if (!params.id) return badRequest('Missing collection id');

  // Mock — values shaped after Kiki, the genesis collection.
  const response: CollectionResponse = {
    id: params.id,
    artist_address: '0xc7e9b3f5a1d8c4b2e6f0a3d5b8c1e4f7a2d6b9c0',
    title: 'Kiki',
    description:
      'Genesis collection on Price Discussion. 2,222 editions of Kiki — each carries a Palette, a Mode, an Encounter, and a State.',
    minted_count: 1847,
    max_supply: 2222,
    floor_price_eth: '0.0091',
    volume_eth: '24.713',
    all_time_high_eth: '0.42',
    cooldown_until: null, // primary still open; cooldown begins on mint-end
    primary_active: true,
    traits: [
      {
        name: 'Palette',
        values: ['Hothurt', 'Cool Bath', 'Swampcore', 'Static', 'Forest Floor', 'Citrus'],
      },
      { name: 'Mode', values: ['Hover', 'Tap', 'Hold', 'Spin', 'Dive'] },
      { name: 'Encounter', values: ['Stranger', 'Familiar', 'Mirror', 'Ghost', 'Ally'] },
      { name: 'State', values: ['Calm', 'Buzzed', 'Aching', 'Curious', 'Tender'] },
    ],
  };
  return NextResponse.json(response);
}
