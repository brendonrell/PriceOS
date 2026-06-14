import { type NextRequest, NextResponse } from 'next/server';
import { getSupabaseService, getSupabaseAnon } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth/siwe';
import { badRequest, serverError } from '@/lib/errors';
import { levelProgress, ANOINT_LOCK_DAYS } from '@/lib/anoint/levels';

export const dynamic = 'force-dynamic';

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;
const LOCK_MS = ANOINT_LOCK_DAYS * 24 * 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// The Anointment & Egregore system. One Pledge of Fealty per account: a single
// row in public.anointments keyed on PK(user_address), targeting a PROJECT
// through a chosen OUTPUT conduit. See docs/anointment-egregore-spec.md.
//
//   • Place / move      → POST   (SIWE)
//   • Withdraw          → DELETE (SIWE, lock-gated)
//   • Read one account  → GET ?me=0x…   (anon)
//   • Read one project  → GET ?project=  (anon)  — count, level, Prime Relic
//
// Project level (Dormant/Cult/Egregore) and the Prime Relic are COMPUTED on
// read from the live anointment counts (lib/anoint/levels.ts) — no cache tables.
// ─────────────────────────────────────────────────────────────────────────────

/** The current anointment row, as stored. token_id stays a string end-to-end —
 *  it mirrors the column type and dodges JS integer-precision loss on big ids. */
interface AnointmentRow {
  user_address: string;
  project_id: string;
  output_token_id: string;
  placed_at: string;
  updated_at: string;
}

/** POST body — target a project by id OR @handle, plus the conduit output. */
export interface AnointRequestBody {
  project_id?: string;
  project?: string;
  output_token_id: string;
}

/** POST response — the placed/moved pledge. `moved` is true when the project
 *  changed (a new 60-day lock started); false on a first placement or a
 *  conduit-only change within the same project. */
export interface AnointResponse {
  user_address: string;
  project_id: string;
  output_token_id: string;
  placed_at: string;
  moved: boolean;
}

/** GET ?me= — one account's current pledge (or null). */
export interface MeAnointResponse {
  address: string;
  anointment: {
    project_id: string;
    output_token_id: string;
    placed_at: string;
    locked: boolean;
    unlocksAt: string;
  } | null;
}

/** GET ?project= — a project's anointment standing + Prime Relic. */
export interface ProjectAnointResponse {
  project_id: string;
  handle: string | null;
  count: number;
  level: number;
  levelName: string;
  nextThreshold: number | null;
  progress: number;
  primeRelic: {
    output_token_id: string;
    owner_address: string | null;
    owner_handle: string | null;
    votes: number;
  } | null;
  /** @names of the anointers (claimed handles only; pre-claim wallets omitted). */
  anointers: string[];
}

/**
 * Resolve a project reference — its `id`, or its `@handle` — to the canonical
 * project id. Returns null when no project matches. Anon or service client;
 * reads only. Mirrors the project-id-or-handle resolution other routes do.
 */
async function resolveProjectId(
  supabase: ReturnType<typeof getSupabaseService>,
  ref: string
): Promise<string | null> {
  // Try id first (the common path — ids are stable slugs).
  const byId = await supabase
    .from('projects')
    .select('id')
    .eq('id', ref)
    .maybeSingle();
  if (byId.error) throw new Error(byId.error.message);
  if (byId.data) return (byId.data as { id: string }).id;

  // Fall back to @handle (citext, case-insensitive in Postgres).
  const byHandle = await supabase
    .from('projects')
    .select('id')
    // `handle` is not in the generated types — cast the column ref away.
    .eq('handle' as never, ref)
    .maybeSingle();
  if (byHandle.error) throw new Error(byHandle.error.message);
  return byHandle.data ? (byHandle.data as { id: string }).id : null;
}

