// Project outputs + stats — real DB read. Returns per-token ownership from
// `holders` (joined to `users` for handles), active listing prices, the project
// minted count + showcase ids, and aggregate stats (collectors, volume, floor)
// plus a follow-graph "collected by" (collectors the viewer follows).
//
// This is the ONE canonical project-outputs endpoint, fetched by
// lib/state/ProjectContext.tsx. (It replaced an old indexer-mock stub that
// hardcoded total: 500, which forced every project to read as SOLD OUT.)

import { type NextRequest, NextResponse } from 'next/server';
import { badRequest, serverError } from '@/lib/errors';
import { getSupabaseService } from '@/lib/supabase';
import { verifySiweSession } from '@/lib/auth/siwe';
import { normalizePlaylistId } from '@/lib/project/soundtrack';
import { projectSpriteFace } from '@/lib/project/projectSprite';
import { rankSocialCandidates } from '@/lib/social/relevance';

export const revalidate = 0;
export const dynamic = 'force-dynamic';

export interface OutputOwner {
  token_id: number;
  owner: string;
  owner_handle: string | null;
  /** Owner account creation (users.created_at) — feeds the My Network
      'New Wallets' filter client-side. Null when the wallet has no row. */
  owner_created_at: string | null;
  list_price_eth: string | null;
  /** What the current owner paid — the newest priced XFER for this token.
      Null when never sold (still with a minter, or no priced XFER on
      record). Powers the $PRICE sort's unlisted tier. */
  spent_eth: string | null;
  /** Mint moment, unix seconds — null if never indexed. Feeds Sun/Moon/
      Rising/PriceDay for Composer's cross-project dataset. */
  mint_ts: number | null;
}

export interface ProjectStats {
  /** Distinct owner wallets. */
  collectors: number;
  /** Trading volume in ETH (sum of priced events). */
  volume_eth: string;
  /** Lowest active listing, or null. */
  floor_eth: string | null;
  /** Followers — wallets following this project (project_follows rows). */
  followers: number;
  /** Collectors the viewer follows (handles, @-prefixed). Empty if signed out
      or following none — the hero "Collected by" row is follow-graph only. */
  collected_by_following: string[];
}

export interface ProjectOutputsResponse {
  project_id: string;
  /** Minted count (NOT total supply). The hero reads this as
      `mintedCount`; sold-out is mintedCount >= maxSupply, where maxSupply
      comes from the registry. A fresh project returns 0 here. */
  total: number;
  showcase_ids: number[];
  /** Artist Showcase presentation (2026-07-20): layout · little titles ·
      the Gen Curated placard caption (null = no placard). */
  showcase_layout: 'classic' | 'masonry' | 'mixed';
  showcase_titles: boolean;
  showcase_caption: string | null;
  /** Bare YouTube playlist id (normalized) or null — the project's soundtrack,
      sourced from the DB `projects.soundtrack` column. */
  soundtrack: string | null;
  /** Signature colour hex from the DB `projects.custom_color` column, or null.
      The registry colorway is the fallback when this is absent. */
  colorway: string | null;
  /** The project's stored PriceSprite (projects.price_sprite) — projects carry
      one like users do, fetchable the same way (Brendon 2026-06-19). */
  price_sprite: string | null;
  outputs: OutputOwner[];
  stats: ProjectStats;
}

