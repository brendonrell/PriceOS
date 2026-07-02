import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon, getSupabaseService } from '@/lib/supabase';
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

export const dynamic = 'force-dynamic';

/*
 * GET /api/search?q=… — Global Search over PD's own DB + chain mirror.
 *
 * Sections, one round trip: answers · projects · collectors · artworks ·
 * soundtracks · traits. Query understanding lives in lib/search/parse —
 * plain words for civilians, a power grammar for the keyboard crowd:
 *
 *   by:@artist  project:prisms  holder:@name  color:yellow  mood:serene
 *   listed · sold · offers · under:0.1 · over:0.5 · sort:rarity|price|
 *   recent|followers · followers:>10 · sun:leo · #7 · prisms 42 · ⰀⰁⰂⰃ7
 *
 * Natural-language visual search rides the stored fingerprint (the Reads-As
 * scene sentence + colour/mood/band facets). Market queries ride the ledger
 * mirror (listings / offers / events) — identical once the on-chain indexer
 * writes the same tables. Ranking: exact > prefix > word > substring, fuzzy
 * fallback (edit distance ≤2) when a name lane comes back empty, volume /
 * followers as popularity tiebreaks. Every query is logged (service-role,
 * fire-and-forget) so "no matches" queries steer what we improve next.
 */

const MIN_QUERY = 2;
const PROJECT_LIMIT = 12;
const USER_LIMIT = 10;
const ARTWORK_LIMIT = 24;

export interface SearchProjectResult {
  id: string;
  title: string;
  handle: string | null;
  artist_handle: string | null;
  minted_count: number;
  max_supply: number;
  /** Why it matched, when not by name (e.g. 'soundtrack' | 'true name…'). */
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
  /** The human "why": the Reads-As sentence, facet words, or market state. */
  label: string;
  /** Output followers, incl. the parent project's parental-support +1. */
  followers: number;
}

export interface SearchSoundtrackResult {
  project_id: string;
  project_title: string;
  /** The soundtrack's human label ("Wardruna — Kvitravn"). */
  label: string;
}

export interface SearchTraitResult {
  project_id: string;
  project_title: string;
  trait_name: string;
  value: string;
}

export interface SearchAnswer {
  text: string;
  href: string | null;
}

export interface SearchResponse {
  query: string;
  answers: SearchAnswer[];
  projects: SearchProjectResult[];
  users: SearchUserResult[];
  artworks: SearchArtworkResult[];
  soundtracks: SearchSoundtrackResult[];
  traits: SearchTraitResult[];
}

const VS15 = '︎';

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
  floor_price_eth?: string | null;
  volume_eth?: string | null;
  all_time_high_eth?: string | null;
  description?: string | null;
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
  rarity_score?: number | null;
  minted_at?: string | null;
};

const OUTPUT_COLS =
  'project_id, token_id, dominant_color, accent_color, tone_mood, color_temperature, brightness_band, saturation_band, complexity_band, orientation, scene, rarity_score, minted_at';

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

/* Bounded edit distance for the fuzzy fallback (typo forgiveness). */
function editDistance(a: string, b: string, cap = 3): number {
  if (Math.abs(a.length - b.length) > cap) return cap + 1;
  const dp = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = dp[j];
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = tmp;
    }
  }
  return dp[b.length];
}

