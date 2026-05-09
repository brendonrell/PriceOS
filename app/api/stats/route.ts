// BLOCKED: requires indexer. Replace mock data with Supabase aggregates
// (SUM(volume_eth), COUNT(DISTINCT owner)) once indexer writes to
// `collections` and `events` tables. Likely backed by a materialized view
// refreshed every 60s to match the cache TTL.

import { NextResponse } from 'next/server';

export const revalidate = 60; // Platform stats: 60s

export interface PlatformStatsResponse {
  total_collections: number;
  total_minted: number;
  total_holders: number;
  total_volume_eth: string;
  primary_volume_eth: string;
  secondary_volume_eth: string;
  active_artists: number;
  artists_in_cooldown: number;
}

export async function GET(): Promise<NextResponse> {
  const response: PlatformStatsResponse = {
    total_collections: 1,
    total_minted: 1847,
    total_holders: 712,
    total_volume_eth: '24.713',
    primary_volume_eth: '13.483',
    secondary_volume_eth: '11.230',
    active_artists: 1,
    artists_in_cooldown: 1,
  };
  return NextResponse.json(response);
}
