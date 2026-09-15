// Social activity feed for a Project's or Output's +More Social tab
// (Brendon, 2026-09-14) — "who's following this, lately". Reads the
// explicit follow rows (project_follows / output_follows), newest first.
// Deliberately separate from /api/feed/social: that feed is market/mint
// activity by the VIEWER's graph; this one is the project/output's OWN
// follow activity, for anyone looking at that page. Unfollows aren't
// logged anywhere in the schema (a delete just removes the row), so this
// only ever shows FOLLOW moments — see the panel's inline note.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const LIMIT = 30;

export interface SocialActivityRow {
  follower_address: string;
  follower_name: string | null;
  created_at: string;
}

export interface SocialActivityResponse {
  scope: 'project' | 'output';
  rows: SocialActivityRow[];
}

function parseOutputRef(ref: string): { slug: string; tokenId: string } | null {
  const idx = ref.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = ref.slice(0, idx).toLowerCase();
  const tokenId = ref.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const projectParam = url.searchParams.get('project');
  const outputParam = url.searchParams.get('output');

  if (!projectParam && !outputParam) {
    return badRequest('Provide `?project=slug` or `?output=slug-id`');
  }

  try {
    const db = getSupabaseService();

    if (outputParam) {
      const parsed = parseOutputRef(outputParam);
      if (!parsed) return badRequest('Invalid `?output=` ref');
      const { data, error } = await db
        .from('output_follows')
        .select('follower_address, follower_name, created_at')
        .eq('project_id', parsed.slug)
        .eq('token_id', parsed.tokenId)
        .order('created_at', { ascending: false })
        .limit(LIMIT);
      if (error) throw new Error(error.message);
      return NextResponse.json(
        { scope: 'output', rows: (data ?? []) as SocialActivityRow[] } satisfies SocialActivityResponse,
      );
    }

    const slug = projectParam!.toLowerCase();
    if (!getProject(slug)) return badRequest('Unknown project');
    const { data, error } = await db
      .from('project_follows')
      .select('follower_address, follower_name, created_at')
      .eq('project_id', slug)
      .order('created_at', { ascending: false })
      .limit(LIMIT);
    if (error) throw new Error(error.message);
    return NextResponse.json(
      { scope: 'project', rows: (data ?? []) as SocialActivityRow[] } satisfies SocialActivityResponse,
    );
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
