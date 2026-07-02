import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';
import { parseQuery, sceneWordForBucket } from '@/lib/search/parse';
import { getCircleStats } from '@/lib/social/circleStats';
import {
  getProject,
  allProjects,
  projectsByArtist,
  findProjectByTrueName,
  projectTrueName,
  outputTrueName,
} from '@/lib/project/registry';

export const revalidate = 60;

/*
 * GET /api/search?q=… — Global Search over PD's own DB + chain mirror.
 *
 * Three sections, one round trip:
 *   projects  — title / @handle / slug / description / soundtrack, an artist's
 *               @handle surfaces their projects, and a pasted True Name
 *               (uppercase Glagolitic) resolves straight to its Project.
 *   users     — @handle / ENS / address (chain identity), each hit enriched
 *               with the profile stats row numbers (collected · spent ·
 *               followers, lib/social/circleStats) + the artist flag.
 *   artworks  — #token ids ("prisms 42", "#7"), and the natural-language
 *               visual read: the stored "Reads As" scene sentence ("two yellow
 *               circles") plus the aesthetic-fingerprint facets (colour bucket,
 *               tone mood, brightness/saturation/complexity bands, temperature,
 *               orientation — lib/search/parse speaks the exact vocabularies
 *               the fingerprint stores).
 *
 * Ranking is done here (exact > prefix > word > substring; projects tiebreak
 * on minted_count, users on followers, artworks on matched-facet count) so the
 * client renders in order.
 */

const MIN_QUERY = 2;
const PROJECT_LIMIT = 6;
const USER_LIMIT = 6;
const ARTWORK_LIMIT = 8;

export interface SearchProjectResult {
  id: string;
  title: string;
  handle: string | null;
  artist_handle: string | null;
  minted_count: number;
  max_supply: number;
  /** Why it matched, when not by name (e.g. 'soundtrack' | 'true name'). */
  match?: string;
}

export interface SearchUserResult {
  address: string;
  ens_name: string | null;
  handle: string | null;
  is_artist: boolean;
  collected: number;
  spent_eth: number;
  followers: number;
}

export interface SearchArtworkResult {
  project_id: string;
  token_id: string;
  project_title: string;
  /** The human "why": the Reads-As sentence or the matched facet words. */
  label: string;
  /** Output followers, incl. the parent project's parental-support +1 —
      same convention as the output-follows read. */
  followers: number;
}

export interface SearchResponse {
  query: string;
  projects: SearchProjectResult[];
  users: SearchUserResult[];
  artworks: SearchArtworkResult[];
}

/* Escape ILIKE wildcards AND double-quotes, then wrap in double quotes inside
   .or() filters. Without the quotes a comma / parenthesis / dot in the query
   could break out of the ilike filter and inject extra PostgREST conditions;
   quoting makes the whole value literal. (Same hardening as the original.) */
