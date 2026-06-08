// Discord link callback — Discord redirects here after the user consents.
//
// Verifies the one-time state against the SIWE session (CSRF), exchanges the
// code for a short-lived token, reads the Discord account's id + display name,
// and stores them on the signed-in wallet's row. Then redirects back to the
// user's profile. Every failure path redirects home with a ?discord= reason
// rather than dumping an error page — this is a browser navigation, not an API
// call. The token is used once and discarded; we never store it.

import { type NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/siwe';
import { getSupabaseService } from '@/lib/supabase';
import { getHandleByAddress } from '@/lib/profile/getUserProfileByHandle';

export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://discord.com/api/oauth2/token';
const ME_URL = 'https://discord.com/api/users/@me';

export async function GET(req: NextRequest): Promise<NextResponse> {
  const origin = req.nextUrl.origin;
  const back = (q: string) => NextResponse.redirect(new URL(`/?discord=${q}`, origin));

  const session = await getSession();
  const address = session.address?.toLowerCase();
  const savedState = session.discordState;

  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');

  // One-time state: clear it whatever happens.
  session.discordState = undefined;
  await session.save();

  if (!address) return back('signedout');
  if (!code || !state || !savedState || state !== savedState) return back('error');

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return back('unconfigured');

  try {
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        code,
        redirect_uri: `${origin}/api/auth/discord/callback`,
      }),
    });
    if (!tokenRes.ok) return back('error');
    const token = (await tokenRes.json()) as { access_token?: string };
    if (!token.access_token) return back('error');

    const meRes = await fetch(ME_URL, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    if (!meRes.ok) return back('error');
    const dUser = (await meRes.json()) as {
      id: string;
      username: string;
      global_name?: string | null;
    };
    const name = dUser.global_name || dUser.username;

    const db = getSupabaseService();
    const { error } = await db
      .from('users')
      .update({ discord_id: dUser.id, discord_username: name } as never)
      .eq('address', address);
    if (error) return back('error');

    const handle = await getHandleByAddress(address).catch(() => null);
    return NextResponse.redirect(
      new URL(handle ? `/${handle}?discord=linked` : '/?discord=linked', origin),
    );
  } catch {
    return back('error');
  }
}
