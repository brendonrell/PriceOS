// Public albums holding a project — EVERY user's albums that shelve at least
// one piece of this project, with the maker's handle (Brendon, 2026-08-02:
// "let's make all albums public, it was the original intention as evidenced by
// this very tab"). Albums live in each user's settings envelope
// (`settings->albums`), the same read the social feed already does; this route
// is the cross-user, project-filtered view of that shelf.
//
// Albums stay NUMBERED, never named — the identity a tile shows is the maker's
// @handle plus the album's 1-based position on THAT maker's shelf.

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService, type AlbumRecord } from '@/lib/supabase';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

/** One public album holding a piece of the project. */
export interface ProjectAlbumRow {
  /** The maker's @name, without the @. */
  owner_handle: string;
  owner_address: string;
  /** 1-based position on the maker's own shelf — the album's identity. */
  position: number;
  album: AlbumRecord;
}

export interface ProjectAlbumsResponse {
  albums: ProjectAlbumRow[];
}

/* How many shelves we read, and how many albums we hand back. Wallets are read
   newest-account-first; the page cap keeps a hot project's tab finite. */
const USER_CAP = 500;
const ALBUM_CAP = 60;

/** Members of an album that belong to this project (keys are `${slug}:${id}`). */
function holdsProject(keys: string[], slug: string): boolean {
  const p = `${slug}:`;
  return keys.some((k) => k.toLowerCase().startsWith(p));
}

function sanitizeAlbum(a: unknown): AlbumRecord | null {
  if (!a || typeof a !== 'object') return null;
  const r = a as Partial<AlbumRecord>;
  if (typeof r.id !== 'string') return null;
  const keys = Array.isArray(r.keys)
    ? r.keys.filter((k): k is string => typeof k === 'string' && k.includes(':'))
    : [];
  if (keys.length === 0) return null;
  return {
    id: r.id,
    name: '',
    keys,
    created_at: typeof r.created_at === 'number' ? r.created_at : 0,
    ...(typeof r.cover === 'string' && r.cover.includes(':') ? { cover: r.cover } : {}),
  };
}

export async function GET(
  _req: NextRequest,
  props: { params: Promise<{ slug: string }> },
): Promise<NextResponse> {
  const params = await props.params;
  if (!params.slug) return badRequest('Missing project slug');
  const slug = params.slug.toLowerCase();

  try {
    const db = getSupabaseService();
    const { data, error } = await db
      .from('users')
      .select('address, handle, albums:settings->albums')
      .not('handle', 'is', null)
      .order('created_at', { ascending: false })
      .limit(USER_CAP);
    if (error) throw new Error(error.message);

    const rows: ProjectAlbumRow[] = [];
    for (const u of (data ?? []) as {
      address: string;
      handle: string | null;
      albums: unknown;
    }[]) {
      if (!u.handle || !Array.isArray(u.albums)) continue;
      (u.albums as unknown[]).forEach((raw, i) => {
        const album = sanitizeAlbum(raw);
        if (!album || !holdsProject(album.keys, slug)) return;
        rows.push({
          owner_handle: u.handle!,
          owner_address: u.address.toLowerCase(),
          position: i + 1,
          album,
        });
      });
    }

    // Newest shelves first, so a project's tab leads with live curation.
    rows.sort((a, b) => b.album.created_at - a.album.created_at);
    return NextResponse.json({ albums: rows.slice(0, ALBUM_CAP) } satisfies ProjectAlbumsResponse);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