export const POST = requireAuth(async (req, _ctx, address) => {
  let body: AnointRequestBody;
  try {
    body = (await req.json()) as AnointRequestBody;
  } catch {
    return badRequest('Invalid JSON body');
  }

  const ref = (body.project_id ?? body.project)?.trim();
  const output_token_id = body.output_token_id?.trim();
  if (!ref) return badRequest('Missing `project_id` or `project`');
  if (!output_token_id) return badRequest('Missing `output_token_id`');

  try {
    const supabase = getSupabaseService();

    const project_id = await resolveProjectId(supabase, ref);
    if (!project_id) return badRequest('No project matches that id or @handle');

    // Read the caller's existing pledge (if any) to decide place vs move vs
    // conduit-change and to enforce the 60-day lock on a cross-project move.
    const existingRes = await supabase
      .from('anointments')
      .select('project_id, output_token_id, placed_at, updated_at')
      .eq('user_address' as never, address)
      .maybeSingle();
    if (existingRes.error) return serverError(existingRes.error.message);
    const existing = existingRes.data as Pick<
      AnointmentRow,
      'project_id' | 'output_token_id' | 'placed_at' | 'updated_at'
    > | null;

    const now = new Date();
    const nowIso = now.toISOString();

    let moved: boolean;
    let placed_at: string;

    if (!existing) {
      // First placement — fresh lock anchor.
      moved = false;
      placed_at = nowIso;
    } else if (existing.project_id === project_id) {
      // Same project: only the conduit Output may be changing. Allowed
      // anytime, never resets the lock — keep the original placed_at.
      moved = false;
      placed_at = existing.placed_at;
    } else {
      // Cross-project MOVE — lock-gated. Blocked until 60 days after placed_at.
      const unlocksAtMs = new Date(existing.placed_at).getTime() + LOCK_MS;
      if (now.getTime() < unlocksAtMs) {
        return NextResponse.json(
          {
            error: `Anointment is locked for ${ANOINT_LOCK_DAYS} days — cannot move to a different project yet`,
            unlocksAt: new Date(unlocksAtMs).toISOString(),
          },
          { status: 409 }
        );
      }
      // Move clears: zero-sum (the old project's count drops since the row
      // moves), and a brand-new 60-day lock starts now.
      moved = true;
      placed_at = nowIso;
    }

    const payload = {
      user_address: address,
      project_id,
      output_token_id,
      placed_at,
      updated_at: nowIso,
    };
    const { data, error } = await supabase
      .from('anointments')
      .upsert(payload as never, { onConflict: 'user_address' })
      .select()
      .single();
    if (error) return serverError(error.message);

    const row = data as AnointmentRow;
    const response: AnointResponse = {
      user_address: row.user_address,
      project_id: row.project_id,
      output_token_id: row.output_token_id,
      placed_at: row.placed_at,
      moved,
    };
    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export const DELETE = requireAuth(async (_req, _ctx, address) => {
  try {
    const supabase = getSupabaseService();

    // Withdrawal is lock-gated too — stakes are real, you can't pull your
    // pledge to re-brigade elsewhere before the 60 days elapse.
    const existingRes = await supabase
      .from('anointments')
      .select('placed_at')
      .eq('user_address' as never, address)
      .maybeSingle();
    if (existingRes.error) return serverError(existingRes.error.message);
    const existing = existingRes.data as { placed_at: string } | null;

    if (existing) {
      const unlocksAtMs = new Date(existing.placed_at).getTime() + LOCK_MS;
      if (Date.now() < unlocksAtMs) {
        return NextResponse.json(
          {
            error: `Anointment is locked for ${ANOINT_LOCK_DAYS} days — cannot withdraw yet`,
            unlocksAt: new Date(unlocksAtMs).toISOString(),
          },
          { status: 409 }
        );
      }
    }

    const { error } = await supabase
      .from('anointments')
      .delete()
      .eq('user_address' as never, address);
    if (error) return serverError(error.message);

    return NextResponse.json({ ok: true });
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
});

export async function GET(req: NextRequest): Promise<NextResponse> {
  const params = new URL(req.url).searchParams;
  const me = params.get('me');
  const project = params.get('project');

  // Exactly one of the two modes — neither or both is a malformed query.
  if ((!me && !project) || (me && project)) {
    return badRequest('Provide exactly one of `?me=` or `?project=`');
  }

  try {
    const supabase = getSupabaseAnon();

    // ── Mode A: ?me=0xADDRESS → that account's current pledge (or null). ──────
    if (me) {
      const meAddr = me.toLowerCase();
      if (!ADDRESS_RE.test(meAddr)) {
        return badRequest('`?me=` must be a 0x… address');
      }

      const { data, error } = await supabase
        .from('anointments')
        .select('project_id, output_token_id, placed_at')
        .eq('user_address' as never, meAddr)
        .maybeSingle();
      if (error) return serverError(error.message);

      const row = data as Pick<
        AnointmentRow,
        'project_id' | 'output_token_id' | 'placed_at'
      > | null;

      const response: MeAnointResponse = {
        address: meAddr,
        anointment: row
          ? (() => {
              const unlocksAtMs = new Date(row.placed_at).getTime() + LOCK_MS;
              return {
                project_id: row.project_id,
                output_token_id: row.output_token_id,
                placed_at: row.placed_at,
                locked: Date.now() < unlocksAtMs,
                unlocksAt: new Date(unlocksAtMs).toISOString(),
              };
            })()
          : null,
      };
      return NextResponse.json(response);
    }

    // ── Mode B: ?project=ID_OR_HANDLE → standing + Prime Relic. ───────────────
    const ref = (project as string).trim();
    if (!ref) return badRequest('`?project=` must not be empty');

    const project_id = await resolveProjectId(supabase, ref);
    if (!project_id) return badRequest('No project matches that id or @handle');

    // The project's @handle for display.
    const handleRes = await supabase
      .from('projects')
      .select('handle')
      .eq('id', project_id)
      .maybeSingle();
    if (handleRes.error) return serverError(handleRes.error.message);
    const handle =
      (handleRes.data as { handle: string | null } | null)?.handle ?? null;

    // All anointments pointing at this project — the count drives the level,
    // the per-conduit tally drives the Prime Relic, the anointers feed the list.
    const anointRes = await supabase
      .from('anointments')
      .select('user_address, output_token_id')
      .eq('project_id', project_id);
    if (anointRes.error) return serverError(anointRes.error.message);
    const rows = (anointRes.data ?? []) as Array<{
      user_address: string;
      output_token_id: string;
    }>;

    const count = rows.length;
    const prog = levelProgress(count);

    // Prime Relic: the conduit Output with the most votes. Tie-break
    // deterministically on the lowest token id (numeric when both numeric,
    // else lexical) so the winner is stable across reads.
    let primeRelic: ProjectAnointResponse['primeRelic'] = null;
    if (count > 0) {
      const tally = new Map<string, number>();
      for (const r of rows) {
        tally.set(r.output_token_id, (tally.get(r.output_token_id) ?? 0) + 1);
      }
      let bestToken: string | null = null;
      let bestVotes = 0;
      for (const [token, votes] of tally) {
        if (
          votes > bestVotes ||
          (votes === bestVotes && bestToken !== null && lowerToken(token, bestToken))
        ) {
          bestToken = token;
          bestVotes = votes;
        }
      }
      if (bestToken !== null) {
        // Resolve the Prime Relic's owner → @handle via holders + users.
        const holderRes = await supabase
          .from('holders')
          .select('owner_address')
          .eq('project_id', project_id)
          .eq('token_id', bestToken)
          .maybeSingle();
        if (holderRes.error) return serverError(holderRes.error.message);
        const owner_address =
          (holderRes.data as { owner_address: string } | null)?.owner_address ??
          null;

        let owner_handle: string | null = null;
        if (owner_address) {
          const ownerRes = await supabase
            .from('users')
            .select('handle')
            .eq('address', owner_address)
            .maybeSingle();
          if (ownerRes.error) return serverError(ownerRes.error.message);
          owner_handle =
            (ownerRes.data as { handle: string | null } | null)?.handle ?? null;
        }

        primeRelic = {
          output_token_id: bestToken,
          owner_address,
          owner_handle,
          votes: bestVotes,
        };
      }
    }

    // Anointers → @names (claimed handles only; pre-claim wallets dropped).
    let anointers: string[] = [];
    const addresses = Array.from(new Set(rows.map((r) => r.user_address)));
    if (addresses.length > 0) {
      const usersRes = await supabase
        .from('users')
        .select('address, handle')
        .in('address', addresses);
      if (usersRes.error) return serverError(usersRes.error.message);
      anointers = ((usersRes.data ?? []) as Array<{
        address: string;
        handle: string | null;
      }>)
        .map((u) => u.handle)
        .filter((h): h is string => typeof h === 'string');
    }

    const response: ProjectAnointResponse = {
      project_id,
      handle,
      count,
      level: prog.level,
      levelName: prog.name,
      nextThreshold: prog.nextThreshold,
      progress: prog.fraction,
      primeRelic,
      anointers,
    };
    return NextResponse.json(response);
  } catch (err) {
    return serverError(err instanceof Error ? err.message : 'Unknown error');
  }
}

/** True when token `a` sorts before `b` for Prime Relic tie-breaking: numeric
 *  compare when both parse as integers, lexical otherwise (stable either way). */
function lowerToken(a: string, b: string): boolean {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isInteger(na) && Number.isInteger(nb)) return na < nb;
  return a < b;
}
