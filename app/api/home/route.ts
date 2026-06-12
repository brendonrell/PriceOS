// Home surface data — the client's live re-pull endpoint. The computation
// lives in lib/home/homeData (shared with the home page's server seed);
// this route only serves it fresh. No cache — the home page re-pulls this
// on Supabase Realtime pushes, so it must always be current.

import { NextResponse } from 'next/server';
import { serverError } from '@/lib/errors';
import { buildHomeResponse } from '@/lib/home/homeData';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export type { HomeResponse, HomeUploadRow, HomeMintingRow } from '@/lib/home/homeData';

export async function GET(): Promise<NextResponse> {
  try {
    const response = await buildHomeResponse();
    return NextResponse.json(response, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
