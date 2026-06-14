import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { computeStreakUpdate } from '@/lib/achievements/streak';
import { persistEvaluation } from '@/lib/achievements/engine';

export const dynamic = 'force-dynamic';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** POST body: the caller's LOCAL date as YYYY-MM-DD (the streak day boundary is
 *  the user's local midnight — the client supplies its own local date so the
 *  server never reads a clock). */
export interface StreakPingRequestBody {
  localDate: string;
}

export interface StreakPingResponse {
  streak: number;
  best: number;
  newlyUnlocked: Array<{
    id: string;
    name: string;
    blurb: string;
    points: number;
    category: string;
    secret?: boolean;
    icon?: string;
  }>;
}

/**
 * Record a qualifying-action ping for the streak. Computes the next streak
 * state from the stored fields + the client's local date, writes the streak
 * fields, then re-evaluates achievements (the streak.* milestones unlock off
 * the new day count). Idempotent within a local day: a second ping the same day
 * is a no-op on the streak (still safe to re-evaluate).
 */
export const POST = requireAuth(async (req, _ctx, address) => {
  let body: StreakPingRequestBody;
  try {
    body = (await req.json()) as StreakPingRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const localDate = body.localDate?.trim();
  if (!localDate || !DATE_RE.test(localDate)) {
    return badRequest('`localDate` must be a YYYY-MM-DD string');
  }

  try {
    const supabase = getSupabaseService();

    // Read the current streak fields. users isn't fully in scope for the cast
    // pattern on these progression columns — select explicitly and cast.
    const { data: userData, error: userErr } = await supabase
      .from('users')
      .select('price_streak, streak_best, streak_last_active')
      .eq('address', address)
      .maybeSingle();
    if (userErr) return serverError(userErr.message);

    const userRow = userData as {
      price_streak: number | null;
      streak_best: number | null;
      streak_last_active: string | null;
    } | null;
    if (!userRow) {
      return badRequest('No user row for the authenticated address');
    }

    const update = computeStreakUpdate({
      lastActive: userRow.streak_last_active,
      currentStreak: userRow.price_streak ?? 0,
      bestStreak: userRow.streak_best ?? 0,
      todayLocal: localDate,
    });

    // Persist the streak fields. Always stamp streak_last_active to today on a
    // new day; on a same-day ping nothing changed, so skip the write.
    if (update.isNewDay || update.changed) {
      const { error: writeErr } = await supabase
        .from('users')
        .update({
          price_streak: update.streak,
          streak_best: update.best,
          streak_last_active: localDate,
        } as never)
        .eq('address', address);
      if (writeErr) return serverError(writeErr.message);
    }

    // Re-evaluate so the streak.* achievements (60/100/180/365/…) unlock off the
    // fresh day count. persistEvaluation reads price_streak from the row we just
    // wrote.
    const { newlyUnlocked } = await persistEvaluation(supabase, address);

    const response: StreakPingResponse = {
      streak: update.streak,
      best: update.best,
      newlyUnlocked: newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        blurb: a.blurb,
        points: a.points,
        category: a.category,
        secret: a.secret,
        icon: a.icon,
      })),
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
