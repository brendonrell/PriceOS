// BLOCKED: requires indexer. Replace mock data with Supabase queries once
// indexer writes to `projects` table. The 60-day cooldown is anchored to
// the artist's most recent project CREATION timestamp + 60 days, matching
// the contract's `PDFactory.lastProjectTimestamp[artist] + COOLDOWN_PERIOD`
// (set at `createProject`, NOT at mint-end — the contract has no notion
// of mint-end). Once the indexer materializes a `last_project_at` column
// (or computes `cooldown_until` directly via the factory's `cooldownRemaining(artist)`
// view), this becomes a single SELECT.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest } from '@/lib/errors';

export const revalidate = 30; // Artist info / cooldown: 30s

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const COOLDOWN_DAYS = 60;

export interface ArtistProjectSummary {
  id: string;
  title: string;
  minted_count: number;
  max_supply: number;
  floor_price_eth: string | null;
  volume_eth: string;
}

export interface ArtistResponse {
  address: string;
  ens_name: string | null;
  handle: string | null;
  cooldown_until: string | null;
  cooldown_active: boolean;
  cooldown_days_remaining: number;
  projects: ArtistProjectSummary[];
  total_volume_eth: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { address: string } }
): Promise<NextResponse> {
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  // Mock: a Kiki-shaped artist with 41 cooldown days remaining.
  const cooldownUntilDate = new Date(Date.now() + 41 * 86_400_000);
  const cooldownActive = cooldownUntilDate.getTime() > Date.now();
  const daysRemaining = cooldownActive
    ? Math.ceil((cooldownUntilDate.getTime() - Date.now()) / 86_400_000)
    : 0;

  const response: ArtistResponse = {
    address,
    ens_name: 'kiki.eth',
    handle: 'kiki',
    cooldown_until: cooldownUntilDate.toISOString(),
    cooldown_active: cooldownActive,
    cooldown_days_remaining: daysRemaining,
    projects: [
      {
        id: 'kiki',
        title: 'Kiki',
        minted_count: 1847,
        max_supply: 2222,
        floor_price_eth: '0.0091',
        volume_eth: '24.713',
      },
    ],
    total_volume_eth: '24.713',
  };

  // Reference COOLDOWN_DAYS so future implementations don't drop the constant.
  void COOLDOWN_DAYS;

  return NextResponse.json(response);
}
