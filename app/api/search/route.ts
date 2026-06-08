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
  handle: string | null;
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

  // Escape ILIKE wildcards AND double-quotes, then wrap each value in double
  // quotes in the .or() filter below. Without the quotes, a comma / parenthesis
  // / dot in the query could break out of the ilike filter and inject extra
  // PostgREST conditions; quoting makes the whole value literal.
  const escaped = q.replace(/[%_\\]/g, '\\$&').replace(/"/g, '\\"');
  const pattern = `"%${escaped}%"`;

  try {
    const supabase = getSupabaseAnon();
    const [colRes, userRes] = await Promise.all([
      supabase
        .from('projects')
        .select('id, title, artist_address, minted_count, max_supply')
        .ilike('title', pattern)
        .limit(MAX_RESULTS),
      // users.handle is citext, so .ilike() matches case-insensitively
      // against it just as it does against the text columns. Querying
      // all three (ens_name, handle, address) lets users find each
      // other by whichever identifier they remember.
      supabase
        .from('users')
        .select('address, ens_name, handle')
        .or(
          `ens_name.ilike.${pattern},handle.ilike.${pattern},address.ilike.${pattern}`
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
