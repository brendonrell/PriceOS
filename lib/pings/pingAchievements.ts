// lib/pings/pingAchievements.ts — server-only.
//
// Emit the self-ping for newly-unlocked achievements. Shared by the evaluate
// route and the streak-ping route (both re-evaluate and return newlyUnlocked).
// Best-effort: never throws, never blocks the response.
//
// ⛔ THE CADENCE (Brendon, 2026-08-01: "I get too many achievements pings…
// they are too front loaded and just annoying"). Two rules, and they are the
// whole of it:
//
//   1. ONE PING PER EVALUATION, EVER. Unlocks arrive in bursts — a single mint
//      can trip a count rung, a spend rung and a distinct-projects rung at
//      once, and seven conditions in the catalog are shared by two trophies
//      apiece, so one action could drop half a dozen separate rows in the
//      inbox. They roll into one ping now, led by the biggest.
//   2. THE CHEAP RUNGS DON'T INTERRUPT. Anything under the floor still
//      unlocks, still scores, still lands on the wall — it just doesn't ping
//      on its own. That is what the day-one flood was: twenty-point trophies
//      for listing a piece or claiming a name, all popping in the first
//      session. A burst carrying something real still pings, and still counts
//      the small ones in its total.

import { createPing } from '@/lib/pings/createPing';

/** Under this, an unlock is silent unless it rides in with a real one. */
const PING_FLOOR_POINTS = 50;

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
  if (newlyUnlocked.length === 0) return;

  // Nothing above the floor landed — the wall records it, the inbox stays quiet.
  const worth = newlyUnlocked.filter((a) => a.points >= PING_FLOOR_POINTS);
  if (worth.length === 0) return;

  // The biggest one leads, and the ping opens onto it.
  const lead = worth.reduce((best, a) => (a.points > best.points ? a : best), worth[0]);
  const points = newlyUnlocked.reduce((n, a) => n + a.points, 0);

  await createPing({
    recipientAddress,
    kind: 'ACHIEVEMENT',
    actorAddress: null,
    actorName: null,
    data: {
      achievement_id: lead.id,
      name: lead.name,
      points,
      icon: lead.icon ?? null,
      /* How many landed together — the row says so when it is more than one. */
      count: newlyUnlocked.length,
    },
  });
}
