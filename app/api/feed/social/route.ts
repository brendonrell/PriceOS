// Social activity feed ☻ route. Builder logic (types, graph reads, the
// anonymous/default-view builders) lives in lib/home/socialFeed.ts — see
// that file for why it's not here. This is just the HTTP handler.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { attachHandles } from '@/lib/feed/handles';
import { badRequest, serverError } from '@/lib/errors';
import {
  actorAddr,
  albumsFor,
  buildDefaultSocialFeed,
  DEFAULT_LIMIT,
  EVENT_SELECT,
  eventsFor,
  graphAddresses,
  toEventRow,
  WINDOW,
  type SocialAlbumRow,
  type SocialEventRow,
  type SocialFeedResponse,
  type SocialRelation,
} from '@/lib/home/socialFeed';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface DbEvent {
  id: string;
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  sale_direction?: string | null;
  timestamp: number | string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const url = new URL(req.url);
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT))));
  const viewer = url.searchParams.get('viewer')?.toLowerCase() ?? null;
  if (viewer !== null && !ADDRESS_RE.test(viewer)) {
    return badRequest('Invalid `?viewer=` address');
  }
  /* Scoped lenses (Brendon, 2026-08-02 — "the social version of the feed" on
     project galleries; 2026-08-03 — the artist showcase): `?actor=` narrows to
     ONE wallet's story, `?project=` to one project's outputs activity — or a
     comma list of slugs (the artist showcase: activity across ALL of that
     artist's projects). The relationship badges still read against the
     viewer's own graph. */
  const actor = url.searchParams.get('actor')?.toLowerCase() ?? null;
  const projectParam = url.searchParams.get('project') ?? null;
  const projectSlugs = projectParam ? projectParam.split(',').filter(Boolean).slice(0, 50) : null;
  if (actor !== null && !ADDRESS_RE.test(actor)) {
    return badRequest('Invalid `?actor=` address');
  }
  if (projectSlugs !== null && (projectSlugs.length === 0 || projectSlugs.some((s) => !/^[a-z0-9-]{1,64}$/.test(s)))) {
    return badRequest('Invalid `?project=` slug');
  }

  try {
    const db = getSupabaseService();

    if (actor || projectSlugs) {
      /* Best-effort graph read — badges only; a scoped lens never fails
         because the viewer's graph can't be read. */
      const graph = viewer ? await graphAddresses(db, viewer).catch(() => null) : null;
      const relationOf = (a: string): SocialRelation =>
        graph ? (graph.mutual.has(a) ? 'mutual' : graph.follow.has(a) ? 'follow' : null) : null;

      let rows;
      let albums: SocialAlbumRow[] = [];
      if (actor) {
        [rows, albums] = await Promise.all([
          eventsFor(db, [actor]),
          albumsFor(db, [actor], relationOf),
        ]);
      } else {
        const { data, error } = await db
          .from('events')
          .select(EVENT_SELECT)
          .in('project_id', projectSlugs!)
          .order('timestamp', { ascending: false })
          .limit(WINDOW);
        if (error) throw new Error(error.message);
        rows = ((data ?? []) as DbEvent[])
          .map(toEventRow)
          .filter((e): e is NonNullable<ReturnType<typeof toEventRow>> => e !== null);
      }
      const page: SocialEventRow[] = rows.slice(0, limit).map((e) => {
        const a = actorAddr(e);
        return { ...e, relation: a ? relationOf(a) : null };
      });
      await attachHandles(db, page);
      return NextResponse.json(
        { events: page, albums, mode: graph ? 'graph' : 'top' } satisfies SocialFeedResponse,
      );
    }

    // Plain default view (no actor/project lens) — viewer's graph, or the
    // top-collectors fallback when logged out / unclaimed / empty graph.
    const result = await buildDefaultSocialFeed(viewer, limit);
    return NextResponse.json(result satisfies SocialFeedResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
