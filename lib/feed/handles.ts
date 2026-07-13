// Batch-resolve the from/to wallet addresses on a page of feed events to their
// claimed @handles, in a single users query. Mutates each EventRow in place,
// setting from_handle / to_handle (null when the wallet has no claimed handle).
// Shared by /api/feed and /api/project/[slug]/feed so the activity rows can
// render "@you collected #12" instead of a raw 0x address.
//
// Since the SIGIL build (2026-07-13) the same query also attaches each
// wallet's forged mark + faction ink (from_sigil / to_sigil) — the tape's
// after-the-@name slot. Unforged wallets stay null; nothing else changes.

import type { getSupabaseService, EventRow } from '@/lib/supabase';
import { sigilFor, SIGIL_BONE } from '@/lib/sigil/sigil';
import { factionForLogo } from '@/lib/factions/factions';

type Db = ReturnType<typeof getSupabaseService>;

export async function attachHandles(db: Db, events: EventRow[]): Promise<void> {
  const addrs = new Set<string>();
  for (const e of events) {
    if (e.from_address) addrs.add(e.from_address);
    if (e.to_address) addrs.add(e.to_address);
  }
  if (addrs.size === 0) return;

  const { data, error } = await db
    .from('users')
    .select('address, handle, sigil_forged_at, profile_logo')
    .in('address', Array.from(addrs));
  if (error) return; // best-effort — fall back to raw addresses on the client

  // Key by lowercase so a case difference between events + users still matches.
  const byAddr = new Map<string, string>();
  const sigilBy = new Map<string, { mark: string; hex: string }>();
  for (const u of (data ?? []) as {
    address: string;
    handle: string | null;
    sigil_forged_at: string | null;
    profile_logo: string | null;
  }[]) {
    if (!u.address) continue;
    const key = u.address.toLowerCase();
    if (u.handle) byAddr.set(key, u.handle);
    if (u.sigil_forged_at) {
      sigilBy.set(key, {
        mark: sigilFor(u.address),
        hex: factionForLogo(u.profile_logo)?.hex ?? SIGIL_BONE,
      });
    }
  }
  for (const e of events) {
    e.from_handle = e.from_address ? (byAddr.get(e.from_address.toLowerCase()) ?? null) : null;
    e.to_handle = e.to_address ? (byAddr.get(e.to_address.toLowerCase()) ?? null) : null;
    e.from_sigil = e.from_address ? (sigilBy.get(e.from_address.toLowerCase()) ?? null) : null;
    e.to_sigil = e.to_address ? (sigilBy.get(e.to_address.toLowerCase()) ?? null) : null;
  }
}
