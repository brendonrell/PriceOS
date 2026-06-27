// /api/output/[id]/feed — activity feed for ONE Output, scoped to a single
// token over the chainless ledger `events` table. Same shape and mapping as the
// project feed (/api/project/[slug]/feed) so the two read identically; the only
// difference is the token_id filter. id = "{slug}-{tokenId}" (e.g. "prisms-12").

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, type EventRow, type EventType } from '@/lib/supabase';
import { attachHandles } from '@/lib/feed/handles';
import { getProject } from '@/lib/project/registry';
import { FEED_LIFECYCLE, milestoneByKey } from '@/lib/home/milestones';
import { badRequest, serverError } from '@/lib/errors';

export const revalidate = 5; // Feed events: 5s

/* The 60-day artist cooldown clock fires at upload, so cooldown_until − 60d is
   the upload moment when no dedicated uploaded_at is stamped (mirrors homeData +
   the artist route). */
const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

/* A non-transaction timeline row: the artist + minter identity moments, the
   project's upload, and each project milestone / lifecycle moment. Rendered in
   the SAME two-line shape as the homepage Now-Minting feed — `label` is the
   ALLCAPS action (the af-type column), `subject` is the name (the f-content
   column, linked when `href` is set). `badge` appends the ✺ PD-Artist mark. */
export interface FeedMarker {
  id: string;
  glyph: string;
  cls: string | null;
  timestamp: string; // ISO
  seq: number;
  /* Genesis rows that anchor to the BOTTOM of every timeline in a fixed order,
     independent of their literal dates (the platform rows carry future dates, so
     a plain time sort would float them to the top). 0 = normal, time-sorted;
     higher = lower on the page. 4 = #price-discussion, 3 = PriceOS 1.0,
     2 = $PRICE airdrop, 1 = identity (artist/minter). */
  pin: number;
  /* When set, the day is undecided — the row shows "MMM ?" (month only). The
     timestamp still carries the right month for display. */
  tbdDay?: boolean;
  /* `label` is the af-type middle column (the homepage style). The right column
     is the descriptive caption `lead` + linked/bold `highlight` + `tail`, with
     `badge` appending the ✺ PD-Artist mark. */
  label: string;
  lead: string;
  highlight: string;
  tail: string;
  href: string | null;
  badge?: boolean;
}

/* The fixed platform-origin rows that open EVERY output's timeline, beneath the
   artist's join, in chronological order. Dates are deliberate (the day is ours
   to pick). Glyphs are Brendon's picks: # = the hashtag, ‰ = the PriceOS logo
   mark (Inter), ⤓ = a downward drop (the airdrop). */
const PLATFORM_GENESIS: readonly FeedMarker[] = [
  {
    id: 'pd-started', glyph: '#', cls: null, timestamp: '2021-11-11T00:00:00.000Z',
    seq: 0, pin: 4, label: 'STARTED', lead: '', highlight: '#price-discussion', tail: ' started', href: null,
  },
  {
    id: 'priceos-released', glyph: '‰', cls: 'af-ic--mille', timestamp: '2026-07-01T00:00:00.000Z',
    seq: 0, pin: 3, tbdDay: true, label: 'RELEASED', lead: '', highlight: 'PriceOS 1.0', tail: ' released', href: null,
  },
  {
    id: 'price-airdrop', glyph: '⍜', cls: null, timestamp: '2026-08-01T00:00:00.000Z',
    seq: 0, pin: 2, tbdDay: true, label: 'AIRDROP', lead: '', highlight: '$PRICE', tail: ' airdrop', href: null,
  },
];

export interface OutputFeedResponse {
  project_id: string;
  token_id: number;
  events: EventRow[];
  markers: FeedMarker[];
  next_cursor: string | null;
}

interface DbEvent {
  id: string;
  type: string;
  project_id: string;
  token_id: string | null;
  from_address: string | null;
  to_address: string | null;
  price_eth: number | string | null;
  timestamp: number | string;
}

function parseId(id: string): { slug: string; tokenId: string } | null {
  const idx = id.lastIndexOf('-');
  if (idx <= 0) return null;
  const slug = id.slice(0, idx).toLowerCase();
  const tokenId = id.slice(idx + 1);
  if (!/^\d+$/.test(tokenId)) return null;
  if (!getProject(slug)) return null;
  return { slug, tokenId };
}

