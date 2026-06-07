// Project outputs — real DB read. Returns per-token ownership from `holders`
// (joined to `users` for handles) + active listing prices + project total +
// showcase ids.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export interface OutputOwner {
  token_id: number;
  owner: string;
  owner_handle: string | null;
  list_price_eth: string | null;
}

export interface ProjectOutputsResponse {
  project_id: string;
  total: number;
  showcase_ids: number[];
  outputs: OutputOwner[];
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { slug: string } }
): Promise<NextResponse> {
  if (!params.slug) return badRequest('Missing project slug');
  const slug = params.slug.toLowerCase();

  try {
    const supabase = getSupabaseService();

    const [projectRes, holdersRes, listingsRes] = await Promise.all([
      supabase
        .from('projects')
        .select('minted_count, showcase_ids')
        .eq('id', slug)
        .maybeSingle(),
      supabase
        .from('holders')
        .select('token_id, owner_address')
        .eq('project_id', slug),
      supabase
        .from('listings')
        .select('token_id, price_eth')
        .eq('project_id', slug)
        .eq('active', true),
    ]);

    if (projectRes.error) return serverError(projectRes.error.message);
    if (holdersRes.error) return serverError(holdersRes.error.message);

    const project = projectRes.data as
      | { minted_count?: number; showcase_ids?: number[] }
      | null;
    const holders = (holdersRes.data ?? []) as { token_id: string; owner_address: string }[];
    const priceByToken: Record<string, string> = {};
    for (const l of (listingsRes.data ?? []) as { token_id: string; price_eth: number | string }[]) {
      priceByToken[String(l.token_id)] = String(l.price_eth);
    }

    // Resolve handles for the (small) set of distinct owners.
    const addrs = [...new Set(holders.map((h) => h.owner_address.toLowerCase()))];
    const handleByAddr: Record<string, string | null> = {};
    if (addrs.length > 0) {
      const usersRes = await supabase
        .from('users')
        .select('address, handle')
        .in('address', addrs);
      if (!usersRes.error) {
        for (const u of (usersRes.data ?? []) as { address: string; handle: string | null }[]) {
          handleByAddr[u.address.toLowerCase()] = u.handle ?? null;
        }
      }
    }

    const outputs: OutputOwner[] = holders
      .map((h) => ({
        token_id: Number(h.token_id),
        owner: h.owner_address,
        owner_handle: handleByAddr[h.owner_address.toLowerCase()] ?? null,
        list_price_eth: priceByToken[String(h.token_id)] ?? null,
      }))
      .sort((a, b) => a.token_id - b.token_id);

    const response: ProjectOutputsResponse = {
      project_id: slug,
      total: project?.minted_count ?? outputs.length,
      showcase_ids: Array.isArray(project?.showcase_ids) ? project!.showcase_ids! : [],
      outputs,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
