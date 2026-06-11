/*
 * Artist allowlist — sim stand-in for the on-chain whitelist.
 *
 * On mainnet the PDFactory contract is the source of truth for who may
 * create Projects; until the indexer wires that up, the `artist_allowlist`
 * table plays its role 1:1 (a row = a whitelisted wallet). All reads here
 * are server-side, anon client, RLS-bound.
 *
 * Status semantics (core PD spec, mirrored from the sim):
 *   active   — whitelisted, mintable now            → ☼
 *   cooldown — whitelisted, inside the 60-day cooldown that starts when
 *              they UPLOAD a project (any of their projects has
 *              cooldown_until in the future) → ☽
 *   null     — not on the whitelist (no badge, not on /artists)
 */

import { getSupabaseAnon } from '@/lib/supabase';

export type ArtistStatus = 'active' | 'cooldown';

export interface AllowlistedArtist {
  address: string;
  handle: string | null;
  ens_name: string | null;
  status: ArtistStatus;
}

/** Whitelist + cooldown status for one wallet. Null = not whitelisted. */
export async function getArtistStatus(
  rawAddress: string,
): Promise<ArtistStatus | null> {
  const address = rawAddress.toLowerCase();
  const supabase = getSupabaseAnon();

  const { data: allow, error: allowErr } = await supabase
    .from('artist_allowlist')
    .select('address')
    .eq('address', address)
    .maybeSingle();
  if (allowErr) throw new Error(allowErr.message);
  if (!allow) return null;

  const { data: cooling, error: coolErr } = await supabase
    .from('projects')
    .select('id')
    .eq('artist_address', address)
    .gt('cooldown_until', new Date().toISOString())
    .limit(1);
  if (coolErr) throw new Error(coolErr.message);
  return (cooling?.length ?? 0) > 0 ? 'cooldown' : 'active';
}

/** Every whitelisted artist with handle/ens + live status, handle-sorted. */
export async function getAllowlistedArtists(): Promise<AllowlistedArtist[]> {
  const supabase = getSupabaseAnon();

  const { data: allow, error: allowErr } = await supabase
    .from('artist_allowlist')
    .select('address');
  if (allowErr) throw new Error(allowErr.message);
  const addresses = (allow ?? []).map((r) => (r as { address: string }).address);
  if (addresses.length === 0) return [];

  const [usersRes, coolRes] = await Promise.all([
    supabase.from('users').select('address, handle, ens_name').in('address', addresses),
    supabase
      .from('projects')
      .select('artist_address')
      .in('artist_address', addresses)
      .gt('cooldown_until', new Date().toISOString()),
  ]);
  if (usersRes.error) throw new Error(usersRes.error.message);
  if (coolRes.error) throw new Error(coolRes.error.message);

  const byAddress = new Map(
    ((usersRes.data ?? []) as { address: string; handle: string | null; ens_name: string | null }[])
      .map((u) => [u.address, u]),
  );
  const cooling = new Set(
    ((coolRes.data ?? []) as { artist_address: string }[]).map((p) => p.artist_address),
  );

  return addresses
    .map((address) => {
      const u = byAddress.get(address);
      return {
        address,
        handle: u?.handle ?? null,
        ens_name: u?.ens_name ?? null,
        status: (cooling.has(address) ? 'cooldown' : 'active') as ArtistStatus,
      };
    })
    .sort((a, b) => (a.handle ?? a.address).localeCompare(b.handle ?? b.address));
}
