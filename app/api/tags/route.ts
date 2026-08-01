import { NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService, type UserRow } from '@/lib/supabase';
import { serverError } from '@/lib/errors';
import { teamStyleIndex } from '@/lib/tags/catalog';
import { projectsByArtist, projectColorway } from '@/lib/project/registry';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tags?handles=a,b,c — profile tags for MANY users in one read.
 *
 * Profile Tags used to be worked out on the profile page alone. They now ride
 * every surface that lists people (leaderboards, collectors, followers, the
 * Friend Inspector dossier, the artwork owner line, search), so this is the ONE
 * place those surfaces get the facts from — no six different list endpoints each
 * growing their own copy of the tag columns.
 *
 * It deliberately returns the raw FACTS, not finished tag chips: the client runs
 * the same lib/tags/derive over them, so lib/tags/catalog stays the single place
 * a tag's colour, label or glyph is ever defined (Brendon, 2026-07-24 — "make
 * them global so we only need to change once"). A colour edit there repaints
 * every surface at once, with nothing baked into a response.
 *
 * `shownTags` (the tags an owner switched ON — tags are off by default) lives in the private settings
 * envelope, so it's lifted with the service key exactly as the profile page does
 * — only that one array of ids leaves the server, never the envelope.
 */

/** The per-user facts deriveTags() needs — mirrors DeriveInput. */
export interface TagFacts {
  profileTags: string[];
  grantedTags: string[];
  userNumber: number | null;
  isArtist: boolean;
  createdAt: string | null;
  address: string | null;
  priceHoldRank: number | null;
  priceHeld: number | null;
  shownTags: string[];
  /** Tag ids the owner switched OFF — darks a default-on tag (project tags). */
  tagsOff: string[];
  /** The Projects this person MADE — one project tag each, in that Project's
   *  own live colour. Resolved here because the registry belongs on the server
   *  side of this wall, not in every surface that shows a person. */
  projects: Array<{ slug: string; name: string; color: string }>;
  /** The owner's @name font — tag labels wear it on their profile, so they wear
   *  it here too; identity reads the same everywhere. */
  nameFont: string | null;
  /** The owner's all-tags paint (one colour across their whole row), or null. */
  tagPaint: string | null;
  /** Months this person CLEARED (`YYYY-MM`) — one "SEP '26 100%" chip each.
   *  Resolved here for the same reason `projects` is: it needs the project
   *  table and the holder rows, which belong on this side of the wall. */
  clearedMonths: string[];
  /** The owner's @handle — gates the handle-reserved TEAM tags (WTBS, Petey). */
  handle: string | null;
  /** Which of the twelve WTBS-family treatments the owner cycled to. */
  teamTagStyle: number;
}

export interface TagsResponse {
  /** handle (lowercase) → facts. Handles with no row are simply absent. */
  users: Record<string, TagFacts>;
}

/** Matches lib/slug.ts. */
const HANDLE_RE = /^[a-z0-9_-]+$/;
/** One screenful of rows and then some — the lists that call this cap at 100. */
const MAX_HANDLES = 120;

