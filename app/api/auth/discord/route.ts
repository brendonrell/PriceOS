// Discord account link — start + unlink.
//
//   GET    → begin linking. Requires a signed-in wallet. Mints a one-time
//            state token into the SIWE session and redirects the browser to
//            Discord's consent screen (scope: identify only — name + id, no
//            bot, no server access). Discord sends the user back to
//            /api/auth/discord/callback.
//   DELETE → unlink: clear the Discord name + id from the caller's row.
//
// Not a login method: the wallet is still the identity. This only attaches a
// Discord account to the already-authenticated wallet.

import { type NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { getSession, verifySiweSession, requireAuth } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const DISCORD_AUTHORIZE = 'https://discord.com/oauth2/authorize';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = req.nextUrl.origin;

  // The Link button only renders for a signed-in owner; if somehow hit while
  // signed out, bounce home rather than erroring.
  const address = await verifySiweSession(req);
  if (!address) return NextResponse.redirect(new URL('/', origin));

  const clientId = process.env.DISCORD_CLIENT_ID;
  if (!clientId) return serverError('Discord is not configured');

  const state = randomBytes(16).toString('hex');
  const session = await getSession();
  session.discordState = state;
  await session.save();

  const url = new URL(DISCORD_AUTHORIZE);
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', `${origin}/api/auth/discord/callback`);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'identify guilds');
  url.searchParams.set('state', state);
  url.searchParams.set('prompt', 'consent');
  return NextResponse.redirect(url.toString());
}

export const DELETE = requireAuth(async (_req, _ctx, address) => {
  try {
    const db = getSupabaseService();
    const { error } = await db
      .from('users')
      .update({
        discord_id: null,
        discord_username: null,
        discord_avatar: null,
        discord_accent_color: null,
        discord_in_server: null,
      } as never)
      .eq('address', address);
    if (error) return serverError(error.message);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
