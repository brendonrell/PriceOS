import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 60;

const MIN_QUERY = 2;
const MAX_RESULTS = 20;

export interface SearchProjectResult {
  id: string;
  title: string;
  artist_address: string;
  minted_count: number;
  max_supply: number;
}

export interface SearchUserResult {
  address: string;
  ens_name: string | null;
  display_name: string | null;
}

export interface SearchResponse {
  query: string;
  projects: SearchProjectResult[];
  users: SearchUserResult[];
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < MIN_QUERY) {
    return badRequest(`Query must be at least ${MIN_QUERY} characters`);
  }

  // Escape Postgres ILIKE wildcards so user input can't slip a `%` in.
  const escaped = q.replace(/[%_\\]/g, '\\$&');
  const pattern = `%${escaped}%`;

  try {
    const supabase = getSupabaseAnon();
    const [colRes, userRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, artist_address, minted_count, max_supply')
        .ilike('title', pattern)
        .limit(MAX_RESULTS),
      supabase
        .from('users')
        .select('address, ens_name, display_name')
        .or(
          `ens_name.ilike.${pattern},display_name.ilike.${pattern},address.ilike.${pattern}`
        )
        .limit(MAX_RESULTS),
    ]);

    if (colRes.error) return serverError(colRes.error.message);
    if (userRes.error) return serverError(userRes.error.message);

    const response: SearchResponse = {
      query: q,
      projects: colRes.data ?? [],
      users: userRes.data ?? [],
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
