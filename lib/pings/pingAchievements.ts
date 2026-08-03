// lib/pings/pingAchievements.ts — server-only.
//
// Emit the self-ping for newly-unlocked achievements. Shared by the evaluate
// route and the streak-ping route (both re-evaluate and return newlyUnlocked).
// Best-effort: never throws, never blocks the response.
//
// ⛔ THE 2026-08-03 REVISION (Brendon: "totally revise pings for these. No
// push no badge just in app and not even all of them solely '4 new
// achievements'"). The whole delivery, and it is deliberately quiet:
//
//   • ONE ROLLED ROW, EVER. Every unlock folds into the recipient's single
//     open (unread) ACHIEVEMENT row — the row reads "4 new achievements",
//     names nothing, and keeps counting until it is read. Reading it closes
//     the batch; the next unlock starts a fresh count.
//   • IN-APP ONLY. No native push (createPing skips ACHIEVEMENT), no unread
//     badge (both count endpoints exclude the kind), no in-app toast
//     (PriceRankSync stopped popping unlocks, PingsContext skips the kind).
//   • THE ROW OPENS THE PING CARD. The card lists the batch; tapping any
//     entry lands on the achievements tab of your profile.

import { getSupabaseService } from '@/lib/supabase';
import { createPing } from '@/lib/pings/createPing';

/** How many of the batch ride the row's data for the ping card to list.
 *  The count is always the real total; only the listing is capped. */
const MAX_LISTED = 30;

export interface UnlockedLike {
  id: string;
  name: string;
  points: number;
  icon?: string;
}

interface ListedUnlock {
  id: string;
  name: string;
  points: number;
  icon?: string;
}

export async function pingAchievements(
  recipientAddress: string,
  newlyUnlocked: UnlockedLike[]
): Promise<void> {
  if (newlyUnlocked.length === 0) return;
  try {
    const db = getSupabaseService();
    const recipient = recipientAddress.toLowerCase();
    const unlocks: ListedUnlock[] = newlyUnlocked.map((a) => ({
      id: a.id,
      name: a.name,
      points: a.points,
      ...(a.icon ? { icon: a.icon } : {}),
    }));

    // Fold into the open (unread) rollup row when one exists — the inbox
    // holds ONE achievements row at a time, and it counts.
    const { data: existing } = await db
      .from('pings')
      .select('id, data')
      .eq('recipient_address', recipient)
      .eq('kind', 'ACHIEVEMENT')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    const row = existing as { id: string; data: Record<string, unknown> } | null;

    if (row) {
      const prev = (row.data ?? {}) as Record<string, unknown>;
      const prevList = Array.isArray(prev.unlocks) ? (prev.unlocks as ListedUnlock[]) : [];
      const prevCount =
        typeof prev.count === 'number' ? (prev.count as number) : Math.max(prevList.length, 1);
      const nowIso = new Date().toISOString();
      await db
        .from('pings')
        .update({
          // Resurface to the top with the new total.
          created_at: nowIso,
          updated_at: nowIso,
          data: {
            count: prevCount + unlocks.length,
            unlocks: [...unlocks, ...prevList].slice(0, MAX_LISTED),
          },
        } as never)
        .eq('id', row.id);
      return;
    }

    await createPing({
      recipientAddress,
      kind: 'ACHIEVEMENT',
      actorAddress: null,
      actorName: null,
      data: {
        count: unlocks.length,
        unlocks: unlocks.slice(0, MAX_LISTED),
      },
    });
  } catch {
    /* best-effort — an achievements ping never breaks the action it rides */
  }
}
