// /api/project/[slug]/artist-push — the ARTIST PUSH perk.
//
// GET  → status for the Studio control: holder count, last push, next
//        available moment, and the preset list.
// POST → { preset } — fan the preset ping to EVERY holder of the project
//        (inbox row + native push, each holder's own settings respected).
//
// Guard rails, all server-side:
//   • Artist-only — the caller must be the project's artist.
//   • One push per project per 30 days (ARTIST_PUSH_COOLDOWN_DAYS).
//   • Preset-only message (no free text in v1).
//   • Muted-artist holders are skipped; the artist never pings themself.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import {
  ARTIST_PUSH_COOLDOWN_DAYS,
  ARTIST_PUSH_PRESETS,
  artistPushGroupKey,
  artistPushPreset,
} from '@/lib/pings/artistPushPresets';
import { sendNativePing } from '@/lib/push/webpush';
import type { FeedItem } from '@/lib/pings/render';

export const dynamic = 'force-dynamic';

type DB = ReturnType<typeof getSupabaseService>;

const INSERT_CHUNK = 500;
const MAX_HOLDERS = 5000;
const MAX_PUSHES = 200;

interface ProjectRow {
  artist_address: string | null;
  handle: string | null;
}

async function loadProject(db: DB, slug: string): Promise<ProjectRow | null> {
  const { data } = await db
    .from('projects')
    .select('artist_address, handle')
    .eq('id', slug)
    .maybeSingle();
  return (data as ProjectRow | null) ?? null;
}

/** Distinct holder addresses of a project (lowercased). */
async function holdersOf(db: DB, slug: string): Promise<string[]> {
  const { data } = await db
    .from('holders')
    .select('owner_address')
    .eq('project_id', slug)
    .limit(MAX_HOLDERS);
  return Array.from(
    new Set(
      ((data ?? []) as Array<{ owner_address: string | null }>)
        .map((r) => r.owner_address?.toLowerCase())
        .filter((a): a is string => !!a),
    ),
  );
}

/** The most recent Artist Push instant for this project, or null. */
async function lastPushAt(db: DB, slug: string): Promise<string | null> {
  const { data } = await db
    .from('pings')
    .select('created_at')
    .eq('group_key', artistPushGroupKey(slug))
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as { created_at: string } | null)?.created_at ?? null;
}

function nextAvailable(last: string | null): string | null {
  if (!last) return null;
  const next = new Date(last).getTime() + ARTIST_PUSH_COOLDOWN_DAYS * 86400_000;
  return next > Date.now() ? new Date(next).toISOString() : null;
}

export const GET = requireAuth<{ slug: string }>(async (_req, ctx, address) => {
  const slug = (await ctx.params).slug?.toLowerCase();
  if (!slug) return badRequest('Missing project');
  try {
    const db = getSupabaseService();
    const proj = await loadProject(db, slug);
    if (!proj) return badRequest('Unknown project');
    if ((proj.artist_address ?? '').toLowerCase() !== address.toLowerCase()) {
      return NextResponse.json({ error: 'Artist only' }, { status: 403 });
    }
    const [holders, last] = await Promise.all([holdersOf(db, slug), lastPushAt(db, slug)]);
    return NextResponse.json({
      holders: holders.filter((h) => h !== address.toLowerCase()).length,
      last_push_at: last,
      next_available_at: nextAvailable(last),
      presets: ARTIST_PUSH_PRESETS,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const POST = requireAuth<{ slug: string }>(async (req, ctx, address) => {
  const slug = (await ctx.params).slug?.toLowerCase();
  if (!slug) return badRequest('Missing project');

  let presetId = '';
  try {
    presetId = String(((await req.json()) as { preset?: string })?.preset ?? '');
  } catch {
    return badRequest('Invalid JSON body');
  }
  const preset = artistPushPreset(presetId);
  if (!preset) return badRequest('Unknown preset');

  try {
    const db = getSupabaseService();
    const artist = address.toLowerCase();

    const proj = await loadProject(db, slug);
    if (!proj) return badRequest('Unknown project');
    if ((proj.artist_address ?? '').toLowerCase() !== artist) {
      return NextResponse.json({ error: 'Artist only' }, { status: 403 });
    }

    // The monthly gate.
    const last = await lastPushAt(db, slug);
    const next = nextAvailable(last);
    if (next) {
      return NextResponse.json(
        { error: 'Monthly push already used', next_available_at: next },
        { status: 429 },
      );
    }

    // Audience: every holder, minus the artist and anyone who muted them.
    let recipients = (await holdersOf(db, slug)).filter((a) => a !== artist);
    if (recipients.length > 0) {
      const { data: mutedRows } = await db
        .from('muted')
        .select('user_address')
        .eq('muted_address', artist)
        .in('user_address', recipients);
      const muted = new Set(
        ((mutedRows ?? []) as Array<{ user_address: string }>).map((r) =>
          r.user_address.toLowerCase(),
        ),
      );
      recipients = recipients.filter((a) => !muted.has(a));
    }
    if (recipients.length === 0) {
      return NextResponse.json({ ok: true, sent: 0 });
    }

    // Actor snapshot — the push speaks as the artist.
    const { data: uRow } = await db
      .from('users')
      .select('handle')
      .eq('address', artist)
      .maybeSingle();
    const artistName = (uRow as { handle: string | null } | null)?.handle ?? null;

    const data = {
      artist_push: true,
      preset: preset.id,
      message: preset.message,
      count: 1,
      ...(proj.handle ? { project_handle: proj.handle } : {}),
    };
    const rows = recipients.map((recipient) => ({
      recipient_address: recipient,
      kind: 'PING',
      actor_address: artist,
      actor_name: artistName,
      project_id: slug,
      token_id: null,
      amount_eth: null,
      data,
      group_key: artistPushGroupKey(slug),
    }));

    let written = 0;
    for (let i = 0; i < rows.length; i += INSERT_CHUNK) {
      const { data: n, error: e } = await db.rpc('app_ping_wishlist_fanout', {
        p_rows: rows.slice(i, i + INSERT_CHUNK),
      } as never);
      if (e) console.error('[pings] artist push chunk failed:', e.message);
      else written += (n as number | null) ?? 0;
    }

    // Native delivery — an Artist Push is 'always' tier (the 1/month gate IS
    // its budget), still honouring each holder's mode + Silent Mode + pills.
    const nowIso = new Date().toISOString();
    await Promise.all(
      recipients.slice(0, MAX_PUSHES).map((r) =>
        sendNativePing(r, {
          id: `apush:${slug}:${nowIso}`,
          kind: 'PING',
          source: 'directed',
          actor_address: artist,
          actor_name: artistName,
          project_id: slug,
          token_id: null,
          amount_eth: null,
          data: data as FeedItem['data'],
          read: false,
          created_at: nowIso,
        }),
      ),
    );

    return NextResponse.json({ ok: true, sent: recipients.length, written });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
