/*
 * lib/market/traitMatch — SERVER-ONLY trait-criteria resolution for offers.
 *
 * A trait offer targets every minted piece whose platform traits carry
 * {category: value} — the same server-computed traits the output page shows
 * (outputTraits: Artist / Project / PriceDay / Sun / Moon / Rising / Fate…,
 * seeded by the mint moment stored on outputs.minted_at). Chain offers commit
 * to the matching set via merkle root at signing time; sim offers re-validate
 * the owner's chosen token here at accept.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getProject, outputTraits } from '@/lib/project/registry';

async function mintedAtMap(db: SupabaseClient, slug: string): Promise<Map<number, number>> {
  const r = await db
    .from('outputs')
    .select('token_id, minted_at')
    .eq('project_id', slug)
    .not('minted_at', 'is', null);
  const m = new Map<number, number>();
  for (const row of (r.data ?? []) as { token_id: string; minted_at: string }[]) {
    const ms = Date.parse(row.minted_at);
    if (Number.isFinite(ms)) m.set(Number(row.token_id), ms);
  }
  return m;
}

/** Every minted token id in `slug` whose `category` trait equals `value`. */
export async function traitIdentifiers(
  db: SupabaseClient,
  slug: string,
  category: string,
  value: string,
): Promise<string[]> {
  if (!getProject(slug)) return [];
  const proj = await db.from('projects').select('minted_count').eq('id', slug).maybeSingle();
  const minted = Number((proj.data as { minted_count?: number } | null)?.minted_count ?? 0);
  if (minted <= 0) return [];
  const mintedAt = await mintedAtMap(db, slug);
  const out: string[] = [];
  for (let id = 1; id <= minted; id++) {
    const traits = outputTraits(slug, id, mintedAt.get(id));
    if (traits[category] === value) out.push(String(id));
  }
  return out;
}

/** Does one token match the trait criteria? */
export async function tokenMatchesTrait(
  db: SupabaseClient,
  slug: string,
  tokenId: string,
  category: string,
  value: string,
): Promise<boolean> {
  if (!getProject(slug)) return false;
  const r = await db
    .from('outputs')
    .select('minted_at')
    .eq('project_id', slug)
    .eq('token_id', tokenId)
    .maybeSingle();
  const raw = (r.data as { minted_at?: string | null } | null)?.minted_at;
  const ms = raw ? Date.parse(raw) : undefined;
  const traits = outputTraits(slug, Number(tokenId), Number.isFinite(ms as number) ? (ms as number) : undefined);
  return traits[category] === value;
}