const strList = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const raw = new URL(req.url).searchParams.get('handles') ?? '';
    const handles = [
      ...new Set(
        raw
          .split(',')
          .map((h) => h.trim().toLowerCase())
          .filter((h) => h && HANDLE_RE.test(h)),
      ),
    ].slice(0, MAX_HANDLES);

    if (handles.length === 0) return NextResponse.json({ users: {} } satisfies TagsResponse);

    const supabase = getSupabaseAnon();
    const res = await supabase
      .from('users')
      .select(
        'address, handle, profile_tags, granted_tags, user_number, price_held, price_hold_rank, name_font, tag_paint, created_at',
      )
      .in('handle', handles);
    if (res.error) return serverError(res.error.message);

    const rows = (res.data ?? []) as Array<Partial<UserRow> & { handle: string | null }>;
    const addresses = rows
      .map((u) => (u.address ?? '').toLowerCase())
      .filter((a) => a.length > 0);

    /* Artist (earned) — the whitelist, one read for the whole batch. */
    let artistAddrs = new Set<string>();
    if (addresses.length) {
      try {
        const allow = await supabase
          .from('artist_allowlist')
          .select('address')
          .in('address', addresses);
        artistAddrs = new Set(
          ((allow.data ?? []) as Array<{ address: string }>).map((a) => a.address.toLowerCase()),
        );
      } catch { /* no allowlist read → nobody gets the Artist tag, never a 500 */ }
    }

    /* COMPLETIONISM — which months has each of these people cleared? A month
       is cleared when they hold at least one output of EVERY project uploaded
       in it, the same cut /api/completionism uses. Two reads for the whole
       batch: the project months (identical for everyone, bucketed once) and
       the holder rows for these addresses. Wrapped like the allowlist read —
       a failure costs the chips, never the response. */
    const clearedByAddr = new Map<string, string[]>();
    if (addresses.length) {
      try {
        const svc = getSupabaseService();
        const [projRes, holdRes] = await Promise.all([
          svc.from('projects').select('id, uploaded_at, cooldown_until').limit(2000),
          svc.from('holders').select('owner_address, project_id').in('owner_address', addresses),
        ]);
        /* project id → the month it was uploaded in. uploaded_at is canonical;
           older rows fall back to the same cooldown−60d moment the feeds use. */
        const monthOf = new Map<string, string>();
        const monthTotals = new Map<string, number>();
        for (const p of (projRes.data ?? []) as Array<{ id: string; uploaded_at: string | null; cooldown_until: string | null }>) {
          let ms = p.uploaded_at ? Date.parse(p.uploaded_at) : NaN;
          if (!Number.isFinite(ms) && p.cooldown_until) {
            ms = Date.parse(p.cooldown_until) - 60 * 86400 * 1000;
          }
          if (!Number.isFinite(ms)) continue;
          const d = new Date(ms);
          const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
          monthOf.set(p.id, key);
          monthTotals.set(key, (monthTotals.get(key) ?? 0) + 1);
        }
        /* address → month → the distinct projects of that month they hold. */
        const heldByAddr = new Map<string, Map<string, Set<string>>>();
        for (const h of (holdRes.data ?? []) as Array<{ owner_address: string; project_id: string }>) {
          const key = monthOf.get(h.project_id);
          if (!key) continue;
          const a = h.owner_address.toLowerCase();
          const months = heldByAddr.get(a) ?? new Map<string, Set<string>>();
          const set = months.get(key) ?? new Set<string>();
          set.add(h.project_id);
          months.set(key, set);
          heldByAddr.set(a, months);
        }
        for (const [a, months] of heldByAddr) {
          const cleared: string[] = [];
          for (const [key, held] of months) {
            const total = monthTotals.get(key) ?? 0;
            if (total > 0 && held.size >= total) cleared.push(key);
          }
          if (cleared.length) clearedByAddr.set(a, cleared);
        }
      } catch { /* no completionism read → no month chips, never a 500 */ }
    }

    /* Shown tags + the WTBS-family style pick — private envelope, service key,
       one read, and only those two values ever leave the server. */
    const shownByHandle = new Map<string, string[]>();
    const offByHandle = new Map<string, string[]>();
    const styleByHandle = new Map<string, number>();
    try {
      const svc = getSupabaseService();
      const s = await svc.from('users').select('handle, settings').in('handle', handles);
      for (const r of (s.data ?? []) as Array<{ handle: string | null; settings?: { shownTags?: unknown; tagsOff?: unknown; teamTagStyle?: unknown } | null }>) {
        if (!r.handle) continue;
        shownByHandle.set(r.handle.toLowerCase(), strList(r.settings?.shownTags));
        offByHandle.set(r.handle.toLowerCase(), strList(r.settings?.tagsOff));
        styleByHandle.set(r.handle.toLowerCase(), teamStyleIndex(r.settings?.teamTagStyle));
      }
    } catch { /* leave empty — nobody's tags show, which is the default anyway */ }

    const users: Record<string, TagFacts> = {};
    for (const u of rows) {
      if (!u.handle) continue;
      const h = u.handle.toLowerCase();
      const addr = (u.address ?? '').toLowerCase() || null;
      users[h] = {
        profileTags: strList(u.profile_tags),
        grantedTags: strList(u.granted_tags),
        userNumber: u.user_number ?? null,
        isArtist: !!addr && artistAddrs.has(addr),
        createdAt: u.created_at ?? null,
        address: addr,
        priceHoldRank: u.price_hold_rank ?? null,
        priceHeld: u.price_held == null ? null : Number(u.price_held),
        shownTags: shownByHandle.get(h) ?? [],
        tagsOff: offByHandle.get(h) ?? [],
        projects: projectsByArtist(h).map((p) => ({
          slug: p.slug,
          name: p.displayName,
          color: projectColorway(p.slug) ?? p.colorway,
        })),
        clearedMonths: (addr && clearedByAddr.get(addr)) || [],
        nameFont: u.name_font ?? null,
        tagPaint: u.tag_paint ?? null,
        handle: h,
        teamTagStyle: styleByHandle.get(h) ?? 0,
      };
    }

    return NextResponse.json({ users } satisfies TagsResponse);
  } catch (e) {
    return serverError(e instanceof Error ? e.message : 'tags lookup failed');
  }
}