function fmtEth(v: string | number | null | undefined): string {
  const n = Number(v ?? 0);
  return isFinite(n) ? (Math.round(n * 1000) / 1000).toString() : '0';
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const q = new URL(req.url).searchParams.get('q')?.trim();
  if (!q || q.length < MIN_QUERY) {
    return badRequest(`Query must be at least ${MIN_QUERY} characters`);
  }

  const parsed = parseQuery(q);
  // Answer keywords ("prisms floor", "who holds prisms 7") ask ABOUT a thing;
  // they must not pollute the name being looked up.
  const ANSWER_WORDS = new Set([
    'floor', 'volume', 'ath', 'spent', 'collected', 'followers',
    'holds', 'holder', 'owns', 'owner', 'who',
  ]);
  const nameTerms = parsed.terms.filter((t) => !ANSWER_WORDS.has(t));
  const textQ = [parsed.handle, ...nameTerms].filter(Boolean).join(' ') || q.toLowerCase();
  const pattern = ilikePattern(textQ);

  try {
    const supabase = getSupabaseAnon();

    /* Registry-side resolutions (pure, no DB): artist handle → their project
       slugs; pasted True Name → its project; a term that IS a slug. */
    const extraSlugs = new Set<string>();
    const slugMatchReason = new Map<string, string>();
    const artistTerms = [parsed.handle, parsed.byArtist, ...parsed.terms]
      .filter((t): t is string => !!t);
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
        if (parsed.trueNameToken) {
          trueNameOutput = { slug: p.slug, tokenId: parsed.trueNameToken };
        }
      }
    }
    if (parsed.project && getProject(parsed.project)) {
      extraSlugs.add(parsed.project);
      if (!slugMatchReason.has(parsed.project)) slugMatchReason.set(parsed.project, 'project');
    }

    /* Soundtrack matches are registry-side — the DB column stores the playlist
       ID; the human words ("Boards of Canada") live on the registry label. */
    const soundtrackHits: SearchSoundtrackResult[] = [];
    if (parsed.terms.length > 0) {
      for (const p of allProjects()) {
        const label = p.soundtrack?.label;
        if (label && parsed.terms.every((t) => label.toLowerCase().includes(t))) {
          soundtrackHits.push({ project_id: p.slug, project_title: p.displayName, label });
          if (soundtrackHits.length >= 4) break;
        }
      }
    }

    /* Trait matches — every project's trait schema lives in the registry. A
       term matching a trait VALUE surfaces `Value (Trait) — Project`. */
    const traitHits: SearchTraitResult[] = [];
    if (parsed.terms.length > 0 && parsed.terms.join(' ').length >= 3) {
      const tq = parsed.terms.join(' ');
      outer: for (const p of allProjects()) {
        for (const trait of p.traitSchema?.traits ?? []) {
          for (const v of trait.values) {
            const vl = v.toLowerCase();
            if (vl === tq || (tq.length >= 4 && vl.includes(tq))) {
              traitHits.push({
                project_id: p.slug,
                project_title: p.displayName,
                trait_name: trait.name,
                value: v,
              });
              if (traitHits.length >= 4) break outer;
            }
          }
        }
      }
    }

    /* A term (or @handle / project:) that is itself a project slug narrows
       artwork search ("prisms 42", "@prisms #7", "project:prisms listed"). */
    const slugHints = parsed.terms.filter((t) => !!getProject(t));
    if (parsed.handle && getProject(parsed.handle)) slugHints.push(parsed.handle);
    if (parsed.project && getProject(parsed.project)) slugHints.push(parsed.project);
    const artistSlugs = parsed.byArtist
      ? projectsByArtist(parsed.byArtist).map((p) => p.slug)
      : [];
    const artworkScope = slugHints.length > 0 ? slugHints
      : artistSlugs.length > 0 ? artistSlugs
      : null;

    /* Price bounds without a market word imply "for sale". */
    const market =
      parsed.market ?? ((parsed.priceMax != null || parsed.priceMin != null) ? 'listed' : null);

    /* ── The parallel fan-out ─────────────────────────────────────────── */

    const hasOperators =
      !!market || !!parsed.holder || !!parsed.byArtist || !!parsed.project ||
      parsed.sort !== null || parsed.followersMin !== null;
    const wantText =
      (parsed.terms.length > 0 || parsed.handle !== null ||
        (!parsed.visual && !hasOperators && !parsed.tokenId && !parsed.address &&
          !parsed.ens && !parsed.trueName)) &&
      textQ.length >= MIN_QUERY;

    const PROJECT_COLS =
      'id, title, handle, artist_address, minted_count, max_supply, floor_price_eth, volume_eth, all_time_high_eth';

    const projectNameQ = wantText
      ? supabase.from('projects').select(PROJECT_COLS)
          .or(`title.ilike.${pattern},handle.ilike.${pattern},id.ilike.${pattern}`)
          .limit(16)
      : null;

    const projectDeepQ = wantText && textQ.length >= 3
      ? supabase.from('projects').select(PROJECT_COLS)
          .ilike('description', `%${textQ.replace(/[%_\\]/g, '\\$&')}%`)
          .limit(6)
      : null;

    const projectSlugQ = extraSlugs.size > 0
      ? supabase.from('projects').select(PROJECT_COLS)
          .in('id', Array.from(extraSlugs))
          .limit(16)
      : null;

    const userFilters: string[] = [];
    if (wantText) {
      userFilters.push(`ens_name.ilike.${pattern}`, `handle.ilike.${pattern}`);
    }
    if (parsed.address) userFilters.push(`address.ilike.${ilikePattern(parsed.address)}`);
    if (parsed.ens) userFilters.push(`ens_name.ilike.${ilikePattern(parsed.ens)}`);
    if (parsed.holder && !parsed.holder.startsWith('0x')) {
      userFilters.push(`handle.ilike.${ilikePattern(parsed.holder)}`);
    }
    const userQ = userFilters.length > 0
      ? supabase.from('users').select('address, ens_name, handle')
          .or(userFilters.join(','))
          .limit(16)
      : null;

    /* Artworks — direct token ref / Reads-As sentence / fingerprint facets. */

    let tokenQ = null;
    if (trueNameOutput) {
      tokenQ = supabase.from('outputs').select(OUTPUT_COLS)
        .eq('project_id', trueNameOutput.slug)
        .eq('token_id', trueNameOutput.tokenId)
        .limit(1);
    } else if (parsed.tokenId) {
      let b = supabase.from('outputs').select(OUTPUT_COLS).eq('token_id', parsed.tokenId);
      if (artworkScope) b = b.in('project_id', artworkScope);
      tokenQ = b.limit(ARTWORK_LIMIT);
    }

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
      if (artworkScope) b = b.in('project_id', artworkScope);
      sceneQ = b.limit(ARTWORK_LIMIT);
    }

    let facetQ = null;
    const wantFacets =
      parsed.colors.length > 0 || Object.keys(parsed.bands).length > 0 ||
      (artworkScope !== null && (parsed.sort === 'rarity' || parsed.sort === 'recent'));
    if (wantFacets) {
      let b = supabase.from('outputs').select(OUTPUT_COLS);
      if (parsed.colors.length > 0) {
        const list = parsed.colors.join(',');
        b = b.or(`dominant_color.in.(${list}),accent_color.in.(${list})`);
      }
      for (const [col, vals] of Object.entries(parsed.bands)) {
        b = b.in(col, vals);
      }
      if (artworkScope) b = b.in('project_id', artworkScope);
      if (parsed.sort === 'rarity') b = b.order('rarity_score', { ascending: false, nullsFirst: false });
      if (parsed.sort === 'recent') b = b.order('minted_at', { ascending: false, nullsFirst: false });
      facetQ = b.limit(ARTWORK_LIMIT * 2);
    }

    /* Market lanes — the ledger mirror (listings / events / offers). */
    let listedQ = null;
    let soldQ = null;
    let offersQ = null;
    if (market === 'listed') {
      let b = supabase.from('listings')
        .select('project_id, token_id, price_eth')
        .eq('active', true);
      if (parsed.priceMax != null) b = b.lte('price_eth', parsed.priceMax);
      if (parsed.priceMin != null) b = b.gte('price_eth', parsed.priceMin);
      if (artworkScope) b = b.in('project_id', artworkScope);
      listedQ = b
        .order('price_eth', { ascending: parsed.sort === 'price' ? false : true })
        .limit(ARTWORK_LIMIT);
    }
    if (market === 'sold') {
      let b = supabase.from('events')
        .select('project_id, token_id, price_eth, timestamp')
        .eq('type', 'SALE');
      if (parsed.priceMax != null) b = b.lte('price_eth', parsed.priceMax);
      if (parsed.priceMin != null) b = b.gte('price_eth', parsed.priceMin);
      if (artworkScope) b = b.in('project_id', artworkScope);
      soldQ = b.order('timestamp', { ascending: false }).limit(ARTWORK_LIMIT);
    }
    if (market === 'offers') {
      let b = supabase.from('offers')
        .select('project_id, token_id, price_eth')
        .eq('status', 'open');
      if (parsed.priceMax != null) b = b.lte('price_eth', parsed.priceMax);
      if (parsed.priceMin != null) b = b.gte('price_eth', parsed.priceMin);
      if (artworkScope) b = b.in('project_id', artworkScope);
      offersQ = b.order('price_eth', { ascending: false }).limit(ARTWORK_LIMIT);
    }

    /* Holder-by-address lane (holder:0x…). Handle form resolves after the
       user lane returns. */
    const holderQ = parsed.holder?.startsWith('0x')
      ? supabase.from('holders')
          .select('project_id, token_id')
          .ilike('owner_address', `${parsed.holder.replace(/[%_\\]/g, '\\$&')}%`)
          .limit(ARTWORK_LIMIT)
      : null;

    const [projName, projDeep, projSlug, userRes, tokRes, sceneRes, facetRes, listedRes, soldRes, offersRes, holderRes] =
      await Promise.all([
        projectNameQ, projectDeepQ, projectSlugQ, userQ, tokenQ, sceneQ, facetQ, listedQ, soldQ, offersQ, holderQ,
      ]);

    for (const r of [projName, projDeep, projSlug, userRes, tokRes, sceneRes, facetRes, listedRes, soldRes, offersRes, holderRes]) {
      if (r?.error) return serverError(r.error.message);
    }

    /* ── Projects: merge + rank (popularity = volume, then minted) ────── */

    const projMap = new Map<string, SearchProjectResult & { score: number; vol: number }>();
    const projRows = new Map<string, ProjectRowLite>();
    const addProject = (row: ProjectRowLite, score: number, match?: string) => {
      projRows.set(row.id, row);
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
        vol: Number(row.volume_eth ?? 0) || 0,
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

    /* Fuzzy fallback — typo forgiveness over the registry names. */
    if (projMap.size === 0 && parsed.terms.length > 0 && textQ.length >= 3) {
      const fuzzed: string[] = [];
      for (const p of allProjects()) {
        const cands = [p.slug, p.displayName.toLowerCase(), p.artistHandle.toLowerCase()];
        if (cands.some((c) => editDistance(c, textQ, 2) <= 2)) fuzzed.push(p.slug);
        if (fuzzed.length >= 6) break;
      }
      if (fuzzed.length > 0) {
        const { data, error } = await supabase
          .from('projects').select(PROJECT_COLS).in('id', fuzzed);
        if (error) return serverError(error.message);
        for (const row of (data ?? []) as ProjectRowLite[]) {
          addProject(row, 30, 'close match');
        }
      }
    }

    const projects = Array.from(projMap.values())
      .sort((a, b) => b.score - a.score || b.vol - a.vol || b.minted_count - a.minted_count)
      .slice(0, PROJECT_LIMIT)
      .map(({ score: _s, vol: _v, ...rest }) => rest);

    /* ── Users: rank, fuzzy fallback, enrich with the stats row ───────── */

    type UserRowLite = { address: string; ens_name: string | null; handle: string | null };
    let userRows = (userRes?.data ?? []) as UserRowLite[];

    if (userRows.length === 0 && wantText && parsed.terms.length > 0 && textQ.length >= 3) {
      // Fuzzy over the (small) users table — typo forgiveness for @names.
      const { data, error } = await supabase
        .from('users').select('address, ens_name, handle')
        .not('handle', 'is', null)
        .limit(500);
      if (error) return serverError(error.message);
      userRows = ((data ?? []) as UserRowLite[]).filter(
        (u) => u.handle && editDistance(u.handle.toLowerCase(), textQ, 2) <= 2
      );
    }

    const usersRanked = userRows
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
      if (parsed.followersMin !== null) {
        users = users.filter((u) => u.followers >= (parsed.followersMin ?? 0));
      }
      if (parsed.sort === 'followers') {
        users.sort((a, b) => b.followers - a.followers);
      }
    }

    /* Holder-by-@name lane resolves through the matched user. */
    let holderPairs = (holderRes?.data ?? []) as Array<{ project_id: string; token_id: string }>;
    if (parsed.holder && !parsed.holder.startsWith('0x')) {
      const holderUser = users.find((u) => u.handle?.toLowerCase() === parsed.holder);
      if (holderUser) {
        const { data, error } = await supabase
          .from('holders').select('project_id, token_id')
          .eq('owner_address', holderUser.address.toLowerCase())
          .limit(ARTWORK_LIMIT);
        if (error) return serverError(error.message);
        holderPairs = (data ?? []) as Array<{ project_id: string; token_id: string }>;
      }
    }

    /* ── Artworks: union all lanes, best reason wins ──────────────────── */

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
    const addArtwork = (key: { project_id: string; token_id: string }, score: number, label: string) => {
      const k = `${key.project_id}:${key.token_id}`;
      const prev = artMap.get(k);
      if (prev && prev.score >= score) return;
      artMap.set(k, {
        project_id: key.project_id,
        token_id: key.token_id,
        project_title: getProject(key.project_id)?.displayName ?? key.project_id.toUpperCase(),
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
    // Market lanes outrank facets — their state IS the reason they matched.
    for (const row of (listedRes?.data ?? []) as Array<{ project_id: string; token_id: string; price_eth: string }>) {
      addArtwork(row, 85, `✹${VS15} ${fmtEth(row.price_eth)} ETH`);
    }
    for (const row of (soldRes?.data ?? []) as Array<{ project_id: string; token_id: string; price_eth: string }>) {
      addArtwork(row, 84, `✶${VS15} sold ${fmtEth(row.price_eth)} ETH`);
    }
    for (const row of (offersRes?.data ?? []) as Array<{ project_id: string; token_id: string; price_eth: string }>) {
      addArtwork(row, 83, `✦${VS15} offer ${fmtEth(row.price_eth)} ETH`);
    }
    for (const row of holderPairs) {
      addArtwork(row, 82, `⌂${VS15} @${parsed.holder}`);
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

    /* ── Inline answers — the ledger speaks (floor / volume / ath / who
       holds / spent / collected / followers) ──────────────────────────── */

    const answers: SearchAnswer[] = [];
    const termSet = new Set(parsed.terms);
    const topProjRow = projects[0] ? projRows.get(projects[0].id) : undefined;
    if (topProjRow) {
      const title = projects[0].title;
      if (termSet.has('floor')) {
        answers.push({ text: `${title} floor — ⟠${VS15} ${fmtEth(topProjRow.floor_price_eth)}`, href: `/art/${topProjRow.id}` });
      }
      if (termSet.has('volume')) {
        answers.push({ text: `${title} volume — ⟠${VS15} ${fmtEth(topProjRow.volume_eth)}`, href: `/art/${topProjRow.id}` });
      }
      if (termSet.has('ath')) {
        answers.push({ text: `${title} all-time high — ⟠${VS15} ${fmtEth(topProjRow.all_time_high_eth)}`, href: `/art/${topProjRow.id}` });
      }
    }
    if ((termSet.has('holds') || termSet.has('holder') || termSet.has('owns') || termSet.has('owner')) &&
        parsed.tokenId && slugHints.length > 0) {
      const { data: hData } = await supabase
        .from('holders').select('owner_address')
        .eq('project_id', slugHints[0])
        .eq('token_id', parsed.tokenId)
        .limit(1);
      const owner = ((hData ?? []) as Array<{ owner_address: string }>)[0]?.owner_address;
      if (owner) {
        const { data: uData } = await supabase
          .from('users').select('handle').eq('address', owner.toLowerCase()).limit(1);
        const h = ((uData ?? []) as Array<{ handle: string | null }>)[0]?.handle ?? undefined;
        const title = getProject(slugHints[0])?.displayName ?? slugHints[0];
        answers.push({
          text: `${title.charAt(0)}${title.slice(1).toLowerCase()} #${parsed.tokenId} — held by ${h ? `@${h}` : `${owner.slice(0, 6)}…${owner.slice(-4)}`}`,
          href: h ? `/${h}` : `/${owner}`,
        });
      }
    }
    if (users[0]?.handle) {
      const u = users[0];
      if (termSet.has('spent')) {
        answers.push({ text: `@${u.handle} spent — ⟠${VS15} ${u.spent_eth.toFixed(2)}`, href: `/${u.handle}` });
      }
      if (termSet.has('collected')) {
        answers.push({ text: `@${u.handle} collected — ⬚${VS15} ${u.collected}`, href: `/${u.handle}` });
      }
      if (termSet.has('followers') && parsed.followersMin === null) {
        answers.push({ text: `@${u.handle} followers — ⚬${VS15} ${u.followers}`, href: `/${u.handle}` });
      }
    }

    const response: SearchResponse = {
      query: q,
      answers,
      projects,
      users,
      artworks,
      soundtracks: soundtrackHits,
      traits: traitHits,
    };

    /* Search log — what people type (and what came back empty) steers what
       we improve. Service-role, fire-and-forget, never blocks the response. */
    try {
      const svc = getSupabaseService();
      void svc.from('search_log')
        .insert({
          q,
          hits:
            answers.length + projects.length + users.length + artworks.length +
            soundtrackHits.length + traitHits.length,
        } as never)
        .then(() => undefined, () => undefined);
    } catch {
      /* no service key in this environment — skip logging */
    }

    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
