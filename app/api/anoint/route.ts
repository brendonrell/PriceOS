import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, getSupabaseAnon } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

/** Anoint a piece. Body for POST; the same pair (minus the caller) is echoed
 *  back in the response. token_id stays a string end-to-end — it mirrors the
 *  anointments PK column type and dodges JS integer-precision loss on big ids. */
export interface AnointRequestBody {
  project_id: string;
  token_id: string;
}

/** POST response — the row as written, plus the resolved caller address. */
export interface AnointResponse {
  user_address: string;
  project_id: string;
  token_id: string;
  created_at: string;
}

export interface UnanointResponse {
  ok: true;
  project_id: string;
  token_id: string;
}

/** GET ?piece= response — who anointed a single piece, and how many. */
export interface PieceAnointsResponse {
  project_id: string;
  token_id: string;
  count: number;
  /** @names of the anointers (claimed handles only; pre-claim wallets omitted). */
  anointers: string[];
}

/** GET ?user= response — the pieces a single user has anointed. */
export interface UserAnointsResponse {
  address: string;
  count: number;
  pieces: Array<{ project_id: string; token_id: string; created_at: string }>;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: AnointRequestBody;
  try {
    body = (await req.json()) as AnointRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const project_id = body.project_id?.trim();
  const token_id = body.token_id?.trim();
  if (!project_id || !token_id) {
    return badRequest('Missing `project_id` or `token_id`');
  }

  try {
    const supabase = getSupabaseService();

    // Idempotent: the PK is (user_address, project_id, token_id), so an upsert
    // on that conflict re-anointing the same piece is a no-op that still returns
    // the row. created_at defaults in Postgres on the first insert only.
    const payload = { user_address: address, project_id, token_id };
    const { data, error } = await supabase
      .from('anointments')
      .upsert(payload as never, {
        onConflict: 'user_address,project_id,token_id',
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    // Cast around Supabase typed-client `never` inference on the new table.
    const row = data as {
      user_address: string;
      project_id: string;
      token_id: string;
      created_at: string;
    };
    const response: AnointResponse = {
      user_address: row.user_address,
      project_id: row.project_id,
      token_id: row.token_id,
      created_at: row.created_at,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (req, _ctx, address) => {
  const params = new URL(req.url).searchParams;
  const project_id = params.get('project_id')?.trim();
  const token_id = params.get('token_id')?.trim();
  if (!project_id || !token_id) {
    return badRequest('Missing `?project_id=` or `?token_id=`');
  }

  try {
    const supabase = getSupabaseService();

    const { error } = await supabase
      .from('anointments')
      .delete()
      .eq('user_address', address)
      .eq('project_id', project_id)
      .eq('token_id', token_id);

    if (error) return serverError(error.message);

    const response: UnanointResponse = { ok: true, project_id, token_id };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const piece = params.get('piece');
  const user = params.get('user');

  // Exactly one of the two modes — neither or both is a malformed query.
  if ((!piece && !user) || (piece && user)) {
    return badRequest('Provide exactly one of `?piece=` or `?user=`');
  }

  try {
    const supabase = getSupabaseAnon();

    // ── Mode A: ?piece=PROJECTID:TOKENID → anointers + count for one piece. ──
    if (piece) {
      // Split on the LAST colon: project ids are slugs (no colons), token ids
      // are numeric strings, so the rightmost colon is the safe delimiter.
      const sep = piece.lastIndexOf(':');
      if (sep <= 0 || sep === piece.length - 1) {
        return badRequest('`?piece=` must be PROJECT_ID:TOKEN_ID');
      }
      const project_id = piece.slice(0, sep);
      const token_id = piece.slice(sep + 1);

      const { data, error } = await supabase
        .from('anointments')
        .select('user_address')
        .eq('project_id', project_id)
        .eq('token_id', token_id);
      if (error) return serverError(error.message);

      const rows = (data ?? []) as Array<{ user_address: string }>;
      const addresses = rows.map((r) => r.user_address);

      // Resolve anointer addresses → @names in one users read. Pre-claim
      // wallets (no handle yet) are simply dropped from the public list.
      let anointers: string[] = [];
      if (addresses.length > 0) {
        const { data: usersData, error: usersErr } = await supabase
          .from('users')
          .select('address, handle')
          .in('address', addresses);
        if (usersErr) return serverError(usersErr.message);
        anointers = ((usersData ?? []) as Array<{
          address: string;
          handle: string | null;
        }>)
          .map((u) => u.handle)
          .filter((h): h is string => typeof h === 'string');
      }

      const response: PieceAnointsResponse = {
        project_id,
        token_id,
        count: addresses.length,
        anointers,
      };
      return NextResponse.json(response);
    }

    // ── Mode B: ?user=0xADDRESS → the pieces this user has anointed. ─────────
    const address = (user as string).toLowerCase();
    if (!ADDRESS_RE.test(address)) {
      return badRequest('`?user=` must be a 0x… address');
    }

    const { data, error } = await supabase
      .from('anointments')
      .select('project_id, token_id, created_at')
      .eq('user_address', address)
      .order('created_at', { ascending: false });
    if (error) return serverError(error.message);

    const pieces = (data ?? []) as Array<{
      project_id: string;
      token_id: string;
      created_at: string;
    }>;
    const response: UserAnointsResponse = {
      address,
      count: pieces.length,
      pieces,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}
