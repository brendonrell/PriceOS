// /api/project/[slug]/replay — the raw ledger stream for The Replay ⟳.
//
// Serves the project's full event history (oldest → newest) plus the upload
// moment and supply, exactly what buildReplayHistoryFromLedger replays into
// the time machine. Same events-table read shape as the story/feed routes.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { getProject } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

const COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

export async function GET(_req: NextRequest, props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const slug = params.slug.toLowerCase();
  const project = getProject(slug);
  if (!project) return badRequest('Unknown project');
  try {
    const db = getSupabaseService();
    const [evRes, projRes] = await Promise.all([
      db.from('events')
        .select('type, token_id, from_address, to_address, price_eth, timestamp')
        .eq('project_id', slug)
        .order('timestamp', { ascending: true })
        .limit(5000),
      db.from('projects').select('max_supply, uploaded_at, cooldown_until').eq('id', slug).maybeSingle(),
    ]);
    if (evRes.error) return serverError(evRes.error.message);
    const proj = projRes.data as { max_supply?: number; uploaded_at?: string | null; cooldown_until?: string | null } | null;
    const uploadedAtMs = proj?.uploaded_at
      ? Date.parse(proj.uploaded_at)
      : proj?.cooldown_until
        ? Date.parse(proj.cooldown_until) - COOLDOWN_MS
        : null;
    return NextResponse.json(
      {
        events: evRes.data ?? [],
        uploadedAtMs: uploadedAtMs != null && Number.isFinite(uploadedAtMs) ? uploadedAtMs : null,
        maxSupply: proj?.max_supply ?? project.outputs,
      },
      { headers: { 'cache-control': 'public, max-age=60' } },
    );
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'replay read failed');
  }
}
