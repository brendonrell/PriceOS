/*
 * circleStats — the batched per-person numbers every people-row shows: the
 * SAME three the profile hero shows (Outputs Collected · Volume Spent ·
 * Followers) plus the artist flag for the ✺ badge.
 *
 * Extracted from app/api/social/circle-stats (2026-07-02) so the Followers
 * Manager route and Global Search share ONE implementation — stored + shown
 * numbers can never drift between surfaces. Logic is byte-for-byte the
 * route's original: collected + spend from `holders` (spend = Σ each held
 * project's mint price via the registry), followers from the `follows` tally
 * by @name, artist = the wallet creates at least one project.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProject } from '../project/registry';
import { isHiddenProject } from '../platform/hiddenProjects';

/** Inline stats for one person row — profile-hero parity, plus the identity
    flair the Friend Inspector wears (faction bubble + profile colorway). */
export interface CircleStat {
  handle: string | null;
  collected: number;
  spentEth: number;
  followers: number;
  isArtist: boolean;
  /** users.profile_logo — a blank-bubble pick IS the wearer's faction. */
  profileLogo: string | null;
  /** users.profile_hex — the personal generative profile colorway. */
  profileHex: string | null;
}

/** Batch the three profile stats (+ artist flag) for a list of lowercased
    addresses. Anon-safe reads only. Throws on the first Supabase error. */
export async function getCircleStats(
  supabase: SupabaseClient,
  addrs: readonly string[]
): Promise<Record<string, CircleStat>> {
  if (addrs.length === 0) return {};

  const [usersRes, holdersRes, artistRes] = await Promise.all([
    supabase.from('users').select('address, handle, profile_logo, profile_hex').in('address', addrs as string[]),
    supabase.from('holders').select('owner_address, project_id').in('owner_address', addrs as string[]),
    supabase.from('projects').select('artist_address').in('artist_address', addrs as string[]),
  ]);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (holdersRes.error) throw new Error(holdersRes.error.message);
  if (artistRes.error) throw new Error(artistRes.error.message);

  const addrToHandle = new Map<string, string>();
  const flairByAddr = new Map<string, { profileLogo: string | null; profileHex: string | null }>();
  for (const u of (usersRes.data ?? []) as Array<{
    address: string; handle: string | null; profile_logo: string | null; profile_hex: string | null;
  }>) {
    const a = u.address.toLowerCase();
    if (u.handle) addrToHandle.set(a, u.handle);
    flairByAddr.set(a, { profileLogo: u.profile_logo ?? null, profileHex: u.profile_hex ?? null });
  }
  const artistSet = new Set(
    ((artistRes.data ?? []) as Array<{ artist_address: string | null }>)
      .map((p) => p.artist_address?.toLowerCase())
      .filter((a): a is string => !!a)
  );

  const collected = new Map<string, number>();
  const spent = new Map<string, number>();
  for (const row of (holdersRes.data ?? []) as Array<{ owner_address: string; project_id: string }>) {
    const a = row.owner_address.toLowerCase();
    collected.set(a, (collected.get(a) ?? 0) + 1);
    const price = getProject(row.project_id)?.mintPriceEth ?? 0;
    spent.set(a, (spent.get(a) ?? 0) + price);
  }

  // Follower counts, by @name, for everyone who has a handle.
  const handles = Array.from(addrToHandle.values()).map((h) => h.toLowerCase());
  const followerByHandle = new Map<string, number>();
  if (handles.length > 0) {
    const { data: fData, error: fErr } = await supabase
      .from('follows')
      .select('following_name')
      .in('following_name', handles);
    if (fErr) throw new Error(fErr.message);
    for (const r of (fData ?? []) as Array<{ following_name: string | null }>) {
      const n = r.following_name?.toLowerCase();
      if (n) followerByHandle.set(n, (followerByHandle.get(n) ?? 0) + 1);
    }
  }

  // Project edges (Brendon 2026-08-16): every project a wallet HOLDS follows
  // them too, same rule the profile page and /api/user/[address] apply — a
  // row already fetched above for `collected`, so just tally distinct
  // projects per address here (hidden test projects excluded, same as the
  // profile's owned-projects count).
  const heldProjectsByAddr = new Map<string, Set<string>>();
  for (const row of (holdersRes.data ?? []) as Array<{ owner_address: string; project_id: string }>) {
    if (isHiddenProject(row.project_id)) continue;
    const a = row.owner_address.toLowerCase();
    if (!heldProjectsByAddr.has(a)) heldProjectsByAddr.set(a, new Set());
    heldProjectsByAddr.get(a)!.add(row.project_id);
  }

  const stats: Record<string, CircleStat> = {};
  for (const a of addrs) {
    const handle = addrToHandle.get(a) ?? null;
    const userFollowers = handle ? followerByHandle.get(handle.toLowerCase()) ?? 0 : 0;
    const projectFollowers = heldProjectsByAddr.get(a)?.size ?? 0;
    stats[a] = {
      handle,
      collected: collected.get(a) ?? 0,
      spentEth: Math.round((spent.get(a) ?? 0) * 1000) / 1000,
      followers: userFollowers + projectFollowers,
      isArtist: artistSet.has(a),
      profileLogo: flairByAddr.get(a)?.profileLogo ?? null,
      profileHex: flairByAddr.get(a)?.profileHex ?? null,
    };
  }
  return stats;
}
