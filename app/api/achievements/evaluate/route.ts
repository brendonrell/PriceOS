import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { persistEvaluation } from '@/lib/achievements/engine';
import { pingAchievements } from '@/lib/pings/pingAchievements';

export const dynamic = 'force-dynamic';

/**
 * POST body (all optional):
 *   clientGrants — achievement ids the BROWSER is asserting (konami code, found
 *   Petey, Odin/Brendon appearances, 4:20, etc.). Only ids whose catalog
 *   trigger is client-granted (CLIENT_GRANTABLE) are honoured; everything else
 *   is silently dropped server-side. The browser can never grant a
 *   server-evaluable achievement.
 */
export interface EvaluateRequestBody {
  clientGrants?: string[];
}

export interface EvaluateResponse {
  newlyUnlocked: Array<{
    id: string;
    name: string;
    blurb: string;
    points: number;
    category: string;
    secret?: boolean;
    icon?: string;
  }>;
  priceScore: number;
  priceRank: number;
}

/**
 * Re-evaluate the caller's whole achievement catalog against their current
 * on/off-chain footprint, persist any newly-unlocked rows, and recompute
 * PriceScore + PriceRank. Idempotent — safe to fire after every mint / market
 * action / follow / anoint and on profile load. Uses the service client (writes
 * the ledger + the user's score/rank).
 */
export const POST = requireAuth(async (req, _ctx, address) => {
  let clientGrants: string[] | undefined;
  // Body is optional — a bare POST is valid. Only reject malformed JSON when a
  // body was actually sent.
  const raw = await req.text();
  if (raw.trim().length > 0) {
    try {
      const body = JSON.parse(raw) as EvaluateRequestBody;
      if (body.clientGrants !== undefined) {
        if (
          !Array.isArray(body.clientGrants) ||
          !body.clientGrants.every((g) => typeof g === 'string')
        ) {
          return badRequest('`clientGrants` must be an array of strings');
        }
        clientGrants = body.clientGrants;
      }
    } catch {
      return badRequest('Invalid JSON body');
    }
  }

  try {
    const supabase = getSupabaseService();
    const { newlyUnlocked, priceScore, priceRank } = await persistEvaluation(
      supabase,
      address,
      clientGrants
    );

    // Self-ping each new unlock so it lands in the user's Pings inbox too.
    await pingAchievements(address, newlyUnlocked);

    const response: EvaluateResponse = {
      newlyUnlocked: newlyUnlocked.map((a) => ({
        id: a.id,
        name: a.name,
        blurb: a.blurb,
        points: a.points,
        category: a.category,
        secret: a.secret,
        icon: a.icon,
      })),
      priceScore,
      priceRank,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
