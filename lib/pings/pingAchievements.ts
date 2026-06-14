// lib/pings/pingAchievements.ts — server-only.
//
// Emit a self-ping for each newly-unlocked achievement. Shared by the evaluate
// route and the streak-ping route (both re-evaluate and return newlyUnlocked).
// Best-effort: never throws, never blocks the response.

import { createPing } from '@/lib/pings/createPing';

export interface UnlockedLike {
  id: string;
  name: string;
  points: number;
  icon?: string;
}

export async function pingAchievements(
  recipientAddress: string,
  newlyUnlocked: UnlockedLike[]
): Promise<void> {
  for (const a of newlyUnlocked) {
    await createPing({
      recipientAddress,
      kind: 'ACHIEVEMENT',
      actorAddress: null,
      actorName: null,
      data: { achievement_id: a.id, name: a.name, points: a.points, icon: a.icon ?? null },
    });
  }
}