function ilikePattern(v: string): string {
  const escaped = v.replace(/[%_\\]/g, '\\$&').replace(/"/g, '\\"');
  return `"%${escaped}%"`;
}

type ProjectRowLite = {
  id: string;
  title: string;
  handle: string | null;
  artist_address: string | null;
  minted_count: number;
  max_supply: number;
  description?: string | null;
  soundtrack?: string | null;
};

type OutputRowLite = {
  project_id: string;
  token_id: string;
  dominant_color: string | null;
  accent_color: string | null;
  tone_mood: string | null;
  color_temperature: string | null;
  brightness_band: string | null;
  saturation_band: string | null;
  complexity_band: string | null;
  orientation: string | null;
  scene: string | null;
};

const OUTPUT_COLS =
  'project_id, token_id, dominant_color, accent_color, tone_mood, color_temperature, brightness_band, saturation_band, complexity_band, orientation, scene';

/* Name-match scoring: exact > prefix > word start > substring. */
function nameScore(name: string | null | undefined, q: string): number {
  if (!name) return 0;
  const n = name.toLowerCase();
  if (n === q) return 100;
  if (n.startsWith(q)) return 80;
  if (n.includes(` ${q}`)) return 60;
  if (n.includes(q)) return 40;
  return 0;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < MIN_QUERY) {
    return badRequest(`Query must be at least ${MIN_QUERY} characters`);
  }

  const parsed = parseQuery(q);
  const textQ = [parsed.handle, ...parsed.terms].filter(Boolean).join(' ') || q.toLowerCase();
  const pattern = ilikePattern(textQ);

  try {
    const supabase = getSupabaseAnon();

    /* Registry-side resolutions (pure, no DB): artist handle → their project
       slugs; pasted True Name → its project; a term that IS a slug. */
    const extraSlugs = new Set<string>();
    const slugMatchReason = new Map<string, string>();
    const artistTerms = [parsed.handle, ...parsed.terms].filter((t): t is string => !!t);
    for (const t of artistTerms) {
      for (const p of projectsByArtist(t)) {
        extraSlugs.add(p.slug);
        if (!slugMatchReason.has(p.slug)) slugMatchReason.set(p.slug, `by @${t}`);
      }
    }
    let trueNameOutput: { slug: string; tokenId: string } | null = null;
    if (parsed.trueName) {
      const p = findProjectByTrueName(parsed.trueName);
      if (p) {
        extraSlugs.add(p.slug);
        slugMatchReason.set(p.slug, 'true name');
        // Glyphs + edition digits = an OUTPUT true name (ⰀⰁⰂⰃ1234).
        if (parsed.trueNameToken) {
          trueNameOutput = { slug: p.slug, tokenId: parsed.trueNameToken };
        }
      }
    }
    /* Soundtrack search is registry-side — the DB column stores the playlist
       ID; the human words ("Boards of Canada") live on the registry label.
       Every plain term must appear in the label. */
    if (parsed.terms.length > 0) {
      for (const p of allProjects()) {
        const label = p.soundtrack?.label?.toLowerCase();
        if (label && parsed.terms.every((t) => label.includes(t))) {
          extraSlugs.add(p.slug);
          if (!slugMatchReason.has(p.slug)) slugMatchReason.set(p.slug, 'soundtrack');
        }
      }
    }

    /* A term (or @handle) that is itself a project slug narrows artwork
       search ("prisms 42", "@prisms #7"). */
    const slugHints = parsed.terms.filter((t) => !!getProject(t));
    if (parsed.handle && getProject(parsed.handle)) slugHints.push(parsed.handle);

    /* ── The parallel fan-out ─────────────────────────────────────────── */

    // Name/text search runs when the query carries name-ish terms — or when
    // nothing else parsed (a plain string is a name search). A purely visual
    // query ("two yellow circles") skips the name lanes entirely.
    const wantText =
      (parsed.terms.length > 0 || parsed.handle !== null ||
        (!parsed.visual && !parsed.tokenId && !parsed.address && !parsed.ens && !parsed.trueName)) &&
      textQ.length >= MIN_QUERY;

    const projectNameQ = wantText
      ? supabase
          .from('projects')
          .select('id, title, handle, artist_address, minted_count, max_supply')
          .or(`title.ilike.${pattern},handle.ilike.${pattern},id.ilike.${pattern}`)
          .limit(12)
      : null;

    const projectDeepQ = wantText && textQ.length >= 3
      ? supabase
          .from('projects')
          .select('id, title, handle, artist_address, minted_count, max_supply, description')
          .ilike('description', `%${textQ.replace(/[%_\\]/g, '\\$&')}%`)
          .limit(6)
      : null;

    const projectSlugQ = extraSlugs.size > 0
      ? supabase
          .from('projects')
          .select('id, title, handle, artist_address, minted_count, max_supply')
          .in('id', Array.from(extraSlugs))
          .limit(12)
      : null;

    const userFilters: string[] = [];
    if (wantText) {
      userFilters.push(`ens_name.ilike.${pattern}`, `handle.ilike.${pattern}`);
    }
    if (parsed.address) userFilters.push(`address.ilike.${ilikePattern(parsed.address)}`);
    if (parsed.ens) userFilters.push(`ens_name.ilike.${ilikePattern(parsed.ens)}`);
    const userQ = userFilters.length > 0
      ? supabase
          .from('users')
          .select('address, ens_name, handle')
          .or(userFilters.join(','))
          .limit(12)
      : null;

    /* Artworks — up to three angles, unioned + ranked below. */

    // 1) Direct token ref (#7, "prisms 42", "@prisms 7", ⰀⰁⰂⰃ1234).
    let tokenQ = null;
    if (trueNameOutput) {
      tokenQ = supabase
        .from('outputs')
        .select(OUTPUT_COLS)
        .eq('project_id', trueNameOutput.slug)
        .eq('token_id', trueNameOutput.tokenId)
        .limit(1);
    } else if (parsed.tokenId) {
      let b = supabase.from('outputs').select(OUTPUT_COLS).eq('token_id', parsed.tokenId);
      if (slugHints.length > 0) b = b.in('project_id', slugHints);
      tokenQ = b.limit(ARTWORK_LIMIT);
    }

    // 2) The Reads-As sentence — every scene word must appear.
    const sceneTerms: string[] = [
      ...parsed.counts,
      ...parsed.colors.slice(0, 2).map(sceneWordForBucket),
      ...parsed.shapes,
    ];
    if (parsed.pattern) sceneTerms.push(parsed.pattern);
    let sceneQ = null;
    if (parsed.shapes.length > 0 || parsed.pattern || parsed.counts.length > 0) {
      let b = supabase.from('outputs').select(OUTPUT_COLS);
      for (const t of sceneTerms) b = b.ilike('scene', `%${t.replace(/[%_\\]/g, '\\$&')}%`);
      if (slugHints.length > 0) b = b.in('project_id', slugHints);
      sceneQ = b.limit(ARTWORK_LIMIT);
    }

    // 3) Fingerprint facets — colour bucket + band/mood columns.
    let facetQ = null;
    if (parsed.colors.length > 0 || Object.keys(parsed.bands).length > 0) {
      let b = supabase.from('outputs').select(OUTPUT_COLS);
      if (parsed.colors.length > 0) {
        const list = parsed.colors.join(',');
        b = b.or(`dominant_color.in.(${list}),accent_color.in.(${list})`);
      }
      for (const [col, vals] of Object.entries(parsed.bands)) {
        b = b.in(col, vals);
      }
      if (slugHints.length > 0) b = b.in('project_id', slugHints);
      facetQ = b.limit(24);
    }

    const [projName, projDeep, projSlug, userRes, tokRes, sceneRes, facetRes] =
      await Promise.all([
        projectNameQ, projectDeepQ, projectSlugQ, userQ, tokenQ, sceneQ, facetQ,
      ]);

    for (const r of [projName, projDeep, projSlug, userRes, tokRes, sceneRes, facetRes]) {
      if (r?.error) return serverError(r.error.message);
    }

    /* ── Projects: merge + rank ───────────────────────────────────────── */

    const projMap = new Map<string, SearchProjectResult & { score: number }>();
    const addProject = (row: ProjectRowLite, score: number, match?: string) => {
      const prev = projMap.get(row.id);
      if (prev && prev.score >= score) return;
      projMap.set(row.id, {
        id: row.id,
        title: row.title,
        handle: row.handle ?? null,
        artist_handle: getProject(row.id)?.artistHandle ?? null,
        minted_count: row.minted_count,
        max_supply: row.max_supply,
        ...(match ? { match } : {}),
        score,
      });
    };
    for (const row of (projName?.data ?? []) as ProjectRowLite[]) {
      const s = Math.max(
        nameScore(row.title, textQ),
        nameScore(row.handle, textQ),
        nameScore(row.id, textQ)
      );
      addProject(row, s || 40);
    }
    for (const row of (projDeep?.data ?? []) as ProjectRowLite[]) {
      addProject(row, 25, 'description');
    }
    for (const row of (projSlug?.data ?? []) as ProjectRowLite[]) {
      addProject(row, 55, slugMatchReason.get(row.id));
    }
    const projects = Array.from(projMap.values())
      .sort((a, b) => b.score - a.score || b.minted_count - a.minted_count)
      .slice(0, PROJECT_LIMIT)
      .map(({ score: _s, ...rest }) => rest);

    /* ── Users: rank, then enrich the keepers with the stats row ─────── */

    type UserRowLite = { address: string; ens_name: string | null; handle: string | null };
    const usersRanked = ((userRes?.data ?? []) as UserRowLite[])
      .map((u) => ({
        ...u,
        score: Math.max(
          nameScore(u.handle, textQ),
          nameScore(u.ens_name, textQ),
          parsed.address && u.address.toLowerCase().startsWith(parsed.address) ? 80 : 0
        ),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, USER_LIMIT);

    let users: SearchUserResult[] = [];
    if (usersRanked.length > 0) {
      const addrs = usersRanked.map((u) => u.address.toLowerCase());
      const stats = await getCircleStats(supabase, addrs);
      users = usersRanked.map((u) => {
        const s = stats[u.address.toLowerCase()];
        return {
          address: u.address,
          ens_name: u.ens_name,
          handle: u.handle,
          is_artist: s?.isArtist ?? false,
          collected: s?.collected ?? 0,
          spent_eth: s?.spentEth ?? 0,
          followers: s?.followers ?? 0,
        };
      });
    }

    /* ── Artworks: union the three angles, best reason wins ──────────── */

    const artMap = new Map<string, SearchArtworkResult & { score: number }>();
    const facetWords = (row: OutputRowLite): string[] => {
      const words: string[] = [];
      if (parsed.colors.includes(row.dominant_color ?? '')) words.push(row.dominant_color as string);
      else if (parsed.colors.includes(row.accent_color ?? '')) words.push(row.accent_color as string);
      for (const col of Object.keys(parsed.bands)) {
        const v = (row as unknown as Record<string, string | null>)[col];
        if (v && parsed.bands[col].includes(v)) words.push(v);
      }
      return words;
    };
    const addArtwork = (row: OutputRowLite, score: number, label: string) => {
      const key = `${row.project_id}:${row.token_id}`;
      const prev = artMap.get(key);
      if (prev && prev.score >= score) return;
      artMap.set(key, {
        project_id: row.project_id,
        token_id: row.token_id,
        project_title: getProject(row.project_id)?.displayName ?? row.project_id.toUpperCase(),
        label,
        followers: 0,
        score,
      });
    };
    for (const row of (tokRes?.data ?? []) as unknown as OutputRowLite[]) {
      const label = trueNameOutput
        ? outputTrueName(row.project_id, Number(row.token_id))
        : row.scene ?? [row.dominant_color, row.tone_mood].filter(Boolean).join(' · ');
      addArtwork(row, 100, label);
    }
    for (const row of (sceneRes?.data ?? []) as unknown as OutputRowLite[]) {
      addArtwork(row, 90, row.scene ?? '');
    }
    for (const row of (facetRes?.data ?? []) as unknown as OutputRowLite[]) {
      const words = facetWords(row);
      addArtwork(row, 20 + words.length * 10, row.scene ?? words.join(' · '));
    }
    const artworks = Array.from(artMap.values())
      .sort((a, b) => b.score - a.score || Number(a.token_id) - Number(b.token_id))
      .slice(0, ARTWORK_LIMIT)
      .map(({ score: _s, ...rest }) => rest);

    /* Output follower counts for the keepers — stored rows + the parent
       project's parental-support +1 (output-follows read convention). */
    if (artworks.length > 0) {
      const { data: ofData, error: ofErr } = await supabase
        .from('output_follows')
        .select('project_id, token_id')
        .in('project_id', Array.from(new Set(artworks.map((a) => a.project_id))))
        .in('token_id', Array.from(new Set(artworks.map((a) => a.token_id))));
      if (ofErr) return serverError(ofErr.message);
      const followCount = new Map<string, number>();
      for (const r of (ofData ?? []) as Array<{ project_id: string; token_id: string }>) {
        const k = `${r.project_id}:${r.token_id}`;
        followCount.set(k, (followCount.get(k) ?? 0) + 1);
      }
      for (const a of artworks) {
        a.followers = (followCount.get(`${a.project_id}:${a.token_id}`) ?? 0) + 1;
      }
    }

    /* A pasted True Name earns its glyphs back in the match hint. */
    for (const p of projects) {
      if (p.match === 'true name') p.match = `true name ${projectTrueName(p.id)}`;
    }

    const response: SearchResponse = { query: q, projects, users, artworks };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