function toEventRow(e: DbEvent): EventRow | null {
  let type: EventType;
  if (e.type === 'MINT') type = 'MINT';
  else if (e.type === 'LIST') type = 'LIST';
  else if (e.type === 'XFER') type = e.price_eth != null ? 'SALE' : 'XFER';
  else return null;
  return {
    id: e.id,
    type,
    project_id: e.project_id,
    token_id: e.token_id != null ? `${e.project_id}-${e.token_id}` : null,
    from_address: e.from_address,
    to_address: e.to_address,
    price_eth: e.price_eth != null ? String(e.price_eth) : null,
    timestamp: new Date(Number(e.timestamp) * 1000).toISOString(),
  };
}

type DB = ReturnType<typeof getSupabaseService>;

/* The project + artist timeline rows for an output: artist joined → project
   uploaded → each milestone reached → graduated → ascension. Same glyphs +
   labels the home / profile feeds use (lib/home/milestones). Project-level, so
   identical across every output of the project. Best-effort: a missing project
   row or unstamped moment simply yields fewer markers. */
async function buildMarkers(db: DB, slug: string, tokenId: string): Promise<FeedMarker[]> {
  const projRes = await db
    .from('projects')
    .select('title, artist_address, uploaded_at, cooldown_until, graduated_at, sold_out_at, milestones')
    .eq('id', slug)
    .maybeSingle();
  const p = projRes.data as {
    title: string | null;
    artist_address: string | null;
    uploaded_at: string | null;
    cooldown_until: string | null;
    graduated_at: string | null;
    sold_out_at: string | null;
    milestones: Record<string, string> | null;
  } | null;
  if (!p) return [];

  const title = p.title ?? slug;
  const markers: FeedMarker[] = [...PLATFORM_GENESIS];
  const iso = (v: string | null): string | null => {
    if (!v) return null;
    const t = new Date(v).getTime();
    return Number.isFinite(t) ? new Date(t).toISOString() : null;
  };
  const projHref = `/art/${slug}`;
  const nameOf = (handle: string | null, addr: string): string =>
    handle ? `@${handle}` : `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  const profileHref = (handle: string | null): string | null => (handle ? `/${handle}` : null);

  const artistAddr = p.artist_address ? p.artist_address.toLowerCase() : null;

  // ── Identity rows: artist joined → artist added as PD Artist → minter joined.
  if (artistAddr) {
    const [artistUserRes, allowRes] = await Promise.all([
      db.from('users').select('handle, created_at').eq('address', artistAddr).maybeSingle(),
      db.from('artist_allowlist').select('added_at').eq('address', artistAddr).maybeSingle(),
    ]);
    const au = artistUserRes.data as { handle: string | null; created_at: string | null } | null;
    const artistName = nameOf(au?.handle ?? null, artistAddr);
    const artistLink = profileHref(au?.handle ?? null);

    const artistJoined = iso(au?.created_at ?? null);
    if (artistJoined) {
      markers.push({
        id: `artist-joined-${slug}`,
        glyph: '✺', cls: null, timestamp: artistJoined, seq: -3, pin: 1,
        label: 'JOINED PD', lead: '', highlight: artistName, tail: ' joined PD', href: artistLink,
      });
    }
    const artistAdded = iso((allowRes.data as { added_at: string | null } | null)?.added_at ?? null);
    if (artistAdded) {
      markers.push({
        id: `artist-added-${slug}`,
        glyph: '✺', cls: null, timestamp: artistAdded, seq: -2, pin: 1,
        label: 'PD ARTIST', lead: '', highlight: artistName, tail: ' added as PD Artist', href: artistLink, badge: true,
      });
    }
  }

  // Original minter of THIS token (first MINT's recipient). Skip if the minter
  // IS the artist (already shown above); otherwise just their join date — never
  // an artist row, even if they happen to be an artist too.
  const mintRes = await db
    .from('events')
    .select('to_address, timestamp')
    .eq('project_id', slug).eq('token_id', tokenId).eq('type', 'MINT')
    .order('timestamp', { ascending: true })
    .limit(1)
    .maybeSingle();
  const minterAddr = (mintRes.data as { to_address: string | null } | null)?.to_address?.toLowerCase() ?? null;
  if (minterAddr && minterAddr !== artistAddr) {
    const muRes = await db.from('users').select('handle, created_at').eq('address', minterAddr).maybeSingle();
    const mu = muRes.data as { handle: string | null; created_at: string | null } | null;
    const minterJoined = iso(mu?.created_at ?? null);
    if (minterJoined) {
      markers.push({
        id: `minter-joined-${slug}-${tokenId}`,
        glyph: '✺', cls: null, timestamp: minterJoined, seq: -1, pin: 1,
        label: 'JOINED PD', lead: '', highlight: nameOf(mu?.handle ?? null, minterAddr), tail: ' joined PD', href: profileHref(mu?.handle ?? null),
      });
    }
  }

  // Project uploaded — uploaded_at, or cooldown_until − 60d as the fallback.
  const uploadedIso = iso(p.uploaded_at)
    ?? (p.cooldown_until ? new Date(new Date(p.cooldown_until).getTime() - COOLDOWN_MS).toISOString() : null);
  if (uploadedIso) {
    markers.push({
      id: `upload-${slug}`,
      glyph: FEED_LIFECYCLE.upload.glyph, cls: null, timestamp: uploadedIso, seq: -1, pin: 0,
      label: FEED_LIFECYCLE.upload.label, lead: '', highlight: title, tail: ' uploaded', href: projHref,
    });
  }

  // Count milestones (FIRST BLOOD, LUCKY 22, …) — stored { "<count>": iso }.
  for (const [count, ts] of Object.entries(p.milestones ?? {})) {
    const m = milestoneByKey(count);
    const when = iso(ts);
    if (m && when) {
      markers.push({
        id: `ms-${count}-${slug}`,
        glyph: m.glyph, cls: m.cls ?? null, timestamp: when, seq: m.count, pin: 0,
        label: m.label, lead: `${title} reached `, highlight: m.label, tail: '', href: projHref,
      });
    }
  }

  // Graduated (crossed Now-Minting) + Ascension (sold out).
  const gradIso = iso(p.graduated_at);
  if (gradIso) {
    markers.push({
      id: `grad-${slug}`,
      glyph: FEED_LIFECYCLE.graduated.glyph, cls: FEED_LIFECYCLE.graduated.cls ?? null, timestamp: gradIso, seq: 18, pin: 0,
      label: FEED_LIFECYCLE.graduated.label, lead: '', highlight: title, tail: ' graduated', href: projHref,
    });
  }
  const ascIso = iso(p.sold_out_at);
  if (ascIso) {
    markers.push({
      id: `asc-${slug}`,
      glyph: FEED_LIFECYCLE.ascension.glyph, cls: null, timestamp: ascIso, seq: Number.MAX_SAFE_INTEGER, pin: 0,
      label: FEED_LIFECYCLE.ascension.label, lead: `${title} reached `, highlight: FEED_LIFECYCLE.ascension.label, tail: '', href: projHref,
    });
  }

  return markers;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
): Promise<NextResponse> {
  const parsed = parseId(params.id);
  if (!parsed) return badRequest('Bad output id');
  const { slug, tokenId } = parsed;
  const limit = Math.min(
    100,
    Math.max(1, Number(new URL(req.url).searchParams.get('limit') ?? '20')),
  );

  try {
    const db = getSupabaseService();
    const { data, error } = await db
      .from('events')
      .select('id, type, project_id, token_id, from_address, to_address, price_eth, timestamp')
      .eq('project_id', slug)
      .eq('token_id', tokenId)
      .order('timestamp', { ascending: false })
      .limit(200);
    if (error) return serverError(error.message);

    const events = ((data ?? []) as DbEvent[])
      .map(toEventRow)
      .filter((e): e is EventRow => e !== null)
      .slice(0, limit);
    await attachHandles(db, events);

    const markers = await buildMarkers(db, slug, tokenId);

    const response: OutputFeedResponse = {
      project_id: slug,
      token_id: Number(tokenId),
      events,
      markers,
      next_cursor: events.length === limit ? events[events.length - 1].timestamp : null,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
