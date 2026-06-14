// POST /api/pings/send — send a person-to-person Ping (a direct message).
//
// Body: { to: string (0x address OR @handle), message: string,
//         projectId?: string, tokenId?: string }
//
// SIWE-gated. The sender is the authed address. createPing handles the rest
// (self-suppression, muted-suppression). A p2p ping is a PING kind carrying the
// message in data.message.

import { NextResponse } from 'next/server';
import { getSupabaseService } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, notFound, serverError } from '@/lib/errors';
import { createPing } from '@/lib/pings/createPing';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const MAX_MESSAGE = 280;

export interface SendPingRequestBody {
  to: string;
  message: string;
  projectId?: string;
  tokenId?: string;
}

export interface SendPingResponse {
  ok: true;
  delivered: boolean; // false when suppressed (self / muted)
}

/** Resolve a recipient ref (0x address or @handle, with/without '@') to a
 *  lowercased address that exists in `users`. Null when unresolved. */
async function resolveRecipient(
  db: ReturnType<typeof getSupabaseService>,
  ref: string
): Promise<string | null> {
  const r = ref.trim().replace(/^@/, '');
  if (ADDRESS_RE.test(r)) {
    const addr = r.toLowerCase();
    const { data } = await db.from('users').select('address').eq('address', addr).maybeSingle();
    return (data as { address: string } | null) ? addr : null;
  }
  const { data } = await db.from('users').select('address').eq('handle', r).maybeSingle();
  return (data as { address: string } | null)?.address?.toLowerCase() ?? null;
}

/** Resolve a wallet → users.handle (null pre-claim). */
async function handleOf(
  db: ReturnType<typeof getSupabaseService>,
  address: string
): Promise<string | null> {
  const { data } = await db.from('users').select('handle').eq('address', address).maybeSingle();
  return (data as { handle: string | null } | null)?.handle ?? null;
}

/** True only when BOTH parties follow each other (the anti-spam gate: you can
 *  only ping someone you're mutuals with). Follows are @name-keyed. */
async function areMutuals(
  db: ReturnType<typeof getSupabaseService>,
  aHandle: string,
  bHandle: string
): Promise<boolean> {
  const [aFollowsB, bFollowsA] = await Promise.all([
    db.from('follows').select('follower_name').eq('follower_name', aHandle).eq('following_name', bHandle).maybeSingle(),
    db.from('follows').select('follower_name').eq('follower_name', bHandle).eq('following_name', aHandle).maybeSingle(),
  ]);
  return !!aFollowsB.data && !!bFollowsA.data;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: SendPingRequestBody;
  try {
    body = (await req.json()) as SendPingRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const message = (body.message ?? '').trim();
  if (!message) return badRequest('Message is required');
  if (message.length > MAX_MESSAGE) return badRequest(`Message too long (max ${MAX_MESSAGE})`);
  if (!body.to) return badRequest('`to` (address or @handle) is required');

  try {
    const db = getSupabaseService();
    const recipient = await resolveRecipient(db, body.to);
    if (!recipient) return notFound('Recipient not found');
    if (recipient === address) return badRequest('Cannot ping yourself');

    // Anti-spam gate: p2p pings are MUTUALS-ONLY. Both parties must follow each
    // other (and both must have claimed an @name).
    const [senderHandle, recipientHandle] = await Promise.all([
      handleOf(db, address),
      handleOf(db, recipient),
    ]);
    if (!senderHandle || !recipientHandle || !(await areMutuals(db, senderHandle, recipientHandle))) {
      return NextResponse.json(
        { error: 'You can only ping people you follow each other', code: 'NOT_MUTUALS' },
        { status: 403 }
      );
    }

    const id = await createPing({
      recipientAddress: recipient,
      kind: 'PING',
      actorAddress: address,
      projectId: body.projectId ?? null,
      tokenId: body.tokenId ?? null,
      data: { message },
    });

    const response: SendPingResponse = { ok: true, delivered: id !== null };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});
