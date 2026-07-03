import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnon } from '@/lib/supabase';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/**
 * Public achievements profile for an address. Anon (RLS-bound) read — the
 * user_achievements + users SELECT grants are TO anon/authenticated, so this
 * needs no session.
 *
 *   unlocked    — the ids the user has unlocked (the ledger).
 *   unlockedAt  — id → ISO unlock timestamp, for "earned on" display + ordering.
 *
 * The card definitions (name/blurb/points/secret) live in code
 * (lib/achievements/catalog.ts), so the client joins these ids against the
 * catalog — we don't ship the catalog over the wire.
 */
export interface AchievementsProfileResponse {
  address: string;
  handle: string | null;
  priceScore: number;
  priceRank: number;
  priceStreak: number;
  streakBest: number;
  unlocked: string[];
  unlockedAt: Record<string, string>;
}

export async function GET(_req: NextRequest, props: { params: Promise<{ address: string }> }): Promise<NextResponse> {
  const params = await props.params;
  const address = params.address.toLowerCase();
  if (!ADDRESS_RE.test(address)) {
    return badRequest('Invalid Ethereum address');
  }

  try {
    const supabase = getSupabaseAnon();

    const [userRes, achRes] = await Promise.all([
      supabase
        .from('users')
        .select('handle, price_score, price_rank, price_streak, streak_best')
        .eq('address', address)
        .maybeSingle(),
      // user_achievements isn't in the generated Database types — cast around it.
      (supabase as unknown as ReturnType<typeof getSupabaseAnon>)
        .from('user_achievements' as never)
        .select('achievement_id, unlocked_at' as never)
        .eq('user_address' as never, address as never),
    ]);

    if (userRes.error) return serverError(userRes.error.message);
    if (achRes.error) return serverError(achRes.error.message);

    // Cast around Supabase typed-client `never` inference on column-list selects.
    const userRow = userRes.data as {
      handle: string | null;
      price_score: number | null;
      price_rank: number | null;
      price_streak: number | null;
      streak_best: number | null;
    } | null;

    const achRows = ((achRes.data ?? []) as unknown) as Array<{
      achievement_id: string;
      unlocked_at: string;
    }>;

    const unlocked: string[] = [];
    const unlockedAt: Record<string, string> = {};
    for (const r of achRows) {
      unlocked.push(r.achievement_id);
      unlockedAt[r.achievement_id] = r.unlocked_at;
    }

    const response: AchievementsProfileResponse = {
      address,
      handle: userRow?.handle ?? null,
      priceScore: userRow?.price_score ?? 0,
      priceRank: userRow?.price_rank ?? 0,
      priceStreak: userRow?.price_streak ?? 0,
      streakBest: userRow?.streak_best ?? 0,
      unlocked,
      unlockedAt,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
