/*
 * BRENDON'S CARDS — the God Mode write surface for the home news rail.
 *
 * GET    → every card, live and parked, in rail order (owner only).
 * POST   → create or update one card (id present = update).
 * DELETE → remove one card by id.
 *
 * Gate: a real SIWE session whose address is one of the OWNER wallets. The
 * table's own policy only ever exposes LIVE cards to the public key; every
 * write here goes through the service role behind this check, so the anon
 * key can never author front-page copy.
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifySiweSession } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';
import { STUDIO_ACCESS_SEED } from '@/lib/studio/access';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

const COLUMNS = 'id, glyph, tag, title, meta, href, active, position, created_at';

const unauthorized = () => NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

/** The SIWE address, but only when it's an owner wallet. */
async function requireOwner(req: NextRequest): Promise<string | null> {
  const address = await verifySiweSession(req);
  if (!address) return null;
  return STUDIO_ACCESS_SEED.some((s) => s.toLowerCase() === address) ? address : null;
}

/* Trim to a real string or null. Empty fields are stored as null, not '', so
   the rail's `meta &&` / `href &&` checks read them as absent. */
const clean = (v: unknown, max: number): string | null => {
  if (typeof v !== 'string') return null;
  const s = v.trim().slice(0, max);
  return s.length > 0 ? s : null;
};

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    if (!(await requireOwner(req))) return unauthorized();
    const db = getSupabaseService();
    const r = await db
      .from('home_news_cards')
      .select(COLUMNS)
      .order('position', { ascending: true })
      .order('id', { ascending: true });
    if (r.error) return serverError(r.error.message);
    return NextResponse.json({ cards: r.data ?? [] }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    if (!(await requireOwner(req))) return unauthorized();
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') return badRequest('Bad body');

    const tag = clean((body as Record<string, unknown>).tag, 40);
    const title = clean((body as Record<string, unknown>).title, 120);
    if (!tag) return badRequest('A top line is required');
    if (!title) return badRequest('A headline is required');

    const row = {
      glyph: clean((body as Record<string, unknown>).glyph, 8),
      tag,
      title,
      meta: clean((body as Record<string, unknown>).meta, 120),
      href: clean((body as Record<string, unknown>).href, 300),
      active: (body as Record<string, unknown>).active !== false,
      position: Number((body as Record<string, unknown>).position) || 0,
      updated_at: new Date().toISOString(),
    };

    const db = getSupabaseService();
    const id = Number((body as Record<string, unknown>).id);
    /* `as never` — the table postdates the generated schema types (same
       escape hatch the anoint route uses). */
    const r = Number.isFinite(id) && id > 0
      ? await db.from('home_news_cards').update(row as never).eq('id', id).select(COLUMNS).maybeSingle()
      : await db.from('home_news_cards').insert(row as never).select(COLUMNS).maybeSingle();
    if (r.error) return serverError(r.error.message);
    return NextResponse.json({ card: r.data }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  try {
    if (!(await requireOwner(req))) return unauthorized();
    const id = Number(new URL(req.url).searchParams.get('id'));
    if (!Number.isFinite(id) || id <= 0) return badRequest('Bad id');
    const db = getSupabaseService();
    const r = await db.from('home_news_cards').delete().eq('id', id);
    if (r.error) return serverError(r.error.message);
    return NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
