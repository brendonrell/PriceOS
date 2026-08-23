// /api/completionism — COMPLETIONISM, month-based (built off PriceDay's
// calendar spine): can you collect every release of a month? A month's
// releases are the projects UPLOADED in it (projects.uploaded_at, the real
// upload moment); a release is "collected" when the wallet holds ≥1 of its
// outputs. One of PD's first-envisaged features, landed 2026-07-02.

import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { isHiddenProject } from '@/lib/platform/hiddenProjects';

export const dynamic = 'force-dynamic';

const MONTHS = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
  'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

export async function GET(req: NextRequest) {
  const address = new URL(req.url).searchParams.get('address')?.toLowerCase();
  if (!address || !address.startsWith('0x')) return badRequest('Bad address');
  try {
    const db = getSupabaseService();
    const [projRes, holdRes, stickRes] = await Promise.all([
      db.from('projects').select('id, title, uploaded_at, cooldown_until').limit(2000),
      db.from('holders').select('project_id').ilike('owner_address', address),
      // Sheets you've actually still got. Selling, gifting or listing a sheet
      // decrements this row, so it is the only source that knows a sheet LEFT
      // (the device's own list only ever grows). A sheet with no row here was
      // never claimed on the server — the client keeps its local answer for
      // those rather than wrongly marking them gone.
      db.from('sticker_holdings').select('sheet_id, qty').ilike('owner_address', address),
    ]);
    if (projRes.error) return serverError(projRes.error.message);
    if (holdRes.error) return serverError(holdRes.error.message);

    const held = new Set(((holdRes.data ?? []) as { project_id: string }[]).map((h) => h.project_id));

    interface MonthBucket {
      key: string;
      label: string;
      projects: { slug: string; title: string; collected: boolean }[];
    }
    const buckets = new Map<string, MonthBucket>();
    for (const p of (projRes.data ?? []) as { id: string; title: string; uploaded_at: string | null; cooldown_until: string | null }[]) {
      if (isHiddenProject(p.id)) continue;
      // uploaded_at is canonical; older rows fall back to the same
      // cooldown-derived upload moment the feeds use (cooldown − 60d).
      let ms = p.uploaded_at ? Date.parse(p.uploaded_at) : NaN;
      if (!Number.isFinite(ms) && p.cooldown_until) {
        ms = Date.parse(p.cooldown_until) - 60 * 86400 * 1000;
      }
      if (!Number.isFinite(ms)) continue;
      const d = new Date(ms);
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
      const b = buckets.get(key) ?? {
        key,
        label: `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`,
        projects: [],
      };
      b.projects.push({ slug: p.id, title: p.title, collected: held.has(p.id) });
      buckets.set(key, b);
    }

    const months = [...buckets.values()]
      .sort((a, b) => b.key.localeCompare(a.key))
      .map((b) => {
        b.projects.sort((x, y) => x.title.localeCompare(y.title));
        const collected = b.projects.filter((p) => p.collected).length;
        return { ...b, collected, total: b.projects.length, complete: collected === b.projects.length && b.projects.length > 0 };
      });

    const sheet_qty: Record<string, number> = {};
    for (const r of ((stickRes.error ? [] : stickRes.data) ?? []) as { sheet_id: string; qty: number }[]) {
      sheet_qty[r.sheet_id] = Number(r.qty) || 0;
    }

    return NextResponse.json({
      address,
      months,
      months_complete: months.filter((m) => m.complete).length,
      sheet_qty,
    });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