export async function GET(req: NextRequest, props: { params: Promise<{ slug: string }> }): Promise<NextResponse> {
  const params = await props.params;
  if (!params.slug) return badRequest('Missing project slug');
  const slug = params.slug.toLowerCase();

  try {
    const supabase = getSupabaseService();

    const [projectRes, holdersRes, listingsRes, eventsRes, followsRes, salesRes, mintsRes] = await Promise.all([
      supabase.from('projects').select('minted_count, showcase_ids, showcase_layout, showcase_titles, showcase_caption, soundtrack, custom_color, price_sprite').eq('id', slug).maybeSingle(),
      supabase.from('holders').select('token_id, owner_address').eq('project_id', slug),
      supabase.from('listings').select('token_id, price_eth').eq('project_id', slug).eq('active', true)
        .or(`end_time.is.null,end_time.gt.${Math.floor(Date.now() / 1000)}`),
      supabase.from('events').select('price_eth').eq('project_id', slug).not('price_eth', 'is', null),
      supabase.from('project_follows').select('*', { count: 'exact', head: true }).eq('project_id', slug),
      // What the CURRENT owner spent on each unlisted piece — newest priced
      // XFER per token (mirrors the single-Output market route's last_sale).
      // Feeds the $PRICE sort's second tier (unlisted-by-spent).
      supabase.from('events').select('token_id, price_eth, timestamp').eq('project_id', slug).eq('type', 'XFER')
        .not('price_eth', 'is', null).order('timestamp', { ascending: false }),
      // Mint moment per token — feeds the birth-traits (Sun/Moon/Rising/
      // PriceDay), which need a real mint timestamp to compute. Composer
      // reads this across every project (Brendon, 2026-08-15).
      supabase.from('events').select('token_id, timestamp').eq('project_id', slug).eq('type', 'MINT'),
    ]);

    if (projectRes.error) return serverError(projectRes.error.message);
    if (holdersRes.error) return serverError(holdersRes.error.message);
    // Floor + volume feed visible card prices — surface a failure rather than
    // silently rendering "no floor / zero volume".
    if (listingsRes.error) return serverError(listingsRes.error.message);
    if (eventsRes.error) return serverError(eventsRes.error.message);
    if (salesRes.error) return serverError(salesRes.error.message);
    if (mintsRes.error) return serverError(mintsRes.error.message);

    // First (= newest, since salesRes is timestamp-desc) priced XFER per
    // token wins — that's what the current owner actually paid.
    const spentByToken: Record<string, string> = {};
    for (const s of (salesRes.data ?? []) as { token_id: string; price_eth: number | string }[]) {
      if (spentByToken[String(s.token_id)] === undefined) spentByToken[String(s.token_id)] = String(s.price_eth);
    }
    const mintTsByToken: Record<string, number> = {};
    for (const m of (mintsRes.data ?? []) as { token_id: string; timestamp: number | string }[]) {
      mintTsByToken[String(m.token_id)] = Number(m.timestamp);
    }

    const project = projectRes.data as { minted_count?: number; showcase_ids?: number[]; showcase_layout?: string | null; showcase_titles?: boolean | null; showcase_caption?: string | null; soundtrack?: string | null; custom_color?: string | null; price_sprite?: string | null } | null;
    const holders = (holdersRes.data ?? []) as { token_id: string; owner_address: string }[];

    // PriceSprite — projects carry one like users. Self-heal: if the row exists
    // but has no stored sprite yet (a freshly-added project), compute the
    // deterministic face and persist it once (fire-and-forget), so every project
    // ends up with a stored, fetchable sprite without a creation hook
    // (Brendon 2026-06-19).
    const priceSprite = project?.price_sprite ?? projectSpriteFace(slug);
    if (project && !project.price_sprite && priceSprite) {
      supabase.from('projects').update({ price_sprite: priceSprite } as never).eq('id', slug).then(() => {}, () => {});
    }

    const priceByToken: Record<string, string> = {};
    let floor: number | null = null;
    for (const l of (listingsRes.data ?? []) as { token_id: string; price_eth: number | string }[]) {
      const p = Number(l.price_eth);
      priceByToken[String(l.token_id)] = String(l.price_eth);
      if (floor === null || p < floor) floor = p;
    }

    let volume = 0;
    for (const e of (eventsRes.data ?? []) as { price_eth: number | string | null }[]) {
      volume += Number(e.price_eth ?? 0);
    }

    // Resolve handles for the (small) set of distinct owners.
    const addrs = [...new Set(holders.map((h) => h.owner_address.toLowerCase()))];
    const handleByAddr: Record<string, string | null> = {};
    const createdByAddr: Record<string, string | null> = {};
    const scoreByHandle: Record<string, number> = {};
    if (addrs.length > 0) {
      const usersRes = await supabase.from('users').select('address, handle, created_at, price_score').in('address', addrs);
      if (!usersRes.error) {
        for (const u of (usersRes.data ?? []) as { address: string; handle: string | null; created_at: string | null; price_score: number | null }[]) {
          handleByAddr[u.address.toLowerCase()] = u.handle ?? null;
          createdByAddr[u.address.toLowerCase()] = u.created_at ?? null;
          if (u.handle) scoreByHandle[u.handle.toLowerCase()] = u.price_score ?? 0;
        }
      }
    }

    // Follow-graph "collected by": collectors whose @name the viewer follows,
    // RANKED by connection strength (mutual first) → PriceRank → a little jitter
    // (lib/social/relevance). Returned best-first; the hero slices the first 3,
    // 2 on phone portrait (Brendon, 2026-08-17).
    let collectedByFollowing: string[] = [];
    const viewer = await verifySiweSession(req);
    if (viewer) {
      const meRes = await supabase.from('users').select('handle').eq('address', viewer).maybeSingle();
      const myHandle = (meRes.data as { handle?: string | null } | null)?.handle ?? null;
      if (myHandle) {
        const [followingRes, followerRes] = await Promise.all([
          supabase.from('follows').select('following_name').eq('follower_name', myHandle),
          supabase.from('follows').select('follower_name').eq('following_name', myHandle),
        ]);
        const following = new Set(
          ((followingRes.data ?? []) as { following_name: string }[]).map((f) => f.following_name.toLowerCase()),
        );
        const followsMeBack = new Set(
          ((followerRes.data ?? []) as { follower_name: string }[]).map((f) => f.follower_name.toLowerCase()),
        );
        const collectorHandles = [
          ...new Set(
            Object.values(handleByAddr).filter((h): h is string => !!h).map((h) => h.toLowerCase()),
          ),
        ];
        const cands = collectorHandles
          .filter((h) => following.has(h))
          .map((h) => ({ handle: `@${h}`, priceScore: scoreByHandle[h] ?? 0, mutual: followsMeBack.has(h) }));
        collectedByFollowing = rankSocialCandidates(cands, cands.length).shown;
      }
    }

    const outputs: OutputOwner[] = holders
      .map((h) => ({
        token_id: Number(h.token_id),
        owner: h.owner_address,
        owner_handle: handleByAddr[h.owner_address.toLowerCase()] ?? null,
        owner_created_at: createdByAddr[h.owner_address.toLowerCase()] ?? null,
        list_price_eth: priceByToken[String(h.token_id)] ?? null,
        spent_eth: spentByToken[String(h.token_id)] ?? null,
        mint_ts: mintTsByToken[String(h.token_id)] ?? null,
      }))
      .sort((a, b) => a.token_id - b.token_id);

    const response: ProjectOutputsResponse = {
      project_id: slug,
      total: project?.minted_count ?? outputs.length,
      showcase_ids: Array.isArray(project?.showcase_ids) ? project!.showcase_ids! : [],
      showcase_layout: (project?.showcase_layout === 'masonry' || project?.showcase_layout === 'mixed') ? project.showcase_layout : 'classic',
      showcase_titles: project?.showcase_titles === true,
      showcase_caption: project?.showcase_caption ?? null,
      soundtrack: normalizePlaylistId(project?.soundtrack),
      colorway: (project?.custom_color ?? null),
      price_sprite: priceSprite,
      outputs,
      stats: {
        collectors: addrs.length,
        volume_eth: String(Number(volume.toFixed(4))),
        floor_eth: floor === null ? null : String(floor),
        followers: followsRes.count ?? 0,
        collected_by_following: collectedByFollowing,
      },
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
