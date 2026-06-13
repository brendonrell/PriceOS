// Batch-resolve the from/to wallet addresses on a page of feed events to their
// claimed @handles, in a single users query. Mutates each EventRow in place,
// setting from_handle / to_handle (null when the wallet has no claimed handle).
// Shared by /api/feed and /api/project/[slug]/feed so the activity rows can
// render "@you collected #12" instead of a raw 0x address.

import type { getSupabaseService, EventRow } from '@/lib/supabase';

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
    .select('address, handle')
    .in('address', Array.from(addrs));
  if (error) return; // best-effort — fall back to raw addresses on the client

  // Key by lowercase so a case difference between events + users still matches.
  const byAddr = new Map<string, string>();
  for (const u of (data ?? []) as { address: string; handle: string | null }[]) {
    if (u.address && u.handle) byAddr.set(u.address.toLowerCase(), u.handle);
  }
  for (const e of events) {
    e.from_handle = e.from_address ? (byAddr.get(e.from_address.toLowerCase()) ?? null) : null;
    e.to_handle = e.to_address ? (byAddr.get(e.to_address.toLowerCase()) ?? null) : null;
  }
}
